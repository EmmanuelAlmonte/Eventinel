import styles from './styles.module.css';

const feedRows = [
  {
    title: 'Traffic collision',
    meta: '0.8 mi away • 2 min ago',
    tone: 'warning',
  },
  {
    title: 'Medical response',
    meta: '1.1 mi away • 5 min ago',
    tone: 'info',
  },
  {
    title: 'Suspicious activity',
    meta: 'Clinton Hill • 8 min ago',
    tone: 'neutral',
  },
];

const mapMarkers = [
  {top: '22%', left: '63%', tone: 'danger'},
  {top: '42%', left: '35%', tone: 'info'},
  {top: '64%', left: '58%', tone: 'warning'},
  {top: '56%', left: '75%', tone: 'neutral'},
];

const markerToneClass = {
  danger: styles.markerDanger,
  info: styles.markerInfo,
  warning: styles.markerWarning,
  neutral: styles.markerNeutral,
};

const rowToneClass = {
  info: styles.feedDotInfo,
  warning: styles.feedDotWarning,
  neutral: styles.feedDotNeutral,
};

export default function LandingVisualPanel() {
  return (
    <section className={styles.shell} aria-label="Eventinel product evidence">
      <div className={styles.mapPanel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>In Use</p>
            <h3 className={styles.title}>Nearby activity stays readable across map, feed, and detail.</h3>
          </div>
          <span className={styles.modePill}>Live incident flow</span>
        </div>

        <div className={styles.mapCanvas}>
          <div className={styles.crosshair} aria-hidden="true" />
          <div className={styles.focusRing} aria-hidden="true" />
          <div className={styles.focusPulse} aria-hidden="true" />

          {mapMarkers.map((marker) => (
            <span
              key={`${marker.top}-${marker.left}`}
              className={`${styles.marker} ${markerToneClass[marker.tone as keyof typeof markerToneClass]}`}
              style={{top: marker.top, left: marker.left}}
            />
          ))}

          <div className={styles.selectedIncident}>
            <span className={styles.selectedType}>Traffic collision</span>
            <strong>0.8 mi away</strong>
            <p>Updated 2 min ago and ready to open from the map or the feed.</p>
          </div>
        </div>

        <div className={styles.evidenceRail}>
          <article className={styles.evidenceCard}>
            <strong>Clusters keep dense blocks readable.</strong>
          </article>
          <article className={styles.evidenceCard}>
            <strong>Feed rows keep time, place, and severity together.</strong>
          </article>
          <article className={styles.evidenceCard}>
            <strong>Detail adds comments, directions, and share.</strong>
          </article>
        </div>
      </div>

      <div className={styles.sideColumn}>
        <div className={styles.phoneFrame}>
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
            <strong>Mini-map, metadata, comments, and actions stay in one flow.</strong>
          </div>
        </div>

        <div className={styles.feedStack}>
          {feedRows.map((row) => (
            <article className={styles.feedRow} key={row.title}>
              <span
                className={`${styles.feedDot} ${rowToneClass[row.tone as keyof typeof rowToneClass]}`}
                aria-hidden="true"
              />
              <div>
                <h4>{row.title}</h4>
                <p>{row.meta}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
