import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Two modes: read-only display of an (optionally fractional) average rating,
// or an interactive 1-5 picker used by the "leave a review" form.
export default function RatingStars({ rating = 0, size = 14, interactive = false, value = 0, onChange }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  if (interactive) {
    return (
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => onChange?.(n)} hitSlop={4}>
            <Ionicons
              name={n <= value ? 'star' : 'star-outline'}
              size={size}
              color={colors.accent}
            />
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const name = rating >= n ? 'star' : rating >= n - 0.5 ? 'star-half' : 'star-outline';
        return <Ionicons key={n} name={name} size={size} color={colors.accent} />;
      })}
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
});
