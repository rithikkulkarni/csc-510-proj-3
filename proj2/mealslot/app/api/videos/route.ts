import "server-only";
import { NextRequest } from "next/server";
import { z } from "zod";

const Body = z.object({
  dishes: z.array(z.string().min(1)).min(1),
});

// Normalize the key: treat missing, empty, or "dummy" as "no real key"
const RAW_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_KEY =
  RAW_KEY && RAW_KEY.toLowerCase() !== "dummy" ? RAW_KEY : undefined;

if (!YOUTUBE_KEY) {
  console.warn(
    "YOUTUBE_API_KEY is missing or set to 'dummy' — using stubbed videos instead of real YouTube search."
  );
}

async function searchYouTube(query: string, maxResults = 2) {
  // If we don't have a real key, just signal "missing_key"
  if (!YOUTUBE_KEY) return { results: [], error: "missing_key" };

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
    query
  )}&maxResults=${maxResults}&key=${YOUTUBE_KEY}`;

  const res = await fetch(url);
  if (!res.ok) return { results: [], error: `http_${res.status}` };

  const body = await res.json();
  const results = Array.isArray(body.items) ? body.items : [];
  return { results, error: null };
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { code: "BAD_REQUEST", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { dishes } = parsed.data;
  const responseObj: {
    results: Record<string, Array<Record<string, any>>>;
    errors: Array<{ dish: string; message: string }>;
  } = { results: {}, errors: [] };

  // If we *do* have a real key, try actual YouTube search first
  if (YOUTUBE_KEY) {
    const jobs = dishes.map(async (dish) => {
      try {
        const { results, error } = await searchYouTube(`${dish} recipe`, 2);
        if (error) {
          responseObj.errors.push({ dish, message: String(error) });
          responseObj.results[dish] = [];
          return;
        }

        const mapped = results.map((v: any) => ({
          id: v.id.videoId,
          title: v.snippet.title,
          description: v.snippet.description,
          url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
          thumbnail: v.snippet.thumbnails?.default?.url,
        }));

        responseObj.results[dish] = mapped;
      } catch (err: any) {
        responseObj.errors.push({ dish, message: err?.message ?? String(err) });
        responseObj.results[dish] = [];
      }
    });

    await Promise.all(jobs);

    return Response.json(responseObj);
  }

  // Fallback stub if key is missing or "dummy"
  const stub = dishes.reduce((acc: any, d: string) => {
    acc[d] = [
      {
        id: `${d}_1`,
        title: `${d} Recipe 1`,
        description: "Stubbed recipe video",
        url: "https://youtube.com",
        thumbnail: "",
      },
      {
        id: `${d}_2`,
        title: `${d} Recipe 2`,
        description: "Stubbed recipe video",
        url: "https://youtube.com",
        thumbnail: "",
      },
    ];
    return acc;
  }, {});

  return Response.json({
    results: stub,
    errors: [],
    notice:
      "YOUTUBE_API_KEY not set (or set to 'dummy') — returning stubbed videos. Set a real YOUTUBE_API_KEY to enable live YouTube searches.",
  });
}
