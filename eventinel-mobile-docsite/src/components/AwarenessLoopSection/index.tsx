import styles from './styles.module.css';

const proofCards = [
  {
    title: 'See incidents near you.',
    copy: 'The map starts with local context, using clustering and nearby coverage so the user sees what matters in the area first.',
    proofs: ['Nearby map context', 'Clustering', 'Viewport-aware activity'],
  },
  {
    title: 'Understand them faster.',
    copy: 'The feed keeps severity, time, and location together, with distance-first ordering that reduces scanning time.',
    proofs: ['Distance first', 'Severity at a glance', 'Relative time + place'],
  },
  {
    title: 'Follow one incident clearly.',
    copy: 'Incident detail opens one event with its mini-map, metadata, comments, directions, and share actions in one flow.',
    proofs: ['Mini-map', 'Comments', 'Directions + share'],
  },
];

export default function AwarenessLoopSection() {
  return (
    <section id="how-it-helps" className={styles.section}>
      <div className={styles.header}>
        <p className={styles.sectionKicker}>How It Helps</p>
        <h2>See incidents near you. Understand them faster. Follow one incident clearly.</h2>
        <p className={styles.sectionCopy}>
          These are the product outcomes the interface is trying to deliver, grounded in the actual
          map, feed, and detail behaviors documented across the app.
        </p>
      </div>

      <div className={styles.proofGrid}>
        {proofCards.map((card, index) => (
          <article className={styles.proofCard} key={card.title}>
            <span className={styles.cardNumber}>{`0${index + 1}`}</span>
            <h3>{card.title}</h3>
            <p>{card.copy}</p>
            <div className={styles.proofTags}>
              {card.proofs.map((proof) => (
                <span className={styles.proofTag} key={proof}>
                  {proof}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className={styles.proofNote}>
        <div className={styles.proofNoteLine} aria-hidden="true" />
        <p>
          Map and feed are backed by the same incident stream, while incident detail stays focused on
          one event with comments and native actions when a user needs follow-through.
        </p>
      </div>
    </section>
  );
}
