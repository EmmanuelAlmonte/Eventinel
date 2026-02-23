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

const incidentRows = [
  {
    title: 'Structure Fire',
    location: '1200 Market St',
    eta: '0.3 mi',
    time: '2 min ago',
    tone: 'danger',
  },
  {
    title: 'Vehicle Accident',
    location: 'Broad & Walnut',
    eta: '0.7 mi',
    time: '8 min ago',
    tone: 'warning',
  },
  {
    title: 'Medical Response',
    location: '2000 Chestnut St',
    eta: '1.2 mi',
    time: '15 min ago',
    tone: 'success',
  },
];

type Tone = 'danger' | 'warning' | 'success';

function toneClass(tone: Tone) {
  if (tone === 'danger') return styles.toneDanger;
  if (tone === 'warning') return styles.toneWarning;
  return styles.toneSuccess;
}

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
        <a href="#how-it-works">How It Works</a>
        <a href="https://github.com/EmmanuelAlmonte/Eventinel-mobile">GitHub</a>
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

      <div className={styles.mockFrame}>
        <div className={styles.windowDots} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className={styles.mockBody}>
          <div className={styles.incidentList}>
            {incidentRows.map((row) => (
              <article className={styles.incidentCard} key={row.title}>
                <div className={styles.incidentTop}>
                  <div className={styles.incidentName}>
                    <span className={`${styles.toneDot} ${toneClass(row.tone as Tone)}`} />
                    {row.title}
                  </div>
                  <span className={styles.time}>{row.time}</span>
                </div>
                <p className={styles.incidentMeta}>
                  {row.location} - {row.eta}
                </p>
              </article>
            ))}
          </div>
          <div className={styles.mapPanel}>Interactive Map View</div>
        </div>
      </div>
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
        <a href="https://github.com/EmmanuelAlmonte/Eventinel-mobile/releases">Android Builds</a>
        <a href="mailto:eventsentinel@gmail.com?subject=Eventinel%20iOS%20Access">
          Request iOS Access
        </a>
        <a href="https://github.com/EmmanuelAlmonte/Eventinel-mobile">Source Code</a>
        <a href="https://github.com/EmmanuelAlmonte/Eventinel-mobile#readme">Getting Started</a>
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
        <HowItWorksSection />
        <DownloadSection />
        <SiteFooter />
      </main>
    </>
  );
}
