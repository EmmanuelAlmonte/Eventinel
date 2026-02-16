import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'installation',
    'quickstart',
    'stability-scope',
    {
      type: 'category',
      label: 'Feature Guides',
      items: [
        'features/profile-settings',
        'features/relay-management',
        'features/login-authentication',
        'features/incident-detail',
        'features/incident-feed',
        'features/map-screen',
      ],
    },
    {
      type: 'category',
      label: 'Commands',
      link: {
        type: 'doc',
        id: 'commands/index',
      },
      items: [
        'commands/init',
        'commands/run',
        'commands/deploy',
        'commands/config',
      ],
    },
    'config',
    'examples',
    'troubleshooting',
    'faq',
    'changelog',
  ],
};

export default sidebars;
