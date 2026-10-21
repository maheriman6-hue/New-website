'use client';

import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { AppShell } from '@/components/AppShell';
import { Cursor } from '@/components/Cursor';

const projects = [
  { title: 'Solstice', client: 'Vogue Italia', year: '2026', category: 'Fashion', image: '/media/solstice.webp', alt: 'Fashion portrait in dramatic red and blue light', position: 'center 32%' },
  { title: 'Blue Current', client: 'Kōra Swim', year: '2026', category: 'Sport', image: '/media/lane-seven.webp', alt: 'Swimmer moving through blue water', position: 'center 46%' },
  { title: 'Terracotta Hour', client: 'Maison Oré', year: '2025', category: 'Still life', image: '/media/terracotta-hour.webp', alt: 'Sculptural terracotta vessels in warm afternoon light', position: 'center 52%' },
  { title: 'Drift', client: 'Independent', year: '2025', category: 'Film', image: '/media/drift.webp', alt: 'A figure crossing a quiet landscape at dusk', position: 'center 56%' },
  { title: 'Red Study', client: 'Vogue Italia', year: '2025', category: 'Beauty', image: '/media/solstice.webp', alt: 'Close fashion portrait with a warm red color palette', position: 'center 68%' },
  { title: 'Clay Court', client: 'Autodrome', year: '2024', category: 'Sport', image: '/media/lane-seven.webp', alt: 'Athlete in motion in a sunlit campaign', position: 'center 72%' },
  { title: 'After Hours', client: 'Hale & Co', year: '2024', category: 'Fashion', image: '/media/solstice.webp', alt: 'Editorial fashion portrait from the After Hours campaign', position: 'center 44%' },
  { title: 'Quiet Objects', client: 'Maison Oré', year: '2024', category: 'Still life', image: '/media/terracotta-hour.webp', alt: 'Quiet arrangement of sculptural objects', position: 'center 38%' },
  { title: 'Open Road', client: 'Ostra', year: '2023', category: 'Automotive', image: '/media/drift.webp', alt: 'Wide cinematic landscape for an automotive campaign', position: 'center 62%' },
  { title: 'Soft Geometry', client: 'Nuit', year: '2023', category: 'Architecture', image: '/media/terracotta-hour.webp', alt: 'Geometric forms and soft shadows', position: 'center 60%' },
  { title: 'Sillage', client: 'Maison Oré', year: '2022', category: 'Fragrance', image: '/media/terracotta-hour.webp', alt: 'Warm-toned fragrance still life', position: 'center 48%' },
  { title: 'Waterline', client: 'Kōra Swim', year: '2021', category: 'Performance', image: '/media/lane-seven.webp', alt: 'Water and movement in a swim campaign', position: 'center 38%' },
];

const categories = ['All', 'Fashion', 'Sport', 'Still life', 'Film', 'Beauty', 'Automotive', 'Architecture', 'Fragrance', 'Performance'];

export function WorkIndex() {
  const [activeCategory, setActiveCategory] = useState('All');
  const reduceMotion = useReducedMotion();
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const visibleProjects = useMemo(
    () => activeCategory === 'All'
      ? projects
      : projects.filter((project) => project.category === activeCategory),
    [activeCategory],
  );

  return (
    <AppShell heroTone="dark">
      <div className="work-index">
        <header className="work-index__intro">
          <p className="work-index__eyebrow">(WORK) — 2023–26</p>
          <h1 className="work-index__title">
            WORK
          </h1>
          <LayoutGroup id="work-categories">
            <div className="work-index__filters" role="group" aria-label="Filter projects by category">
              {categories.map((category) => {
                const count = category === 'All'
                  ? projects.length
                  : projects.filter((project) => project.category === category).length;
                const isActive = category === activeCategory;

                return (
                  <button
                    type="button"
                    className={`work-index__filter${isActive ? ' is-active' : ''}`}
                    aria-pressed={isActive}
                    key={category}
                    onClick={() => setActiveCategory(category)}
                  >
                    {isActive && (
                      <motion.span
                        className="work-index__filter-indicator"
                        layoutId="active-work-filter"
                        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="work-index__filter-name">{category}</span>
                    <span className="work-index__filter-count">{String(count).padStart(2, '0')}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </header>

        <motion.div className="work-index__grid" layout>
          <AnimatePresence mode="popLayout" initial={false}>
            {visibleProjects.map((project, index) => (
              <motion.article
                className={`work-index__card${index % 4 === 1 || index % 4 === 2 ? ' is-offset' : ''}`}
                key={project.title}
                ref={(node) => {
                  if (node) cardRefs.current.set(project.title, node);
                  else cardRefs.current.delete(project.title);
                }}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.985 }}
                transition={reduceMotion ? { duration: 0 } : {
                  layout: { type: 'spring', stiffness: 330, damping: 34 },
                  opacity: { duration: 0.22 },
                  y: { duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: Math.min(index * 0.025, 0.2) },
                }}
                onAnimationStart={() => cardRefs.current.get(project.title)?.style.setProperty('will-change', 'transform, opacity')}
                onAnimationComplete={() => cardRefs.current.get(project.title)?.style.removeProperty('will-change')}
                onLayoutAnimationStart={() => cardRefs.current.get(project.title)?.style.setProperty('will-change', 'transform, opacity')}
                onLayoutAnimationComplete={() => cardRefs.current.get(project.title)?.style.removeProperty('will-change')}
                data-cursor-label="View ↗"
                aria-label={`${project.title}, ${project.category} project`}
              >
                <div className="work-index__media">
                  <Image
                    className="work-index__image"
                    src={project.image}
                    alt={project.alt}
                    fill
                    sizes="(max-width: 700px) 100vw, 48vw"
                    style={{ objectPosition: project.position }}
                    loading={index < 2 ? 'eager' : 'lazy'}
                  />
                  <span className="work-index__tag">{project.category}</span>
                  <span className="work-index__year">{project.year}</span>
                </div>
                <div className="work-index__meta">
                  <h2 className="work-index__project-title">{project.title}</h2>
                  <p className="work-index__client">{project.client}</p>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
      <Cursor />
    </AppShell>
  );
}
