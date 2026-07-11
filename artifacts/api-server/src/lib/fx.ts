/**
 * Taux de change unifié QDIA.
 * Convention : DZD_USD_RATE = nombre de DZD pour 1 USD (ex. 135).
 * Si la valeur env est < 1 (ex. 0.0074), on l'interprète comme USD/DZD et on inverse.
 */
export function dzdPerUsd(): number {
  const raw = Number(process.env.DZD_USD_RATE ?? 135);
  if (!Number.isFinite(raw) || raw <= 0) return 135;
  if (raw < 1) return 1 / raw;
  return raw;
}

export function usdPerDzd(): number {
  return 1 / dzdPerUsd();
}

export function dzdToUsd(dzd: number): number {
  return dzd * usdPerDzd();
}

export function usdToDzd(usd: number): number {
  return usd * dzdPerUsd();
}
