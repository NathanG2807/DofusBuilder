/** Aligné sur `app/schemas.py` (backend). */

export type ItemEffectLine = {
  formatted?: string;
  type?: { name?: string; id?: number };
};

export type WeaponDetailOut = {
  ap_cost?: number;
  range?: { min?: number; max?: number };
  critical_hit_probability?: number;
  critical_hit_bonus?: number;
  max_cast_per_turn?: number;
  cast_in_line?: boolean;
  cast_in_diagonal?: boolean;
  cast_test_los?: boolean;
};

export type ItemOut = {
  ankama_id: number;
  name: string;
  level: number;
  type_name_id: string | null;
  is_weapon: boolean;
  image_url_icon: string | null;
  effects?: ItemEffectLine[] | null;
  conditions?: unknown;
  parent_set_id?: number | null;
  pods?: number | null;
  base_stats: Record<string, number> | null;
  description?: string | null;
  /** Métadonnées de combat arme (coup en PA, portée, CC, coups/tour…) — après migration + ETL. */
  weapon_detail?: WeaponDetailOut | null;
};

export type ItemSetOut = {
  ankama_id: number;
  name: string | null;
  equipment_ids: number[] | null;
  bonus_effects: Record<string, unknown> | null;
};

export type ItemSetListResponse = {
  sets: ItemSetOut[];
  total: number;
  page: number;
  page_size: number;
};

export type ItemListResponse = {
  items: ItemOut[];
  total: number;
  page: number;
  page_size: number;
};

export type ActiveSetDetail = {
  name: string;
  set_id: number;
  piece_count: number;
  total_pieces: number;
  effects: string[];
};

export type FullBuild = {
  slots: Record<string, number | null>;
  total_stats: Record<string, number>;
  active_set_bonuses: string[];
  active_set_details?: ActiveSetDetail[];
  exo_pa?: boolean;
  exo_pm?: boolean;
};

export type OptimizationRequest = {
  level: number;
  class_id: number;
  elements: string[];
  min_pa: number;
  min_pm: number;
  focus_stats: string[];
  allow_exo_pa?: boolean;
  allow_exo_pm?: boolean;
  allow_dofus?: boolean;
  allow_prysmaradite?: boolean;
  mode: "solver" | "genetic";
  /** Poids personnalisés par stat (1-10). Si absent = poids par défaut du solver. */
  stat_weights?: Record<string, number>;
  /** Slots verrouillés : emplacement → ankama_id. Ces items seront conservés dans le build optimisé. */
  locked_slots?: Record<string, number>;
};

/** Aligné sur `BuildOut` (backend). */
export type BuildOut = {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  class_id: number | null;
  level: number | null;
  sex: string | null;
  slots: Record<string, number | null> | null;
  total_stats: Record<string, number> | null;
  active_set_bonuses: string[] | null;
  char_stats: Record<string, number> | null;
  parcho_stats: Record<string, number> | null;
  exo_fm: Record<string, string> | null;
  locked_slots: Record<string, number> | null;
  is_public: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BuildCreatePayload = {
  name: string;
  description?: string | null;
  class_id?: number | null;
  level?: number | null;
  sex?: string | null;
  slots?: Record<string, number | null> | null;
  total_stats?: Record<string, number> | null;
  active_set_bonuses?: string[] | null;
  char_stats?: Record<string, number> | null;
  parcho_stats?: Record<string, number> | null;
  exo_fm?: Record<string, string> | null;
  locked_slots?: Record<string, number> | null;
  is_public?: boolean;
};

export type UserPublic = {
  id: string;
  username: string;
  email: string;
  created_at: string;
};
