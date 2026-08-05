import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Reusable password field: masked by default, with a trailing eye/eye-off
// toggle that only affects local visibility state — the value itself stays
// fully controlled by the parent and is never touched by toggling.
export default function PasswordInput({ value, onChange, placeholder, style, ...rest }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrap" style={style}>
      <input
        className="password-input-field"
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...rest}
      />
      <button
        type="button"
        className="password-input-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
