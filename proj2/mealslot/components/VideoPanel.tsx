"use client";

import React, { useState } from "react";
import Modal from "./ui/Modal";
import { cn } from "./ui/cn";

export type Video = {
  id: string;
  title: string;
  thumbnail?: string;
};

export default function VideoPanel({
  videosByDish,
}: {
  videosByDish: Record<string, Video[]>;
}) {
  const [video, setVideo] = useState<Video | null>(null);

  const tileBase =
    "group flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white/90 p-2.5 text-left shadow-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50";
  const thumbnailBase =
    "relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100";

  return (
    <div className="space-y-5">
      {Object.entries(videosByDish).map(([dish, vids]) => (
        <section
          key={dish}
          className="rounded-2xl border border-dashed border-neutral-200/80 bg-white/60 p-3 shadow-sm"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-neutral-900">
              {dish}
            </h3>
            <span className="text-xs text-neutral-500">
              {Math.min(vids.length, 2)} of {vids.length} suggestions
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {vids.slice(0, 2).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVideo(v)}
                className={tileBase}
                aria-label={`Play ${v.title}`}
              >
                {/* Thumbnail */}
                <div className={thumbnailBase}>
                  {v.thumbnail ? (
                    <img
                      src={v.thumbnail}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-neutral-200" />
                  )}

                  {/* Play overlay */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-[10px] text-white shadow-sm group-hover:bg-black/70">
                      ▶
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="flex-1 space-y-1">
                  <p className="line-clamp-2 text-xs font-medium text-neutral-900">
                    {v.title}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Tap to watch on YouTube
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}

      {/* Inline player modal */}
      <Modal
        open={!!video}
        title={video ? `Playing: ${video.title}` : "Video"}
        onClose={() => setVideo(null)}
      >
        {video && (
          <div className="rounded-2xl border border-neutral-200/80 bg-black/5 p-2 shadow-sm">
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              <iframe
                title={video.title}
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${video.id}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
