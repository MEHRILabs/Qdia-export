/** Coûts en crédits IA par action (affichage + futur débit) */
export const AI_CREDIT_COSTS = {
  /** Fiche produit complète FR + EN + AR (1 appel IA) */
  product_sheet_3lang: 3,
  pricing_calculation: 1,
  studio_remove_bg: 1,
  studio_white_bg: 2,
  studio_scene: 2,
  studio_enhance: 2,
  chat_message: 0,
} as const;

export type AiCreditAction = keyof typeof AI_CREDIT_COSTS;

export function getCreditCost(action: AiCreditAction): number {
  return AI_CREDIT_COSTS[action];
}

export function getCreditsSummary() {
  return {
    costs: AI_CREDIT_COSTS,
    product_sheet_note:
      "La fiche en 3 langues (FR/EN/AR) consomme 3 crédits : génération titres, descriptions et specs en une seule passe IA.",
  };
}
