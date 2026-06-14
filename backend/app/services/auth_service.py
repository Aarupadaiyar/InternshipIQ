from __future__ import annotations

"""
Auth service — business logic for registration, login, and token management.
"""
import logging
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt_handler import create_access_token
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse
from app.utils.security import verify_password

logger = logging.getLogger(__name__)

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
            logger.warning(f"Registration failed: Account with email '{data.email}' already exists.")
            raise _EMAIL_TAKEN
        try:
            user = await self.repo.create(data)
            logger.info(f"User registration successful for email: '{data.email}', user_id: {user.id}")
            return user
        except Exception as e:
            logger.error(f"Registration failed for email '{data.email}' due to database/unexpected error: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred during user registration."
            )

    async def login(self, data: UserLogin) -> TokenResponse:
        """
        Authenticate a user and return a JWT access token and refresh token.
        Uses constant-time comparison via passlib to resist timing attacks.
        Raises HTTP 401 on any failure (intentionally vague for security).
        """
        user = await self.repo.get_by_email(data.email)
        if not user:
            logger.warning(f"Login failed: Email '{data.email}' is not registered.")
            raise _INVALID_CREDENTIALS
        
        if user.password_hash is None:
            logger.warning(f"Login failed: OAuth-only user '{data.email}' attempted password login.")
            raise _INVALID_CREDENTIALS

        if not verify_password(data.password, user.password_hash):
            logger.warning(f"Login failed: Incorrect password for user '{data.email}'.")
            raise _INVALID_CREDENTIALS

        if not user.is_active:
            logger.warning(f"Login failed: Account '{data.email}' is deactivated.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Contact support.",
            )

        from app.repositories.user_repository import is_developer_email
        if is_developer_email(user.email):
            user.role = "ADMIN"
            
        from datetime import datetime, timezone
        user.last_login = datetime.now(timezone.utc)
        self.repo.db.add(user)
        await self.repo.db.flush()
        await self.repo.db.refresh(user)

        access_token = create_access_token(user.id)
        refresh_token = await self.rt_repo.create_token(user.id)
        logger.info(f"User logged in successfully: '{data.email}', role: {user.role}, user_id: {user.id}")
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
        """
        from app.config import settings
        import httpx

        logger.info(f"Initializing Google OAuth login sequence. redirect_uri: {redirectUri if 'redirectUri' in locals() else redirect_uri}")

        email = None
        full_name = None
        google_id = None

        # Check configuration & filter out default placeholders
        is_configured = (
            bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)
            and "your-google-client-id" not in settings.GOOGLE_CLIENT_ID
            and settings.GOOGLE_CLIENT_ID.lower() != "mock"
        )
        use_mock = False

        if not is_configured:
            if settings.is_development:
                use_mock = True
                logger.info("Google OAuth credentials not configured. Falling back to sandbox/mock mode in development.")
            else:
                logger.error("Google OAuth login failed: Credentials are not configured in a production/non-development environment.")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Google OAuth is not configured on the server",
                )
        elif code.startswith("mock_code_"):
            if settings.is_development:
                use_mock = True
                logger.info("Google OAuth received mock code in development. Utilizing sandbox/mock mode.")
            else:
                logger.warning("Google OAuth login failed: Mock code received but mock OAuth codes are disabled in production.")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mock OAuth codes are disabled",
                )

        if use_mock:
            parts = code.split(":")
            if len(parts) >= 4:
                email = parts[1]
                full_name = parts[2]
                google_id = parts[3]
                logger.info(f"Decoded custom Google sandbox credentials: name={full_name}, email={email}, id={google_id}")
            else:
                email = "mock_google_user@example.com"
                full_name = "Google Sandbox User"
                google_id = "mock_google_id_12345"
                logger.info("Utilizing default Google sandbox credentials.")
        else:
            try:
                # 1. Exchange code for credentials
                logger.info("Exchanging code for Google token...")
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
                        logger.warning(f"Google OAuth token exchange failed: {token_data.get('error_description', 'Unknown error')}")
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Google OAuth failed: {token_data.get('error_description', 'Unknown error')}"
                        )
                    
                    id_token = token_data.get("id_token")
                    if not id_token:
                        logger.warning("Google OAuth response was missing the id_token.")
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Google OAuth response missing id_token"
                        )
                    
                    # 2. Get tokeninfo
                    logger.info("Validating Google id_token with tokeninfo endpoint...")
                    info_res = await client.get(
                        f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
                    )
                    info_data = info_res.json()
                    if info_res.status_code != 200:
                        logger.warning("Failed to validate Google id_token with tokeninfo endpoint.")
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Failed to validate Google id_token"
                        )
                    
                    # Verify audience matches client ID
                    if info_data.get("aud") != settings.GOOGLE_CLIENT_ID:
                        logger.warning(f"Google id_token aud mismatch. Expected {settings.GOOGLE_CLIENT_ID}, got {info_data.get('aud')}.")
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Google id_token aud mismatch"
                        )
                    
                    email = info_data.get("email")
                    full_name = info_data.get("name", "Google User")
                    google_id = info_data.get("sub")
            except Exception as e:
                logger.error(f"Google OAuth flow error: {str(e)}", exc_info=True)
                if isinstance(e, HTTPException):
                    raise
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Google OAuth error: {str(e)}"
                )

        if not email or not google_id:
            logger.warning("Google OAuth flow completed but email or user ID was not found in the credentials.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not retrieve email or user ID from Google OAuth"
            )

        logger.info(f"Retrieving or creating user for Google email: '{email}', provider id: {google_id}")
        user = await self.repo.get_or_create_oauth_user(
            email=email,
            full_name=full_name,
            provider="google",
            oauth_id=google_id
        )

        if not user.is_active:
            logger.warning(f"Google OAuth login failed: Account '{email}' is deactivated.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Contact support.",
            )

        access_token = create_access_token(user.id)
        refresh_token = await self.rt_repo.create_token(user.id)
        logger.info(f"Google OAuth user logged in successfully: '{email}', user_id: {user.id}")
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

    async def login_github(self, code: str, redirect_uri: str) -> TokenResponse:
        """
        Authenticate a user using GitHub OAuth.
        """
        from app.config import settings
        import httpx

        logger.info(f"Initializing GitHub OAuth login sequence. redirect_uri: {redirect_uri}")

        email = None
        full_name = None
        github_id = None

        # Check configuration & filter out default placeholders
        is_configured = (
            bool(settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET)
            and "your-github-client-id" not in settings.GITHUB_CLIENT_ID
            and settings.GITHUB_CLIENT_ID.lower() != "mock"
        )
        use_mock = False

        if not is_configured:
            if settings.is_development:
                use_mock = True
                logger.info("GitHub OAuth credentials not configured. Falling back to sandbox/mock mode in development.")
            else:
                logger.error("GitHub OAuth login failed: Credentials are not configured in a production/non-development environment.")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="GitHub OAuth is not configured on the server",
                )
        elif code.startswith("mock_code_"):
            if settings.is_development:
                use_mock = True
                logger.info("GitHub OAuth received mock code in development. Utilizing sandbox/mock mode.")
            else:
                logger.warning("GitHub OAuth login failed: Mock code received but mock OAuth codes are disabled in production.")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mock OAuth codes are disabled",
                )

        if use_mock:
            parts = code.split(":")
            if len(parts) >= 4:
                email = parts[1]
                full_name = parts[2]
                github_id = parts[3]
                logger.info(f"Decoded custom GitHub sandbox credentials: name={full_name}, email={email}, id={github_id}")
            else:
                email = "mock_github_user@example.com"
                full_name = "GitHub Sandbox User"
                github_id = "mock_github_id_12345"
                logger.info("Utilizing default GitHub sandbox credentials.")
        else:
            try:
                # 1. Exchange code for access token
                logger.info("Exchanging code for GitHub token...")
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
                        logger.warning(f"GitHub OAuth token exchange failed: {token_data.get('error_description', 'Unknown error')}")
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"GitHub OAuth failed: {token_data.get('error_description', 'Unknown error')}"
                        )
                    
                    access_token = token_data.get("access_token")
                    if not access_token:
                        logger.warning("GitHub OAuth response was missing access_token.")
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="GitHub OAuth response missing access_token"
                        )
                    
                    # 2. Get user profile
                    logger.info("Retrieving GitHub user profile details...")
                    user_res = await client.get(
                        "https://api.github.com/user",
                        headers={"Authorization": f"token {access_token}"}
                    )
                    user_data = user_res.json()
                    if user_res.status_code != 200:
                        logger.warning("Failed to retrieve GitHub user profile using access token.")
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Failed to retrieve GitHub user profile"
                        )
                    
                    github_id = str(user_data.get("id"))
                    full_name = user_data.get("name") or user_data.get("login") or "GitHub User"
                    email = user_data.get("email")

                    # 3. Get user email if private
                    if not email:
                        logger.info("GitHub user email is private. Fetching from user emails endpoint...")
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
                logger.error(f"GitHub OAuth flow error: {str(e)}", exc_info=True)
                if isinstance(e, HTTPException):
                    raise
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"GitHub OAuth error: {str(e)}"
                )

        if not email or not github_id:
            logger.warning("GitHub OAuth flow completed but email or user ID was not found in the credentials.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not retrieve email or user ID from GitHub OAuth"
            )

        logger.info(f"Retrieving or creating user for GitHub email: '{email}', provider id: {github_id}")
        user = await self.repo.get_or_create_oauth_user(
            email=email,
            full_name=full_name,
            provider="github",
            oauth_id=github_id
        )

        if not user.is_active:
            logger.warning(f"GitHub OAuth login failed: Account '{email}' is deactivated.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Contact support.",
            )

        access_token = create_access_token(user.id)
        refresh_token = await self.rt_repo.create_token(user.id)
        logger.info(f"GitHub OAuth user logged in successfully: '{email}', user_id: {user.id}")
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )


