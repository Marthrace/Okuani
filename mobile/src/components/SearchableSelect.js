import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SHADOW, SPACING } from '../utils/theme';

// Same tap-to-open bottom-sheet pattern as Select, plus a search field
// pinned above the option list so a long, fixed vocabulary (e.g. Ghana's 16
// regions) can be filtered by typing instead of scrolled through by hand.
// Still only ever commits one of the predefined `items` — typing narrows
// the list, it doesn't let the seller submit arbitrary free text.
export default function SearchableSelect({ selectedValue, onValueChange, items, placeholder = 'Search…' }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const normalized = items.map((item) =>
    typeof item === 'string' ? { label: item, value: item } : item
  );
  const selected = normalized.find((i) => i.value === selectedValue);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((i) => i.label.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, items]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={[styles.triggerText, !selected && styles.triggerPlaceholder]} numberOfLines={1}>
          {selected ? selected.label : 'Select…'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={15} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.value)}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.emptyText}>No match for "{query}"</Text>
              }
              renderItem={({ item }) => {
                const active = item.value === selectedValue;
                return (
                  <Pressable
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => {
                      onValueChange(item.value);
                      close();
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
    triggerPlaceholder: { color: colors.textMuted },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: RADIUS.xl,
      borderTopRightRadius: RADIUS.xl,
      maxHeight: '70%',
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
    searchWrap: {
      position: 'relative',
      justifyContent: 'center',
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.sm,
    },
    searchIcon: { position: 'absolute', left: SPACING.md - 2, zIndex: 1 },
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.pill,
      paddingVertical: SPACING.sm,
      paddingLeft: 34,
      paddingRight: SPACING.md,
      fontSize: 13,
      color: colors.text,
      backgroundColor: colors.bg,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: 12,
      paddingVertical: SPACING.lg,
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
