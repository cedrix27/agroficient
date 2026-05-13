import re
from app.models.schemas import OnsetResponse, SeasonalForecastRequest, SeasonalForecastResponse
from app.clients.cds_client import get_cds_stub
from app.clients.earth_engine_client import get_chirps_daily_series, get_chirps_seasonal_features_by_period
from app.services.ml_inference import seasonal_predict

SEASON_AXIS = "JFMAMJJASOND"


def _parse_periode(periode: str) -> tuple[list[int], int, str]:
    m = re.match(r"^([A-Z]{3,5})-(\d{4})$", periode.strip().upper())
    if not m:
        raise ValueError("Periode invalide. Format attendu ex: JAS-2026")

    code = m.group(1)
    year = int(m.group(2))

    idx = SEASON_AXIS.find(code)
    if idx < 0:
        raise ValueError("Code saison non reconnu (ex: JAS, MAM, OND)")

    months = [((idx + i) % 12) + 1 for i in range(len(code))]
    return months, year, code


def _category_from_anomaly(anomaly_pct: float) -> tuple[str, float]:
    if anomaly_pct >= 15:
        return "bonne", min(0.92, 0.62 + anomaly_pct / 120)
    if anomaly_pct <= -15:
        return "difficile", min(0.92, 0.62 + abs(anomaly_pct) / 120)
    return "normale", max(0.52, 0.8 - abs(anomaly_pct) / 100)


def _apply_cds_adjustment(base_prob: float, cds_configured: bool) -> float:
    if cds_configured:
        return min(0.95, base_prob + 0.02)
    return max(0.45, base_prob - 0.03)


def generate_data_driven_forecast(payload: SeasonalForecastRequest) -> SeasonalForecastResponse:
    months, target_year, season_code = _parse_periode(payload.periode)

    chirps = get_chirps_seasonal_features_by_period(
        payload.latitude,
        payload.longitude,
        months=months,
        target_year=target_year,
        radius_km=25,
    )

    anomaly = float(chirps.get("anomaly_pct", 0.0))
    current_mean = float(chirps.get("current_mean_daily_mm", 0.0))
    historical_mean = float(chirps.get("historical_mean_daily_mm", 0.0))

    ml_category, ml_prob = seasonal_predict(
        {
            "lat": payload.latitude,
            "lon": payload.longitude,
            "season_code": season_code,
            "anomaly_pct": anomaly,
            "current_mean_daily_mm": current_mean,
            "historical_mean_daily_mm": historical_mean,
        }
    )

    if ml_category is None:
        categorie, base_prob = _category_from_anomaly(anomaly)
        source = "chirps_seasonal_v2"
    else:
        categorie = ml_category
        base_prob = ml_prob if ml_prob is not None else 0.65
        source = "ml_seasonal_v1"

    cds_info = get_cds_stub(payload.periode)
    prob = _apply_cds_adjustment(float(base_prob), bool(cds_info.get("configured")))

    return SeasonalForecastResponse(
        zone_id=payload.zone_id,
        categorie=categorie,  # type: ignore[arg-type]
        probabilite=round(prob, 3),
        source=source,
        details={
            "periode": payload.periode,
            "months": months,
            "chirps": chirps,
            "cds": cds_info,
            "ml_enabled": ml_category is not None,
        },
    )


def predict_onset_date(zone_id: str, latitude: float, longitude: float, year: int) -> OnsetResponse:
    # Agronomic-inspired simplified rule:
    # onset = first day after April 1 where 3-day cumulative rain >= 20mm
    # and no dry spell > 7 consecutive days in next 30 days.
    start = f"{year}-04-01"
    end = f"{year}-10-31"

    series = get_chirps_daily_series(latitude, longitude, start, end)
    # Fallback if target-year daily observations are not available yet.
    effective_year = year
    if len(series) == 0:
        effective_year = year - 1
        start = f"{effective_year}-04-01"
        end = f"{effective_year}-10-31"
        series = get_chirps_daily_series(latitude, longitude, start, end)

    rains = [x["rain_mm"] for x in series]

    onset_date = None
    confidence = 0.55

    for i in range(len(rains) - 33):
        three_day = rains[i] + rains[i + 1] + rains[i + 2]
        if three_day < 20:
            continue

        window = rains[i : i + 30]
        max_dry = 0
        cur_dry = 0
        for val in window:
            if val < 1:
                cur_dry += 1
                max_dry = max(max_dry, cur_dry)
            else:
                cur_dry = 0

        if max_dry <= 7:
            onset_date = series[i]["date"]
            confidence = min(0.92, 0.6 + (three_day - 20) / 60)
            break

    details = {
        "rule": "3-day>=20mm and next30days max dry spell <=7 days",
        "period": {"start": start, "end": end},
        "effective_year": effective_year,
        "sample_days": len(series),
    }

    return OnsetResponse(
        zone_id=zone_id,
        onset_date=onset_date,
        method="chirps_agronomic_v1",
        confidence=round(confidence, 3),
        details=details,
    )
