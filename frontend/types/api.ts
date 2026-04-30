/** Aligné sur `app/schemas.py` (backend). */

export type ItemEffectLine = {
  formatted?: string;
  type?: { name?: string; id?: number };
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
};

export type OptimizationRequest = {
  level: number;
  class_id: number;
  elements: string[];
  min_pa: number;
  min_pm: number;
  focus_stats: string[];
  mode: "solver" | "genetic";
};

/** Aligné sur `BuildOut` (backend). */
export type BuildOut = {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  class_id: number | null;
  level: number | null;
  slots: Record<string, number | null> | null;
  total_stats: Record<string, number> | null;
  active_set_bonuses: string[] | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type BuildCreatePayload = {
  name: string;
  description?: string | null;
  class_id?: number | null;
  level?: number | null;
  slots?: Record<string, number | null> | null;
  total_stats?: Record<string, number> | null;
  active_set_bonuses?: string[] | null;
  is_public?: boolean;
};

export type UserPublic = {
  id: string;
  username: string;
  email: string;
  created_at: string;
};
