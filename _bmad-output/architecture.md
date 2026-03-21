# Architecture Technique — time-tracker3 Backend & Deployment

**Version:** 1.0  
**Date:** 2026-03-21  
**Auteur:** Eric  
**Statut:** Approuvée — prête pour implémentation

---

## 1. Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React 19 App                                        │  │
│  │  ┌──────────────┐   ┌──────────────────────────────┐ │  │
│  │  │ Clerk.dev    │   │  Zustand Store               │ │  │
│  │  │ (Auth UI +   │   │  (async API calls,           │ │  │
│  │  │  session     │   │   no more persist middleware) │ │  │
│  │  │  token)      │   └──────────────┬───────────────┘ │  │
│  │  └──────────────┘                  │ fetch + JWT      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────-┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      VERCEL                                 │
│  ┌─────────────────────┐   ┌────────────────────────────┐  │
│  │  Static Frontend    │   │  Serverless API Routes     │  │
│  │  /dist (React SPA)  │   │  /api/*.ts                 │  │
│  │                     │   │  - Clerk token validation  │  │
│  │                     │   │  - Multi-user data scoping │  │
│  └─────────────────────┘   └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │ libSQL protocol
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      TURSO                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  libSQL Database (SQLite-compatible, multi-region)  │   │
│  │  tables: tasks | tags | sessions | active_timers    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication — Clerk.dev

### Pourquoi Clerk

- Zero auth infrastructure à maintenir
- SDK React natif avec hooks (`useUser`, `useAuth`)
- Gère sessions, refresh tokens, social login si besoin
- Gratuit jusqu'à 10,000 MAU
- S'intègre en 2 composants: `<ClerkProvider>` + `<SignedIn>/<SignedOut>`

### Flux d'authentification

```
User opens app
    │
    ▼
<ClerkProvider> (in main.tsx)
    │
    ├─→ Not signed in → <SignedOut><RedirectToSignIn /></SignedOut>
    │
    └─→ Signed in → <SignedIn><App /></SignedIn>
                           │
                           │  useAuth().getToken()
                           │  → JWT Bearer token
                           ▼
                    All API calls: Authorization: Bearer <token>
                           │
                           ▼
                    API route: verifyClerkToken(req)
                           │
                    → Extract userId
                    → Scope all DB queries to userId
```

### Variables d'environnement

```env
# Frontend (VITE_ prefix = bundled into client)
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...

# Backend only (never sent to client)
CLERK_SECRET_KEY=sk_live_...
```

---

## 3. API Layer — Vercel Serverless Functions

### Structure des routes

```
/api
├── lib/
│   ├── db.ts          # Turso client singleton
│   ├── auth.ts        # Clerk token validation
│   └── schema.sql     # Database schema (for setup script)
├── tasks.ts           # GET /api/tasks, POST /api/tasks
├── tasks/
│   └── [id].ts        # PUT /api/tasks/:id, DELETE /api/tasks/:id
├── tags.ts            # GET /api/tags, POST /api/tags
├── tags/
│   └── [id].ts        # PUT /api/tags/:id, DELETE /api/tags/:id
├── sessions.ts        # GET /api/sessions, POST /api/sessions
├── sessions/
│   └── [id].ts        # PUT /api/sessions/:id, DELETE /api/sessions/:id
└── active-timer.ts    # GET/PUT/DELETE /api/active-timer
```

### Pattern standard d'une route API

```typescript
// api/tasks.ts
import { createClient } from "@libsql/client";
import { verifyToken } from "@clerk/backend";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Validate auth
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  // 2. Route by method
  if (req.method === "GET") {
    const tasks = await db.execute({
      sql: "SELECT * FROM tasks WHERE user_id = ? ORDER BY position ASC",
      args: [userId],
    });
    return res.status(200).json(tasks.rows);
  }

  if (req.method === "POST") {
    // ... create task
  }

  return res.status(405).json({ error: "Method not allowed" });
}
```

### Sécurité

- Toutes les routes valident le JWT Clerk avant d'accéder à la DB
- Toutes les requêtes SQL utilisent des paramètres préparés (protection injection SQL)
- Chaque requête filtre par `user_id` — un utilisateur ne peut jamais accéder aux données d'un autre
- En-têtes CORS gérés par Vercel (origine limitée au domaine de l'app)

---

## 4. Base de données — Turso (libSQL)

### Connexion

```typescript
// api/lib/db.ts
import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
```

### Variables d'environnement

```env
# Turso (backend only - jamais VITE_ préfixé)
TURSO_DATABASE_URL=libsql://time-tracker-prod-<user>.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

### Sérialisation des données complexes

Les champs `segments` et `audit_events` (arrays d'objets) sont stockés comme JSON TEXT :

```typescript
// Écriture
await db.execute({
  sql: 'INSERT INTO sessions (segments, ...) VALUES (?, ...)',
  args: [JSON.stringify(session.segments), ...]
});

// Lecture
const session = row as any;
session.segments = JSON.parse(session.segments as string);
```

---

## 5. Frontend — Adaptation du Store Zustand

### Changements principaux

| Avant                               | Après                                   |
| ----------------------------------- | --------------------------------------- |
| `persist` middleware + localStorage | Appels API async                        |
| `resilientBrowserStorage`           | Supprimé                                |
| Actions synchrones                  | Actions async avec `try/catch`          |
| Pas d'auth                          | Token Clerk injecté dans chaque requête |

### Client API typé

```typescript
// src/lib/api.ts
import { useAuth } from "@clerk/clerk-react";

export function createApiClient(getToken: () => Promise<string | null>) {
  async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
    const token = await getToken();
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }
  return { fetcher };
}
```

---

## 6. CI/CD — GitHub Actions + Vercel

### Pipeline

```
Push to main  ─→  type-check ─┐
                 unit-tests  ─┤─→ build-and-deploy ─→ Vercel PRODUCTION
                 e2e-tests   ─┘

Push to develop ─→ (same jobs) ─→ Vercel STAGING (preview URL)

Open PR ─→ (same jobs) ─→ Vercel PREVIEW (unique URL per PR, commented on PR)
```

### Secrets requis dans GitHub Actions

```yaml
secrets:
  VERCEL_TOKEN             # vercel.com → Account → Tokens
  VERCEL_ORG_ID            # déjà configuré
  VERCEL_PROJECT_ID        # déjà configuré
  TURSO_DATABASE_URL       # turso.tech → DB → URL
  TURSO_AUTH_TOKEN         # turso db tokens create <db-name>
  VITE_CLERK_PUBLISHABLE_KEY   # Clerk → API Keys
  CLERK_SECRET_KEY             # Clerk → API Keys
```

### Env vars pour le build Vite

Les variables `VITE_*` doivent être disponibles au moment du `npm run build` :

```yaml
- name: Build application
  run: npm run build
  env:
    VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.VITE_CLERK_PUBLISHABLE_KEY }}
```

---

## 7. Développement local

### Setup initial

```bash
# 1. Copier les vars d'environnement
cp .env.local.example .env.local
# → Remplir TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, VITE_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY

# 2. Installer les dépendances
npm install

# 3. Initialiser la base de données
npm run db:setup

# 4. Démarrer l'app
npm run dev
```

### Variables .env.local.example

```env
# Clerk Auth
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Turso Database
TURSO_DATABASE_URL=libsql://time-tracker-dev-<user>.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

---

## 8. Décisions d'architecture & rationale

| Décision      | Choix                      | Rationale                                                                                            |
| ------------- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Auth          | Clerk.dev                  | Zero maintenance, multi-user dès le départ, SDK React excellent                                      |
| DB            | Turso libSQL               | Tier gratuit généreux, SQLite-compatible, multi-region, utilisé avec succès récemment                |
| API           | Vercel Functions           | Colocalisé avec le frontend, pas de serveur séparé, gratuit sur Vercel                               |
| Sérialisation | JSON dans TEXT             | Sessions et segments sont des structures imbriquées — évite tables de jointure complexes pour un MVP |
| Migration     | Partir de zéro             | Simplification — pas de code de migration localStorage→DB                                            |
| Multi-user    | `user_id` sur chaque ligne | Scalable, simple, Clerk fournit un userId stable                                                     |
