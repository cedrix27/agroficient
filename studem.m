# Agroficient - Study Memo (`studem.m`)

## Vision du projet
Agroficient est une plateforme web de prévision agro-météo pour zones sahéliennes.
Objectif: permettre à une organisation (ONG/projet/ministère) de gérer ses zones et agriculteurs, et d'exploiter des prévisions exploitables pour la décision terrain.

## Architecture retenue
Architecture hybride:
- Frontend + backend web: Next.js (dashboard, CRUD, APIs plateforme)
- Data/ML/météo: microservice Python FastAPI (`backend/`)
- Base de données: PostgreSQL via Prisma

Pourquoi ce choix:
- Next.js accélère le produit web (UX, routage, intégration dashboard).
- Python est mieux adapté aux pipelines météo/ML (Earth Engine, scikit-learn, CDS).

## Etat actuel implémenté

### 1) Plateforme Next.js
- Layout dashboard + sidebar
- Pages:
  - `/dashboard`
  - `/dashboard/zones`
  - `/dashboard/agriculteurs`
  - `/dashboard/alertes`
  - `/dashboard/previsions`
- CRUD:
  - Zones: liste, création, édition inline, suppression
  - Agriculteurs: pagination, filtre zone, import CSV, édition inline, suppression
- Etats UI robustes:
  - `loading`, `error`, `empty`
- Toasts UI succès/erreur

### 2) API plateforme Next.js (`app/api/*`)
- `/api/zones` + `/api/zones/[id]`
- `/api/agriculteurs` + `/api/agriculteurs/[id]`
- `/api/alertes`
- `/api/previsions`

Validation backend:
- `zod` via `lib/validation.ts`
- Retours d'erreurs structurés (`422`, `400`, `503`)

Fallbacks:
- Si DB indisponible, fallback demo data sur certaines routes.

### 3) Backend Python (`backend/`)
- FastAPI bootstrappé avec endpoints:
  - `GET /health`
  - `POST /previsions/saisonniere`
  - `POST /previsions/court-terme` (Open-Meteo réel)
  - `POST /previsions/chirps` (Earth Engine CHIRPS réel)
  - `POST /previsions/cds` (connecteur scaffold)

Connecteurs:
- Open-Meteo: appel HTTP réel
- Earth Engine: initialisation `ee` + extraction CHIRPS sur buffer géographique
- CDS: scaffold prêt pour retrieval NetCDF

## Intégration Next.js <-> Python
La route `GET /api/previsions` côté Next.js:
1. Charge les zones depuis DB (ou demo)
2. Appelle Python:
   - `/previsions/saisonniere`
   - `/previsions/court-terme`
3. Agrège réponse pour le frontend
4. Fallback DB historique puis demo si Python indisponible

## UI Prévisions (mise à jour majeure)
La page `/dashboard/previsions` a été refaite:
- Carte stylisée orientée Burkina Faso
- Sélecteur de localité
- Points de zones colorés par catégorie (`bonne`, `normale`, `difficile`)
- Panneau d'analyse locale:
  - période
  - probabilité
  - pluie estimée
  - coordonnées
  - recommandation opérationnelle

## APIs/services et rôle exact

### Côté Next.js (obligatoire pour la plateforme web)
- PostgreSQL (`DATABASE_URL`): coeur des données applicatives

### Côté Python microservices
- Open-Meteo: prévisions court terme (sans clé)
- Google Earth Engine: historique CHIRPS (auth requise)
- Copernicus CDS: prévisions saisonnières SEAS5 (clé CDS requise)

## Auth Earth Engine - ce qui a été nécessaire
- Auth locale effectuée (`earthengine authenticate`)
- Liaison projet GCP nécessaire (`earthengine set_project ...`)
- Ajout de `EE_PROJECT_ID` dans `backend/.env`

## Tests réalisés
- `GET /health`: OK
- `POST /previsions/court-terme`: OK (retour Open-Meteo)
- `POST /previsions/chirps`: OK (retour Earth Engine, métriques pluie)
- `npm run build` (Next.js): OK

## Limites actuelles
- Carte prévisions: stylisée (pas encore carte tuilée Leaflet réelle)
- CDS: endpoint encore scaffold (pas retrieval NetCDF complet)
- Logique saisonnière: encore mock/règle simple

## Prochaines étapes techniques recommandées
1. Basculer carte prévisions vers Leaflet réel (fond carte + couches)
2. Ajouter gestion localités administratives (région/province/commune)
3. Implémenter CDS réel (download + parsing + classification)
4. Persister les sorties Python en table `Prevision`
5. Ajouter tests automatiques API (pytest + tests d'intégration)
