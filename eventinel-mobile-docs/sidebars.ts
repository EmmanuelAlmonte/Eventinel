import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'installation',
    'quickstart',
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
