"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { PrefsSchema, DietEnum, ALLERGEN_OPTIONS } from "@/lib/party";
import { getRealtimeForRoom } from "@/lib/realtime";
import { useUser } from "@/app/context/UserContext";
import PartySpinMachine from "@/components/party/PartySpinMachine";
import PartySidebar from "@/components/party/PartySidebar";
import PartyChat from "@/components/party/PartyChat";
import PartyMap from "@/components/party/PartyMap";

/** ——— Presence tuning ——— */
const HEARTBEAT_MS = 15_000;   // send a beat every 15s
const PEER_TTL_MS = 120_000;  // consider peers alive for 2 minutes since lastSeen

/** ————— Types ————— */
type Dish = {
  id: string;
  name: string;
  category: string;
  tags: string[];
  allergens: string[];
  ytQuery?: string;
};

type SpinTriple = [Dish | null, Dish | null, Dish | null];

type PartyState = {
  party: { id: string; code: string; isActive: boolean; constraints?: any };
  members: { id: string; nickname?: string; prefs: z.infer<typeof PrefsSchema> }[];
};

type Peer = { id: string; nickname: string; creator: boolean; lastSeen: number };

type ChatMsg = { id: string; ts: number; from: string; text: string };

type VotePacket = { idx: 0 | 1 | 2; kind: "keep" | "reroll"; voterId: string };

/** ————— Utils ————— */
const now = () => Date.now();
const byCreated = (a: Peer, b: Peer) =>
  a.creator === b.creator ? a.id.localeCompare(b.id) : a.creator ? -1 : 1;

