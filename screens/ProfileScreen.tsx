import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNDKSessionLogout, useNDKCurrentPubkey, useNDKCurrentUser } from '@nostr-dev-kit/mobile';

export default function ProfileScreen() {
  const logout = useNDKSessionLogout();
  const currentPubkey = useNDKCurrentPubkey();
  const currentUser = useNDKCurrentUser();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            if (currentPubkey) {
              logout(currentPubkey);
            }
          },
        },
      ]
    );
  };

  // Get display name from profile if available
  const displayName = currentUser?.profile?.displayName || currentUser?.profile?.name || 'Anonymous';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.description}>Your Nostr identity</Text>

      {/* User Info Card */}
      <View style={styles.card}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.displayName}>{displayName}</Text>

        {currentUser?.profile?.about && (
          <Text style={styles.about} numberOfLines={3}>
            {currentUser.profile.about}
          </Text>
        )}
      </View>

      {/* Public Key Display */}
      {currentPubkey && (
        <View style={styles.pubkeyContainer}>
          <Text style={styles.pubkeyLabel}>Your Public Key:</Text>
          <Text style={styles.pubkeyText} selectable numberOfLines={2}>
            {currentPubkey}
          </Text>
        </View>
      )}

      {/* Logout Button */}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Info Note */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Your session is securely stored on this device. Logging out will clear your local session.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  about: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  pubkeyContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pubkeyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pubkeyText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#6b7280',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  infoText: {
    fontSize: 13,
    color: '#0369a1',
    textAlign: 'center',
  },
});
