from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.kid import Kid
from app.schemas.kid import KidCreate, KidUpdate, KidResponse
from app.middleware.auth_middleware import get_current_user

router = APIRouter()

# Maximum number of kids per user
MAX_KIDS = 5

# Merged alias pool (gender-neutral)
ALIASES = [
    "Alex", "Alice", "Ben", "Bella", "Charlie",
    "Claire", "David", "Diana", "Ethan", "Emma",
    "Finn", "Fiona", "George", "Grace", "Henry",
    "Hannah", "Isaac", "Ivy", "Jack", "Julia",
]


async def get_next_alias(db: AsyncSession, user_id: UUID) -> str:
    """
    Get the next available alias for a user's kid.
    """
    result = await db.execute(
        select(Kid.alias).where(Kid.user_id == user_id)
    )
    used_aliases = {row[0] for row in result.fetchall()}

    for alias in ALIASES:
        if alias not in used_aliases:
            return alias

    # If all aliases used, start with numbered versions
    base_alias = ALIASES[0]
    counter = 2
    while f"{base_alias}{counter}" in used_aliases:
        counter += 1
    return f"{base_alias}{counter}"


@router.get("", response_model=list[KidResponse])
async def list_kids(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all kids for the current user.
    """
    result = await db.execute(
        select(Kid)
        .where(Kid.user_id == current_user.id)
        .order_by(Kid.created_at)
    )
    kids = result.scalars().all()
    return [KidResponse.model_validate(kid) for kid in kids]


@router.post("", response_model=KidResponse, status_code=status.HTTP_201_CREATED)
async def create_kid(
    request: KidCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new kid profile.
    Alias is auto-assigned.
    """
    # Check kid limit
    result = await db.execute(
        select(Kid).where(Kid.user_id == current_user.id)
    )
    existing_kids = result.scalars().all()

    if len(existing_kids) >= MAX_KIDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum of {MAX_KIDS} kids allowed per user",
        )

    # Get next available alias
    alias = await get_next_alias(db, current_user.id)

    # Create kid
    kid = Kid(
        user_id=current_user.id,
        name=request.name,
        grade=request.grade,
        difficulty_level=request.difficulty_level,
        alias=alias,
    )
    db.add(kid)
    await db.flush()
    await db.refresh(kid)

    return KidResponse.model_validate(kid)


@router.get("/{kid_id}", response_model=KidResponse)
async def get_kid(
    kid_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific kid by ID.
    """
    result = await db.execute(
        select(Kid).where(Kid.id == kid_id, Kid.user_id == current_user.id)
    )
    kid = result.scalar_one_or_none()

    if kid is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kid not found",
        )

    return KidResponse.model_validate(kid)


@router.put("/{kid_id}", response_model=KidResponse)
async def update_kid(
    kid_id: UUID,
    request: KidUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a kid's profile.
    """
    result = await db.execute(
        select(Kid).where(Kid.id == kid_id, Kid.user_id == current_user.id)
    )
    kid = result.scalar_one_or_none()

    if kid is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kid not found",
        )

    # Update fields if provided
    if request.name is not None:
        kid.name = request.name
    if request.grade is not None:
        kid.grade = request.grade
    if request.difficulty_level is not None:
        kid.difficulty_level = request.difficulty_level

    await db.flush()
    await db.refresh(kid)

    return KidResponse.model_validate(kid)


@router.delete("/{kid_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kid(
    kid_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a kid profile.
    """
    result = await db.execute(
        select(Kid).where(Kid.id == kid_id, Kid.user_id == current_user.id)
    )
    kid = result.scalar_one_or_none()

    if kid is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kid not found",
        )

    await db.delete(kid)
