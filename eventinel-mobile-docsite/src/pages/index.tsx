import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '../components/HomepageFeatures';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <a
            className="button button--secondary button--lg"
            href="/docs/installation">
            Open Eventinel Docs
          </a>
        </div>
      </div>
    </header>
  );
}

const SiteLayout = Layout as any;

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <SiteLayout
      title={`${siteConfig.title} Docs`}
      description="Official documentation for Eventinel Mobile.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </SiteLayout>
  );
}
