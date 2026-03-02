import clsx from 'clsx';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Fast Local Setup',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description:
      'Bootstrap the Eventinel workspace with npm, configure environment values, and run Expo in minutes.',
  },
  {
    title: 'Operator-Focused Workflows',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description:
      'Find practical guidance for app startup, relay connectivity, incident feeds, map behavior, and auth-related testing.',
  },
  {
    title: 'Release Ready',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description:
      'Follow documented runbooks for validation, build steps, and deployment handoff for Android and iOS targets.',
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
