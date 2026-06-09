from __future__ import annotations

"""
Auth service — business logic for registration, login, and token management.
"""
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt_handler import create_access_token
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse
from app.utils.security import verify_password

_EMAIL_TAKEN = HTTPException(
    status_code=status.HTTP_409_CONFLICT,
    detail="An account with this email already exists",
)

_INVALID_CREDENTIALS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid email or password",
    headers={"WWW-Authenticate": "Bearer"},
)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = UserRepository(db)
        self.rt_repo = RefreshTokenRepository(db)

    async def register(self, data: UserCreate) -> User:
        """
        Register a new user.
        Raises HTTP 409 if the email is already in use.
        """
        if await self.repo.email_exists(data.email):
            raise _EMAIL_TAKEN
        return await self.repo.create(data)

    async def login(self, data: UserLogin) -> TokenResponse:
        """
        Authenticate a user and return a JWT access token and refresh token.
        Uses constant-time comparison via passlib to resist timing attacks.
        Raises HTTP 401 on any failure (intentionally vague for security).
        """
        user = await self.repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise _INVALID_CREDENTIALS
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Contact support.",
            )

        access_token = create_access_token(user.id)
        refresh_token = await self.rt_repo.create_token(user.id)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

    async def refresh_access_token(self, refresh_token: str) -> dict:
        """
        Verify the refresh token and generate a new short-lived access token.
        """
        try:
            user_id = await self.rt_repo.verify_and_refresh(refresh_token)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e),
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = await self.repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User inactive or not found",
            )
            
        new_access_token = create_access_token(user.id)
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }

    async def logout(self, refresh_token: str) -> None:
        """
        Revoke the refresh token on logout.
        """
        await self.rt_repo.revoke_token(refresh_token)

    async def login_google(self, code: str, redirect_uri: str) -> TokenResponse:
        """
        Authenticate a user using Google OAuth.
        Supports development sandbox login with mock credentials.
        """
        from app.config import settings
        import httpx

        email = None
        full_name = None
        google_id = None

        # Sandbox Mock login check
        if code == "mock_code_google" or not settings.GOOGLE_CLIENT_ID or settings.GOOGLE_CLIENT_ID.lower() == "mock":
            email = "mock_google_user@example.com"
            full_name = "Google Sandbox User"
            google_id = "mock_google_id_12345"
        else:
            try:
                # 1. Exchange code for credentials
                async with httpx.AsyncClient() as client:
                    token_res = await client.post(
                        "https://oauth2.googleapis.com/token",
                        data={
                            "code": code,
                            "client_id": settings.GOOGLE_CLIENT_ID,
                            "client_secret": settings.GOOGLE_CLIENT_SECRET,
                            "redirect_uri": redirect_uri,
                            "grant_type": "authorization_code"
                        }
                    )
                    token_data = token_res.json()
                    if token_res.status_code != 200:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Google OAuth failed: {token_data.get('error_description', 'Unknown error')}"
                        )
                    
                    id_token = token_data.get("id_token")
                    if not id_token:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Google OAuth response missing id_token"
                        )
                    
                    # 2. Get tokeninfo
                    info_res = await client.get(
                        f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
                    )
                    info_data = info_res.json()
                    if info_res.status_code != 200:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Failed to validate Google id_token"
                        )
                    
                    # Verify audience matches client ID
                    if info_data.get("aud") != settings.GOOGLE_CLIENT_ID:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Google id_token aud mismatch"
                        )
                    
                    email = info_data.get("email")
                    full_name = info_data.get("name", "Google User")
                    google_id = info_data.get("sub")
            except Exception as e:
                if isinstance(e, HTTPException):
                    raise
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Google OAuth error: {str(e)}"
                )

        if not email or not google_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not retrieve email or user ID from Google OAuth"
            )

        user = await self.repo.get_or_create_oauth_user(
            email=email,
            full_name=full_name,
            provider="google",
            oauth_id=google_id
        )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Contact support.",
            )

        access_token = create_access_token(user.id)
        refresh_token = await self.rt_repo.create_token(user.id)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

    async def login_github(self, code: str, redirect_uri: str) -> TokenResponse:
        """
        Authenticate a user using GitHub OAuth.
        Supports development sandbox login with mock credentials.
        """
        from app.config import settings
        import httpx

        email = None
        full_name = None
        github_id = None

        # Sandbox Mock login check
        if code == "mock_code_github" or not settings.GITHUB_CLIENT_ID or settings.GITHUB_CLIENT_ID.lower() == "mock":
            email = "mock_github_user@example.com"
            full_name = "GitHub Sandbox User"
            github_id = "mock_github_id_12345"
        else:
            try:
                # 1. Exchange code for access token
                async with httpx.AsyncClient() as client:
                    token_res = await client.post(
                        "https://github.com/login/oauth/access_token",
                        headers={"Accept": "application/json"},
                        data={
                            "client_id": settings.GITHUB_CLIENT_ID,
                            "client_secret": settings.GITHUB_CLIENT_SECRET,
                            "code": code,
                            "redirect_uri": redirect_uri
                        }
                    )
                    token_data = token_res.json()
                    if token_res.status_code != 200 or "error" in token_data:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"GitHub OAuth failed: {token_data.get('error_description', 'Unknown error')}"
                        )
                    
                    access_token = token_data.get("access_token")
                    if not access_token:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="GitHub OAuth response missing access_token"
                        )
                    
                    # 2. Get user profile
                    user_res = await client.get(
                        "https://api.github.com/user",
                        headers={"Authorization": f"token {access_token}"}
                    )
                    user_data = user_res.json()
                    if user_res.status_code != 200:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Failed to retrieve GitHub user profile"
                        )
                    
                    github_id = str(user_data.get("id"))
                    full_name = user_data.get("name") or user_data.get("login") or "GitHub User"
                    email = user_data.get("email")

                    # 3. Get user email if private
                    if not email:
                        emails_res = await client.get(
                            "https://api.github.com/user/emails",
                            headers={"Authorization": f"token {access_token}"}
                        )
                        if emails_res.status_code == 200:
                            emails_data = emails_res.json()
                            for email_item in emails_data:
                                if email_item.get("primary") and email_item.get("verified"):
                                    email = email_item.get("email")
                                    break
                            if not email and emails_data:
                                email = emails_data[0].get("email")
            except Exception as e:
                if isinstance(e, HTTPException):
                    raise
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"GitHub OAuth error: {str(e)}"
                )

        if not email or not github_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not retrieve email or user ID from GitHub OAuth"
            )

        user = await self.repo.get_or_create_oauth_user(
            email=email,
            full_name=full_name,
            provider="github",
            oauth_id=github_id
        )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Contact support.",
            )

        access_token = create_access_token(user.id)
        refresh_token = await self.rt_repo.create_token(user.id)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )


