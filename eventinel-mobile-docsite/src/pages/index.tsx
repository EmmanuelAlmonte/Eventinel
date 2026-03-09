import AwarenessLoopSection from '../components/AwarenessLoopSection';
import LandingVisualPanel from '../components/LandingVisualPanel';
import TimelineVideoCarousel, {
  type TimelineVideoItem,
} from '../components/TimelineVideoCarousel';
import styles from './index.module.css';

const productCards = [
  {
    title: 'Map Surface',
    tag: 'Spatial understanding',
    copy: 'The first screen explains where nearby activity is happening and what deserves attention.',
    bullets: ['Watch radius', 'Category markers', 'Hotspot awareness'],
  },
  {
    title: 'Incident Feed',
    tag: 'Fast scanning',
    copy: 'A structured feed gives chronological movement without losing location, category, or severity.',
    bullets: ['Recent changes', 'Readable summaries', 'Priority cues'],
  },
  {
    title: 'Incident Detail',
    tag: 'Follow-through context',
    copy: 'When something matters, the detail surface gives the user a deeper, calmer understanding.',
    bullets: ['Contextual drill-down', 'Status follow-up', 'Single-incident focus'],
  },
  {
    title: 'User Controls',
    tag: 'Relevance tuning',
    copy: 'The experience stays useful because users can shape radius, categories, and source behavior.',
    bullets: ['Personal radius', 'Category filters', 'Relay-aware setup'],
  },
];

const platformPillars = [
  {
    title: 'Location comes first',
    copy: 'Nearby incidents are easier to understand when place, distance, and watch radius lead the experience.',
  },
  {
    title: 'Open protocol foundation',
    copy: 'Eventinel is built as an open-source, Nostr-native system with transparent infrastructure and distribution.',
  },
  {
    title: 'Focused mobile workflow',
    copy: 'Map, feed, and incident detail work together as one flow for fast understanding on mobile.',
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
        <a href="#awareness-loop">Awareness Loop</a>
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
        <h1 className={styles.heroTitle}>Understand what is happening nearby.</h1>
        <p className={styles.heroSubtitle}>
          Eventinel is a Nostr-native mobile product that brings map context, incident summaries,
          and follow-through detail into one clearer experience for understanding what is happening
          nearby.
        </p>

        <div className={styles.ctaRow}>
          <a className={styles.primaryAction} href="#product">
            Explore Product Story
          </a>
          <a className={styles.secondaryAction} href="#timeline">
            View Roadmap
          </a>
        </div>

        <div className={styles.heroSignals}>
          <span>Map-first interface</span>
          <span>Configurable local relevance</span>
          <span>Open-source + Nostr-native</span>
        </div>
      </div>

      <LandingVisualPanel />
    </section>
  );
}

function ProductSection() {
  return (
    <section id="product" className={styles.section}>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionKicker}>How It Works</p>
        <h2>See the core product in one view.</h2>
        <p>
          Eventinel brings nearby incident activity into a map-led mobile experience with a feed for
          scanning, detail for context, and controls for relevance.
        </p>
      </div>

      <div className={styles.productGrid}>
        {productCards.map((card) => (
          <article className={styles.productCard} key={card.title}>
            <span className={styles.productTag}>{card.tag}</span>
            <h3>{card.title}</h3>
            <p>{card.copy}</p>
            <ul className={styles.productList}>
              {card.bullets.map((bullet) => (
                <li className={styles.productListItem} key={bullet}>
                  {bullet}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function PlatformSection() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionKicker}>Why Eventinel</p>
        <h2>Built for local awareness, not generic alert noise.</h2>
      </div>

      <div className={styles.pillarGrid}>
        {platformPillars.map((pillar) => (
          <article className={styles.pillarCard} key={pillar.title}>
            <h3>{pillar.title}</h3>
            <p>{pillar.copy}</p>
          </article>
        ))}
      </div>
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
      <PlatformSection />
      <RoadmapSection />
      <SiteFooter />
    </main>
  );
}
