from app.core.config import settings


def get_cds_stub(target_period: str) -> dict:
    configured = bool(settings.cds_api_key)
    return {
        "source": "copernicus_cds_seas5",
        "configured": configured,
        "api_url": settings.cds_api_url,
        "target_period": target_period,
        "note": "Stub connector ready. Integrate cdsapi retrieve workflow with netcdf parsing for production.",
    }
