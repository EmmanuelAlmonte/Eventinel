import styles from './styles.module.css';

const signalCards = [
  {
    title: 'Map-led awareness',
    copy: 'Local activity is grouped spatially first, so users understand where attention is needed.',
  },
  {
    title: 'Priority-aware feed',
    copy: 'Updates stay scannable with severity cues, categories, and distance context.',
  },
  {
    title: 'Detail when it matters',
    copy: 'One tap opens incident context, follow-through, and user-facing understanding.',
  },
];

const mapMarkers = [
  {label: 'Fire', top: '22%', left: '63%', tone: 'danger'},
  {label: 'Medical', top: '42%', left: '35%', tone: 'info'},
  {label: 'Traffic', top: '64%', left: '58%', tone: 'warning'},
  {label: 'Suspicious', top: '56%', left: '75%', tone: 'neutral'},
];

const markerToneClass = {
  danger: styles.markerDanger,
  info: styles.markerInfo,
  warning: styles.markerWarning,
  neutral: styles.markerNeutral,
};

export default function LandingVisualPanel() {
  return (
    <section className={styles.shell} aria-label="Eventinel product overview">
      <div className={styles.mapPanel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>Product Snapshot</p>
            <h3 className={styles.title}>A live operating picture built around local context</h3>
          </div>
          <span className={styles.modePill}>Map + Feed + Detail</span>
        </div>

        <div className={styles.mapCanvas}>
          <div className={styles.crosshair} aria-hidden="true" />
          <div className={styles.focusRing} aria-hidden="true" />
          <div className={styles.focusPulse} aria-hidden="true" />
          <span className={styles.zoneLabel}>Active watch radius</span>

          {mapMarkers.map((marker) => (
            <span
              key={marker.label}
              className={`${styles.marker} ${markerToneClass[marker.tone as keyof typeof markerToneClass]}`}
              style={{top: marker.top, left: marker.left}}>
              {marker.label}
            </span>
          ))}

          <div className={styles.routeCard}>
            <span className={styles.routeLabel}>Nearby activity</span>
            <strong>Context arrives spatially, not just chronologically.</strong>
          </div>
        </div>

        <div className={styles.surfaceStrip}>
          <article className={styles.surfaceCard}>
            <span className={styles.surfaceLabel}>Radius</span>
            <strong>User-controlled relevance zones</strong>
          </article>
          <article className={styles.surfaceCard}>
            <span className={styles.surfaceLabel}>Categories</span>
            <strong>Traffic, medical, fire, suspicious activity</strong>
          </article>
          <article className={styles.surfaceCard}>
            <span className={styles.surfaceLabel}>Detail</span>
            <strong>Structured follow-through when a signal needs attention</strong>
          </article>
        </div>
      </div>

      <div className={styles.sideColumn}>
        <div className={styles.phoneFrame}>
          <div className={styles.phoneTopBar}>
            <span className={styles.phoneStatus}>Live preview</span>
          </div>
          <video
            className={styles.phoneVideo}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata">
            <source src="/media/appstore-preview.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className={styles.phoneOverlay}>
            <span className={styles.overlayLabel}>Incident detail</span>
            <strong>Clear context without leaving the main experience.</strong>
          </div>
        </div>

        <div className={styles.signalRail}>
          {signalCards.map((card) => (
            <article className={styles.signalCard} key={card.title}>
              <h4>{card.title}</h4>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
