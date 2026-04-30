# Spécifications Techniques Détaillées : Dofus Intelligence Architect (DIA)

## 1. Vue d'Ensemble
**DIA** est une application web de theorycrafting pour Dofus 3 (Unity). Elle combine une interface de build classique (type Dofusbook) avec un moteur d'optimisation piloté par IA (Claude 3.5 Sonnet) et des algorithmes mathématiques (OR-Tools / Algorithmes Génétiques).

---

## 2. Architecture des Données (PostgreSQL)

### 2.1 Schéma des Tables
```sql
-- Extension pour la recherche sémantique (RAG futur pour les guides)
CREATE EXTENSION IF NOT EXISTS pgvector;

-- Table des Items (Synchronisée via l'API dofusdu.de)
CREATE TABLE items (
    ankama_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    level INTEGER NOT NULL,
    type_name_id VARCHAR(100), -- ex: 'boots', 'sword'
    is_weapon BOOLEAN DEFAULT FALSE,
    image_url_icon TEXT,
    effects JSONB, -- Liste d'objets {id, min, max, formatted}
    conditions JSONB, -- Arbre récursif de ConditionNode (prérequis)
    parent_set_id INTEGER,
    pods INTEGER,
    base_stats JSONB, -- Extraction aplatie des stats max pour le Solver (ex: {"strength": 80})
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des Panoplies (Sets)
CREATE TABLE item_sets (
    ankama_id INTEGER PRIMARY KEY,
    name VARCHAR(255),
    equipment_ids INTEGER[], -- Array des IDs des items appartenant à la panoplie
    bonus_effects JSONB -- Map des bonus par palier : {"2": [{"id": 111, "max": 1}], "3": [...]}
);

-- Table des Utilisateurs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des Builds (Stuffs enregistrés par les utilisateurs)
CREATE TABLE builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    class_id INTEGER,
    level INTEGER,
    slots JSONB, -- Map des équipements : {"hat": 13971, "cloak": 13972, "ring1": 1234, ...}
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Contrats d'Interface API (FastAPI / Pydantic)

Ces modèles définissent la structure stricte des données échangées entre le Frontend, le LLM (via Tool Calling) et le Solver mathématique.

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict

# Représentation d'une statistique d'item
class ItemEffect(BaseModel):
    id: int
    min: Optional[int]
    max: int
    formatted: str

# Représentation du Build final renvoyé au Frontend
class FullBuild(BaseModel):
    slots: Dict[str, Optional[int]] # Mapping: slot_name -> ankama_id
    total_stats: Dict[str, int]     # Addition des stats + bonus panoplies
    active_set_bonuses: List[str]   # Noms des panoplies activées

# Requête générée par le LLM ou envoyée par l'UI pour déclencher l'optimisation
class OptimizationRequest(BaseModel):
    level: int = Field(default=200, description="Niveau maximum des équipements")
    class_id: int = Field(description="ID de la classe du personnage")
    elements: List[str] = Field(description="Éléments principaux souhaités (ex: ['strength', 'intelligence'])")
    min_pa: int = Field(default=11, description="Nombre minimum de Points d'Action requis")
    min_pm: int = Field(default=6, description="Nombre minimum de Points de Mouvement requis")
    focus_stats: List[str] = Field(default_factory=list, description="Stats annexes à maximiser (ex: ['damage_earth', 'critical_hit'])")
    mode: str = Field(default="solver", description="'solver' pour l'optimum unique, 'genetic' pour des variantes")
```

---

## 4. Moteur d'Optimisation (OR-Tools)

Le Solver utilise la **Programmation Linéaire en Nombres Entiers (MIP)** pour trouver la combinaison parfaite.

