"use client";

import { createContext, useContext } from "react";

/** Contexte réservé à l'infobulle arme : bonus CC natif + nombre de coups sélectionné. */
export type WeaponCombatCtx = {
  weaponCritBonusFlat: number;
  weaponHits: number;
};

const WeaponCombatContext = createContext<WeaponCombatCtx | null>(null);

export function WeaponCombatProvider({
  weaponCritBonusFlat,
  weaponHits,
  children,
}: {
  weaponCritBonusFlat: number;
  weaponHits: number;
  children: React.ReactNode;
}) {
  return (
    <WeaponCombatContext.Provider value={{ weaponCritBonusFlat, weaponHits }}>
      {children}
    </WeaponCombatContext.Provider>
  );
}

export function useWeaponCombat(): WeaponCombatCtx | null {
  return useContext(WeaponCombatContext);
}
