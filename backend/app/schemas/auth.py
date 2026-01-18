from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime


class GoogleAuthRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    name: str | None
    picture_url: str | None
    country: str
    preferred_model: str
    created_at: datetime

    class Config:
        from_attributes = True
