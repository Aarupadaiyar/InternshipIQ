
"""
Authentication API endpoints.
"""
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.middleware.rate_limit import limiter
from app.models.user import User
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse, MessageResponse, TokenRefreshRequest, LogoutRequest, OAuthLoginRequest
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


@router.post(
    "/refresh",
    summary="Obtain a new access token using a refresh token",
)
@limiter.limit("20/minute")
async def refresh(
    request: Request,
    data: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Obtains a new access token using a valid refresh token.
    Rate limited: 20 requests per minute.
    """
    auth_service = AuthService(db)
    return await auth_service.refresh_access_token(data.refresh_token)


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
    data: LogoutRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Invalidates the user's session by revoking the refresh token.
    """
    auth_service = AuthService(db)
    await auth_service.logout(data.refresh_token)
    return MessageResponse(message="Successfully logged out")


@router.post(
    "/google-login",
    response_model=TokenResponse,
    summary="Login or register with Google OAuth",
)
@limiter.limit("10/minute")
async def google_login(
    request: Request,
    data: OAuthLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticates a user via Google OAuth authorization code flow.
    Returns access and refresh tokens.
    """
    auth_service = AuthService(db)
    return await auth_service.login_google(data.code, data.redirect_uri)


@router.post(
    "/github-login",
    response_model=TokenResponse,
    summary="Login or register with GitHub OAuth",
)
@limiter.limit("10/minute")
async def github_login(
    request: Request,
    data: OAuthLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticates a user via GitHub OAuth authorization code flow.
    Returns access and refresh tokens.
    """
    auth_service = AuthService(db)
    return await auth_service.login_github(data.code, data.redirect_uri)


