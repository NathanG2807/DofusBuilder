# Journal de suivi - DIA Project

## Dernière mise à jour : 2026-04-11

## Ordre de développement (référence DIA_SPEC)

| Ordre | Module | Contenu principal |
| :---: | :--- | :--- |
| 0 | Configuration | `.env`, Docker / DB locale, structure des dossiers |
| 1 | ETL & Data | script Python, mapping ActionID, ingestion SQL |
| 2 | Backend API | FastAPI, modèles Pydantic, auth JWT |
| 3 | Solver Engine | OR-Tools, conditions, bonus panoplies |
| 4 | Frontend Core | Next.js, Zustand, grille inventaire |
| 5 | AI Agent | tool calling, Vercel AI SDK, prompt système |
| 6 | Persistance | sauvegarde build, partage de lien |

**État actuel :** module **6 (Persistance)** — table **`builds`** enrichie (**`total_stats`**, **`active_set_bonuses`** JSONB) ; **`PersistBuildPanel`** : inscription / connexion (JWT en **`localStorage`**), sauvegarde du build courant, liste, chargement, suppression, **copie du lien** ; route **`/build/[buildId]`** charge un build **public** sans compte. Migration **`db/migrate_002_build_snapshot.sql`** pour bases déjà initialisées. **Pistes suivantes :** itérations UI (drag & drop, recherche d’objets), raffinements auth, slugs courts optionnels.

## Tâches terminées (module 4)

- Dépendance **`zustand`**.
- Types API alignés backend (`types/api.ts`).
- `lib/slots.ts` : emplacements = même ordre que le solver Python.
- `lib/api.ts` : `NEXT_PUBLIC_API_URL` (défaut `http://127.0.0.1:8000`), `runOptimize`, `fetchItem`.
- Store : `currentBuild`, `stats`, `activeSetBonuses`, `itemById`, `updateSlot`, `syncWithAI`, `resetBuild`, `applyFullBuild`, `prefetchEquippedItems`.
- UI : `DashboardApp` (split : chat placeholder + dashboard), `InventoryGrid`, `OptimizePanel`, `StatsPanel`, `ChatPlaceholder`.
- `next.config.ts` : `images.remotePatterns` pour `api.dofusdu.de` (si passage à `next/image` plus tard).
- Fichier **`frontend/.env.local.example`**.

## Fichiers créés ou modifiés (module 4)

- `frontend/package.json` (+ zustand)
- `frontend/types/api.ts`
- `frontend/lib/slots.ts`, `frontend/lib/api.ts`
- `frontend/store/build-store.ts`
- `frontend/components/dashboard/*`, `frontend/components/chat/ChatPlaceholder.tsx`
- `frontend/app/page.tsx`, `frontend/app/layout.tsx`
- `frontend/next.config.ts`
- `frontend/.env.local.example`

## Tâches terminées (module 5)

- Dépendances **`ai`**, **`@ai-sdk/anthropic`**, **`@ai-sdk/react`**, **`zod`**.
- **`app/api/chat/route.ts`** : `streamText` (Anthropic), outil **`optimize_build`** (`fetch` vers le solver), `stopWhen: stepCountIs(12)`, réponse UI stream ; **503** si pas de clé.
- **`components/chat/ChatPanel.tsx`** : `useChat` + `DefaultChatTransport`, rendu texte + outil, **`onFinish`** → `applyFullBuild` + `prefetchEquippedItems`.
- **`DashboardApp`** : panneau gauche = **`ChatPanel`** (remplace le placeholder).
- **`frontend/.env.local.example`** : `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `BACKEND_URL`.

## Fichiers créés ou modifiés (module 5)

- `frontend/app/api/chat/route.ts`
- `frontend/components/chat/ChatPanel.tsx`
- `frontend/components/dashboard/DashboardApp.tsx`
- `frontend/.env.local.example`
- `followup.md`

## Tâches terminées (module 6)

- **`db/init.sql`** + **`db/migrate_002_build_snapshot.sql`** : colonnes snapshot sur **`builds`**.
- **Backend** : modèle **`Build`**, schémas **`BuildCreate` / `BuildUpdate` / `BuildOut`**, création de build avec stats.
- **`lib/auth.ts`**, **`lib/api.ts`** : register, login, me, CRUD builds côté client ; **`getBuildById`** sans header (partage public).
- **Store** : **`hydrateFromPersistedBuild`**.
- **`PersistBuildPanel`**, page **`/build/[buildId]`**, **`DashboardApp`** mis à jour.

## Fichiers créés ou modifiés (module 6)

- `db/init.sql`, `db/migrate_002_build_snapshot.sql`
- `backend/app/models/build.py`, `backend/app/schemas.py`, `backend/app/routers/builds.py`
- `frontend/lib/auth.ts`, `frontend/lib/api.ts`, `frontend/types/api.ts`, `frontend/store/build-store.ts`
- `frontend/components/dashboard/PersistBuildPanel.tsx`, `frontend/components/dashboard/DashboardApp.tsx`
- `frontend/app/build/[buildId]/page.tsx`
- `followup.md`

## Travail en cours / pistes

- Drag & drop, tooltips détaillés (jets), recherche d’objets par slot.
- Slugs de partage courts, édition de build nommé côté API depuis l’UI.

## Notes techniques

- Front : `cd frontend`, `npm install`, `npm run dev` (souvent port **3000**). Copier `.env.local.example` → `.env.local` ; pour l’assistant IA, renseigner **`ANTHROPIC_API_KEY`**.
- Back : `uvicorn` sur **8000** ; CORS déjà ouvert pour `localhost:3000` et `127.0.0.1:3000`.
- DB : `docker compose up -d` à la racine du repo. Si la base existait **avant** le module 6, exécuter une fois **`db/migrate_002_build_snapshot.sql`** (ou recréer le volume).
