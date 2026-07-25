import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

export default function Header({ networkStatus, hasPendingChanges }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>OKUANI</Text>
        <Text style={styles.tagline}>OFFLINE-FIRST</Text>
      </View>
      <View style={styles.icons}>
        <Ionicons
          name={networkStatus === 'online' ? 'wifi' : 'cloud-offline-outline'}
          size={18}
          color={networkStatus === 'online' ? COLORS.success : COLORS.danger}
        />
        <Ionicons
          name={hasPendingChanges ? 'sync-outline' : 'checkmark-done'}
          size={18}
          color={hasPendingChanges ? COLORS.warning : COLORS.success}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.dark,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  brand: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  tagline: {
    color: COLORS.accent,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  icons: {
    flexDirection: 'row',
    gap: 12,
  },
});
