import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

type MenuItem = {
  title: string;
  description: string;
  icon: string;
  screen: string;
  color: string;
};

const menuItems: MenuItem[] = [
  {
    title: 'Relays',
    description: 'Connect to Nostr relays and send notes',
    icon: '🌐',
    screen: 'Relays',
    color: '#3b82f6',
  },
  {
    title: 'Private Key',
    description: 'Set your Nostr identity',
    icon: '🔑',
    screen: 'Key',
    color: '#8b5cf6',
  },
  {
    title: 'Map',
    description: 'View incidents on map',
    icon: '🗺️',
    screen: 'Map',
    color: '#10b981',
  },
  {
    title: 'Profile',
    description: 'Your profile and settings',
    icon: '👤',
    screen: 'Profile',
    color: '#f59e0b',
  },
];

export default function MenuScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Eventinel</Text>
        <Text style={styles.subtitle}>Nostr-native public safety monitoring</Text>
      </View>

      <View style={styles.grid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.card, { borderLeftColor: item.color }]}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Tap any card to get started</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  grid: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 40,
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  arrow: {
    fontSize: 32,
    color: '#d1d5db',
    fontWeight: '300',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});
