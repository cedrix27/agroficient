import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    open_meteo_base_url: str = os.getenv("OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1/forecast")
    google_earth_api_key: str = os.getenv("GOOGLE_EARTH_API_KEY", "")
    google_application_credentials: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    ee_project_id: str = os.getenv("EE_PROJECT_ID", os.getenv("GOOGLE_CLOUD_PROJECT", ""))
    cds_api_key: str = os.getenv("CDS_API_KEY", "")
    cds_api_url: str = os.getenv("CDS_API_URL", "https://cds.climate.copernicus.eu/api/v2")


settings = Settings()
