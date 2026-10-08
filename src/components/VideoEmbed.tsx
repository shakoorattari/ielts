import { useState } from 'react';

/**
 * A YouTube video that only contacts YouTube once the visitor presses play (so simply opening the page
 * shares nothing with Google), using the privacy-enhanced embed domain.
 */
export function VideoEmbed({ id, title, channel }: { id: string; title: string; channel: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="relative aspect-video w-full bg-ink/90">
        {playing ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 grid place-items-center bg-gradient-to-br from-brand-700 to-brand-500 text-on-brand"
            aria-label={`Play video: ${title}`}
          >
            <span className="flex flex-col items-center gap-3 px-6 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white/20 text-2xl transition group-hover:scale-105">
                ▶
              </span>
              <span className="text-sm font-semibold leading-snug sm:text-base">{title}</span>
              <span className="text-xs opacity-80">Plays from YouTube when you press it</span>
            </span>
          </button>
        )}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
        <span className="text-ink-soft">
          {channel} ·{' '}
          <a
            href={`https://youtu.be/${id}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-600 hover:underline"
          >
            Watch on YouTube
          </a>
        </span>
      </figcaption>
    </figure>
  );
}
