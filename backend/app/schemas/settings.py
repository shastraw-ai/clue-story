from pydantic import BaseModel, Field
from typing import Literal


LLMModel = Literal["gpt-4o-mini", "gpt-4o", "gpt-4.1", "gpt-5-mini", "gpt-5"]


class SettingsResponse(BaseModel):
    country: str
    preferred_model: str


class SettingsUpdate(BaseModel):
    country: str | None = Field(None, max_length=10)
    preferred_model: LLMModel | None = None