/** ————— Component ————— */
export default function PartyClient({
  code: initialCode,
  onCodeChange,
  initialNickname,
  skipAutoJoin,
  initialMemberId,
  onSpin,
}: {
  code?: string;
  onCodeChange?: (code: string) => void;
  initialNickname?: string;
  skipAutoJoin?: boolean;
  initialMemberId?: string | null;
  onSpin?: () => void;
}) {
  /** user context for auth_id */
  const { user } = useUser();

  /** nickname (persist) */
  const [nickname, setNickname] = useState<string>(() => {
    if (initialNickname) return initialNickname;
    try { return localStorage.getItem("mealslot_nickname") || "Guest"; } catch { return "Guest"; }
  });
  useEffect(() => { try { localStorage.setItem("mealslot_nickname", nickname); } catch { } }, [nickname]);

  /** code / member / party state moved to page-level in some flows */
  const [activeCode, setActiveCode] = useState<string>(() => (initialCode ?? ""));
  const code = activeCode; // some helpers still reference `code`
  const updateActiveCode = useCallback((c: string) => {
    setActiveCode(c);
    try { onCodeChange?.(c); } catch { }
  }, [onCodeChange]);

  const [memberId, setMemberId] = useState<string | null>(() => (initialMemberId ?? null));
  const [state, setState] = useState<PartyState | null>(null);
  const autoJoinedRef = useRef(false);

  /** prefs */
  const [prefs, setPrefs] = useState<z.infer<typeof PrefsSchema>>({});
  const [allergenOptions, setAllergenOptions] = useState<string[]>(ALLERGEN_OPTIONS);

  // Load allergens from dishes table so the UI reflects real data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/allergens", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        const list: string[] = Array.isArray(j.allergens) ? j.allergens.filter(Boolean) : [];
        if (!cancelled && list.length) setAllergenOptions(list);
      } catch { /* keep fallback */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const [peers, setPeers] = useState<Record<string, Peer>>({});
  const [transport, setTransport] = useState<string>("");

  /** spin filters */
  const [cats, setCats] = useState<{ breakfast: boolean; lunch: boolean; dinner: boolean; dessert: boolean }>({
    breakfast: false, lunch: false, dinner: true, dessert: false
  });
  const [powerups, setPowerups] = useState<{ healthy?: boolean; cheap?: boolean; fast?: boolean }>({});

  /** spin state */
  const [isSpinning, setIsSpinning] = useState(false);
  const [slots, setSlots] = useState<SpinTriple>([null, null, null]);
  const [locks, setLocks] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [slotCategories, setSlotCategories] = useState<string[]>(["Breakfast", "Lunch", "Dinner"]);
  const [recent, setRecent] = useState<string[]>([]);

  /** votes per slot (keep / reroll) */
  const [votes, setVotes] = useState<[
    { keep: Set<string>; reroll: Set<string> },
    { keep: Set<string>; reroll: Set<string> },
    { keep: Set<string>; reroll: Set<string> }
  ]>([
    { keep: new Set(), reroll: new Set() },
    { keep: new Set(), reroll: new Set() },
    { keep: new Set(), reroll: new Set() },
  ]);

  const resetVotes = () =>
    setVotes([
      { keep: new Set(), reroll: new Set() },
      { keep: new Set(), reroll: new Set() },
      { keep: new Set(), reroll: new Set() },
    ]);

  /** chat */
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const chatInputRef = useRef<HTMLInputElement>(null);

  /** realtime */
  const rtRef = useRef<Awaited<ReturnType<typeof getRealtimeForRoom>> | null>(
    null,
  );
  const clientIdRef = useRef<string>("");
  if (!clientIdRef.current) {
    try {
      const k = "party:clientId";
      const v = sessionStorage.getItem(k); if (v) { clientIdRef.current = v; } else {
        const id = crypto.randomUUID(); sessionStorage.setItem(k, id); clientIdRef.current = id;
      }
    } catch { clientIdRef.current = crypto.randomUUID(); }
  }
  const createdRef = useRef(false);

  /** refs for stable handlers */
  const slotsRef = useRef(slots); useEffect(() => { slotsRef.current = slots; }, [slots]);
  const locksRef = useRef(locks); useEffect(() => { locksRef.current = locks; }, [locks]);
  const livePeersRef = useRef<Peer[]>([]);
  const lastSpinSummaryRef = useRef<string>("");

  /** computed */
  const livePeers = useMemo(() => {
    const arr = Object.values(peers);
    const pruned = arr.filter((p) => now() - p.lastSeen <= PEER_TTL_MS);
    pruned.sort(byCreated);
    livePeersRef.current = pruned;
    return pruned;
  }, [peers]);

  const hostId = useMemo(() => livePeers.find(p => p.creator)?.id ?? livePeers[0]?.id ?? null, [livePeers]);
  const iAmHost = !!memberId && hostId === memberId;
  const iAmHostRef = useRef(iAmHost); useEffect(() => { iAmHostRef.current = iAmHost; }, [iAmHost]);

  const displayName = useMemo(() => {
    const me = state?.members.find((m) => m.id === memberId);
    return me?.nickname || nickname;
  }, [memberId, nickname, state?.members]);

  // Hydrate my prefs from server state (includes user allergens from public.user)
  useEffect(() => {
    if (!memberId || !state?.members) return;
    const me = state.members.find(m => m.id === memberId);
    if (me?.prefs) setPrefs(me.prefs);
  }, [memberId, state?.members]);

  const categoriesArray = useMemo(() => {
    const out: string[] = [];
    if (cats.breakfast) out.push("Breakfast");
    if (cats.lunch) out.push("Lunch");
    if (cats.dinner) out.push("Dinner");
    if (cats.dessert) out.push("Dessert");
    return out.length ? out : ["Dinner"]; // default dinner
  }, [cats]);

  /** Aggregate allergens from all party members */
  const partyAllergens = useMemo(() => {
    if (!state?.members) return [];
    const allergenSet = new Set<string>();
    state.members.forEach(member => {
      const memberAllergens = member.prefs?.allergens ?? [];
      memberAllergens.forEach(a => allergenSet.add(a));
    });
    return Array.from(allergenSet);
  }, [state?.members]);

  /** disconnect */
  const disconnect = useCallback(() => {
    try { rtRef.current?.emit("bye", { code: activeCode, clientId: clientIdRef.current }); } catch { }
    try { rtRef.current?.close(); } catch { }
    rtRef.current = null;
    setTransport("");
  }, [activeCode]);

  /** one-time system message */
  const pushedConnectedRef = useRef(false);
  const pushSys = useCallback((text: string) => {
    setChat((c) => [
      ...c,
      { id: crypto.randomUUID(), ts: Date.now(), from: "system", text },
    ]);
  }, []);

  /** helper: bump peer lastSeen for any id */
  const touchPeer = useCallback(
    (id: string, mutateNickname?: string, creatorFlag?: boolean) => {
      setPeers((prev) => {
        const ex = prev[id];
        return {
          ...prev,
          [id]: {
            id,
            nickname: mutateNickname ?? ex?.nickname ?? "Guest",
            creator: creatorFlag ?? ex?.creator ?? false,
            lastSeen: Date.now(),
          },
        };
      });
    },
    [],
  );

  /** realtime wiring — attach listeners once per room */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeCode || !memberId) {
        disconnect();
        return;
      }

      const rt = await getRealtimeForRoom(activeCode);
      if (cancelled) { try { rt.close(); } catch { }; return; }
      rtRef.current = rt;
      setTransport(rt.kind);

      const seenMsgIds = new Set<string>();

      // Presence
      rt.on("hello", (p: any) => {
        if (!p || p.code !== activeCode) return;
        touchPeer(p.clientId, p.nickname, !!p.creator);
        try { rt.emit("here", { code: activeCode, clientId: clientIdRef.current, nickname: displayName, creator: createdRef.current }); } catch { }
      });

      rt.on("here", (p: any) => {
        if (!p || p.code !== activeCode) return;
        touchPeer(p.clientId, p.nickname);
      });

      rt.on("beat", (p: any) => {
        if (!p || p.code !== activeCode) return;
        touchPeer(p.clientId);
      });

      rt.on("bye", (p: any) => {
        if (!p || p.code !== activeCode) return;
        setPeers(prev => { const cp = { ...prev }; delete cp[p.clientId]; return cp; });
      });

      // Nick
      rt.on("nick", (p: any) => {
        if (!p || p.code !== activeCode) return;
        touchPeer(p.clientId, p.nickname);
      });

      // Chat
      rt.on("chat", (m: any) => {
        if (!m || m.code !== activeCode || !m.id || seenMsgIds.has(m.id)) return;
        seenMsgIds.add(m.id);
        touchPeer(m.clientId ?? "", undefined); // if server includes clientId, this keeps them fresh
        setChat(c => [...c, { id: m.id, ts: m.ts, from: m.from || "anon", text: String(m.text || "") }]);
      });

      // Spin sync
      rt.on("spin_result", (payload: any) => {
        if (!payload || payload.code !== activeCode) return;
        setSlots(payload.slots ?? [null, null, null]);
        setLocks(payload.locks ?? [false, false, false]);
        resetVotes();
        onSpin?.();
        const summary: string = payload.summary || "";
        if (summary && summary !== lastSpinSummaryRef.current) {
          lastSpinSummaryRef.current = summary;
          setRecent(r => [summary, ...r].slice(0, 30));
        }
      });

      rt.on("sync_request", (p: any) => {
        if (!iAmHostRef.current || !p || p.code !== activeCode) return;
        try {
          rt.emit("spin_result", {
            code: activeCode,
            slots: slotsRef.current,
            locks: locksRef.current,
            summary: lastSpinSummaryRef.current,
          });
        } catch { }
      });

      // Votes
      rt.on("vote", (v: VotePacket & { clientId?: string }) => {
        if (!v || v.idx === undefined) return;
        if (v.clientId) touchPeer(v.clientId);
        setVotes((prev) => {
          const cp = [
            { keep: new Set(prev[0].keep), reroll: new Set(prev[0].reroll) },
            { keep: new Set(prev[1].keep), reroll: new Set(prev[1].reroll) },
            { keep: new Set(prev[2].keep), reroll: new Set(prev[2].reroll) },
          ] as typeof prev;
          cp[v.idx].keep.delete(v.voterId);
          cp[v.idx].reroll.delete(v.voterId);
          cp[v.idx][v.kind].add(v.voterId as string);
          return cp;
        });
        if (iAmHostRef.current) maybeActOnVotes(v.idx);
      });

      // announce + heartbeat
      try { rt.emit("hello", { code: activeCode, clientId: clientIdRef.current, nickname: displayName, creator: createdRef.current }); } catch { }
      // Heartbeat: also self-touch locally so we never prune ourselves even if server doesn't echo in throttled tabs
      const sendBeat = () => {
        try { rt.emit("beat", { code: activeCode, clientId: clientIdRef.current }); } catch { }
        touchPeer(clientIdRef.current); // local keepalive
      };
      sendBeat();
      const hb = setInterval(sendBeat, HEARTBEAT_MS);

      // newbies request sync
      try { if (!iAmHostRef.current) rt.emit("sync_request", { code: activeCode, clientId: clientIdRef.current }); } catch { }

      if (!pushedConnectedRef.current) {
        pushSys(`Connected via ${rt.kind}.`);
        pushedConnectedRef.current = true;
      }

      // When tab becomes visible again, send an immediate beat
      const vis = () => {
        if (document.visibilityState === "visible") sendBeat();
      };
      document.addEventListener("visibilitychange", vis);

      return () => {
        clearInterval(hb);
        document.removeEventListener("visibilitychange", vis);
      };
    })();

    return () => {
      cancelled = true;
      disconnect();
      pushedConnectedRef.current = false;
    };
  }, [activeCode, memberId, displayName, disconnect, pushSys, touchPeer]);

  /** fetch server state */
  const fetchState = useCallback(async (c: string) => {
    const r = await fetch(`/api/party/state?code=${c}`, { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as PartyState;
    setState(j);

    // seed peers from server order (host first)
    setPeers((prev) => {
      const base = { ...prev };
      const host = j.members[0]?.id ?? null;
      for (const m of j.members) {
        base[m.id] = {
          id: m.id,
          nickname: m.nickname || "Guest",
          creator: m.id === host,
          lastSeen: Date.now(),
        };
      }
      return base;
    });
    return j;
  }, []);

  /** create/join/leave handled at page-level; PartyClient initializes from provided props */

  // onLeave is handled by the page; PartyClient will disconnect via effects when `activeCode`/`memberId` change

  // Initialize from page-provided props: if the page created the party it will supply `initialMemberId`
  useEffect(() => {
    if (!initialCode) return;
    if (initialMemberId && skipAutoJoin) {
      setMemberId(initialMemberId);
      clientIdRef.current = initialMemberId;
      createdRef.current = true;
      updateActiveCode(initialCode.toUpperCase());
      // fetch server state for UI
      (async () => { try { await fetchState(initialCode.toUpperCase()); } catch { } })();
    }
  }, [initialCode, initialMemberId, skipAutoJoin, fetchState, updateActiveCode]);

  // Parent-level create/join handlers moved to page; no ref exposure here anymore

  /** prefs push */
  const [prefsStateGuard] = useState(0); // no-op, keeps deps stable
  const pushPrefs = useCallback(async (next: Partial<z.infer<typeof PrefsSchema>>) => {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    if (!state?.party?.id || !memberId) return;
    const r = await fetch("/api/party/update", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ partyId: state.party.id, memberId, prefs: merged })
    });
    if (r.ok) {
      const j = await r.json();
      setState(s => s ? { ...s, party: { ...s.party, constraints: j.merged } } : s);
    }
    try { rtRef.current?.emit("prefs", { code: activeCode, memberId, prefs: merged }); } catch { }
  }, [prefs, state?.party?.id, memberId, activeCode, prefsStateGuard]);

  /** broadcast helpers */
  const summarize = useCallback((trip: SpinTriple) =>
    trip.map((d, i) => `${slotCategories[i] || "—"}: ${d?.name ?? "—"}`).join(" · "),
    [slotCategories]
  );

  const emitSpinBroadcast = useCallback((trip: SpinTriple, lk: [boolean, boolean, boolean]) => {
    const summary = summarize(trip);
    lastSpinSummaryRef.current = summary;
    try {
      rtRef.current?.emit("spin_result", {
        code: activeCode, slots: trip, locks: lk, summary
      });
    } catch { }
  }, [activeCode, summarize]);

  /** reroll function (single-slot reroll; host-only) */
  const rerollSingleSlotHost = constUseCallbackRerollSingleSlotHost();

  function constUseCallbackRerollSingleSlotHost() {
    return useCallback(async (idx: 0 | 1 | 2, categoriesOverride?: string[]) => {
      if (!iAmHost) return;
      const lockedOverride: [boolean, boolean, boolean] = [true, true, true];
      lockedOverride[idx] = false; // only this slot changes
      setIsSpinning(true);
      try {
        const endpoint = `${window.location.origin}/api/party/spin`;
        const categoriesToSend = categoriesOverride ?? slotCategories ?? categoriesArray;
        const r = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            code: activeCode,
            categories: categoriesToSend,
            constraints: {
              ...(state?.party?.constraints || {}),
              allergens: partyAllergens, // Use aggregated party allergens
            },
            locked: lockedOverride,
            slots: slotsRef.current,
            powerups,
          }),
        });
        const j = await r.json().catch(() => ({}));
        const trip = (j?.selection as SpinTriple) ?? slotsRef.current;
        setSlots(trip);
        setRecent((rm) => [summarize(trip), ...rm].slice(0, 50));
        resetVotes();
        emitSpinBroadcast(trip, lockedOverride);
      } catch (e) {
        console.error(e);
        alert("Re-roll failed.");
      } finally {
        setIsSpinning(false);
      }
    }, [
      iAmHost,
      activeCode,
      slotCategories,
      categoriesArray,
      state?.party?.constraints,
      powerups,
      partyAllergens,
      emitSpinBroadcast,
    ]);
  }

  /** lock toggles (host drives the authoritative lock) */
  const toggleLock = useCallback((idx: 0 | 1 | 2) => {
    if (!iAmHost) return;
    setLocks(l => {
      const cp: [boolean, boolean, boolean] = [...l] as any;
      cp[idx] = !cp[idx];
      locksRef.current = cp;
      emitSpinBroadcast(slotsRef.current, cp);
      return cp;
    });
  }, [iAmHost, emitSpinBroadcast]);

  /** votes: quorum and action */
  const quorum = useMemo(() => Math.max(1, Math.floor(livePeersRef.current.length / 2) + 1), [livePeers]);

  const sendVote = useCallback((idx: 0 | 1 | 2, kind: "keep" | "reroll") => {
    if (!activeCode || !memberId) return;
    const pkt: VotePacket = { idx, kind, voterId: memberId };
    setVotes(prev => {
      const cp = [
        { keep: new Set(prev[0].keep), reroll: new Set(prev[0].reroll) },
        { keep: new Set(prev[1].keep), reroll: new Set(prev[1].reroll) },
        { keep: new Set(prev[2].keep), reroll: new Set(prev[2].reroll) },
      ] as typeof prev;
      cp[idx].keep.delete(memberId);
      cp[idx].reroll.delete(memberId);
      cp[idx][kind].add(memberId);
      return cp;
    });
    try { rtRef.current?.emit("vote", { ...pkt, code: activeCode, clientId: memberId }); } catch { }
    if (iAmHost) maybeActOnVotes(idx);
  }, [activeCode, memberId, iAmHost]);

  const maybeActOnVotes = (idx: 0 | 1 | 2) => {
    const v = votes[idx];
    const keepCount = v.keep.size;
    const rerollCount = v.reroll.size;
    if (keepCount >= quorum) {
      setLocks(l => {
        const cp: [boolean, boolean, boolean] = [...l] as any;
        cp[idx] = true;
        locksRef.current = cp;
        emitSpinBroadcast(slotsRef.current, cp);
        return cp;
      });
      setVotes((prev) => {
        const cp = [
          { keep: new Set(prev[0].keep), reroll: new Set(prev[0].reroll) },
          { keep: new Set(prev[1].keep), reroll: new Set(prev[1].reroll) },
          { keep: new Set(prev[2].keep), reroll: new Set(prev[2].reroll) },
        ] as typeof prev;
        cp[idx] = { keep: new Set(), reroll: new Set() };
        return cp;
      });
    } else if (rerollCount >= quorum) {
      rerollSingleSlotHost(idx);
    }
  };

  /** chat */
  const onGroupSpin = useCallback(async () => {
    if (!activeCode || !memberId) return alert("Join a party first");
    if (!iAmHost) return alert("Only the host can spin.");
    setIsSpinning(true);
    try {
      const endpoint = `${window.location.origin}/api/party/spin`;
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          code: activeCode,
          categories: slotCategories,
          constraints: {
            ...(state?.party?.constraints || {}),
            allergens: partyAllergens, // Use aggregated party allergens
          },
          locked: locksRef.current,
          slots: slotsRef.current,
          powerups,
        }),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        throw new Error(`HTTP ${r.status} ${r.statusText} :: ${text}`);
      }
      const j = await r.json().catch(() => ({}));
      const trip = (j?.selection as SpinTriple) ?? [null, null, null];
      setSlots(trip);
      setRecent((rm) => [summarize(trip), ...rm].slice(0, 50));
      resetVotes();
      emitSpinBroadcast(trip, locksRef.current);
    } catch (e) {
      console.error(e);
      alert("Group spin failed.");
    } finally {
      setIsSpinning(false);
    }
  }, [activeCode, memberId, iAmHost, slotCategories, state?.party?.constraints, powerups, partyAllergens, emitSpinBroadcast]);

  /** chat */
  const sendChat = useCallback((text: string) => {
    if (!text.trim() || !activeCode) return;
    const msg: ChatMsg = { id: crypto.randomUUID(), ts: Date.now(), from: displayName, text };
    setChat(c => [...c, msg]); // local echo
    try { rtRef.current?.emit("chat", { ...msg, code: activeCode, clientId: memberId }); } catch { }
  }, [activeCode, displayName, memberId]);

  /** UI gates */
  const canCreate = code.length === 0 && !memberId;
  const canJoin = code.length === 6 && !memberId;

  const primarySmallButtonBase =
    "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs md:text-sm font-medium transform transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 hover:-translate-y-0.5 hover:scale-[1.05] active:scale-[0.97]";
  const secondarySmallButtonBase =
    "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs md:text-sm font-medium transform transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 hover:-translate-y-0.5 hover:scale-[1.05] active:scale-[0.97]";

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">

      {/* Left: Spin Machine (2/3 width) */}
      <PartySpinMachine
        memberId={memberId}
        iAmHost={iAmHost}
        isSpinning={isSpinning}
        powerups={powerups}
        onPowerupToggle={(key: string) => {
          if (key === "healthy" || key === "cheap" || key === "fast") {
            setPowerups(p => ({ ...p, [key]: !p[key] }));
          }
        }}
        onGroupSpin={onGroupSpin}
        onReroll={() => { }} // Placeholder - reroll is handled per-slot via voting
        slots={slots}
        locks={locks}
        slotCategories={slotCategories}
        onCategoryChange={(idx, category) => {
          const newCats = [...slotCategories];
          newCats[idx] = category;
          setSlotCategories(newCats);
          // Immediately fetch a replacement for this slot using the updated categories (host will run)
          try {
            // idx may be number; ensure it matches expected type
            // @ts-ignore
            rerollSingleSlotHost(idx, newCats);
          } catch (e) {
            // swallow if helper not available
          }
        }}
        votes={votes}
        onToggleLock={toggleLock}
        onSendVote={sendVote}
        recent={recent}
      />

      {/* Right: Members + Preferences + Chat (1/3 width) */}
      <div className="grid gap-4 auto-rows-max">
        <PartySidebar
          livePeers={livePeers}
          hostId={hostId}
          memberId={memberId}
          prefs={prefs}
          allergenOptions={allergenOptions}
          onPrefChange={pushPrefs}
        />
        <PartyChat
          chat={chat}
          onSendChat={sendChat}
        />
      </div>
    </div>
  );
}
