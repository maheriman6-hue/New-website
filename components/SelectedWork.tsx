'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type Project = {
  title: string;
  client: string;
  year: string;
  category: string;
  image: string;
  alt: string;
  objectPosition?: string;
};

const projects: Project[] = [
  {
    title: 'Solstice',
    client: 'VOGUE ITALIA',
    year: '2026',
    category: 'FASHION',
    image: '/media/solstice.webp',
    alt: 'Fashion portrait for Solstice',
    objectPosition: 'center 32%',
  },
  {
    title: 'Lane Seven',
    client: 'KORA SWIM',
    year: '2026',
    category: 'SPORT',
    image: '/media/lane-seven.webp',
    alt: 'Swimmer moving through blue water',
    objectPosition: 'center 46%',
  },
  {
    title: 'Terracotta Hour',
    client: 'MAISON ORÉ',
    year: '2026',
    category: 'STILL LIFE',
    image: '/media/terracotta-hour.webp',
    alt: 'Red ceramic vessels arranged in afternoon light',
    objectPosition: 'center 52%',
  },
  {
    title: 'Drift',
    client: 'SHORT FILM',
    year: '2025',
    category: 'FILM',
    image: '/media/drift.webp',
    alt: 'Quiet landscape at the end of the day',
    objectPosition: 'center 56%',
  },
  {
    title: 'Red Study',
    client: 'VOGUE ITALIA',
    year: '2025',
    category: 'BEAUTY',
    image: '/media/solstice.webp',
    alt: 'Close fashion portrait in warm light',
    objectPosition: 'center 68%',
  },
  {
    title: 'Blue Hour',
    client: 'KORA SWIM',
    year: '2024',
    category: 'CAMPAIGN',
    image: '/media/lane-seven.webp',
    alt: 'Blue pool water in late afternoon',
    objectPosition: 'center 72%',
  },
];

const projectColumns = [
  [projects[0], projects[2], projects[4]],
  [projects[1], projects[3], projects[5]],
];

const projectImageStyles = projects.map((project) => ({
  objectPosition: project.objectPosition ?? 'center',
}));

function WorkCard({ project, index }: { project: Project; index: number }) {
  return (
    <article className="work-card">
      <Link
        className="work-card__link"
        href="/work"
        data-cursor-label="View ↗"
        aria-label={`View ${project.title} project`}
      >
        <div className="work-card__reveal">
          <div className="work-card__media">
            <Image
              className="work-card__image"
              src={project.image}
              alt={project.alt}
              fill
              sizes="(max-width: 700px) 100vw, 48vw"
              style={projectImageStyles[index]}
              loading="lazy"
            />
            <span className="work-card__tag">{project.category}</span>
          </div>
        </div>
        <div className="work-card__meta">
          <span className="work-card__title">{project.title}</span>
          <span className="work-card__client">{project.client} — {project.year}</span>
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
          WORK <span>06</span>
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
              const index = projects.indexOf(project);
              return <WorkCard key={project.title} project={project} index={index} />;
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
