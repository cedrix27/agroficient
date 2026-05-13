from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    CDSRequest,
    ChirpsRequest,
    OnsetRequest,
    OnsetResponse,
    SeasonalForecastRequest,
    SeasonalForecastResponse,
    ShortTermForecastRequest,
)
from app.services.seasonal_service import generate_data_driven_forecast, predict_onset_date
from app.clients.openmeteo_client import get_short_term_forecast
from app.clients.earth_engine_client import get_chirps_data
from app.clients.cds_client import get_cds_stub

router = APIRouter(prefix="/previsions", tags=["previsions"])


@router.post("/saisonniere", response_model=SeasonalForecastResponse)
def prevision_saisonniere(payload: SeasonalForecastRequest) -> SeasonalForecastResponse:
    try:
        return generate_data_driven_forecast(payload)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Seasonal forecast error: {exc}") from exc


@router.post("/debut-saison", response_model=OnsetResponse)
def prevision_debut_saison(payload: OnsetRequest) -> OnsetResponse:
    try:
        return predict_onset_date(payload.zone_id, payload.latitude, payload.longitude, payload.year)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Onset forecast error: {exc}") from exc


@router.post("/court-terme")
def prevision_court_terme(payload: ShortTermForecastRequest) -> dict:
    try:
        return get_short_term_forecast(payload.latitude, payload.longitude, payload.days)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Open-Meteo error: {exc}") from exc


@router.post("/chirps")
def prevision_chirps(payload: ChirpsRequest) -> dict:
    try:
        return get_chirps_data(
            payload.latitude,
            payload.longitude,
            payload.radius_km,
            payload.start_date,
            payload.end_date,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                "Earth Engine error. Verify credentials/authentication. "
                f"Details: {exc}"
            ),
        ) from exc


@router.post("/cds")
def prevision_cds(payload: CDSRequest) -> dict:
    return get_cds_stub(payload.target_period)
