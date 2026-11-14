'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { workItems, type WorkItem } from '@/data/work';

const projectColumns = [
  workItems.filter((_, index) => index % 2 === 0),
  workItems.filter((_, index) => index % 2 === 1),
];

function WorkCard({ project }: { project: WorkItem }) {
  return (
    <article className="work-card">
      <Link
        className="work-card__link"
        href="/work"
        data-cursor-label="View ↗"
        aria-label={`View ${project.title}, ${project.category} project`}
      >
        <div className="work-card__reveal">
          <div className="work-card__media">
            <Image
              className="work-card__image"
              src={project.image}
              alt={project.alt}
              fill
              sizes="(max-width: 700px) 100vw, 48vw"
              style={{ objectPosition: project.imagePosition ?? 'center' }}
              loading="lazy"
            />
            <span className="work-card__tag">{project.category}</span>
          </div>
        </div>
        <div className="work-card__meta">
          <span className="work-card__title">{project.title}</span>
          <span className="work-card__client">{project.meta}</span>
        </div>
      </Link>
    </article>
  );
}

export function SelectedWork() {
  const sectionRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    if (!section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const context = gsap.context(() => {
      section.querySelectorAll<HTMLElement>('.work-card__reveal').forEach((reveal) => {
        gsap.fromTo(
          reveal,
          { clipPath: 'inset(12% 0 0 round 12px)', y: 28 },
          {
            clipPath: 'inset(0% 0 0 round 12px)',
            y: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: reveal,
              start: 'top 88%',
              end: 'top 55%',
              scrub: 0.45,
            },
          },
        );
      });
    }, section);

    return () => context.revert();
  }, []);

  return (
    <section ref={sectionRef} className="selected-work" aria-labelledby="selected-work-heading">
      <div className="selected-work__eyebrow">(02) — SELECTED WORK</div>
      <div className="selected-work__heading-row">
        <h2 id="selected-work-heading" className="selected-work__heading">
          WORK 
        </h2>
        <Link className="selected-work__all-link" href="/work">
          View all work <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <div className="selected-work__grid">
        {projectColumns.map((column, columnIndex) => (
          <div
            className={['selected-work__column', columnIndex === 1 ? 'is-offset' : ''].join(' ')}
            key={`column-${columnIndex}`}
          >
            {column.map((project) => {
              return <WorkCard key={project.slug} project={project} />;
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
