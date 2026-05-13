# 🌧️ SahelWeather — Plateforme de prévisions météo agricoles pour le Sahel

SaaS de prévision des précipitations pour les agriculteurs sahéliens.
Les clients (ONG, ministères, projets agricoles) gèrent leurs zones et agriculteurs via un dashboard web.
Les agriculteurs reçoivent des alertes SMS en mooré, dioula ou français sur téléphone basique.

---

## Stack technique

| Couche | Technologie | Rôle |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) | Dashboard web + Route Handlers |
| UI | Shadcn/ui + Tailwind CSS | Composants et styles |
| Base de données | PostgreSQL via Supabase | Agriculteurs, zones, prédictions |
| ORM | Prisma | Schéma et requêtes |
| Cartes | Leaflet.js | Visualisation des zones |
| ML / Data | Python FastAPI (microservice) | Modèles scikit-learn + Earth Engine |
| SMS | Africa's Talking | Envoi SMS Burkina/Afrique de l'Ouest |
| IA texte | Claude API (Anthropic) | Génération messages SMS en langues locales |
| Météo court terme | Open-Meteo API | Prévisions 16 jours (gratuit, sans clé) |
| Données satellites | Google Earth Engine + CHIRPS | Historique précipitations 40 ans |
| Prévision saisonnière | ECMWF SEAS5 via Copernicus CDS | Prévision 6 mois bonne/mauvaise saison |
| Déploiement frontend | Vercel | Gratuit pour commencer |
| Déploiement Python | Railway ou DigitalOcean | Microservice ML à 5$/mois |
| Cron jobs | Vercel Cron ou GitHub Actions | Déclenchement alertes quotidiennes |

---

## Architecture du projet

```
sahelweather/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Layout avec sidebar
│   │   ├── page.tsx              # Vue d'ensemble / stats
│   │   ├── zones/
│   │   │   ├── page.tsx          # Liste des zones
│   │   │   └── [id]/page.tsx     # Détail zone + carte
│   │   ├── agriculteurs/
│   │   │   ├── page.tsx          # Liste agriculteurs
│   │   │   └── import/page.tsx   # Import CSV
│   │   ├── alertes/
│   │   │   └── page.tsx          # Historique SMS envoyés
│   │   └── previsions/
│   │       └── page.tsx          # Carte prévisions saisonnières
│   └── api/
│       ├── zones/route.ts        # CRUD zones
│       ├── agriculteurs/route.ts # CRUD agriculteurs
│       ├── previsions/
│       │   ├── saisonniere/route.ts   # Appelle microservice Python
│       │   └── court-terme/route.ts   # Appelle Open-Meteo directement
│       ├── alertes/
│       │   └── envoyer/route.ts       # Génère SMS via Claude + envoie via AT
│       └── cron/
│           └── daily-check/route.ts   # Déclenché chaque matin
│
├── components/
│   ├── ui/                       # Shadcn components (auto-générés)
│   ├── map/
│   │   ├── ZoneMap.tsx           # Carte Leaflet des zones
│   │   └── PrevisionMap.tsx      # Carte avec couleurs par prévision
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── AlertesFeed.tsx
│   │   └── ZonesList.tsx
│   └── forms/
│       ├── ZoneForm.tsx          # Créer/éditer une zone
│       └── ImportCSV.tsx         # Import agriculteurs en masse
│
├── lib/
│   ├── db.ts                     # Instance Prisma
│   ├── africastalking.ts         # Client SMS Africa's Talking
│   ├── claude.ts                 # Client Anthropic pour génération SMS
│   ├── openmeteo.ts              # Wrapper Open-Meteo API
│   └── python-client.ts          # Client HTTP vers microservice Python
│
├── prisma/
│   └── schema.prisma             # Schéma base de données
│
├── python-service/               # Microservice séparé
│   ├── main.py                   # FastAPI app
│   ├── models/
│   │   ├── seasonal.py           # Modèle Random Forest saisonnier
│   │   └── onset_detection.py    # Détection début de saison
│   ├── data/
│   │   ├── chirps_fetcher.py     # Récupération données CHIRPS
│   │   ├── ecmwf_fetcher.py      # Récupération SEAS5 Copernicus
│   │   └── enso_fetcher.py       # Indices ENSO depuis NOAA
│   └── requirements.txt
│
└── .env.local                    # Variables d'environnement
```

