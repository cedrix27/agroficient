import os
from datetime import date
import ee
from app.core.config import settings


def _init_ee() -> str | None:
    project = settings.ee_project_id or None
    creds_path = settings.google_application_credentials

    if creds_path and os.path.exists(creds_path):
        credentials = ee.ServiceAccountCredentials(email=None, key_file=creds_path)
        ee.Initialize(credentials=credentials, project=project)
        return project

    ee.Initialize(project=project)
    return project


def _safe_reduced_precip(img_collection: ee.imagecollection.ImageCollection, geometry: ee.geometry.Geometry) -> float:
    count = int(img_collection.size().getInfo() or 0)
    if count == 0:
        return 0.0

    reduced = (
        img_collection.mean()
        .reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=5000,
            maxPixels=1_000_000_000,
        )
        .getInfo()
    )

    if not isinstance(reduced, dict):
        return 0.0

    val = reduced.get("precipitation")
    return float(val or 0.0)


def _month_filter(months: list[int]) -> ee.Filter:
    filters = [ee.Filter.calendarRange(m, m, "month") for m in months]
    f = filters[0]
    for nxt in filters[1:]:
        f = ee.Filter.Or(f, nxt)
    return f


def get_chirps_data(
    latitude: float,
    longitude: float,
    radius_km: float = 25,
    start_date: str = "1981-01-01",
    end_date: str | None = None,
) -> dict:
    project = _init_ee()

    if end_date is None:
        end_date = date.today().isoformat()

    point = ee.Geometry.Point([longitude, latitude])
    zone = point.buffer(radius_km * 1000)

    chirps = (
        ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
        .filterDate(start_date, end_date)
        .filterBounds(zone)
    )

    image_count = int(chirps.size().getInfo() or 0)

    total_red = (
        chirps.sum()
        .reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=zone,
            scale=5000,
            maxPixels=1_000_000_000,
        )
        .getInfo()
    )
    total_mm = float(total_red.get("precipitation", 0.0)) if isinstance(total_red, dict) else 0.0

    mean_daily_mm = _safe_reduced_precip(chirps, zone)

    return {
        "source": "earth_engine_chirps",
        "project": project,
        "latitude": latitude,
        "longitude": longitude,
        "radius_km": radius_km,
        "period": {"start": start_date, "end": end_date},
        "image_count": image_count,
        "total_mm_estimate": total_mm,
        "mean_daily_mm_estimate": mean_daily_mm,
    }


def get_chirps_seasonal_features_by_period(
    latitude: float,
    longitude: float,
    months: list[int],
    target_year: int,
    radius_km: float = 25,
) -> dict:
    project = _init_ee()

    point = ee.Geometry.Point([longitude, latitude])
    zone = point.buffer(radius_km * 1000)
    chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").filterBounds(zone)

    today = date.today()
    min_month = min(months)
    max_month = max(months)

    requested_start = date(target_year, min_month, 1)

    # If requested season has not started yet, use last year's same season as observational proxy.
    effective_year = target_year if requested_start <= today else (target_year - 1)
    pre_season_proxy = effective_year != target_year

    current_start = f"{effective_year}-{min_month:02d}-01"
    if effective_year == today.year and max_month >= today.month:
        current_end = today.isoformat()
    else:
        current_end = f"{effective_year}-{max_month:02d}-28"

    month_f = _month_filter(months)

    current_period = chirps.filterDate(current_start, current_end).filter(month_f)

    historical_start = "1981-01-01"
    historical_end = f"{effective_year - 1}-12-31"
    historical_period = chirps.filterDate(historical_start, historical_end).filter(month_f)

    current_mean = _safe_reduced_precip(current_period, zone)
    historical_mean = _safe_reduced_precip(historical_period, zone)

    anomaly_pct = ((current_mean - historical_mean) / historical_mean * 100.0) if historical_mean > 0 else 0.0

    return {
        "source": "earth_engine_chirps",
        "project": project,
        "months": months,
        "target_year": target_year,
        "effective_year": effective_year,
        "pre_season_proxy": pre_season_proxy,
        "current_period": {"start": current_start, "end": current_end},
        "historical_period": {"start": historical_start, "end": historical_end},
        "current_mean_daily_mm": round(current_mean, 3),
        "historical_mean_daily_mm": round(historical_mean, 3),
        "anomaly_pct": round(anomaly_pct, 2),
    }


def get_chirps_daily_series(
    latitude: float,
    longitude: float,
    start_date: str,
    end_date: str,
    radius_km: float = 25,
) -> list[dict]:
    _init_ee()

    point = ee.Geometry.Point([longitude, latitude])
    zone = point.buffer(radius_km * 1000)

    coll = (
        ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
        .filterDate(start_date, end_date)
        .filterBounds(zone)
        .map(
            lambda img: img.set(
                "date", ee.Date(img.get("system:time_start")).format("YYYY-MM-dd")
            ).set(
                "rain",
                img.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=zone,
                    scale=5000,
                    maxPixels=1_000_000_000,
                ).get("precipitation"),
            )
        )
    )

    dates = coll.aggregate_array("date").getInfo() or []
    rains = coll.aggregate_array("rain").getInfo() or []

    out = []
    for d, r in zip(dates, rains):
        out.append({"date": d, "rain_mm": float(r or 0.0)})

    return out
