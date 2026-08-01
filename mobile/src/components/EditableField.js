import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Select from './Select';
import { useTheme } from '../context/ThemeContext';
import { RADIUS, SPACING } from '../utils/theme';

export default function EditableField({
  label,
  value,
  placeholder,
  editable,
  multiline,
  emptyText = 'Not set yet',
  onSave,
  textStyle,
  options,
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || (options ? options[0]?.value : ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const displayValue = options ? options.find((o) => o.value === value)?.label : value;

  const startEdit = () => {
    setDraft(value || (options ? options[0]?.value : ''));
    setError('');
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(options ? draft : draft.trim());
      setEditing(false);
    } catch (e) {
      setError(e.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <View style={styles.wrap}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {options ? (
          <Select selectedValue={draft} onValueChange={setDraft} items={options} />
        ) : (
          <TextInput
            style={[styles.input, multiline && styles.inputMultiline]}
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder}
            multiline={multiline}
            autoFocus
          />
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={cancel} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save</Text>}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.displayRow}>
        <Text style={[styles.displayText, !value && styles.emptyText, textStyle]}>
          {displayValue || emptyText}
        </Text>
        {editable && (
          <Pressable onPress={startEdit} hitSlop={8}>
            <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  displayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  displayText: { fontSize: 14, color: colors.text, flex: 1, lineHeight: 19 },
  emptyText: { color: colors.textMuted, fontStyle: 'italic' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 1,
    fontSize: 14,
    color: colors.text,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  error: { color: colors.danger, fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  cancelBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm - 1 },
  cancelText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm - 1,
    minWidth: 60,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
