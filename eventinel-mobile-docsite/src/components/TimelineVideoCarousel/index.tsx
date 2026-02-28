import { useCallback, useMemo, useState } from 'react';
import styles from './styles.module.css';

export type TimelineVideoItem = {
  title: string;
  purpose?: string;
  copy: string;
  src: string;
  preload?: 'none' | 'metadata' | 'auto';
};

type TimelineVideoCarouselProps = {
  items: TimelineVideoItem[];
};

function getStepLabel(title: string) {
  if (/timeline/i.test(title)) return 'Deck';
  const match = title.match(/d(\d+)/i);
  if (match) return `D${match[1]}`;
  return title;
}

export default function TimelineVideoCarousel({ items }: TimelineVideoCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoAdvancePaused, setIsAutoAdvancePaused] = useState(false);

  const safeItems = useMemo(() => items.filter((item) => Boolean(item.src)), [items]);
  const activeItem = safeItems[activeIndex] ?? safeItems[0];

  const goToIndex = useCallback(
    (nextIndex: number) => {
      if (safeItems.length === 0) return;
      const bounded = (nextIndex + safeItems.length) % safeItems.length;
      setActiveIndex(bounded);
    },
    [safeItems.length],
  );

  const goToIndexFromUserInteraction = useCallback(
    (nextIndex: number) => {
      setIsAutoAdvancePaused(true);
      goToIndex(nextIndex);
    },
    [goToIndex],
  );

  const toggleAutoAdvance = useCallback(() => {
    setIsAutoAdvancePaused((current) => !current);
  }, []);

  const onVideoEnd = useCallback(() => {
    if (isAutoAdvancePaused) return;
    goToIndex(activeIndex + 1);
  }, [activeIndex, goToIndex, isAutoAdvancePaused]);

  if (safeItems.length === 0 || !activeItem) {
    return null;
  }

  const activeHeading = activeItem.purpose ?? activeItem.title;
  const progressPercent = ((activeIndex + 1) / safeItems.length) * 100;

  return (
    <section
      id="timeline"
      className={styles.carouselSection}
      aria-label="Implementation timeline carousel">
      <div className={styles.carouselTopRow}>
        <div className={styles.carouselTitleBlock}>
          <p className={styles.carouselTitle}>Implementation Timeline</p>
        </div>
        <div className={styles.carouselControls}>
          <span
            className={`${styles.statusPill} ${
              isAutoAdvancePaused ? styles.statusPaused : styles.statusAuto
            }`}
            aria-live="polite">
            {isAutoAdvancePaused ? 'Paused' : 'Auto'}
          </span>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => goToIndexFromUserInteraction(activeIndex - 1)}
            aria-label="Previous timeline video">
            Prev
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => goToIndexFromUserInteraction(activeIndex + 1)}
            aria-label="Next timeline video">
            Next
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={toggleAutoAdvance}
            aria-label={isAutoAdvancePaused ? 'Resume auto switching' : 'Pause auto switching'}>
            {isAutoAdvancePaused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      <div className={styles.activeMeta}>
        <p className={styles.activeLabel}>{activeHeading}</p>
        {activeItem.copy ? <p className={styles.activeCopy}>{activeItem.copy}</p> : null}
      </div>
      <div className={styles.videoViewport}>
        <video
          key={activeItem.src}
          className={styles.video}
          autoPlay
          muted
          playsInline
          onEnded={onVideoEnd}
          preload={activeItem.preload ?? 'metadata'}>
          <source src={activeItem.src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      <div className={styles.progressTrack} aria-hidden="true">
        <span className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
      </div>

      <div className={styles.stepRail} role="tablist" aria-label="Timeline videos">
        {safeItems.map((item, index) => (
          <button
            type="button"
            key={item.src}
            role="tab"
            aria-selected={activeIndex === index}
            className={`${styles.stepButton} ${activeIndex === index ? styles.stepButtonActive : ''}`}
            onClick={() => goToIndexFromUserInteraction(index)}
            title={item.title}>
            {getStepLabel(item.title)}
          </button>
        ))}
      </div>
    </section>
  );
}
