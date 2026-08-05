import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

// A compact, tap-to-open dropdown styled to match the app's text inputs.
// Replaces @react-native-picker/picker, which rendered as a full native
// spinning wheel on iOS — visually inconsistent with every other input in
// the app (different chrome, font, and a much taller footprint).
export default function Select({ selectedValue, onValueChange, items }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [open, setOpen] = useState(false);

  const normalized = items.map((item) =>
    typeof item === 'string' ? { label: item, value: item } : item
  );
  const selected = normalized.find((i) => i.value === selectedValue);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText} numberOfLines={1}>
          {selected ? selected.label : 'Select…'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <FlatList
              data={normalized}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => {
                const active = item.value === selectedValue;
                return (
                  <Pressable
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => {
                      onValueChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{item.label}</Text>
                    {active && <Ionicons name="checkmark" size={18} color={colors.refGreen} />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm + 1,
      backgroundColor: colors.card,
    },
    triggerText: { fontSize: 13, color: colors.text, flex: 1 },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: RADIUS.xl,
      borderTopRightRadius: RADIUS.xl,
      maxHeight: '60%',
      paddingBottom: SPACING.lg,
      ...SHADOW.raised,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginVertical: SPACING.sm + 2,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    optionActive: { backgroundColor: colors.primarySoft },
    optionText: { fontSize: 14, color: colors.text },
    optionTextActive: { fontWeight: '700', color: colors.refGreen },
  });
