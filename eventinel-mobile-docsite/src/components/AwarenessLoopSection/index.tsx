import styles from './styles.module.css';

const awarenessSteps = [
  {
    title: 'Locate what matters nearby',
    copy: 'Eventinel starts with place, not noise. The map creates immediate local relevance.',
  },
  {
    title: 'Prioritize with readable summaries',
    copy: 'The feed turns incoming signals into a scannable sequence instead of an overwhelming stream.',
  },
  {
    title: 'Open detail only when attention is earned',
    copy: 'Users move into a single incident context when they need follow-through, not before.',
  },
];

export default function AwarenessLoopSection() {
  return (
    <section id="awareness-loop" className={styles.section}>
      <div className={styles.workflowGrid}>
        <div className={styles.workflowVisual} aria-hidden="true">
          <div className={styles.workflowRing} />
          <div className={`${styles.workflowNode} ${styles.workflowNodePrimary}`}>Map intake</div>
          <div className={styles.workflowNodeSecondary}>Priority feed</div>
          <div className={styles.workflowNodeTertiary}>Incident detail</div>
          <div className={styles.workflowPathPrimary} />
          <div className={styles.workflowPathSecondary} />
          <div className={styles.workflowLabel}>Signal becomes understanding through place first.</div>
        </div>

        <div className={styles.workflowSteps}>
          <p className={styles.sectionKicker}>Awareness Loop</p>
          <h2>From incoming signal to calmer understanding.</h2>
          <div className={styles.stepStack}>
            {awarenessSteps.map((step, index) => (
              <article className={styles.workflowStep} key={step.title}>
                <span>{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
