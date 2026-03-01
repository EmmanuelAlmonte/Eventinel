import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Eventinel',
  tagline: 'Nostr-native mobile public safety awareness',
  favicon: 'img/favicon.svg',
  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://eventinel.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'EmmanuelAlmonte', // Usually your GitHub org/user name.
  projectName: 'Eventinel', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: false,
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Eventinel',
      logo: {
        alt: 'Eventinel Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          href: 'https://github.com/EmmanuelAlmonte/Eventinel/releases',
          label: 'Download',
          position: 'right',
        },
        {
          href: 'https://github.com/EmmanuelAlmonte/Eventinel',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Download',
          items: [
            {
              label: 'Android Releases',
              href: 'https://github.com/EmmanuelAlmonte/Eventinel/releases',
            },
            {
              label: 'Request iOS Access',
              href: 'mailto:eventsentinel@gmail.com?subject=Eventinel%20iOS%20Access',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/EmmanuelAlmonte/Eventinel',
            },
            {
              label: 'Contact',
              href: 'mailto:eventsentinel@gmail.com',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Eventinel.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
