import requests
from app.core.config import settings


def get_short_term_forecast(latitude: float, longitude: float, days: int = 16) -> dict:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": "precipitation_sum,precipitation_probability_max",
        "forecast_days": max(1, min(days, 16)),
        "timezone": "Africa/Abidjan",
    }
    response = requests.get(settings.open_meteo_base_url, params=params, timeout=15)
    response.raise_for_status()
    return response.json()
