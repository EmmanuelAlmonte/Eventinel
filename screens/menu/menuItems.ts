export type MenuItem = {
  title: string;
  description: string;
  icon: string;
  iconType: string;
  screen: string;
  color: string;
};

export const menuItems: MenuItem[] = [
  {
    title: 'Relays',
    description: 'Manage Nostr relay connections',
    icon: 'public',
    iconType: 'material',
    screen: 'Relays',
    color: '#3B82F6',
  },
  {
    title: 'Map',
    description: 'View incidents on map',
    icon: 'map',
    iconType: 'material',
    screen: 'Map',
    color: '#22C55E',
  },
  {
    title: 'Profile',
    description: 'Your profile and settings',
    icon: 'person',
    iconType: 'material',
    screen: 'Profile',
    color: '#F59E0B',
  },
];