### 4.1 Variables de décision
Pour chaque emplacement d'équipement `s` (chapeau, cape, etc.) et chaque objet `i` éligible (filtré par niveau) :
* Soit `x_{s,i} ∈ {0, 1}` (1 si l'objet est équipé, 0 sinon).

### 4.2 Exemples de Contraintes Linéaires (Python / OR-Tools)
```python
# 1. Contrainte d'unicité : Un seul item par emplacement
for s in slots:
    solver.Add(solver.Sum([x[s, i] for i in eligible_items[s]]) == 1)

# 2. Contrainte PA minimum (incluant items + stat de base du niveau 1)
pa_expr = solver.Sum([items[i].stats.get("AP", 0) * x[s, i] for s in slots for i in eligible_items[s]]) 
# Note : Il faudra ajouter la gestion des bonus de panoplie dynamiques ici
solver.Add(pa_expr + base_pa >= min_pa)
```

### 4.3 Parsing des Conditions (Arbre API)
Les prérequis des objets (`ConditionNode` de l'API) sont convertis dynamiquement en contraintes :
Si l'item X nécessite "Force > 600", on ajoute la contrainte :
* `Somme(Force des autres items équipés) >= 600 * x_{emplacement, X}`

---

## 5. Frontend & Generative UI (React / Next.js)

### 5.1 Gestion d'état Global (Zustand)
Le store TypeScript sert de "Source de Vérité" pour le dashboard et l'interface de chat IA.

```typescript
interface BuildState {
  // L'inventaire en cours d'édition
  currentBuild: Record<string, number | null>; // ex: { "hat": 13971, "cloak": null }
  
  // Les statistiques totales calculées dynamiquement
  stats: Record<string, number>;
  
  // Actions
  updateSlot: (slot: string, itemId: number | null) => void;
  syncWithAI: (newBuild: Record<string, number>) => void; // Appelé quand le Solver a fini
}
```

### 5.2 Expérience Utilisateur (Vercel AI SDK)
L'interface est divisée en deux (Split Screen) :
1. **Chat Panel (Gauche) :** Utilise `useChat` pour streamer les messages du LLM. L'IA demande des précisions, valide les choix et explique les compromis du build généré.
2. **Dashboard (Droite) :** Écoute le store Zustand. Dès que l'IA déclenche le Tool Calling `OptimizationRequest`, le backend calcule, puis renvoie un JSON qui met à jour visuellement les slots de l'inventaire en temps réel.

---

## 6. Workflow de Développement pour l'IA (Cursor)

1.  **Ingénierie de la donnée (ETL) :** Créer le script Python pour aspirer `api.dofusdu.de`, aplatir les `effects` complexes en `base_stats` simples à manipuler, et populer la base PostgreSQL.
2.  **Moteur Backend :** Implémenter le micro-service de calcul (`SolverEngine`).
3.  **API / Orchestration :** Connecter FastAPI au Vercel AI SDK, configurer Claude 3.5 Sonnet avec les descriptions précises des Tools.
4.  **UI Components :** Développer l'interface d'inventaire interactif (Drag & Drop, affichage des jets, tooltips) avec TailwindCSS et Shadcn/ui.

---

## 7. Ressources Externes
* **Documentation API Source :** `https://docs.dofusdu.de/dofus3/v1/`
* **Format des images :** Utiliser la propriété `image_urls.hq` fournie par l'API pour un rendu net dans l'inventaire.# Spécifications Techniques Détaillées : Dofus Intelligence Architect (DIA)

## 1. Vue d'Ensemble
**DIA** est une application web de theorycrafting pour Dofus 3 (Unity). Elle combine une interface de build classique (type Dofusbook) avec un moteur d'optimisation piloté par IA (Claude 3.5 Sonnet) et des algorithmes mathématiques (OR-Tools / Algorithmes Génétiques).

---

## 2. Architecture des Données (PostgreSQL)

### 2.1 Schéma des Tables
```sql
-- Extension pour la recherche sémantique (RAG futur pour les guides)
CREATE EXTENSION IF NOT EXISTS pgvector;

-- Table des Items (Synchronisée via l'API dofusdu.de)
CREATE TABLE items (
    ankama_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    level INTEGER NOT NULL,
    type_name_id VARCHAR(100), -- ex: 'boots', 'sword'
    is_weapon BOOLEAN DEFAULT FALSE,
    image_url_icon TEXT,
    effects JSONB, -- Liste d'objets {id, min, max, formatted}
    conditions JSONB, -- Arbre récursif de ConditionNode (prérequis)
    parent_set_id INTEGER,
    pods INTEGER,
    base_stats JSONB, -- Extraction aplatie des stats max pour le Solver (ex: {"strength": 80})
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des Panoplies (Sets)
CREATE TABLE item_sets (
    ankama_id INTEGER PRIMARY KEY,
    name VARCHAR(255),
    equipment_ids INTEGER[], -- Array des IDs des items appartenant à la panoplie
    bonus_effects JSONB -- Map des bonus par palier : {"2": [{"id": 111, "max": 1}], "3": [...]}
);

-- Table des Utilisateurs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des Builds (Stuffs enregistrés par les utilisateurs)
CREATE TABLE builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    class_id INTEGER,
    level INTEGER,
    slots JSONB, -- Map des équipements : {"hat": 13971, "cloak": 13972, "ring1": 1234, ...}
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Contrats d'Interface API (FastAPI / Pydantic)

Ces modèles définissent la structure stricte des données échangées entre le Frontend, le LLM (via Tool Calling) et le Solver mathématique.

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict

# Représentation d'une statistique d'item
class ItemEffect(BaseModel):
    id: int
    min: Optional[int]
    max: int
    formatted: str

# Représentation du Build final renvoyé au Frontend
class FullBuild(BaseModel):
    slots: Dict[str, Optional[int]] # Mapping: slot_name -> ankama_id
    total_stats: Dict[str, int]     # Addition des stats + bonus panoplies
    active_set_bonuses: List[str]   # Noms des panoplies activées

# Requête générée par le LLM ou envoyée par l'UI pour déclencher l'optimisation
class OptimizationRequest(BaseModel):
    level: int = Field(default=200, description="Niveau maximum des équipements")
    class_id: int = Field(description="ID de la classe du personnage")
    elements: List[str] = Field(description="Éléments principaux souhaités (ex: ['strength', 'intelligence'])")
    min_pa: int = Field(default=11, description="Nombre minimum de Points d'Action requis")
    min_pm: int = Field(default=6, description="Nombre minimum de Points de Mouvement requis")
    focus_stats: List[str] = Field(default_factory=list, description="Stats annexes à maximiser (ex: ['damage_earth', 'critical_hit'])")
    mode: str = Field(default="solver", description="'solver' pour l'optimum unique, 'genetic' pour des variantes")
```

---

## 4. Moteur d'Optimisation (OR-Tools)

Le Solver utilise la **Programmation Linéaire en Nombres Entiers (MIP)** pour trouver la combinaison parfaite.

### 4.1 Variables de décision
Pour chaque emplacement d'équipement `s` (chapeau, cape, etc.) et chaque objet `i` éligible (filtré par niveau) :
* Soit `x_{s,i} ∈ {0, 1}` (1 si l'objet est équipé, 0 sinon).

### 4.2 Exemples de Contraintes Linéaires (Python / OR-Tools)
```python
# 1. Contrainte d'unicité : Un seul item par emplacement
for s in slots:
    solver.Add(solver.Sum([x[s, i] for i in eligible_items[s]]) == 1)

# 2. Contrainte PA minimum (incluant items + stat de base du niveau 1)
pa_expr = solver.Sum([items[i].stats.get("AP", 0) * x[s, i] for s in slots for i in eligible_items[s]]) 
# Note : Il faudra ajouter la gestion des bonus de panoplie dynamiques ici
solver.Add(pa_expr + base_pa >= min_pa)
```

### 4.3 Parsing des Conditions (Arbre API)
Les prérequis des objets (`ConditionNode` de l'API) sont convertis dynamiquement en contraintes :
Si l'item X nécessite "Force > 600", on ajoute la contrainte :
* `Somme(Force des autres items équipés) >= 600 * x_{emplacement, X}`

---

## 5. Frontend & Generative UI (React / Next.js)

### 5.1 Gestion d'état Global (Zustand)
Le store TypeScript sert de "Source de Vérité" pour le dashboard et l'interface de chat IA.

```typescript
interface BuildState {
  // L'inventaire en cours d'édition
  currentBuild: Record<string, number | null>; // ex: { "hat": 13971, "cloak": null }
  
  // Les statistiques totales calculées dynamiquement
  stats: Record<string, number>;
  
  // Actions
  updateSlot: (slot: string, itemId: number | null) => void;
  syncWithAI: (newBuild: Record<string, number>) => void; // Appelé quand le Solver a fini
}
```

### 5.2 Expérience Utilisateur (Vercel AI SDK)
L'interface est divisée en deux (Split Screen) :
1. **Chat Panel (Gauche) :** Utilise `useChat` pour streamer les messages du LLM. L'IA demande des précisions, valide les choix et explique les compromis du build généré.
2. **Dashboard (Droite) :** Écoute le store Zustand. Dès que l'IA déclenche le Tool Calling `OptimizationRequest`, le backend calcule, puis renvoie un JSON qui met à jour visuellement les slots de l'inventaire en temps réel.

---

## 6. Workflow de Développement pour l'IA (Cursor)

1.  **Ingénierie de la donnée (ETL) :** Créer le script Python pour aspirer `api.dofusdu.de`, aplatir les `effects` complexes en `base_stats` simples à manipuler, et populer la base PostgreSQL.
2.  **Moteur Backend :** Implémenter le micro-service de calcul (`SolverEngine`).
3.  **API / Orchestration :** Connecter FastAPI au Vercel AI SDK, configurer Claude 3.5 Sonnet avec les descriptions précises des Tools.
4.  **UI Components :** Développer l'interface d'inventaire interactif (Drag & Drop, affichage des jets, tooltips) avec TailwindCSS et Shadcn/ui.

---

## 7. Ressources Externes
* **Documentation API Source :** `https://docs.dofusdu.de/dofus3/v1/`
* **Format des images :** Utiliser la propriété `image_urls.hq` fournie par l'API pour un rendu net dans l'inventaire.# Spécifications Techniques Détaillées : Dofus Intelligence Architect (DIA)

## 1. Vue d'Ensemble
**DIA** est une application web de theorycrafting pour Dofus 3 (Unity). Elle combine une interface de build classique (type Dofusbook) avec un moteur d'optimisation piloté par IA (Claude 3.5 Sonnet) et des algorithmes mathématiques (OR-Tools / Algorithmes Génétiques).

---

## 2. Architecture des Données (PostgreSQL)

### 2.1 Schéma des Tables
```sql
-- Extension pour la recherche sémantique (RAG futur pour les guides)
CREATE EXTENSION IF NOT EXISTS pgvector;

-- Table des Items (Synchronisée via l'API dofusdu.de)
CREATE TABLE items (
    ankama_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    level INTEGER NOT NULL,
    type_name_id VARCHAR(100), -- ex: 'boots', 'sword'
    is_weapon BOOLEAN DEFAULT FALSE,
    image_url_icon TEXT,
    effects JSONB, -- Liste d'objets {id, min, max, formatted}
    conditions JSONB, -- Arbre récursif de ConditionNode (prérequis)
    parent_set_id INTEGER,
    pods INTEGER,
    base_stats JSONB, -- Extraction aplatie des stats max pour le Solver (ex: {"strength": 80})
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des Panoplies (Sets)
CREATE TABLE item_sets (
    ankama_id INTEGER PRIMARY KEY,
    name VARCHAR(255),
    equipment_ids INTEGER[], -- Array des IDs des items appartenant à la panoplie
    bonus_effects JSONB -- Map des bonus par palier : {"2": [{"id": 111, "max": 1}], "3": [...]}
);

-- Table des Utilisateurs
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des Builds (Stuffs enregistrés par les utilisateurs)
CREATE TABLE builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    class_id INTEGER,
    level INTEGER,
    slots JSONB, -- Map des équipements : {"hat": 13971, "cloak": 13972, "ring1": 1234, ...}
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Contrats d'Interface API (FastAPI / Pydantic)

Ces modèles définissent la structure stricte des données échangées entre le Frontend, le LLM (via Tool Calling) et le Solver mathématique.

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict

# Représentation d'une statistique d'item
class ItemEffect(BaseModel):
    id: int
    min: Optional[int]
    max: int
    formatted: str

# Représentation du Build final renvoyé au Frontend
class FullBuild(BaseModel):
    slots: Dict[str, Optional[int]] # Mapping: slot_name -> ankama_id
    total_stats: Dict[str, int]     # Addition des stats + bonus panoplies
    active_set_bonuses: List[str]   # Noms des panoplies activées

# Requête générée par le LLM ou envoyée par l'UI pour déclencher l'optimisation
class OptimizationRequest(BaseModel):
    level: int = Field(default=200, description="Niveau maximum des équipements")
    class_id: int = Field(description="ID de la classe du personnage")
    elements: List[str] = Field(description="Éléments principaux souhaités (ex: ['strength', 'intelligence'])")
    min_pa: int = Field(default=11, description="Nombre minimum de Points d'Action requis")
    min_pm: int = Field(default=6, description="Nombre minimum de Points de Mouvement requis")
    focus_stats: List[str] = Field(default_factory=list, description="Stats annexes à maximiser (ex: ['damage_earth', 'critical_hit'])")
    mode: str = Field(default="solver", description="'solver' pour l'optimum unique, 'genetic' pour des variantes")
```

---

## 4. Moteur d'Optimisation (OR-Tools)

Le Solver utilise la **Programmation Linéaire en Nombres Entiers (MIP)** pour trouver la combinaison parfaite.

### 4.1 Variables de décision
Pour chaque emplacement d'équipement `s` (chapeau, cape, etc.) et chaque objet `i` éligible (filtré par niveau) :
* Soit `x_{s,i} ∈ {0, 1}` (1 si l'objet est équipé, 0 sinon).

### 4.2 Exemples de Contraintes Linéaires (Python / OR-Tools)
```python
# 1. Contrainte d'unicité : Un seul item par emplacement
for s in slots:
    solver.Add(solver.Sum([x[s, i] for i in eligible_items[s]]) == 1)

# 2. Contrainte PA minimum (incluant items + stat de base du niveau 1)
pa_expr = solver.Sum([items[i].stats.get("AP", 0) * x[s, i] for s in slots for i in eligible_items[s]]) 
# Note : Il faudra ajouter la gestion des bonus de panoplie dynamiques ici
solver.Add(pa_expr + base_pa >= min_pa)
```

### 4.3 Parsing des Conditions (Arbre API)
Les prérequis des objets (`ConditionNode` de l'API) sont convertis dynamiquement en contraintes :
Si l'item X nécessite "Force > 600", on ajoute la contrainte :
* `Somme(Force des autres items équipés) >= 600 * x_{emplacement, X}`

---

## 5. Frontend & Generative UI (React / Next.js)

### 5.1 Gestion d'état Global (Zustand)
Le store TypeScript sert de "Source de Vérité" pour le dashboard et l'interface de chat IA.

```typescript
interface BuildState {
  // L'inventaire en cours d'édition
  currentBuild: Record<string, number | null>; // ex: { "hat": 13971, "cloak": null }
  
  // Les statistiques totales calculées dynamiquement
  stats: Record<string, number>;
  
  // Actions
  updateSlot: (slot: string, itemId: number | null) => void;
  syncWithAI: (newBuild: Record<string, number>) => void; // Appelé quand le Solver a fini
}
```

### 5.2 Expérience Utilisateur (Vercel AI SDK)
L'interface est divisée en deux (Split Screen) :
1. **Chat Panel (Gauche) :** Utilise `useChat` pour streamer les messages du LLM. L'IA demande des précisions, valide les choix et explique les compromis du build généré.
2. **Dashboard (Droite) :** Écoute le store Zustand. Dès que l'IA déclenche le Tool Calling `OptimizationRequest`, le backend calcule, puis renvoie un JSON qui met à jour visuellement les slots de l'inventaire en temps réel.

---

## 6. Workflow de Développement pour l'IA (Cursor)

1.  **Ingénierie de la donnée (ETL) :** Créer le script Python pour aspirer `api.dofusdu.de`, aplatir les `effects` complexes en `base_stats` simples à manipuler, et populer la base PostgreSQL.
2.  **Moteur Backend :** Implémenter le micro-service de calcul (`SolverEngine`).
3.  **API / Orchestration :** Connecter FastAPI au Vercel AI SDK, configurer Claude 3.5 Sonnet avec les descriptions précises des Tools.
4.  **UI Components :** Développer l'interface d'inventaire interactif (Drag & Drop, affichage des jets, tooltips) avec TailwindCSS et Shadcn/ui.

---

## 7. Ressources Externes
* **Documentation API Source :** `https://docs.dofusdu.de/dofus3/v1/`
* **Format des images :** Utiliser la propriété `image_urls.hq` fournie par l'API pour un rendu net dans l'inventaire.

---

## 8. État d'Avancement & Checklist des Modules

Ce tableau doit être consulté par l'IA pour prioriser les tâches.

| Module | État | Composants Clés |
| :--- | :--- | :--- |
| **0. Configuration** | 🔄 En cours | .env, Docker/DB local, Structure dossiers |
| **1. ETL & Data** | 🟥 À faire | Script Python, Mapping ActionID, Ingestion SQL |
| **2. Backend API** | 🟥 À faire | FastAPI, Modèles Pydantic, Auth JWT |
| **3. Solver Engine** | 🟥 À faire | Logique OR-Tools, Gestion Conditions, Bonus Sets |
| **4. Frontend Core** | 🟥 À faire | Next.js, Zustand Store, Grille Inventaire |
| **5. AI Agent** | 🟥 À faire | Tool Calling, Streaming Vercel SDK, System Prompt |
| **6. Persistance** | 🟥 À faire | Sauvegarde build (JSONB), Partage de lien |

---

## 9. Instructions Opérationnelles pour Cursor

**Règle d'Or :** À chaque fin de tâche ou de session, tu DOIS mettre à jour le fichier `followup.md`.

1. **Lecture au démarrage :** Au début de chaque session, lis `DIA_SPEC.md` pour le plan global et `followup.md` pour savoir exactement où tu t'es arrêté.
2. **Journal de bord (`followup.md`) :** Ce fichier doit contenir :
    - La liste des fichiers créés/modifiés.
    - Les bugs rencontrés et résolus.
    - La prochaine étape immédiate (Task Next).
3. **Validation :** Avant de passer d'un module à l'autre (ex: de l'ETL au Solver), demande validation à l'utilisateur.

# Journal de Suivi - DIA Project

## 📅 Dernière mise à jour : [Date du jour]

## ✅ Tâches Terminées
- [ ] Initialisation du dépôt.
- [ ] Création du fichier DIA_SPEC.md.

## 🛠 Travail en cours
- [ ] Configuration de l'environnement (FastAPI / Next.js).

## ⚠️ Bloquants / Bugs
- Aucun.

## 🚀 Prochaine Étape (Next Task)
- Configurer PostgreSQL et créer le script d'ingestion des items (ETL).

## 📝 Notes techniques
- Utiliser `pydantic-settings` pour la gestion du .env.
