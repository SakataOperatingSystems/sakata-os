"use client";

import { useState } from "react";
import { saveConfigurationOverride } from "./actions";

type ConfigurationEditorProps = {
  organizationProductModuleId: string;
  configurationDefinitionId: string;
  configurationCode: string;
  valueType: string;
  currentValue: unknown;
  valueSource: string;
};

export default function ConfigurationEditor({
  organizationProductModuleId,
  configurationDefinitionId,
  configurationCode,
  valueType,
  currentValue,
  valueSource,
}: ConfigurationEditorProps) {
  const initialValue =
    typeof currentValue === "string"
      ? currentValue
      : JSON.stringify(currentValue ?? "");

  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setStatus(null);

    try {
      let parsedValue: unknown = value;

      if (valueType === "integer") {
        parsedValue = Number.parseInt(value, 10);
      } else if (valueType === "decimal") {
        parsedValue = Number.parseFloat(value);
      } else if (valueType === "boolean") {
        parsedValue = value === "true";
      } else if (valueType === "json") {
        parsedValue = JSON.parse(value);
      }

      await saveConfigurationOverride(
        organizationProductModuleId,
        configurationDefinitionId,
        parsedValue
      );

      setStatus("Saved");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to save configuration."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Override
      </label>

      <div className="flex gap-2">
        <input
          type={valueType === "integer" || valueType === "decimal" ? "number" : "text"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
          aria-label={`Override ${configurationCode}`}
        />

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {status && (
        <p className="text-xs text-zinc-600">
          {status}
        </p>
      )}

      <p className="text-xs text-zinc-500">
        Current source: {valueSource}
      </p>
    </div>
  );
}