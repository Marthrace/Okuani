import React, { useState } from 'react';
import { Pencil } from 'lucide-react';

export default function EditableField({
  label,
  value,
  placeholder,
  editable,
  multiline,
  emptyText = 'Not set yet',
  onSave,
  valueStyle,
  options,
}) {
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
    const Field = multiline ? 'textarea' : 'input';
    return (
      <div className="editable-field">
        {label ? <label className="editable-field-label">{label}</label> : null}
        {options ? (
          <select className="input-control" value={draft} onChange={(e) => setDraft(e.target.value)}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <Field
            className="input-control"
            style={multiline ? { minHeight: 80, resize: 'vertical' } : undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            autoFocus
          />
        )}
        {error ? <div className="auth-error">{error}</div> : null}
        <div className="editable-field-actions">
          <button className="auth-link-muted" onClick={cancel} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" style={{ padding: '6px 16px', fontSize: 12 }} onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="editable-field">
      {label ? <label className="editable-field-label">{label}</label> : null}
      <div className="editable-field-display">
        <span className={value ? 'editable-field-value' : 'editable-field-empty'} style={valueStyle}>
          {displayValue || emptyText}
        </span>
        {editable && (
          <button className="editable-field-pencil" onClick={startEdit} aria-label={`Edit ${label || 'field'}`}>
            <Pencil size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
