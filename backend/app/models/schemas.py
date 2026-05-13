from pydantic import BaseModel, Field
from typing import Literal


class SeasonalForecastRequest(BaseModel):
    zone_id: str = Field(min_length=1)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    periode: str = Field(min_length=3, max_length=20)


class SeasonalForecastResponse(BaseModel):
    zone_id: str
    categorie: Literal["bonne", "normale", "difficile"]
    probabilite: float = Field(ge=0, le=1)
    source: str
    details: dict


class OnsetRequest(BaseModel):
    zone_id: str = Field(min_length=1)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    year: int = Field(ge=1981, le=2100)


class OnsetResponse(BaseModel):
    zone_id: str
    onset_date: str | None
    method: str
    confidence: float = Field(ge=0, le=1)
    details: dict


class ShortTermForecastRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    days: int = Field(default=16, ge=1, le=16)


class ChirpsRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radius_km: float = Field(default=25, ge=1, le=250)
    start_date: str = Field(default="1981-01-01")
    end_date: str | None = None


class CDSRequest(BaseModel):
    target_period: str = Field(min_length=3, max_length=20)
