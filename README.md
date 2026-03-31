# Time Tracker

Application de suivi de temps construite avec React, Vite, TypeScript, Zustand, Clerk et des routes API Vercel persistées dans Turso/libSQL.

## Ce qui est en place

- authentification Clerk côté client et validation des bearer tokens côté API
- persistance distante des tâches, tags, sessions et du chrono actif
- store Zustand migré vers une couche API typée au lieu de `localStorage`
- grille de cartes réorganisable, historique de sessions, saisie manuelle et rapport hebdomadaire
- script d'initialisation de base via `npm run db:setup`
- validation frontend avec Vitest unit + intégration

## Variables d'environnement

Copier `.env.local.example` vers `.env.local` puis renseigner les valeurs suivantes:

```bash
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

Règles:

- `VITE_CLERK_PUBLISHABLE_KEY` est la seule valeur frontend-safe.
- `CLERK_SECRET_KEY` et `TURSO_AUTH_TOKEN` restent strictement server-side.
- `TURSO_AUTH_TOKEN` est facultatif uniquement pour une base locale (`file:`, `:memory:`, `http://127.0.0.1`, `http://localhost`).

## Démarrage local

1. Installer les dépendances.
2. Configurer `.env.local`.
3. Initialiser la base.
4. Démarrer le serveur de développement complet.

```bash
npm install
npm run db:setup
npm run dev
```

`npm run dev` lance le frontend Vite et l'API Vercel en parallèle. Aucune récursion ni configuration complexe — une seule commande pour un environnement complet de développement.

## Scripts

```bash
npm run dev           # Frontend + API (à utiliser pour le développement complet)
npm run dev:api      # API Vercel uniquement
npm run dev:frontend # Frontend Vite uniquement
npm run build        # Compile l'application Vite et les routes API
npm run db:setup     # Exécute le schéma de base de données
npm run test         # Suite Vitest globale
npm run test:unit    # Logique métier et store API-backed
npm run test:integration # Parcours UI React avec auth/API mockés
npm run test:e2e     # Scénarios Playwright
npm run test:all     # Tous les tests (unit + intégration + E2E)
```

## Notes sur les scripts

- **`npm run dev`** : Lance le serveur Vercel qui gère à la fois l'API et le frontend (via Vite). C'est la commande recommandée pour le développement local complet. Aucune recursion, pas de complexité — une seule commande.
- **`npm run dev:api`** : Lance uniquement l'API Vercel si vous avez déjà une instance frontend en démarrage ailleurs.
- **`npm run dev:frontend`** : Lance uniquement Vite si vous testez le frontend sans les routes API.

## CI/CD et déploiement

Le workflow GitHub Actions attend les secrets suivants au niveau du repository:

```bash
VITE_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

`VITE_CLERK_PUBLISHABLE_KEY` est la seule valeur frontend-safe. Les secrets backend (`CLERK_SECRET_KEY`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) doivent rester dans GitHub Secrets et dans les variables d'environnement Vercel, jamais dans le bundle frontend.

Comportement attendu:

- `main` déploie la production via `vercel build --prod` puis `vercel deploy --prebuilt --prod`.
- `develop` déploie le staging via le flux preview Vercel.
- les pull requests déclenchent un preview deploy après validation et le workflow met à jour un commentaire avec l'URL générée.
- `workflow_dispatch` permet de relancer manuellement un déploiement `preview`, `staging` ou `production`.
- les déploiements restent bloqués tant que la build, les tests unitaires ou les tests d'intégration échouent.

## Notes d'architecture

- Les routes protégées passent toutes par `api/lib/auth.ts` et `api/lib/db.ts`.
- Les routes CRUD vivent sous `api/tasks.ts`, `api/tags.ts`, `api/sessions.ts` et `api/active-timer.ts` avec leurs routes `[id]` associées.
- `src/lib/api.ts` est la frontière typée entre React et le backend.
- `src/store/useTimeTrackerStore.ts` conserve les invariants métier, notamment le chrono unique actif et la consolidation des sessions.
