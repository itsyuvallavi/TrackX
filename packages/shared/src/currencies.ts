// Owner: packages/shared. Currency constants and conversion helpers shared across services.
import { z } from "zod";

export const CURRENCIES = ["EUR", "USD", "ILS"] as const;

export const CurrencySchema = z.enum(CURRENCIES);

export type Currency = z.infer<typeof CurrencySchema>;

export function normalizeCurrency(input: string): Currency | null {
  const value = input.trim().toLowerCase();

  if (["eur", "eu", "euro", "euros", "€"].includes(value)) {
    return "EUR";
  }

  if (["usd", "dollar", "dollars", "$"].includes(value)) {
    return "USD";
  }

  if (["ils", "shekel", "shekels", "nis", "₪"].includes(value)) {
    return "ILS";
  }

  return null;
}
