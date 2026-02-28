import TimelineVideoCarousel, {
  type TimelineVideoItem,
} from '../components/TimelineVideoCarousel';
import styles from './index.module.css';

const featureItems = [
  {
    title: 'Live Incident Signals',
    description:
      'Track nearby incidents in real time with relevance tuned to where you are and what matters most to you.',
  },
  {
    title: 'Configurable Alerts',
    description:
      'Set default relevance mode or custom radius, choose incident categories, and build personal alert zones.',
  },
  {
    title: 'Open + Nostr Native',
    description:
      'Built as open-source software with transparent workflows and protocol-native interoperability.',
  },
];

const howItWorks = [
  'Install Eventinel on Android (or request iOS access).',
  'Set your location, categories, and alert preferences.',
  'Receive nearby incident alerts and monitor map/feed views.',
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
    copy: 'User-facing alert and incident workflows, tuned for clear actionability under time pressure.',
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
    purpose: 'Reporter Support Payments (Final)',
    copy: 'Enable direct viewer support for reporters during live incident coverage with hardened payout reliability.',
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
        <a href="#features">Features</a>
        <a href="#timeline">Timeline</a>
        <a href="https://github.com/EmmanuelAlmonte/Eventinel">GitHub</a>
      </nav>

      <a
        className={styles.topAction}
        href="mailto:eventsentinel@gmail.com?subject=Eventinel%20Early%20Access">
        Get Early Access
      </a>
    </header>
  );
}

function Hero() {
  return (
    <section className={styles.hero}>
      <p className={styles.pill}>Now in Development - Coming to Your City</p>
      <h1 className={styles.heroTitle}>Events Detected. Stay Protected.</h1>
      <p className={styles.heroSubtitle}>
        Real-time 911 monitoring and local safety alerts with configurable radius and incident
        preferences.
      </p>

      <div className={styles.ctaRow}>
        <input
          className={styles.emailInput}
          type="email"
          placeholder="Enter your email"
          aria-label="Email for early access"
        />
        <a
          className={styles.ctaButton}
          href="mailto:eventsentinel@gmail.com?subject=Eventinel%20Early%20Access">
          Get Early Access
        </a>
      </div>
      <p className={styles.helperText}>Join the waitlist. No spam, ever.</p>
    </section>
  );
}

function FeatureSection() {
  return (
    <section id="features" className={styles.section}>
      <h2>Core Features</h2>
      <div className={styles.featureGrid}>
        {featureItems.map((item) => (
          <article className={styles.featureCard} key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className={styles.section}>
      <h2>How It Works</h2>
      <div className={styles.stepsGrid}>
        {howItWorks.map((step, index) => (
          <article className={styles.stepCard} key={step}>
            <span>{index + 1}</span>
            <p>{step}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DownloadSection() {
  return (
    <section className={styles.section}>
      <h2>Download + Access</h2>
      <div className={styles.downloadRow}>
        {/* <a href="https://github.com/EmmanuelAlmonte/Eventinel/releases">Android Builds</a> */}
        {/* <a href="mailto:eventsentinel@gmail.com?subject=Eventinel%20iOS%20Access">
          Request iOS Access
        </a> */}
        <a href="https://github.com/EmmanuelAlmonte/Eventinel">Source Code</a>
        <a href="https://github.com/EmmanuelAlmonte/Eventinel#readme">Getting Started</a>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className={styles.siteFooter}>
      <p>
        Eventinel is a Nostr-native public safety app for mobile. Built in public and open-source.
      </p>
      <p>
        Contact: <a href="mailto:eventsentinel@gmail.com">eventsentinel@gmail.com</a>
      </p>
    </footer>
  );
}

export default function Home() {
  return (
    <>
      <main className={styles.page}>
        <TopBar />
        <Hero />
        <FeatureSection />
        <section className={styles.section}>
          <TimelineVideoCarousel items={timelineCarouselItems} />
        </section>
        {/* <HowItWorksSection /> */}
        <DownloadSection />
        <SiteFooter />
      </main>
    </>
  );
}
