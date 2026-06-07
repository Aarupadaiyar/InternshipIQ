
"""
Authentication API endpoints.
"""
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.middleware.rate_limit import limiter
from app.models.user import User
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse, MessageResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
@limiter.limit("3/minute")
async def register(
    request: Request,
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Registers a new user and returns their profile info.
    Rate limited: 3 requests per minute.
    """
    auth_service = AuthService(db)
    return await auth_service.register(data)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login to obtain a JWT token",
)
@limiter.limit("5/minute")
async def login(
    request: Request,
    data: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticates email and password and returns a JWT token.
    Rate limited: 5 requests per minute.
    """
    auth_service = AuthService(db)
    return await auth_service.login(data)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user details",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Returns the details of the currently authenticated user.
    """
    return current_user


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Log out of the system",
)
async def logout(
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """
    Invalidates the user's session.
    Since JWT is stateless, the server acknowledges the request,
    and the client is responsible for discarding the token.
    """
    return MessageResponse(message="Successfully logged out")
