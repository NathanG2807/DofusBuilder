"use client";

import { createContext, useContext } from "react";

/** Contexte réservé à l’infobulle arme : bonus CC « natif » (critical_hit_bonus). */
export type WeaponCombatCtx = {
  weaponCritBonusFlat: number;
};

const WeaponCombatContext = createContext<WeaponCombatCtx | null>(null);

export function WeaponCombatProvider({
  weaponCritBonusFlat,
  children,
}: {
  weaponCritBonusFlat: number;
  children: React.ReactNode;
}) {
  return (
    <WeaponCombatContext.Provider value={{ weaponCritBonusFlat }}>
      {children}
    </WeaponCombatContext.Provider>
  );
}

export function useWeaponCombat(): WeaponCombatCtx | null {
  return useContext(WeaponCombatContext);
}