---

## Schéma base de données (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Organisation {
  id          String   @id @default(cuid())
  nom         String
  email       String   @unique
  plan        String   @default("free") // free | pro | enterprise
  createdAt   DateTime @default(now())
  zones       Zone[]
}

model Zone {
  id             String       @id @default(cuid())
  nom            String
  description    String?
  latitude       Float        // Centre de la zone
  longitude      Float
  radiusKm       Float        @default(25) // Rayon en km
  langue         String       @default("fr") // fr | moore | dioula | fulfude
  cultures       String[]     // ["mil", "sorgho", "niebe"]
  organisationId String
  organisation   Organisation @relation(fields: [organisationId], references: [id])
  agriculteurs   Agriculteur[]
  previsions     Prevision[]
  alertes        Alerte[]
  createdAt      DateTime     @default(now())
}

model Agriculteur {
  id          String   @id @default(cuid())
  nom         String
  telephone   String   // Format: +226XXXXXXXX
  langue      String   @default("fr")
  zoneId      String
  zone        Zone     @relation(fields: [zoneId], references: [id])
  alertes     Alerte[]
  actif       Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model Prevision {
  id              String   @id @default(cuid())
  zoneId          String
  zone            Zone     @relation(fields: [zoneId], references: [id])
  type            String   // "saisonniere" | "court_terme" | "debut_saison"
  periode         String   // ex: "JAS-2025" ou "2025-06-15"
  categorie       String   // "bonne" | "normale" | "mauvaise"
  probabilite     Float    // 0 à 1
  details         Json     // Données brutes de la prévision
  source          String   // "ecmwf_seas5" | "open_meteo" | "random_forest"
  createdAt       DateTime @default(now())
}

model Alerte {
  id            String      @id @default(cuid())
  zoneId        String
  zone          Zone        @relation(fields: [zoneId], references: [id])
  agriculteurId String?
  agriculteur   Agriculteur? @relation(fields: [agriculteurId], references: [id])
  type          String      // "debut_saison" | "bonne_saison" | "secheresse" | "pluie_imminente"
  messageFr     String      // Message en français
  messageLocal  String      // Message en langue locale
  langue        String
  statutSMS     String      @default("pending") // pending | sent | failed
  envoyes       Int         @default(0)
  echoues       Int         @default(0)
  createdAt     DateTime    @default(now())
}
```

---

## Variables d'environnement

Crée un fichier `.env.local` à la racine du projet Next.js :

```bash
# Base de données (Supabase gratuit)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"

# Anthropic Claude API
ANTHROPIC_API_KEY="sk-ant-..."

# Africa's Talking SMS (Burkina Faso)
AT_API_KEY="votre_cle_africas_talking"
AT_USERNAME="votre_username"
AT_SENDER_ID="SAHEL"  # ID expéditeur visible sur le SMS

# Microservice Python (local ou Railway)
PYTHON_SERVICE_URL="http://localhost:8000"

# Vercel Cron Secret (pour sécuriser le endpoint cron)
CRON_SECRET="une_chaine_aleatoire_longue"

# Next.js
NEXTAUTH_SECRET="une_autre_chaine_aleatoire"
NEXTAUTH_URL="http://localhost:3000"
```

Crée un fichier `.env` dans `python-service/` :

```bash
# Google Earth Engine (compte étudiant gratuit)
GOOGLE_APPLICATION_CREDENTIALS="./gee-credentials.json"

# Copernicus CDS (gratuit après inscription)
CDS_API_KEY="votre_cle_copernicus"
CDS_API_URL="https://cds.climate.copernicus.eu/api/v2"
```

---

## Installation et démarrage

### 1. Cloner et installer les dépendances Next.js

```bash
git clone https://github.com/votre-repo/sahelweather
cd sahelweather
npm install
```

### 2. Initialiser Shadcn/ui

```bash
npx shadcn@latest init
# Choisir: Default style, Zinc color, CSS variables: yes

# Installer les composants nécessaires
npx shadcn@latest add button card table badge input label
npx shadcn@latest add select dialog sheet tabs
npx shadcn@latest add dropdown-menu avatar separator
npx shadcn@latest add toast sonner
```

### 3. Configurer la base de données

```bash
# Initialiser Prisma
npx prisma generate
npx prisma db push

# Vérifier dans Supabase que les tables sont créées
npx prisma studio  # Interface visuelle optionnelle
```

### 4. Installer les dépendances cartographiques

```bash
npm install leaflet react-leaflet
npm install --save-dev @types/leaflet
```

### 5. Configurer le microservice Python

```bash
cd python-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

pip install fastapi uvicorn
pip install earthengine-api
pip install scikit-learn pandas numpy
pip install cdsapi  # Pour ECMWF SEAS5
pip install requests python-dotenv

# Authentifier Google Earth Engine (une seule fois)
earthengine authenticate
```

### 6. Démarrer en développement

Terminal 1 — Next.js :
```bash
npm run dev
# App disponible sur http://localhost:3000
```

Terminal 2 — Microservice Python :
```bash
cd python-service
uvicorn main:app --reload --port 8000
# API disponible sur http://localhost:8000
# Docs auto sur http://localhost:8000/docs
```

---

## Fonctionnement détaillé de chaque API

### Open-Meteo — Prévisions court terme (0 à 16 jours)
- **Gratuit, sans clé API, sans inscription**
- Appel direct HTTP depuis Next.js
- Utilisé pour : détecter si la pluie arrive dans les prochains jours

```typescript
// lib/openmeteo.ts
export async function getPrevisionCourtTerme(lat: number, lon: number) {
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&daily=precipitation_sum,precipitation_probability_max` +
    `&forecast_days=16&timezone=Africa%2FAbidjan`

  const res = await fetch(url)
  const data = await res.json()
  // data.daily.precipitation_sum = tableau de 16 valeurs en mm
  // data.daily.precipitation_probability_max = probabilités en %
  return data
}
```

### CHIRPS via Google Earth Engine — Historique 40 ans
- **Gratuit pour étudiants et chercheurs**
- Utilisé uniquement dans le microservice Python
- Utilisé pour : entraîner le modèle Random Forest saisonnier

```python
# python-service/data/chirps_fetcher.py
import ee

def get_historical_rainfall(lat, lon, radius_km=25):
    """Retourne la pluviométrie mensuelle des 40 dernières années pour une zone."""
    ee.Initialize()

    point = ee.Geometry.Point([lon, lat])
    zone = point.buffer(radius_km * 1000)

    chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY") \
        .filterDate("1981-01-01", "2024-12-31") \
        .filterBounds(zone)

    # Agréger par mois
    def monthly_sum(month_offset):
        start = ee.Date("1981-01-01").advance(month_offset, "month")
        end = start.advance(1, "month")
        monthly = chirps.filterDate(start, end).sum()
        mean_val = monthly.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=zone,
            scale=5000
        ).get("precipitation")
        return ee.Feature(None, {"date": start.format("YYYY-MM"), "mm": mean_val})

    # Retourne un DataFrame pandas avec date + mm de pluie
    ...
```

### ECMWF SEAS5 via Copernicus CDS — Prévision saisonnière
- **Gratuit après inscription sur climate.copernicus.eu**
- Donne une prévision probabiliste à 6 mois
- Catégories : below_normal / near_normal / above_normal

```python
# python-service/data/ecmwf_fetcher.py
import cdsapi

def get_seasonal_forecast(lat, lon, target_month):
    """Récupère la prévision SEAS5 pour une zone et un mois cible."""
    client = cdsapi.Client()

    client.retrieve(
        "seasonal-original-single-levels",
        {
            "originating_centre": "ecmwf",
            "system": "51",  # SEAS5
            "variable": "total_precipitation",
            "year": "2025",
            "month": str(target_month - 4).zfill(2),  # Initialisé 4 mois avant
            "day": "01",
            "leadtime_month": ["1", "2", "3", "4", "5", "6"],
            "format": "netcdf"
        },
        "forecast.nc"
    )
    # Extraire la valeur pour les coordonnées lat/lon
    # Comparer à la climatologie CHIRPS pour classifier bonne/normale/mauvaise
    ...
```

### Claude API — Génération des messages SMS
- Transforme des données brutes en texte humain dans la bonne langue
- Appelé depuis Next.js avant chaque envoi SMS

```typescript
// lib/claude.ts
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

export async function genererMessageSMS(params: {
  langue: "fr" | "moore" | "dioula" | "fulfude"
  type: "debut_saison" | "bonne_saison" | "secheresse" | "pluie_imminente"
  donneesMeteo: {
    pluieDans: number      // jours avant prochaine pluie
    mmPrevus: number       // mm attendus
    previsionSaison: string // "bonne" | "normale" | "mauvaise"
    probabilite: number    // pourcentage
  }
  cultures: string[]       // ["mil", "sorgho"]
}) {
  const prompt = `Tu es un conseiller agricole expert du Sahel.
Génère un SMS court (max 160 caractères) pour un agriculteur du Burkina Faso.
Langue: ${params.langue}
Type d'alerte: ${params.type}
Données: pluie dans ${params.donneesMeteo.pluieDans} jours, ${params.donneesMeteo.mmPrevus}mm prévus
Cultures: ${params.cultures.join(", ")}
Saison prévue: ${params.donneesMeteo.previsionSaison} (${params.donneesMeteo.probabilite}%)

Le message doit être simple, direct, actionnable.
Commence directement par le message, sans guillemets ni explication.`

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }]
  })

  return response.content[0].type === "text" ? response.content[0].text : ""
}
```

### Africa's Talking — Envoi SMS
- Spécialisé Afrique, supporte les numéros +226 (Burkina)
- Moins cher que Twilio pour l'Afrique de l'Ouest
- Sandbox gratuite pour les tests

```typescript
// lib/africastalking.ts
import AfricasTalking from "africastalking"

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY!,
  username: process.env.AT_USERNAME!
})

const sms = at.SMS

export async function envoyerSMS(numeros: string[], message: string) {
  const result = await sms.send({
    to: numeros,          // ["+22670123456", "+22676543210"]
    message: message,
    from: process.env.AT_SENDER_ID
  })

  return {
    envoyes: result.SMSMessageData.Recipients.filter(r => r.status === "Success").length,
    echoues: result.SMSMessageData.Recipients.filter(r => r.status !== "Success").length,
    details: result.SMSMessageData.Recipients
  }
}
```

### Cron job quotidien — Le chef d'orchestre
- Déclenché chaque matin à 6h00 heure locale
- Vérifie toutes les zones, génère et envoie les alertes pertinentes

```typescript
// app/api/cron/daily-check/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getPrevisionCourtTerme } from "@/lib/openmeteo"
import { genererMessageSMS } from "@/lib/claude"
import { envoyerSMS } from "@/lib/africastalking"

export async function GET(req: NextRequest) {
  // Vérifier le secret cron (sécurité)
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const zones = await db.zone.findMany({
    include: { agriculteurs: { where: { actif: true } } }
  })

  for (const zone of zones) {
    const meteo = await getPrevisionCourtTerme(zone.latitude, zone.longitude)

    // Règle 1 : pluie significative dans moins de 3 jours
    const pluieImminente = meteo.daily.precipitation_sum
      .slice(0, 3)
      .some((mm: number) => mm > 10)

    // Règle 2 : sécheresse — pas de pluie dans les 14 prochains jours
    const secheresse = meteo.daily.precipitation_sum
      .slice(0, 14)
      .every((mm: number) => mm < 2)

    if (!pluieImminente && !secheresse) continue

    const type = pluieImminente ? "pluie_imminente" : "secheresse"
    const numeros = zone.agriculteurs.map(a => a.telephone)

    if (numeros.length === 0) continue

    const messageFr = await genererMessageSMS({
      langue: "fr",
      type,
      donneesMeteo: {
        pluieDans: meteo.daily.precipitation_sum.findIndex((mm: number) => mm > 5),
        mmPrevus: Math.max(...meteo.daily.precipitation_sum.slice(0, 7)),
        previsionSaison: "normale",
        probabilite: 60
      },
      cultures: zone.cultures
    })

    const messageLocal = zone.langue !== "fr"
      ? await genererMessageSMS({ .../* mêmes params */, langue: zone.langue as any })
      : messageFr

    const message = zone.langue !== "fr" ? messageLocal : messageFr
    const resultat = await envoyerSMS(numeros, message)

    await db.alerte.create({
      data: {
        zoneId: zone.id,
        type,
        messageFr,
        messageLocal,
        langue: zone.langue,
        statutSMS: "sent",
        envoyes: resultat.envoyes,
        echoues: resultat.echoues
      }
    })
  }

  return NextResponse.json({ ok: true, zonesTraitees: zones.length })
}
```

---

## Pages à construire (ordre de priorité)

### 1. Layout principal avec sidebar
Crée `app/(dashboard)/layout.tsx` avec une sidebar Shadcn contenant :
- Logo + nom de l'organisation
- Navigation : Vue d'ensemble, Zones, Agriculteurs, Alertes, Prévisions
- En bas : Plan actuel + bouton paramètres

### 2. Page Vue d'ensemble (dashboard home)
Crée `app/(dashboard)/page.tsx` avec :
- 4 StatsCards : Zones actives, Agriculteurs inscrits, SMS envoyés ce mois, Prochaine alerte prévue
- Liste des 5 dernières alertes envoyées
- Carte miniature des zones

### 3. Page Zones
Crée `app/(dashboard)/zones/page.tsx` avec :
- Table des zones (nom, nb agriculteurs, langue, dernière alerte)
- Bouton "Créer une zone" qui ouvre un Dialog
- Le Dialog contient un formulaire + une carte Leaflet pour cliquer et définir la position

### 4. Page Agriculteurs
Crée `app/(dashboard)/agriculteurs/page.tsx` avec :
- Table paginée des agriculteurs (nom, téléphone, zone, langue, statut)
- Import CSV pour ajouter en masse
- Filtre par zone

### 5. Page Prévisions
Crée `app/(dashboard)/previsions/page.tsx` avec :
- Carte Leaflet affichant toutes les zones colorées selon la prévision saisonnière
- Vert = bonne saison prévue, Orange = normale, Rouge = difficile
- Panneau latéral avec détails de la zone sélectionnée

---

## Vercel Cron (déclenchement automatique)

Ajoute dans `vercel.json` à la racine :

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-check",
      "schedule": "0 5 * * *"
    }
  ]
}
```

Cela déclenche le endpoint chaque matin à 5h UTC (6h heure locale Burkina Faso).
Le header `Authorization: Bearer CRON_SECRET` est automatiquement ajouté par Vercel.

---

## Déploiement

### Frontend (Vercel — gratuit)
```bash
npm install -g vercel
vercel deploy
# Configurer les variables d'environnement dans le dashboard Vercel
```

### Microservice Python (Railway — 5$/mois)
```bash
# Créer un Dockerfile dans python-service/
# dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Déployer sur Railway
railway login
railway init
railway up
# Copier l'URL Railway dans PYTHON_SERVICE_URL dans Vercel
```

---

## Ordre de développement recommandé

1. **Semaine 1** : Setup Next.js + Prisma + Supabase + Shadcn. Créer le layout et les pages statiques.
2. **Semaine 2** : Intégrer Open-Meteo (pas de clé requise). Créer le CRUD des zones et agriculteurs.
3. **Semaine 3** : Intégrer Claude API pour génération de messages. Intégrer Africa's Talking en mode sandbox.
4. **Semaine 4** : Construire le microservice Python avec CHIRPS + le modèle Random Forest simple.
5. **Semaine 5** : Connecter tout. Tester le flux complet : zone → météo → message mooré → SMS.
6. **Semaine 6** : Déployer sur Vercel + Railway. Tester avec de vrais numéros burkinabè.

---

## Inscription aux services gratuits

| Service | URL inscription | Délai activation |
|---|---|---|
| Google Earth Engine | earthengine.google.com | 1-3 jours (approbation manuelle) |
| Copernicus CDS | cds.climate.copernicus.eu | Immédiat |
| Supabase | supabase.com | Immédiat |
| Africa's Talking | africastalking.com | Immédiat (sandbox) |
| Anthropic Claude | console.anthropic.com | Immédiat |
| Vercel | vercel.com | Immédiat |

---

*Projet développé pour aider les agriculteurs sahéliens à prendre de meilleures décisions agricoles grâce aux données climatiques.*
