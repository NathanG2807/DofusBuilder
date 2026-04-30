/**
 * Évalue si les conditions d'un item sont respectées par les stats actuelles du build.
 */

type ConditionNode = {
  is_operand: boolean;
  condition?: {
    element?: { name?: string; id?: number };
    operator?: string;
    int_value?: number;
  };
  relation?: string;
  children?: ConditionNode[];
};

// Mapping ID d'élément de condition → clé dans les stats du build
const CONDITION_ID_TO_STAT: Record<number, string> = {
  8:   "pm",
  9:   "vitality",
  10:  "wisdom",
  12:  "pa",
  13:  "intelligence",
  22:  "chance",
  24:  "initiative",
  25:  "prospecting",
  26:  "lock",
  29:  "critical_percent",
  32:  "power",
  36:  "agility",
  45:  "strength",
  59:  "dodge",
};

// Mapping nom d'élément → clé stats (fallback si l'id n'est pas reconnu)
const CONDITION_NAME_TO_STAT: Record<string, string> = {
  pa:            "pa",
  pm:            "pm",
  vitalité:      "vitality",
  sagesse:       "wisdom",
  force:         "strength",
  intelligence:  "intelligence",
  chance:        "chance",
  agilité:       "agility",
  puissance:     "power",
  initiative:    "initiative",
  prospection:   "prospecting",
  tacle:         "lock",
  fuite:         "dodge",
};

function getStatKey(element?: { name?: string; id?: number }): string | null {
  if (!element) return null;
  if (element.id != null && CONDITION_ID_TO_STAT[element.id]) {
    return CONDITION_ID_TO_STAT[element.id];
  }
  const name = element.name?.toLowerCase().trim() ?? "";
  return CONDITION_NAME_TO_STAT[name] ?? null;
}

function compare(statValue: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case ">":  return statValue >  threshold;
    case ">=": return statValue >= threshold;
    case "<":  return statValue <  threshold;
    case "<=": return statValue <= threshold;
    case "=":  return statValue === threshold;
    case "!=": return statValue !== threshold;
    default:   return true; // opérateur inconnu → on ne bloque pas
  }
}

function evaluateNode(node: ConditionNode, stats: Record<string, number>): boolean {
  if (!node) return true;

  if (node.is_operand) {
    const c = node.condition;
    if (!c) return true;
    const key = getStatKey(c.element);
    if (!key) return true; // condition inconnue (ex: niveau d'alignement) → on ignore
    const val = stats[key] ?? 0;
    return compare(val, c.operator ?? "=", c.int_value ?? 0);
  }

  // Nœud composé
  const children = node.children ?? [];
  if (node.relation === "or") {
    return children.some((child) => evaluateNode(child, stats));
  }
  // "and" par défaut
  return children.every((child) => evaluateNode(child, stats));
}

/**
 * Retourne `true` si toutes les conditions sont respectées (ou si l'item n'a pas de condition).
 * `stats` doit contenir les totaux du build (incluant les bases PA/PM/Vitalité).
 */
export function isConditionMet(
  conditions: unknown,
  stats: Record<string, number>,
): boolean {
  if (!conditions || typeof conditions !== "object") return true;
  return evaluateNode(conditions as ConditionNode, stats);
}
