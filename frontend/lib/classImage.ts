/**
 * URLs des avatars de classe.
 * Source prioritaire: assets locaux `frontend/public/assets/classes/{id}_{sex}.png`
 * Convention sexe: 0 = masculin, 1 = feminin
 */

export type ClassSex = "male" | "female";

function normalizeClassId(classId: number): number {
  // Compat historique: ancien mapping Forgelance=19
  if (classId === 19) return 20;
  return classId;
}

function sexCode(sex: ClassSex): 0 | 1 {
  return sex === "female" ? 1 : 0;
}

export function classImageUrl(classId: number, sex: ClassSex = "male"): string {
  const cid = normalizeClassId(classId);
  return `/assets/classes/${cid}-${sexCode(sex)}.png`;
}

export function classImageFallback(classId: number, sex: ClassSex = "male"): string {
  // Aucun fallback distant: on reste sur les assets du projet.
  return classImageUrl(classId, sex);
}
