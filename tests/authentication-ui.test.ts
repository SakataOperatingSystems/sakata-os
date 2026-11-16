import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PasswordField from "@/app/login/password-field";
import {
  getPasswordInputType,
  getPasswordToggleLabel,
  togglePasswordVisibility,
} from "@/app/login/password-visibility";
import { validateNewPassword } from "@/app/auth/recover/validation";

describe("password visibility", () => {
  it("switches input type and accessible toggle label together", () => {
    const visible = togglePasswordVisibility(false);

    expect(visible).toBe(true);
    expect(getPasswordInputType(visible)).toBe("text");
    expect(getPasswordToggleLabel(visible)).toBe("Hide password");
    expect(togglePasswordVisibility(visible)).toBe(false);
    expect(getPasswordInputType(false)).toBe("password");
    expect(getPasswordToggleLabel(false)).toBe("Show password");
  });

  it("renders a labelled password field with an accessible visibility button", () => {
    const markup = renderToStaticMarkup(
      createElement(PasswordField, {
        id: "password",
        name: "password",
        label: "Password",
        value: "",
        onChange: () => undefined,
        autoComplete: "current-password",
        placeholder: "Your password",
      }),
    );

    expect(markup).toContain('for="password"');
    expect(markup).toContain('type="password"');
    expect(markup).toContain('autoComplete="current-password"');
    expect(markup).toContain('aria-label="Show password"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('aria-controls="password"');
  });
});

describe("password recovery validation", () => {
  it("requires a minimum length and matching confirmation", () => {
    expect(validateNewPassword("short", "short")).toMatch(/8 characters/);
    expect(validateNewPassword("long-enough", "different")).toBe(
      "The passwords do not match.",
    );
    expect(validateNewPassword("long-enough", "long-enough")).toBeNull();
  });
});
