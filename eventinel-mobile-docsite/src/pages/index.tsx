import AwarenessLoopSection from '../components/AwarenessLoopSection';
import LandingVisualPanel from '../components/LandingVisualPanel';
import TimelineVideoCarousel, {
  type TimelineVideoItem,
} from '../components/TimelineVideoCarousel';
import styles from './index.module.css';

const storyCards = [
  {
    label: 'Map',
    title: 'See the area first',
    copy: 'The map gives nearby incident context first, with clustering and location-aware visibility before a user opens one event.',
  },
  {
    label: 'Feed',
    title: 'Scan what changed',
    copy: 'The incident feed keeps type, severity, time, and place together so activity can be read quickly instead of pieced together.',
  },
  {
    label: 'Detail',
    title: 'Stay with one incident',
    copy: 'Incident detail holds the mini-map, metadata, comments, directions, and share actions in one focused view.',
  },
];

const timelineCarouselItems: TimelineVideoItem[] = [
  {
    title: 'Timeline Deck',
    purpose: '9-Month Delivery Roadmap',
    copy: '',
    src: '/media/implementation-timeline-carousel.mp4',
    preload: 'auto',
  },
  {
    title: 'Deliverable D1',
    purpose: 'Data + Ingestion Foundation',
    copy: 'Foundation delivery: data model, ingestion pipeline, and baseline mobile reliability guardrails.',
    src: '/media/implementation-timeline-d1.mp4',
  },
  {
    title: 'Deliverable D2',
    purpose: 'Incident Alert UX Flows',
    copy: 'User-facing alert and incident workflows tuned for clear actionability under time pressure.',
    src: '/media/implementation-timeline-d2.mp4',
  },
  {
    title: 'Deliverable D3',
    purpose: 'Map Context + Media Clarity',
    copy: 'Map and contextual media improvements that increase trust and reduce ambiguous incident signals.',
    src: '/media/implementation-timeline-d3.mp4',
  },
  {
    title: 'Deliverable D4',
    purpose: 'Protocol Reliability + Interop',
    copy: 'Nostr protocol integration milestones for resilient distribution and open ecosystem interoperability.',
    src: '/media/implementation-timeline-d4.mp4',
  },
  {
    title: 'Deliverable D5',
    purpose: 'Personalized Safety Controls',
    copy: 'Personalization and source controls, including safer family-oriented alert configuration paths.',
    src: '/media/implementation-timeline-d5.mp4',
  },
  {
    title: 'Deliverable D6',
    purpose: 'Production Hardening + QA',
    copy: 'Production polish, QA, and release readiness with measurable performance and stability targets.',
    src: '/media/implementation-timeline-d6.mp4',
  },
  {
    title: 'Deliverable D7',
    purpose: 'Reporter Support Payments',
    copy: 'Viewer support for reporters during live incident coverage with hardened payout reliability.',
    src: '/media/implementation-timeline-d7.mp4',
  },
];

function TopBar() {
  return (
    <header className={styles.topBar}>
      <a className={styles.brand} href="/" aria-label="Eventinel home">
        <span className={styles.brandIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img">
            <path d="M12 2 4 5v6c0 5.4 3.4 10.4 8 11 4.6-.6 8-5.6 8-11V5l-8-3Zm0 5.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 12.2c-2.2-.5-4-3.2-4-5.6 0-1 .8-1.8 1.8-1.8h4.4c1 0 1.8.8 1.8 1.8 0 2.4-1.8 5.1-4 5.6Z" />
          </svg>
        </span>
        <span>Eventinel</span>
      </a>

      <nav className={styles.navLinks} aria-label="Primary">
        <a href="#product">Product</a>
        <a href="#how-it-helps">How It Helps</a>
        <a href="#timeline">Roadmap</a>
        <a href="https://github.com/EmmanuelAlmonte/Eventinel">GitHub</a>
      </nav>

      <a
        className={styles.topAction}
        href="mailto:eventsentinel@gmail.com?subject=Eventinel%20Product%20Inquiry">
        Contact
      </a>
    </header>
  );
}

function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <h1 className={styles.heroTitle}>Events detected. Stay protected.</h1>
        <p className={styles.heroSubtitle}>
          Eventinel is a Nostr-native incident awareness app built around a nearby map, a faster
          feed, and one clear incident detail flow when something needs closer attention.
        </p>

        <div className={styles.ctaRow}>
          <a className={styles.primaryAction} href="#product">
            See the Product
          </a>
          <a className={styles.secondaryAction} href="#timeline">
            View Roadmap
          </a>
        </div>

        <div className={styles.heroSignals}>
          <span>Nearby incident map</span>
          <span>Distance-aware feed</span>
          <span>Detail with comments and directions</span>
        </div>
      </div>
    </section>
  );
}

function ProductSection() {
  return (
    <section id="product" className={styles.section}>
      <div className={styles.storyGrid}>
        <div className={styles.storyLead}>
          <p className={styles.sectionKicker}>What Eventinel Is</p>
          <h2>A location-aware incident map, feed, and detail view built to work together.</h2>
          <p>
            The same incident stream powers the map, the feed, and the detail screen, so users can
            move from nearby activity to one incident without losing local context.
          </p>
          <p className={styles.storyLeadNote}>
            The product stays grounded in place first, then makes time, severity, and follow-through
            easier to read.
          </p>
        </div>

        <div className={styles.storyRail}>
          {storyCards.map((card) => (
            <article className={styles.storyCard} key={card.title}>
              <span className={styles.storyCardLabel}>{card.label}</span>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function EvidenceSection() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionKicker}>Product Evidence</p>
        <h2>What the product looks like when nearby activity starts moving.</h2>
        <p>
          The map, feed, and detail view share one flow, so users can move from overview to one
          incident without losing context.
        </p>
      </div>
      <LandingVisualPanel />
    </section>
  );
}

function RoadmapSection() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionKicker}>Roadmap</p>
        <h2>A clear path from core awareness to broader capability.</h2>
        <p className={styles.timelineIntro}>
          The roadmap shows how the product expands from core incident awareness into stronger
          reliability, personalization, and ecosystem support.
        </p>
      </div>
      <TimelineVideoCarousel items={timelineCarouselItems} />
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className={styles.siteFooter}>
      <p>Eventinel is a Nostr-native public safety awareness app for mobile.</p>
      <div className={styles.footerLinks}>
        <a href="https://github.com/EmmanuelAlmonte/Eventinel">Source Code</a>
        <a href="mailto:eventsentinel@gmail.com">eventsentinel@gmail.com</a>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main className={styles.page}>
      <TopBar />
      <Hero />
      <ProductSection />
      <AwarenessLoopSection />
      <EvidenceSection />
      <RoadmapSection />
      <SiteFooter />
    </main>
  );
}
