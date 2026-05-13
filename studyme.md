# StudyMe - Agroficient (Etat du projet, architecture, process détaillé)

## 1) But principal de l'application
Le rôle central d'Agroficient est de fournir une plateforme web opérationnelle pour:
- visualiser les conditions météo court terme par localité (pluie imminente, volume cumulé),
- analyser les tendances saisonnières long terme (bonne / normale / difficile),
- estimer la date probable du début de la saison pluvieuse,
- cartographier les zones agricoles du Burkina Faso avec subdivisions administratives.

En clair: décision agricole locale guidée par données météo réelles + logique prédictive.

---

## 2) Architecture globale retenue
Architecture hybride:
- Next.js (frontend + APIs plateforme)
- PostgreSQL + Prisma (données app)
- Python FastAPI (microservices météo/ML)

Pourquoi:
- Next.js gère rapidement le produit web (dashboard, CRUD, UX).
- Python est plus adapté à CHIRPS/Earth Engine, agrégation météo et logique climatique.

---

## 3) Ce qui est déjà implémenté

### 3.1 Plateforme web (Next.js)
- Dashboard complet:
  - `/dashboard`
  - `/dashboard/zones`
  - `/dashboard/agriculteurs`
  - `/dashboard/alertes`
  - `/dashboard/previsions`
- CRUD zones/agriculteurs (create, update, delete)
- Import CSV agriculteurs
- Etats UI robustes: loading/error/empty
- Toasts succès/erreurs

### 3.2 APIs plateforme Next.js
- `GET/POST /api/zones`
- `PUT/DELETE /api/zones/[id]`
- `GET/POST /api/agriculteurs`
- `PUT/DELETE /api/agriculteurs/[id]`
- `GET /api/alertes`
- `GET /api/previsions`

Validation payloads via Zod (`lib/validation.ts`).

### 3.3 Backend Python FastAPI (dossier `backend/`)
Endpoints actifs:
- `GET /health`
- `POST /previsions/court-terme` (Open-Meteo réel)
- `POST /previsions/chirps` (Earth Engine CHIRPS réel)
- `POST /previsions/saisonniere` (v2 data-driven CHIRPS saisonnier)
- `POST /previsions/debut-saison` (détection onset pluie, règle agronomique simplifiée)
- `POST /previsions/cds` (scaffold CDS)

---

## 4) Process météo implémenté (court terme, long terme, onset)

### 4.1 Court terme
Source: Open-Meteo
- données journalières pluie/probabilité
- utilisées pour estimer pluie proche (7 à 16 jours)

### 4.2 Long terme saisonnier (v2)
Source principale: CHIRPS (Earth Engine)
- parse d'une période saisonnière (`JAS-2026`, `OND-2025`, etc.)
- extraction moyenne pluie de la saison cible
- comparaison à la climatologie historique des mêmes mois
- calcul d'anomalie (%)
- classification:
  - anomalie élevée positive -> `bonne`
  - autour de la normale -> `normale`
  - anomalie négative forte -> `difficile`
- probabilité calibrée depuis l'intensité d'anomalie
- ajustement léger selon disponibilité CDS

### 4.3 Début de saison pluvieuse (onset)
Méthode agronomique simplifiée:
- fenêtre avril -> octobre
- premier jour où cumul pluie 3 jours >= 20 mm
- condition de robustesse: pas de sécheresse > 7 jours dans les 30 jours suivants
- retourne date estimée + confiance

---

## 5) Cartographie officielle Burkina
Objectif: abandon des subdivisions mock -> données administratives réelles.

### Ce qui a été fait
- téléchargement GeoJSON officiel HDX (COD-AB)
- extraction niveaux:
  - ADM1: 17 régions
  - ADM2: 47 provinces
  - ADM3: 351 communes
- normalisation des propriétés (`id`, `name`, `adm1`, `adm2`, `adm3`)
- intégration dans Leaflet avec sélecteur de niveau admin

### Fichiers clés
- `public/geo/bfa_adm1.geojson`
- `public/geo/bfa_adm2.geojson`
- `public/geo/bfa_adm3.geojson`
- `components/map/BurkinaMap.tsx`
- `scripts/fetch-burkina-admin-hdx.mjs`
- `scripts/normalize-burkina-hdx.mjs`

---

## 6) Flux d'intégration Next <-> Python
Route pivot: `GET /api/previsions` (Next.js)

Pour chaque zone:
1. appel Python `/previsions/saisonniere`
2. appel Python `/previsions/court-terme`
3. appel Python `/previsions/debut-saison`
4. agrégation pour UI (`categorie`, `probabilite`, `pluieMm`, `dateDebutSaison`, `recommandation`)

Fallback:
- si Python indisponible -> fallback DB/demo.

---

## 7) Secrets / configuration

### Next.js (`.env.local`)
- `DATABASE_URL`
- `PYTHON_SERVICE_URL` (ex `http://127.0.0.1:8001`)

### Backend Python (`backend/.env`)
- `EE_PROJECT_ID`
- `GOOGLE_APPLICATION_CREDENTIALS` (optionnel si auth locale)
- `OPEN_METEO_BASE_URL`
- `CDS_API_KEY`, `CDS_API_URL`

