export function getDateKeyInTimeZone(date: Date, timeZone: string): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Cannot format an invalid date.");
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");

  if (!year || !month || !day) {
    throw new Error("Could not format the organization-local calendar date.");
  }

  return `${year}-${month}-${day}`;
}

export function formatDateTimeInTimeZone(
  value: string,
  timeZone: string,
  locale: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid deadline";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

export function formatOrganizationCurrency(
  amount: number | string,
  currencyCode: string,
  locale: string,
): string {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    throw new Error("A fee account contains an invalid balance amount.");
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(numericAmount);
}
