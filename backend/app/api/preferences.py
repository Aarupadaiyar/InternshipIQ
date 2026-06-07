
"""
User Preferences API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.preferences import PreferencesCreate, PreferencesResponse, PreferencesUpdate
from app.repositories.preferences_repository import PreferencesRepository

router = APIRouter(prefix="/preferences", tags=["Preferences"])


@router.get(
    "",
    response_model=PreferencesResponse,
    summary="Get current user preferences",
)
async def get_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PreferencesResponse:
    """
    Retrieves the preferences for the currently logged-in user.
    Raises 404 if no preferences have been configured yet.
    """
    repo = PreferencesRepository(db)
    prefs = await repo.get_by_user(current_user.id)
    if not prefs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preferences not found. Please create preferences first.",
        )
    return prefs


@router.post(
    "",
    response_model=PreferencesResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or replace user preferences",
)
async def create_preferences(
    data: PreferencesCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PreferencesResponse:
    """
    Creates new preferences or fully replaces existing preferences for the user.
    """
    repo = PreferencesRepository(db)
    return await repo.create_or_update(current_user.id, data)


@router.put(
    "",
    response_model=PreferencesResponse,
    summary="Partially update user preferences",
)
async def update_preferences(
    data: PreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PreferencesResponse:
    """
    Partially updates the user's preferences.
    Only fields sent in the request body will be updated; other fields are left unchanged.
    Raises 404 if preferences do not exist.
    """
    repo = PreferencesRepository(db)
    prefs = await repo.get_by_user(current_user.id)
    if not prefs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preferences not found. Please create preferences first.",
        )
    return await repo.update(prefs, data)
