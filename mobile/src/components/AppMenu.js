import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

const MENU_ITEMS = [
  { key: 'help', label: 'Help for Users', icon: 'help-circle-outline' },
  { key: 'about', label: 'About OKUANI', icon: 'information-circle-outline' },
  { key: 'report', label: 'Report', icon: 'flag-outline' },
];

// A three-bar menu trigger + its dropdown, dropped into whichever
// icon-chip row a screen already has (Header's icon row, FarmerPortalScreen's
// hero icon row, ...) — the trigger reuses that row's existing chip styling
// via `style`/`iconColor` rather than inventing a new look. Closes on
// selecting an item or tapping outside it, same backdrop-press-to-dismiss
// pattern as Select/SearchableSelect.
export default function AppMenu({ onHelp, onAbout, onReportUser, style, iconColor = '#fff', iconSize = 16 }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [open, setOpen] = useState(false);

  const handleSelect = (key) => {
    setOpen(false);
    if (key === 'help') onHelp?.();
    else if (key === 'about') onAbout?.();
    else if (key === 'report') onReportUser?.();
  };

  return (
    <>
      <Pressable style={[styles.trigger, style]} onPress={() => setOpen(true)} hitSlop={6}>
        <Ionicons name="menu" size={iconSize} color={iconColor} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            {MENU_ITEMS.map((item) => (
              <Pressable key={item.key} style={styles.item} onPress={() => handleSelect(item.key)}>
                <Ionicons name={item.icon} size={18} color={colors.refGreen} />
                <Text style={styles.itemText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    trigger: {
      width: 30,
      height: 30,
      borderRadius: RADIUS.pill,
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: RADIUS.xl,
      borderTopRightRadius: RADIUS.xl,
      paddingBottom: SPACING.xl,
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
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    itemText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  });
