export function togglePasswordVisibility(visible: boolean): boolean {
  return !visible;
}

export function getPasswordInputType(visible: boolean): "text" | "password" {
  return visible ? "text" : "password";
}

export function getPasswordToggleLabel(visible: boolean): string {
  return visible ? "Hide password" : "Show password";
}
