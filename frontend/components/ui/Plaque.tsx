"use client";

import Link from "next/link";
import React from "react";

import { cn } from "@/lib/cn";

type PlaqueOwnProps = {
  /** Ajoute les coins gravés + grain de matière (réservé aux plaques "vitrine"). */
  ornate?: boolean;
  /** Effet de soulèvement au survol/focus. */
  interactive?: boolean;
  /** Variante plus discrète pour les éléments imbriqués (lignes de liste, etc.). */
  flat?: boolean;
};

type PlaqueProps = PlaqueOwnProps & React.HTMLAttributes<HTMLDivElement>;

export function Plaque({ ornate, interactive, flat, className, children, ...props }: PlaqueProps) {
  return (
    <div
      className={cn(
        flat ? "plaque-flat" : "plaque",
        ornate && "plaque-ornate",
        interactive && "plaque-interactive",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type PlaqueLinkProps = PlaqueOwnProps &
  React.ComponentProps<typeof Link> & { className?: string };

/** Variante navigable (Link) de la plaque, pour les cartes de destination. */
export function PlaqueLink({ ornate, interactive = true, flat, className, children, ...props }: PlaqueLinkProps) {
  return (
    <Link
      className={cn(
        flat ? "plaque-flat" : "plaque",
        ornate && "plaque-ornate",
        interactive && "plaque-interactive",
        "block",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
