"""
Build a bootstrap training dataset for seasonal classification.

Data sources:
- Burkina cities from data/raw-hdx/bfa_admincapitals.geojson
- CHIRPS seasonal features via Earth Engine client

Output columns:
- city_name, lat, lon, year, season_code,
  anomaly_pct, current_mean_daily_mm, historical_mean_daily_mm,
  target_category

Usage:
  cd /Users/MACPRO/Cedrix/Ismagi/IA/Agroficient
  source backend/.venv/bin/activate
  python backend/ml/build_training_dataset.py \
    --output backend/ml/training_dataset.csv \
    --start-year 2014 --end-year 2025 --seasons JAS,OND,MAM
"""

from __future__ import annotations

import argparse
import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
import sys

# Allow importing backend app modules when launched from repo root.
ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / 'backend'
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.clients.earth_engine_client import get_chirps_seasonal_features_by_period  # noqa: E402

SEASON_AXIS = "JFMAMJJASOND"


@dataclass
class City:
    name: str
    lat: float
    lon: float


def parse_season(code: str) -> list[int]:
    code = code.strip().upper()
    idx = SEASON_AXIS.find(code)
    if idx < 0:
        raise ValueError(f"Unknown season code: {code}")
    return [((idx + i) % 12) + 1 for i in range(len(code))]


def classify_from_anomaly(anomaly_pct: float) -> str:
    if anomaly_pct >= 15:
        return "bonne"
    if anomaly_pct <= -15:
        return "difficile"
    return "normale"


def load_cities(capitals_geojson: Path) -> list[City]:
    raw = json.loads(capitals_geojson.read_text())
    feats = raw.get('features', [])
    cities: list[City] = []

    for f in feats:
        coords = f.get('geometry', {}).get('coordinates', [])
        props = f.get('properties', {})
        if not isinstance(coords, list) or len(coords) < 2:
            continue

        lon = float(coords[0])
        lat = float(coords[1])

        name = (
            props.get('ADM3_FR')
            or props.get('ADM3_EN')
            or props.get('shapeName')
            or props.get('CITY_NAME')
            or props.get('name')
        )
        if not name:
            continue

        cities.append(City(str(name).strip(), lat, lon))

    # Deduplicate by city name + rounded coordinates
    dedup = {}
    for c in cities:
        key = (c.name.lower(), round(c.lat, 4), round(c.lon, 4))
        dedup[key] = c

    return list(dedup.values())


def iter_rows(cities: Iterable[City], years: Iterable[int], season_codes: list[str]):
    for city in cities:
        for year in years:
            for season_code in season_codes:
                months = parse_season(season_code)

                try:
                    feat = get_chirps_seasonal_features_by_period(
                        latitude=city.lat,
                        longitude=city.lon,
                        months=months,
                        target_year=year,
                        radius_km=20,
                    )
                except Exception as exc:
                    # Skip sample if EE fails for this point/time.
                    print(f"[warn] skip {city.name} {season_code}-{year}: {exc}")
                    continue

                anomaly = float(feat.get('anomaly_pct', 0.0) or 0.0)
                current = float(feat.get('current_mean_daily_mm', 0.0) or 0.0)
                historical = float(feat.get('historical_mean_daily_mm', 0.0) or 0.0)

                yield {
                    'city_name': city.name,
                    'lat': city.lat,
                    'lon': city.lon,
                    'year': year,
                    'season_code': season_code,
                    'anomaly_pct': anomaly,
                    'current_mean_daily_mm': current,
                    'historical_mean_daily_mm': historical,
                    # Bootstrap label from climatic rule; replace later with field labels when available.
                    'target_category': classify_from_anomaly(anomaly),
                }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--capitals-geojson', default=str(ROOT / 'data' / 'raw-hdx' / 'bfa_admincapitals.geojson'))
    parser.add_argument('--output', required=True)
    parser.add_argument('--start-year', type=int, default=2014)
    parser.add_argument('--end-year', type=int, default=2025)
    parser.add_argument('--seasons', default='JAS,OND,MAM')
    args = parser.parse_args()

    capitals = Path(args.capitals_geojson)
    if not capitals.exists():
        raise FileNotFoundError(f"Missing capitals file: {capitals}")

    cities = load_cities(capitals)
    if not cities:
        raise RuntimeError('No cities loaded from capitals geojson')

    season_codes = [s.strip().upper() for s in args.seasons.split(',') if s.strip()]
    years = range(args.start_year, args.end_year + 1)

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)

    fields = [
        'city_name',
        'lat',
        'lon',
        'year',
        'season_code',
        'anomaly_pct',
        'current_mean_daily_mm',
        'historical_mean_daily_mm',
        'target_category',
    ]

    n = 0
    with out.open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for row in iter_rows(cities, years, season_codes):
            w.writerow(row)
            n += 1

    print(f"Done. rows={n}, cities={len(cities)}, output={out}")


if __name__ == '__main__':
    main()
