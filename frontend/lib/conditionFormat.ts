/**
 * Formatage des conditions d'équipement (structure récursive Dofusdude).
 *
 * Nœud simple   → { is_operand: true,  condition: { element: { name }, operator, int_value } }
 * Nœud composé  → { is_operand: false, relation: "and"|"or", children: [...] }
 */

type ConditionNode = {
  is_operand: boolean;
  condition?: {
    element?: { name?: string };
    operator?: string;
    int_value?: number;
  };
  relation?: string;
  children?: ConditionNode[];
};

const OP_LABEL: Record<string, string> = {
  ">":  ">",
  ">=": "≥",
  "<":  "<",
  "<=": "≤",
  "=":  "=",
  "!=": "≠",
};

function formatNode(node: ConditionNode, depth = 0): string {
  if (!node) return "";

  if (node.is_operand) {
    const c = node.condition;
    if (!c) return "";
    const name = c.element?.name ?? "?";
    const op   = OP_LABEL[c.operator ?? ""] ?? (c.operator ?? "");
    const val  = c.int_value ?? 0;
    return `${name} ${op} ${val}`;
  }

  // Nœud composé
  const rel = node.relation === "or" ? " OU " : " ET ";
  const parts = (node.children ?? []).map((child) => formatNode(child, depth + 1)).filter(Boolean);
  if (parts.length === 0) return "";
  const joined = parts.join(rel);
  // Parenthèses uniquement en profondeur > 0 pour éviter les doublons
  return depth > 0 ? `(${joined})` : joined;
}

/**
 * Convertit le JSON de conditions brutes en lignes lisibles.
 * Renvoie un tableau vide si l'objet n'a pas de conditions.
 */
export function formatConditions(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const node = raw as ConditionNode;
  const text = formatNode(node);
  if (!text) return [];
  return text.split(" ET ").flatMap((part) =>
    part.includes(" OU ") ? [part] : [part]
  );
}

/**
 * Renvoie une seule chaîne lisible pour la condition, ou null.
 */
export function formatConditionString(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const node = raw as ConditionNode;
  const text = formatNode(node);
  return text || null;
}
