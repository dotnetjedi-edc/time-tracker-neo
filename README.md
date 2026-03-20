# Time Tracker

MVP local-first de suivi de temps personnel construit avec React, Vite, TypeScript, Tailwind CSS et Zustand.

## Inclus dans cette implémentation

- grille de grosses cartes de tâches tactile et réorganisable par drag and drop
- un seul chrono actif à la fois avec mise à jour seconde par seconde
- arrêt automatique du chrono lors d'un rechargement puis consolidation dans l'historique
- CRUD des tâches et des tags
- filtres multi-tags
- rapport hebdomadaire avec totaux par jour et par semaine
- persistance locale via localStorage pour pouvoir utiliser l'application immédiatement

## Démarrage

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run dev
npm run build
npm run test
npx playwright install chromium
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:all
```

`npm run test` exécute la suite Vitest globale.

`npm run test:unit` cible la logique métier pure.

`npm run test:integration` valide les parcours UI React branchés au store.

`npm run test:e2e` valide les scénarios navigateur avec Playwright.

`npm run test:all` enchaîne les trois niveaux pour une passe de régression complète.

## Notes d'architecture

Cette base est volontairement exécutable sans backend pour livrer rapidement le MVP front. La couche métier correspond déjà à la spec et peut être branchée plus tard sur des fonctions Vercel et Turso en remplaçant la persistance locale par des appels API.
