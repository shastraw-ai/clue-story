from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


class KidCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    grade: str = Field(..., pattern=r"^(K|[1-9]|1[0-2])$")  # K, 1-12
    difficulty_level: int = Field(..., ge=1, le=5)


class KidUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    grade: str | None = Field(None, pattern=r"^(K|[1-9]|1[0-2])$")
    difficulty_level: int | None = Field(None, ge=1, le=5)


class KidResponse(BaseModel):
    id: UUID
    name: str
    grade: str
    difficulty_level: int
    alias: str
    created_at: datetime

    class Config:
        from_attributes = True
