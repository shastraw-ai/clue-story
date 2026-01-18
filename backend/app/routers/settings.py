from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.settings import SettingsResponse, SettingsUpdate
from app.middleware.auth_middleware import get_current_user

router = APIRouter()


@router.get("", response_model=SettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_user),
):
    """
    Get user settings.
    """
    return SettingsResponse(
        country=current_user.country,
        preferred_model=current_user.preferred_model,
    )


@router.put("", response_model=SettingsResponse)
async def update_settings(
    request: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update user settings.
    """
    if request.country is not None:
        current_user.country = request.country
    if request.preferred_model is not None:
        current_user.preferred_model = request.preferred_model

    await db.flush()
    await db.refresh(current_user)

    return SettingsResponse(
        country=current_user.country,
        preferred_model=current_user.preferred_model,
    )
