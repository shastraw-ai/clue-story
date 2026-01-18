from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.auth import GoogleAuthRequest, TokenResponse, UserResponse
from app.services.auth_service import auth_service
from app.middleware.auth_middleware import get_current_user

router = APIRouter()


@router.post("/google", response_model=TokenResponse)
async def google_auth(
    request: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate with Google ID token.
    Creates a new user if one doesn't exist.
    Returns a JWT access token.
    """
    try:
        google_info = await auth_service.verify_google_token(request.id_token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    # Check if user exists
    result = await db.execute(
        select(User).where(User.google_id == google_info["google_id"])
    )
    user = result.scalar_one_or_none()

    if user is None:
        # Create new user
        user = User(
            google_id=google_info["google_id"],
            email=google_info["email"],
            name=google_info["name"],
            picture_url=google_info["picture_url"],
        )
        db.add(user)
        await db.flush()
    else:
        # Update user info from Google
        user.name = google_info["name"]
        user.picture_url = google_info["picture_url"]

    await db.commit()
    await db.refresh(user)

    # Create access token
    access_token = auth_service.create_access_token(user.id, user.email)

    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """
    Get the current authenticated user.
    """
    return UserResponse.model_validate(current_user)
