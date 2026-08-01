import { Platform, StyleSheet, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../context/ThemeContext';
import { RADIUS } from '../utils/theme';

// @react-native-picker/picker renders very differently per platform: a compact
// dropdown button on Android vs. a full spinning wheel on iOS. Fixing the
// height keeps the wheel from ballooning the form's layout on iOS.
export default function Select({ selectedValue, onValueChange, items }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.wrap}>
      <Picker selectedValue={selectedValue} onValueChange={onValueChange} style={styles.picker} itemStyle={styles.item}>
        {items.map((item) => {
          const { label, value } = typeof item === 'string' ? { label: item, value: item } : item;
          return <Picker.Item key={value} label={label} value={value} />;
        })}
      </Picker>
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    justifyContent: 'center',
    height: Platform.OS === 'ios' ? 120 : 48,
  },
  picker: {
    ...Platform.select({
      android: { color: colors.text },
    }),
  },
  item: {
    fontSize: 15,
    height: 120,
  },
});
