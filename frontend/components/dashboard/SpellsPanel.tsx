"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { useDisplayStats } from "@/hooks/useDisplayStats";
import { useBuildStore } from "@/store/build-store";
import { CLASS_TO_BREED_ID, CLASS_TO_SPELL_TYPE_ID } from "@/lib/dofusClasses";

/* ══════════════════════════════════════════════════════════════════════════════
   Types
══════════════════════════════════════════════════════════════════════════════ */
interface SpellFullData {
  id: number;
  order: number;
  img: string;
  name: { fr: string };
  description: { fr: string };
  typeId: number; // 8 = sort de base, 598 = variante
}

interface SpellVariantGroup {
  id: number;
  breedId: number;
  spellIds: number[];
  spells: SpellFullData[];
}

interface SpellEffect {
  effectId: number;
  effectElement: number;
  value: number;
  diceNum: number;
  diceSide: number;
  duration: number;
  visibleInTooltip: boolean;
}

interface SpellLevelData {
  id: number;
  grade: number;
  apCost: number;
  minRange: number;
  range: number;
  criticalHitProbability: number;
  maxCastPerTurn: number;
  minPlayerLevel: number;
  rangeCanBeBoosted: boolean;
  castInLine: boolean;
  castInDiagonal: boolean;
  castTestLos: boolean;
  effects: SpellEffect[];
  criticalEffect: SpellEffect[];
}

/* ══════════════════════════════════════════════════════════════════════════════
   Helpers
══════════════════════════════════════════════════════════════════════════════ */
/**
 * Mapping effectElement (spell-levels API) → icône visuelle.
 *
 * Convention DofusDB (vérifiée via /effects?id=…) :
 *   0 = Neutre (pas d'icône dédiée)
 *   1 = Terre
 *   2 = Feu
 *   3 = Eau
 *   4 = Air
 *   5 = "non-élément" (caractéristiques boostées : Puissance, etc.)
 *  -1 = aucun élément
 *
 * effectElement (spell-levels) === elementId (effects). Aucun "swap" Dofus 2 / Dofus 3.
 */
const ELEMENT_ICONS: Record<number, { icon: string; label: string }> = {
  1: { icon: "ter", label: "Terre" },
  2: { icon: "feu", label: "Feu"   },
  3: { icon: "eau", label: "Eau"   },
  4: { icon: "air", label: "Air"   },
};

/**
 * Effets dont la ligne doit être entièrement masquée (même si visibleInTooltip=true
 * dans l'API spell-levels), car ce sont des mécanismes internes sans valeur affichable.
 *
 * 293 = "Soins (% PV cible)" : utilisé en mécanique interne (diceNum = spellId), jamais montré in-game.
 */
const ALWAYS_HIDDEN_EFFECT_IDS = new Set<number>([293]);

/** Max sane display value — au-dessus, c'est un ID interne (spellId/stateId), pas un nombre de gameplay. */
const MAX_DISPLAY_VALUE = 9000;

/* ── Cache d'effets dynamique ───────────────────────────────────────────────
   Labels chargés depuis https://api.dofusdb.fr/effects/{id}?lang=fr
   Cache module-level : persiste entre les montages React.
────────────────────────────────────────────────────────────────────────────── */
interface EffectInfo {
  /** Libellé court à afficher (sans suffixe d'élément, sans "X" placeholder). */
  label: string;
  /** Affiche un "%" après la valeur. */
  isPercent: boolean;
  /** L'effet est élémentaire : afficher l'icône via effectElement (1-4). */
  isElemental: boolean;
  /** Ne jamais afficher de valeur numérique (état pur, ID interne, mécanique cachée). */
  hideValue: boolean;
}

/** Cache module-level : effectId → informations */
const gEffectCache   = new Map<number, EffectInfo>();
/** Requêtes en cours pour éviter les doublons */
const gEffectPending = new Map<number, Promise<void>>();

/**
 * Parse le template de description de l'API Dofus DB.
 * Exemple : "#1{{~1~2 à }}#2% Érosion" → "Érosion"
 * Exemple : "#1{{~1~2 à }}#2 dommages Feu" → "dommages Feu"
 * Exemple : "#1{{~1~2 à }}#2% <sprite name=\"PV\"> PV du lanceur" → "PV du lanceur"
 */
