'use client';

import Image from 'next/image';
import { useState } from 'react';

export function ReelBlock() {
  const [showVideoNotice, setShowVideoNotice] = useState(false);

  return (
    <section className="reel-block" aria-labelledby="reel-heading">
      <div className="reel-block__frame">
        <Image
          className="reel-block__poster"
          src="/media/drift.webp"
          alt=""
          fill
          sizes="(max-width: 700px) 100vw, 92vw"
          priority={false}
        />
        <div className="reel-block__shade" />
        <div className="reel-block__title-group">
          <h2 id="reel-heading" className="reel-block__title">REEL</h2>
          
        </div>
        <button
          className="reel-block__play"
          type="button"
          aria-label="Play reel"
          onClick={() => setShowVideoNotice(true)}
        >
          Play <span aria-hidden="true">▶</span>
        </button>

        {showVideoNotice && (
          <div className="reel-block__notice" role="status">
            Add the reel video at <code>public/media/reel.mp4</code> to enable playback.
            <button type="button" onClick={() => setShowVideoNotice(false)} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
