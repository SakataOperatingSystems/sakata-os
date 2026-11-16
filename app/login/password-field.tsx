"use client";

import { useState } from "react";
import {
  getPasswordInputType,
  getPasswordToggleLabel,
  togglePasswordVisibility,
} from "./password-visibility";

type PasswordFieldProps = {
  id: string;
  name: string;
  value: string;
  label: string;
  autoComplete: string;
  placeholder: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
};

export default function PasswordField({
  id,
  name,
  value,
  label,
  autoComplete,
  placeholder,
  onChange,
  required = true,
  minLength,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const toggleLabel = getPasswordToggleLabel(visible);

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-slate-200"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={getPasswordInputType(visible)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 pr-24 text-white outline-none transition focus-visible:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400/40"
        />
        <button
          type="button"
          aria-label={toggleLabel}
          aria-pressed={visible}
          aria-controls={id}
          onClick={() =>
            setVisible((current) => togglePasswordVisibility(current))
          }
          className="absolute inset-y-0 right-2 my-auto rounded-md px-2 text-xs font-semibold text-sky-300 outline-none transition hover:text-sky-100 focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