function parseApiEffectLabel(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")        // supprime les balises Unity <sprite name="…">
    .replace(/#\d+/g, "")           // supprime #1 #2 …
    .replace(/\{\{[^}]*\}\}/g, "")  // supprime {{…}} (séparateurs conditionnels)
    .replace(/^[\s%:+\-]+/, "")     // supprime les "% : + -" éventuels en tête
    .replace(/[\s%:]+$/, "")        // supprime les "% :" éventuels en queue
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pré-remplit le cache pour les effets les plus courants — évite N requêtes réseau au premier hover.
 *
 * Toutes les entrées sont vérifiées contre https://api.dofusdb.fr/effects/{id}?lang=fr
 * Les labels sont volontairement courts : l'élément est exprimé via l'icône, pas dupliqué dans le texte.
 */
(function seedCache() {
  // [id, label court, isPercent, isElemental, hideValue]
  const SEED: Array<[number, string, boolean, boolean, boolean]> = [
    // ── Déplacements / positionnement ─────────────────────────────────────
    [  4, "Téléportation",                  false, false, true  ], // Téléporte sur case ciblée
    [  5, "Repousse",                       false, false, false ], // Repousse de N cases
    [  6, "Attire",                         false, false, false ], // Attire de N cases
    [  8, "Échange de positions",           false, false, true  ],
    [ 50, "Porte la cible",                 false, false, true  ],
    [ 51, "Lance une entité",               false, false, true  ],
    // ── PA / PM (vols/rembours) ──────────────────────────────────────────
    [ 77, "Vol de PM",                      false, false, false ], // Vole #1 à #2 PM
    [ 78, "Rembourse PM",                   false, false, false ],
    [ 84, "Vol de PA",                      false, false, false ], // Vole #1 à #2 PA
    // ── Soins / Vol de vie / Dommages "% PV lanceur" ─────────────────────
    // 81 = "Soins" (Eniripsa & co)  /  82 = Vol de vie Neutre (fixe)
    [ 81, "Soins",                          false, false, false ],
    [ 82, "Vol de vie Neutre",              false, false, false ],
    // 85/86/87 = Dommages élément % PV lanceur — élément via effectElement
    [ 85, "Dommages (% PV lanceur)",        true,  true,  false ], // elementId=3 (Eau)
    [ 86, "Dommages (% PV lanceur)",        true,  true,  false ], // elementId=1 (Terre)
    [ 87, "Dommages (% PV lanceur)",        true,  true,  false ], // elementId=4 (Air)
    // ── Vol de vie élémentaire (élément via effectElement = elementId) ──
    [ 91, "Vol de vie",                     false, true,  false ], // Eau   (elementId=3)
    [ 92, "Vol de vie",                     false, true,  false ], // Terre (elementId=1)
    [ 93, "Vol de vie",                     false, true,  false ], // Air   (elementId=4)
    [ 94, "Vol de vie",                     false, true,  false ], // Feu   (elementId=2)
    [ 95, "Vol de vie Neutre",              false, false, false ], // Neutre (elementId=0, pas d'icône)
    // ── Dommages élémentaires ────────────────────────────────────────────
    [ 96, "Dommages",                       false, true,  false ], // Eau   (elementId=3)
    [ 97, "Dommages",                       false, true,  false ], // Terre (elementId=1)
    [ 98, "Dommages",                       false, true,  false ], // Air   (elementId=4)
    [ 99, "Dommages",                       false, true,  false ], // Feu   (elementId=2)
    [100, "Dommages Neutre",                false, false, false ], // Neutre (elementId=0)
    // ── Soins additionnels ───────────────────────────────────────────────
    [101, "Soins",                          false, false, false ],
    [105, "Malus de PV",                    false, false, false ],
    [108, "Soins",                          false, false, false ],
    // ── PA / PM (octrois & retraits) ─────────────────────────────────────
    [110, "PA octroyés",                    false, false, false ],
    [111, "PA retirés (non esquivables)",   false, false, false ],
    [112, "PA retirés",                     false, false, false ],
    [116, "PM octroyés",                    false, false, false ],
    [117, "PM retirés (non esquivables)",   false, false, false ],
    [118, "PM retirés",                     false, false, false ],
    // ── Portée ────────────────────────────────────────────────────────────
    [120, "Portée ajoutée",                 false, false, false ],
    [121, "Portée retirée",                 false, false, false ],
    // ── Téléportations / invocations / états visuels ─────────────────────
    [123, "Téléportation",                  false, false, true  ],
    [125, "Invocation",                     false, false, true  ],
    // ── Caractéristiques (ajoutées / retirées) ───────────────────────────
    [126, "Force ajoutée",                  false, false, false ],
    [127, "Force retirée",                  false, false, false ],
    [131, "Vitalité ajoutée",               false, false, false ],
    [132, "Vitalité retirée",               false, false, false ],
    [136, "Agilité ajoutée",                false, false, false ],
    [137, "Agilité retirée",                false, false, false ],
    [138, "Intelligence ajoutée",           false, false, false ],
    [139, "Intelligence retirée",           false, false, false ],
    [141, "Chance ajoutée",                 false, false, false ],
    [142, "Chance retirée",                 false, false, false ],
    [143, "Sagesse ajoutée",                false, false, false ],
    [144, "Sagesse retirée",                false, false, false ],
    [145, "Érosion",                        true,  false, false ],
    [147, "Dommages ajoutés",               false, false, false ],
    [150, "Initiative ajoutée",             false, false, false ],
    [152, "Puissance ajoutée",              false, false, false ],
    [153, "Puissance retirée",              false, false, false ],
    [154, "Critique ajouté",                false, false, false ],
    [158, "Invocation",                     false, false, true  ],
    [163, "Invisibilité",                   false, false, true  ],
    [168, "Esquive PA ajoutée",             false, false, false ],
    [169, "Esquive PA retirée",             false, false, false ],
    [171, "Tacle ajouté",                   false, false, false ],
    [172, "Tacle retiré",                   false, false, false ],
    // 186 = -X Puissance (API description "-#1{{~1~2 à -}}#2 Puissance")
    [186, "Puissance retirée",              false, false, false ],
    [187, "Do. Poussée retirés",            false, false, false ],
    [188, "Do. Critiques ajoutés",          false, false, false ],
    [189, "Do. Critiques retirés",          false, false, false ],
    [215, "Glyphe",                         false, false, true  ],
    [281, "Bouclier",                       false, false, false ],
    // 293 explicitement caché (voir ALWAYS_HIDDEN_EFFECT_IDS) — laissé en cache pour cohérence
    [293, "Soins (% PV cible)",             false, false, true  ],
    [406, "État appliqué",                  false, false, true  ],
    [951, "État spécial",                   false, false, true  ],
    [1160,"État",                           false, false, true  ],
  ];
  for (const [id, label, isPercent, isElemental, hideValue] of SEED) {
    gEffectCache.set(id, { label, isPercent, isElemental, hideValue });
  }
})();

/**
 * Charge les informations d'un effect depuis l'API et les met en cache.
 * Retourne immédiatement si l'effect est déjà en cache.
 *
 * Convention élément API : elementId ∈ {1,2,3,4} → élément réel ; 0 (Neutre) ou 5 (non-élément)
 * → pas d'icône d'élément (le label gère l'info Neutre).
 */
function loadEffectInfo(effectId: number): Promise<void> {
  if (gEffectCache.has(effectId)) return Promise.resolve();
  if (gEffectPending.has(effectId)) return gEffectPending.get(effectId)!;

  const promise = fetch(`https://api.dofusdb.fr/effects/${effectId}?lang=fr`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((d) => {
      const isPercent: boolean  = d.isInPercent ?? false;
      const hideValue: boolean  = d.hideValueInTooltip ?? false;
      const elementId: number   = d.elementId ?? -1;
      const isElemental: boolean = elementId >= 1 && elementId <= 4;
      const raw: string         = d.description?.fr ?? "";
      const label = parseApiEffectLabel(raw) || `Effet #${effectId}`;
      gEffectCache.set(effectId, { label, isPercent, isElemental, hideValue });
    })
    .catch(() => {
      gEffectCache.set(effectId, {
        label: `Effet #${effectId}`,
        isPercent: false,
        isElemental: false,
        hideValue: false,
      });
    })
    .finally(() => {
      gEffectPending.delete(effectId);
    });

  gEffectPending.set(effectId, promise);
  return promise;
}

/**
 * Résout l'icône d'élément pour un effet donné.
 *
 * Règle unique : afficher l'icône via `effectElement` (1=Terre, 2=Feu, 3=Eau, 4=Air)
 * UNIQUEMENT si l'effet est marqué `isElemental` (i.e. son `elementId` API est dans {1,2,3,4}).
 *
 * Cela exclut :
 *  - Neutre (elementId=0) : pas d'icône, info dans le label
 *  - Boost de caractéristique (elementId=5, ex: Puissance)
 *  - Effets sans élément (elementId=-1)
 */
function resolveEffectElement(eff: SpellEffect): { icon: string; label: string } | undefined {
  const info = gEffectCache.get(eff.effectId);
  if (!info?.isElemental) return undefined;
  if (eff.effectElement < 1 || eff.effectElement > 4) return undefined;
  return ELEMENT_ICONS[eff.effectElement];
}

function getEffectLabel(eff: SpellEffect): string {
  return gEffectCache.get(eff.effectId)?.label ?? `Effet #${eff.effectId}`;
}

/* ══════════════════════════════════════════════════════════════════════════════
   Calcul de dégâts réels (Dofus 3)
   ─────────────────────────────────
   Formule : Dégâts = base + base × ((Puissance + Caractéristique) / 100) + Dommages_fixes
   En cas de Coup Critique : on ajoute en plus la stat « Dommages Critiques » (flat).

   Mapping élément (effectElement / elementId) :
     0 = Neutre (carac = Force,        dmg fixes = damage_neutral + damage)
     1 = Terre  (carac = Force,        dmg fixes = damage_earth   + damage)
     2 = Feu    (carac = Intelligence, dmg fixes = damage_fire    + damage)
     3 = Eau    (carac = Chance,       dmg fixes = damage_water   + damage)
     4 = Air    (carac = Agilité,      dmg fixes = damage_air     + damage)
══════════════════════════════════════════════════════════════════════════════ */

interface ElementInfo {
  /** Clé de la caractéristique principale dans `stats`. */
  caracKey: "strength" | "intelligence" | "chance" | "agility";
  /** Clé des dommages fixes spécifiques à l'élément dans `stats`. */
  damageKey:
    | "damage_earth" | "damage_fire" | "damage_water"
    | "damage_air"   | "damage_neutral";
  /** Classe Tailwind pour la couleur du texte des dégâts. */
  colorClass: string;
}

const ELEMENT_INFO: Record<number, ElementInfo> = {
  0: { caracKey: "strength",     damageKey: "damage_neutral", colorClass: "text-[#a8a8a8]" }, // Neutre
  1: { caracKey: "strength",     damageKey: "damage_earth",   colorClass: "text-[#7faf3a]" }, // Terre
  2: { caracKey: "intelligence", damageKey: "damage_fire",    colorClass: "text-[#e26e3c]" }, // Feu
  3: { caracKey: "chance",       damageKey: "damage_water",   colorClass: "text-[#4ba4dd]" }, // Eau
  4: { caracKey: "agility",      damageKey: "damage_air",     colorClass: "text-[#b8d040]" }, // Air
};

/** Effets dont les dégâts (ou le vol de vie) suivent la formule standard. */
const SCALABLE_DAMAGE_EFFECT_IDS = new Set<number>([
  // Vol de vie élémentaires
  91, 92, 93, 94,
  // Vol Neutre élémentaire
  95,
  // Dommages élémentaires
  96, 97, 98, 99,
  // Dommages Neutre
  100,
]);

/**
 * Détermine l'élément à utiliser pour le calcul d'un effet.
 *
 * - Si le sort est marqué « meilleur élément » (`useBestElement`),
 *   retourne l'élément {1..4} avec la plus haute caractéristique.
 * - Sinon retourne `effectElement` brut.
 */
function pickElementForCalc(
  eff: SpellEffect,
  stats: Record<string, number>,
  useBestElement: boolean,
): number {
  if (useBestElement) {
    const candidates: Array<[number, number]> = [
      [1, stats.strength     ?? 0],
      [2, stats.intelligence ?? 0],
      [3, stats.chance       ?? 0],
      [4, stats.agility      ?? 0],
    ];
    candidates.sort((a, b) => b[1] - a[1]);
    return candidates[0][0];
  }
  return eff.effectElement;
}

/**
 * Calcule la plage de dégâts réels (min-max) pour un effet, étant donné les stats du build.
 *
 * Retourne `null` si l'effet n'est pas un effet de dégâts/vol de vie scalable
 * ou si la dice est invalide (effet plate/état).
 */
function computeEffectDamage(
  eff: SpellEffect,
  stats: Record<string, number>,
  opts: { isCrit: boolean; useBestElement: boolean },
): { min: number; max: number; element: number } | null {
  if (!SCALABLE_DAMAGE_EFFECT_IDS.has(eff.effectId)) return null;

  const { diceNum, diceSide } = eff;
  if (diceNum <= 0 || diceNum >= MAX_DISPLAY_VALUE) return null;
  // diceSide peut valoir 0 (dégâts fixes) ou être > diceNum (range)

  const element = pickElementForCalc(eff, stats, opts.useBestElement);
  const info    = ELEMENT_INFO[element];
  if (!info) return null;

  const power     = stats.power ?? 0;
  const carac     = stats[info.caracKey] ?? 0;
  const dmgFixes  = (stats[info.damageKey] ?? 0) + (stats.damage ?? 0);
  const critFlat  = opts.isCrit ? (stats.critical_damage ?? 0) : 0;
  const factor    = 1 + (power + carac) / 100;

  const minBase = diceNum;
  const maxBase = diceSide > diceNum ? diceSide : diceNum;

  const min = Math.floor(minBase * factor + dmgFixes + critFlat);
  const max = Math.floor(maxBase * factor + dmgFixes + critFlat);

  return { min, max, element };
}

/** Détecte si un sort utilise la mécanique « meilleur élément » (depuis sa description). */
function spellUsesBestElement(desc: string): boolean {
  return desc.includes("meilleur élément");
}

/**
 * Identifie le sort de base d'un groupe de variants en fonction du classId.
 *
 * L'API DofusDB retourne pour chaque groupe `[base, variante]` (base toujours en premier)
 * mais la donnée formelle est le `typeId` :
 *  - Iop  (classId=8)  : base typeId=8,    variant typeId=598
 *  - Féca (classId=1)  : base typeId=1,    variant typeId=592
 *  - Sram (classId=4)  : base typeId=4,    variant typeId=589
 *  - Cra  (classId=9)  : base typeId=9,    variant typeId=594
 *  - …
 *  - Forgelance (classId=20) : base typeId=2374, variant typeId=2376
 *
 * `CLASS_TO_SPELL_TYPE_ID[classId]` donne le typeId de base attendu.
 */
function pickBase(spells: SpellFullData[], classId: number): SpellFullData {
  const baseTypeId = CLASS_TO_SPELL_TYPE_ID[classId];
  return spells.find((s) => s.typeId === baseTypeId) ?? spells[0];
}

function pickVariant(spells: SpellFullData[], classId: number): SpellFullData {
  const baseTypeId = CLASS_TO_SPELL_TYPE_ID[classId];
  return spells.find((s) => s.typeId !== baseTypeId) ?? spells[1] ?? spells[0];
}

function formatEffectValue(eff: SpellEffect): string {
  const info = gEffectCache.get(eff.effectId);
  if (info?.hideValue) return "";

  const { diceNum, diceSide, value } = eff;
  const MAX = MAX_DISPLAY_VALUE;

  let raw = "";
  if (diceNum > 0 && diceSide > 0 && diceNum !== diceSide && diceNum < MAX && diceSide < MAX)
    raw = `${diceNum} à ${diceSide}`;
  else if (diceNum > 0 && diceNum < MAX) raw = `${diceNum}`;
  else if (diceSide > 0 && diceSide < MAX) raw = `${diceSide}`;
  else if (value > 0 && value < MAX) raw = `${value}`;

  if (!raw) return "";
  return info?.isPercent ? `${raw}%` : raw;
}

const DESC_ELEMENT_PATTERNS = [
  { word: "Terre", icon: "ter", label: "Terre" },
  { word: "Feu",   icon: "feu", label: "Feu"   },
  { word: "Eau",   icon: "eau", label: "Eau"   },
  { word: "Air",   icon: "air", label: "Air"   },
];

function detectDescElements(desc: string) {
  if (desc.includes("meilleur élément")) return DESC_ELEMENT_PATTERNS;
  return DESC_ELEMENT_PATTERNS.filter(({ word }) => desc.includes(word));
}

/* ══════════════════════════════════════════════════════════════════════════════
   Sous-composants partagés
══════════════════════════════════════════════════════════════════════════════ */
function StatChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-0.5 text-[11px] text-[#aaaaaa]">
      {children}
    </span>
  );
}

function SpellEffectRow({
  eff,
  stats,
  isCrit,
  useBestElement,
}: {
  eff: SpellEffect;
  stats: Record<string, number>;
  /** True si l'effet provient de la liste critique (ajoute Dommages Critiques flat). */
  isCrit: boolean;
  /** True si le sort utilise la mécanique « meilleur élément » → carac dynamique. */
  useBestElement: boolean;
}) {
  const label = getEffectLabel(eff);
  const val   = formatEffectValue(eff);
  // Dégâts calculés avec le build courant (null pour les effets non-scalables).
  const calc  = computeEffectDamage(eff, stats, { isCrit, useBestElement });
  // L'élément affiché en icône suit le calcul (utile pour « meilleur élément »).
  const elIdx = calc?.element ?? eff.effectElement;
  const cacheInfo = gEffectCache.get(eff.effectId);
  const el =
    cacheInfo?.isElemental && elIdx >= 1 && elIdx <= 4
      ? ELEMENT_ICONS[elIdx]
      : undefined;
  const colorClass = calc ? ELEMENT_INFO[calc.element]?.colorClass ?? "" : "";

  return (
    <li className="flex items-center gap-1.5 text-[11px]">
      <span className="shrink-0 text-[#9cce38]">•</span>
      {el && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/assets/elements/${el.icon}.png`}
          alt={el.label}
          width={13}
          height={13}
          className="h-[13px] w-[13px] shrink-0 object-contain"
        />
      )}
      <span className="flex-1 text-[#c0c0c0]">{label}</span>
      {val && (
        <span className="shrink-0 font-semibold tabular-nums text-[#f0e0a0]">
          {val}
        </span>
      )}
      {calc && (
        <span
          className={`shrink-0 font-semibold tabular-nums ${colorClass}`}
          title={
            isCrit
              ? "Dégâts réels en CC (build courant)"
              : "Dégâts réels (build courant)"
          }
        >
          ({calc.min === calc.max ? calc.min : `${calc.min}-${calc.max}`})
        </span>
      )}
      {eff.duration > 0 && (
        <span className="shrink-0 text-[10px] text-[#666666]">
          {eff.duration}t
        </span>
      )}
    </li>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SpellCardBody — corps réutilisable d'une carte de sort (avec fetch levels)
══════════════════════════════════════════════════════════════════════════════ */
function SpellCardBody({
  spell,
  label,
  isVariant,
}: {
  spell: SpellFullData;
  label?: string;
  isVariant?: boolean;
}) {
  /* Stats du build courant — l'affichage des dégâts calculés se met à jour
   * automatiquement quand on équipe / déséquipe un item ou modifie le niveau. */
  const stats = useDisplayStats();

  const [levels, setLevels]               = useState<SpellLevelData[]>([]);
  const [loadingLvl, setLoadingLvl]       = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(1);
  /** Incrémenté après que les labels d'effets inconnus ont été chargés → force un re-render. */
  const [effectVer, setEffectVer]         = useState(0);

  /* Fetch des niveaux du sort */
  useEffect(() => {
    setLoadingLvl(true);
    setLevels([]);
    setSelectedGrade(1);
    fetch(
      `https://api.dofusdb.fr/spell-levels?$skip=0&spellId=${spell.id}&$sort[grade]=1&lang=fr`,
    )
      .then((r) => r.json())
      .then((d) => setLevels(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingLvl(false));
  }, [spell.id]);

  /* Charge lazily les labels d'effets inconnus depuis l'API */
  useEffect(() => {
    if (levels.length === 0) return;

    const unknownIds = new Set<number>();
    for (const lvl of levels) {
      for (const eff of [...lvl.effects, ...lvl.criticalEffect]) {
        if (!gEffectCache.has(eff.effectId)) unknownIds.add(eff.effectId);
      }
    }
    if (unknownIds.size === 0) return;

    let cancelled = false;
    Promise.all([...unknownIds].map(loadEffectInfo)).then(() => {
      if (!cancelled) setEffectVer((v) => v + 1);
    });
    return () => { cancelled = true; };
  }, [levels]);

  const currentLevel       = levels.find((l) => l.grade === selectedGrade) ?? levels[0] ?? null;
  const isDisplayable = (e: SpellEffect) =>
    e.visibleInTooltip && !ALWAYS_HIDDEN_EFFECT_IDS.has(e.effectId);

  const visibleEffects     = currentLevel?.effects.filter(isDisplayable) ?? [];
  const visibleCritEffects = currentLevel?.criticalEffect.filter(isDisplayable) ?? [];
  const elements           = detectDescElements(spell.description.fr);
  const useBestElement     = spellUsesBestElement(spell.description.fr);

  return (
    <>
      {label && (
        <p
          className={`mb-1.5 text-[9px] font-semibold uppercase tracking-widest ${
            isVariant ? "text-[#7060a0]" : "text-[#555555]"
          }`}
        >
          {label}
        </p>
      )}

      {/* ── En-tête : icône + nom + sélecteur de grade ─────────────────── */}
      <div className="flex items-start gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={spell.img}
          alt=""
          width={44}
          height={44}
          className={`h-11 w-11 shrink-0 rounded-lg border bg-black/40 object-contain ${
            isVariant ? "border-[#5a4080]" : "border-[#383838]"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold leading-tight text-[#f0e0a0]">
              {spell.name.fr}
            </p>

            {levels.length > 1 && (
              <div className="flex shrink-0 gap-0.5">
                {levels.map((l) => (
                  <button
                    key={l.grade}
                    type="button"
                    onClick={() => setSelectedGrade(l.grade)}
                    className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold transition ${
                      selectedGrade === l.grade
                        ? isVariant
                          ? "border border-[#5a4080]/60 bg-[#1a0e2a] text-[#b090e0]"
                          : "border border-[#4a8000]/60 bg-[#1a2c0a] text-[#9cce38]"
                        : "border border-[#282828] bg-[#222222] text-[#555555] hover:text-[#aaaaaa]"
                    }`}
                  >
                    {l.grade}
                  </button>
                ))}
              </div>
            )}
          </div>

          {elements.length > 0 && (
            <div className="mt-1 flex gap-1.5">
              {elements.map((el) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={el.icon}
                  src={`/assets/elements/${el.icon}.png`}
                  alt={el.label}
                  title={el.label}
                  width={14}
                  height={14}
                  className="h-[14px] w-[14px] object-contain"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Description ─────────────────────────────────────────────────── */}
      <p className="mt-2 whitespace-pre-line text-[11px] leading-snug text-[#777777]">
        {spell.description.fr}
      </p>

      {loadingLvl && (
        <p className="mt-2 text-[10px] text-[#444444]">Chargement…</p>
      )}

      {currentLevel && (
        <>
          {/* ── Stats du niveau ─────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-[#252525] pt-2">
            <StatChip>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/elements/pa.png"
                alt="PA"
                width={12}
                height={12}
                className="h-[12px] w-[12px] object-contain"
              />
              {currentLevel.apCost} PA
            </StatChip>

            <StatChip>
              Portée&nbsp;
              {currentLevel.minRange > 0
                ? `${currentLevel.minRange}–${currentLevel.range}`
                : currentLevel.range}
              {currentLevel.rangeCanBeBoosted && " ↑"}
            </StatChip>

            {currentLevel.criticalHitProbability > 0 && (
              <StatChip>CC {currentLevel.criticalHitProbability}%</StatChip>
            )}

            {currentLevel.maxCastPerTurn > 0 && (
              <StatChip>{currentLevel.maxCastPerTurn}×/tour</StatChip>
            )}

            {currentLevel.minPlayerLevel > 1 && (
              <StatChip>Niv. {currentLevel.minPlayerLevel}</StatChip>
            )}

            {currentLevel.castInLine && <StatChip>Ligne</StatChip>}
            {currentLevel.castInDiagonal && <StatChip>Diagonale</StatChip>}
            {currentLevel.castTestLos && <StatChip>Ligne de vue</StatChip>}
          </div>

          {/* ── Effets normaux ──────────────────────────────────────────── */}
          {visibleEffects.length > 0 && (
            <div className="mt-2 border-t border-[#252525] pt-1.5">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-[#555555]">
                Effets
              </p>
              {/* effectVer utilisé comme key pour forcer le re-render après chargement des labels */}
              <ul key={effectVer} className="space-y-0.5">
                {visibleEffects.map((eff, i) => (
                  <SpellEffectRow
                    key={i}
                    eff={eff}
                    stats={stats}
                    isCrit={false}
                    useBestElement={useBestElement}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* ── Effets critique ─────────────────────────────────────────── */}
          {visibleCritEffects.length > 0 && (
            <div className="mt-1.5 border-t border-[#f0c060]/15 pt-1.5">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-[#c09040]/80">
                ⚡ Coup Critique
              </p>
              <ul key={effectVer} className="space-y-0.5">
                {visibleCritEffects.map((eff, i) => (
                  <SpellEffectRow
                    key={i}
                    eff={eff}
                    stats={stats}
                    isCrit
                    useBestElement={useBestElement}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   SpellCompareTooltip — sort de base + variante côte à côte
══════════════════════════════════════════════════════════════════════════════ */
function SpellCompareTooltip({
  group,
  classId,
  anchor,
  onMouseEnter,
  onMouseLeave,
}: {
  group: SpellVariantGroup;
  classId: number;
  anchor: { x: number; y: number };
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999, visible: false });

  const baseSpell    = pickBase(group.spells, classId);
  const variantSpell = pickVariant(group.spells, classId);

  const CARD_W = 680;
  const MARGIN = 8;
  const OFFSET = 14;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cardH = el.scrollHeight;
    const vw    = window.innerWidth;
    const vh    = window.innerHeight;
    const w     = Math.min(CARD_W, vw - MARGIN * 2);

    // Toujours à droite du curseur, jamais vers la gauche (ne recouvre pas la grille de sorts)
    let left = anchor.x + OFFSET;
    if (left + w + MARGIN > vw) left = vw - w - MARGIN;
    left = Math.max(MARGIN, left);

    let top = anchor.y + OFFSET;
    if (top + cardH + MARGIN > vh) {
      const above = anchor.y - cardH - OFFSET;
      top = above >= MARGIN ? above : Math.max(MARGIN, vh - cardH - MARGIN);
    }
    setPos({ top, left, visible: true });
  }, [anchor.x, anchor.y, group.id, CARD_W, MARGIN, OFFSET]);

  if (typeof document === "undefined") return null;

  const cardW = typeof window !== "undefined"
    ? Math.min(CARD_W, window.innerWidth - MARGIN * 2)
    : CARD_W;

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="fixed z-[300] rounded-xl border border-[#3a3a3a] bg-[#1a1a1a] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.75)]"
      style={{
        top: pos.top,
        left: pos.left,
        width: cardW,
        visibility: pos.visible ? "visible" : "hidden",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex gap-2">
        {/* ── Sort de base — gauche ──────────────────────────────────── */}
        <div className="min-w-0 flex-1 rounded-lg border border-[#2a2a2a] bg-[#141414] p-2">
          <SpellCardBody spell={baseSpell} label="Sort de base" />
        </div>

        {/* ── Séparateur ────────────────────────────────────────────── */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-1">
          <div className="w-px flex-1 bg-[#2a2a2a]" />
          <span className="shrink-0 text-[10px] font-bold text-[#444444]">vs</span>
          <div className="w-px flex-1 bg-[#2a2a2a]" />
        </div>

        {/* ── Variante — droite ──────────────────────────────────────── */}
        <div className="min-w-0 flex-1 rounded-lg border border-[#5a4080]/40 bg-[#120e1a] p-2">
          <SpellCardBody spell={variantSpell} label="Variante" isVariant />
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Panel principal
══════════════════════════════════════════════════════════════════════════════ */

/** Taille des icônes affichées dans la grille (px). */
const ICON_SIZE = 48;

export function SpellsPanel() {
  const classId = useBuildStore((s) => s.classId);

  const [groups, setGroups]             = useState<SpellVariantGroup[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [hover, setHover]               = useState<{
    group: SpellVariantGroup;
    x: number;
    y: number;
  } | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Fetch des variants à chaque changement de classe */
  useEffect(() => {
    const breedId = CLASS_TO_BREED_ID[classId] ?? classId;
    let cancelled = false;

    setLoading(true);
    setError(null);
    setGroups([]);
    setSelectedGroupId(null);

    fetch(`https://api.dofusdb.fr/spell-variants?$limit=50&breedId=${breedId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Erreur HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        const data: SpellVariantGroup[] = d.data ?? [];
        data.sort((a, b) => {
          const aBase = pickBase(a.spells, classId);
          const bBase = pickBase(b.spells, classId);
          return (aBase?.order ?? 0) - (bBase?.order ?? 0);
        });
        setGroups(data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [classId]);

  const clearClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearClose();
    closeTimer.current = setTimeout(() => setHover(null), 200);
  }, [clearClose]);

  const handleGroupClick = useCallback((groupId: number) => {
    setSelectedGroupId((prev) => (prev === groupId ? null : groupId));
  }, []);

  const hasSelection = selectedGroupId !== null;

  /* Le tooltip suit toujours le curseur ; le "lock" est purement visuel */

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-[#2e2e2e] bg-[#181818]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_24px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between border-b border-[#222222] px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888888]">
          Sorts de classe
        </p>
        {loading && (
          <span className="text-[10px] text-[#555555]">Chargement…</span>
        )}
        {hasSelection && (
          <button
            type="button"
            onClick={() => setSelectedGroupId(null)}
            className="text-[10px] text-[#555555] hover:text-[#888888] transition"
          >
            ✕ Déverrouiller
          </button>
        )}
      </div>

      {error ? (
        <p className="p-4 text-[12px] text-red-400/90">{error}</p>
      ) : groups.length === 0 && !loading ? (
        <p className="p-4 text-[12px] text-[#444444]">Aucun sort trouvé.</p>
      ) : (
        <div
          className="grid p-3"
          style={{
            gridTemplateColumns: `repeat(11, ${ICON_SIZE}px)`,
            gap: "4px",
          }}
        >
          {groups.map((group) => {
            const baseSpell    = pickBase(group.spells, classId);
            const variantSpell = pickVariant(group.spells, classId);
            const isHovered    = hover?.group.id === group.id;
            const isSelected   = selectedGroupId === group.id;
            const isDimmed     = hasSelection && !isSelected;

            return (
              <div
                key={group.id}
                role="button"
                tabIndex={0}
                className={`flex flex-col gap-[3px] cursor-pointer rounded transition-opacity duration-150 ${
                  isDimmed ? "opacity-25" : "opacity-100"
                }`}
                onMouseEnter={(e) => {
                  clearClose();
                  setHover({ group, x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => {
                  if (hover?.group.id === group.id) {
                    setHover((h) =>
                      h ? { ...h, x: e.clientX, y: e.clientY } : null,
                    );
                  }
                }}
                onMouseLeave={scheduleHide}
                onClick={() => handleGroupClick(group.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleGroupClick(group.id);
                }}
              >
                {/* ── Sort de base ──────────────────────────────────── */}
                <div
                  title={baseSpell?.name.fr}
                  className={`overflow-hidden rounded-lg border bg-[#141414] transition-[border-color,box-shadow] ${
                    isSelected
                      ? "border-[#72bc1e] shadow-[0_0_0_2px_rgba(114,188,30,0.35)]"
                      : isHovered
                        ? "border-[#4a8000]/70"
                        : "border-[#2a2a2a]"
                  }`}
                  style={{ width: ICON_SIZE, height: ICON_SIZE }}
                >
                  {baseSpell && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={baseSpell.img}
                      alt={baseSpell.name.fr}
                      width={ICON_SIZE}
                      height={ICON_SIZE}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  )}
                </div>

                {/* ── Variante ──────────────────────────────────────── */}
                <div
                  title={variantSpell?.name.fr}
                  className={`relative overflow-hidden rounded-lg border bg-[#141414] transition-[border-color,box-shadow] ${
                    isSelected
                      ? "border-[#9070d0] shadow-[0_0_0_2px_rgba(144,112,208,0.35)]"
                      : isHovered
                        ? "border-[#5a4080]/70"
                        : "border-[#2a2a2a]"
                  }`}
                  style={{ width: ICON_SIZE, height: ICON_SIZE }}
                >
                  {variantSpell && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={variantSpell.img}
                      alt={variantSpell.name.fr}
                      width={ICON_SIZE}
                      height={ICON_SIZE}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  )}
                  {/* Badge V — variante */}
                  <span className="absolute bottom-0 right-0 rounded-tl bg-[#2a1a40]/80 px-[3px] py-[1px] text-[7px] font-bold leading-none text-[#b090e0]">
                    V
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hover && (
        <SpellCompareTooltip
          group={hover.group}
          classId={classId}
          anchor={{ x: hover.x, y: hover.y }}
          onMouseEnter={clearClose}
          onMouseLeave={scheduleHide}
        />
      )}
    </section>
  );
}
