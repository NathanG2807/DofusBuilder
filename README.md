# Zaap Builder

Plateforme de theorycrafting pour **Dofus 3** : compose ton équipement, optimise tes stats, sauvegarde et partage tes builds avec la communauté.

**Démo :** [zaaap.vercel.app](https://zaaap.vercel.app) · **Discord :** [rejoindre le serveur](https://discord.gg/hj6Yy4Dcz)

> Fan site communautaire non officiel. Dofus et tous les contenus associés sont la propriété d’[Ankama Games](https://www.ankama.com/).

---

## Fonctionnalités

- **Builder** — équipement par emplacement, stats en temps réel, bonus de panoplie
- **Optimiseur** — recherche de stuff via moteur de contraintes (OR-Tools)
- **Assistant IA** — optimisation guidée par conversation (Anthropic)
- **Partage** — builds publics, liens permanents, catalogue communautaire, upvotes
- **Atelier** — listes de craft et suivi des ressources
- **Comptes** — inscription, authentification JWT, profils publics

---

## Stack

| Couche | Technologies |
|--------|----------------|
| Frontend | Next.js, React, TypeScript, Tailwind CSS, Zustand |
| Backend | FastAPI, SQLAlchemy (async), Pydantic |
| Base de données | PostgreSQL 16 + pgvector |
| Optimisation | Google OR-Tools |
| Données jeu | [API DofusDude](https://docs.dofusdu.de/) |

---

## Prérequis

- [Node.js](https://nodejs.org/) 20+
- [Python](https://www.python.org/) 3.11+
- [Docker](https://www.docker.com/) (PostgreSQL)

---

## Démarrage rapide

### 1. Cloner le dépôt

```bash
git clone https://github.com/NathanG2807/DofusBuilder.git
cd DofusBuilder
```

### 2. Base de données

```bash
docker compose up -d
```

PostgreSQL est exposé sur le port **5433**  
(`user` / `password` / `database` : `postgres` / `postgres` / `dofusbuilder`).

### 3. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Crée un fichier `.env` à la **racine** du dépôt :

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5433/dofusbuilder
JWT_SECRET=change-me-in-production
FRONTEND_URL=http://localhost:3000
```

Lance l’API :

```bash
uvicorn app.main:app --reload --app-dir .
```

- API : [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Healthcheck : [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- Docs OpenAPI : [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 4. Importer les données du jeu

```bash
cd backend
python -m etl.ingest
```

### 5. Frontend

```bash
cd frontend
npm install
```

Crée `frontend/.env.local` :

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

# Optionnel — assistant IA
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-5
BACKEND_URL=http://127.0.0.1:8000
```

```bash
npm run dev
```

Application : [http://localhost:3000](http://localhost:3000)

---

## Structure du projet

```text
DofusBuilder/
├── backend/             # API FastAPI, solver, ETL
│   ├── app/             # Routes, modèles, sécurité, solver
│   └── etl/             # Import depuis l’API DofusDude
├── frontend/            # Application Next.js
├── db/                  # Scripts SQL d’initialisation & migrations
└── docker-compose.yml   # PostgreSQL local
```

---

## Variables d’environnement

| Variable | Emplacement | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | `.env` (racine) | Connexion PostgreSQL |
| `JWT_SECRET` | `.env` (racine) | Secret de signature des tokens (**fort en production**) |
| `FRONTEND_URL` | `.env` (racine) | URL du front (liens de reset password, etc.) |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | URL de l’API côté navigateur |
| `ANTHROPIC_API_KEY` | `frontend/.env.local` | Clé API pour l’assistant IA (optionnel) |
| `BACKEND_URL` | `frontend/.env.local` | URL interne de l’API pour les routes serveur Next.js |

---

## Licence & mentions légales

Projet open source à usage communautaire.

- Données de jeu fournies via l’API communautaire [DofusDude](https://docs.dofusdu.de/)
- **Dofus** © Ankama — ce projet n’est **pas affilié** à Ankama Games

---

## Auteur

Maintenu par [NathanG2807](https://github.com/NathanG2807)
