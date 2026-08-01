import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../utils/theme';

// Reusable password field: masked by default, with a trailing eye/eye-off
// toggle that only affects local visibility state — the value itself is
// controlled by the parent and is never touched by toggling.
export default function PasswordInput({ value, onChangeText, placeholder, style, ...rest }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.wrap, style]}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        secureTextEntry={!visible}
        value={value}
        onChangeText={onChangeText}
        {...rest}
      />
      <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8} style={styles.iconBtn}>
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    paddingRight: SPACING.sm + 2,
  },
  input: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 13,
    color: colors.text,
  },
  iconBtn: { padding: 4 },
});