Earth Engine nécessite:
- auth locale (`earthengine authenticate`) ou credentials service account,
- project GCP lié (`earthengine set_project ...`).

---

## 8) Tests réalisés
- Build Next.js: OK
- `GET /health`: OK
- `POST /previsions/court-terme`: OK
- `POST /previsions/chirps`: OK
- `POST /previsions/saisonniere`: OK (v2)
- `POST /previsions/debut-saison`: endpoint ajouté et intégré

---

## 9) Limites actuelles (honnêtes)
- CDS est encore scaffold (pas encore ingestion NetCDF complète)
- onset reste une heuristique agronomique simplifiée (v1)
- pas encore de calibration statistique avancée par zone/culture

---

## 10) Roadmap technique recommandée
1. CDS réel: download + parsing NetCDF + fusion pondérée avec CHIRPS
2. Persistance systématique des prévisions Python dans table `Prevision`
3. Calibration historique onset/saison par zone (backtesting)
4. Filtrage carte par niveau admin + recherche commune
5. Tests automatiques backend (pytest) + tests API intégration

---

## 11) Résumé exécutif
Le projet n'est plus au stade maquette: il exécute déjà un pipeline météo réel (Open-Meteo + CHIRPS), cartographie officielle Burkina (ADM1/2/3), et fournit des sorties décisionnelles pour court terme, tendance saisonnière et début probable de saison des pluies.


## 12) Automatisation quotidienne (cron)
Un cron Next.js/Vercel a été ajouté pour rafraîchir les prévisions sans action utilisateur:
- Endpoint: `/api/cron/previsions-refresh`
- Fréquence: `0 5 * * *` (05:00 UTC)
- Fichier: `vercel.json`

Comportement:
1. vérifie `CRON_SECRET` (si configuré)
2. appelle `/api/previsions`
3. déclenche calcul + persistance des snapshots météo

Résultat: la base est pré-alimentée chaque jour, le dashboard lit des données déjà prêtes.


## 13) Observabilité du pipeline avant ML
Un endpoint de statut a été ajouté:
- `GET /api/cron/status`

Il permet de vérifier:
- fraîcheur des prévisions (timestamp dernière entrée),
- volume des prévisions sur 24h,
- couverture des zones (zones total vs zones avec données saisonnières),
- répartition par type (`saisonniere`, `debut_saison`, etc.).

Objectif: garantir la qualité et la stabilité du pipeline data avant d'introduire un modèle ML.


## 14) Règles de santé et dernier statut cron
Le monitoring pipeline inclut désormais:
- seuil rouge si données prévisions âgées de plus de 36h,
- seuil rouge si 0 entrée sur les dernières 24h,
- alerte si couverture zones saisonnières < 80%,
- état du dernier cron (`success/failure/never`) avec erreur associée.

Endpoints:
- `/api/cron/previsions-refresh` met à jour le statut du cron,
- `/api/cron/status` expose les flags de santé + statut cron.


## 15) Persistance DB des exécutions cron
Le statut cron n'est plus uniquement en mémoire process.

Ajout:
- `lib/pipeline-run.ts`
- table technique auto-créée `pipeline_runs` (CREATE TABLE IF NOT EXISTS)

Chaque exécution de `/api/cron/previsions-refresh` enregistre:
- `job_name`
- `outcome` (`success` | `failure`)
- `refreshed_count`
- `error`
- `created_at`

`/api/cron/status` lit ce journal DB pour afficher:
- dernier run,
- dernier succès,
- dernier échec,
- volume de runs,
- dernière erreur.

Impact:
- état cron persistant au redémarrage,
- meilleure observabilité avant phase ML,
- base fiable pour alerting futur.


## 16) Baseline d'évaluation avant ML
Un endpoint d'évaluation a été ajouté:
- `GET /api/previsions/eval?years=6`

Il fournit:
- MAE (jours) sur l'onset via baseline médiane (par zone),
- volume d'échantillons exploités,
- distribution des classes saisonnières (`bonne/normale/difficile`),
- confiance moyenne des prévisions saisonnières.

La page `/dashboard/pipeline` affiche ces métriques pour piloter la transition vers le ML.


## 17) Stratégie ML (Colab -> Backend)
Approche recommandée implémentée:

- Entraînement modèle: Colab / environnement dédié (`backend/ml/train_onset_seasonal.py`)
- Artifact exporté: `backend/models/seasonal_model.joblib`
- Inference production: backend FastAPI via `backend/app/services/ml_inference.py`
- Fallback automatique: si modèle absent, logique heuristique CHIRPS reste active.

Fichiers ML ajoutés:
- `backend/ml/train_onset_seasonal.py`
- `backend/ml/colab_training_template.md`
- `backend/app/services/ml_inference.py`

Flux de prédiction saisonnière:
1. extraction features CHIRPS
2. tentative `model.predict_proba(...)`
3. si modèle introuvable -> fallback règles anomalies
4. sortie API avec indicateur `ml_enabled`
