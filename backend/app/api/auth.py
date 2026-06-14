
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


@router.post(
    "/email-webhook",
    summary="Email provider webhook receiver for Resend and SendGrid tracking",
)
async def email_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Receives tracking webhook payloads from Resend or SendGrid.
    Updates digest_logs with timestamps: delivered_at, opened_at, clicked_at.
    """
    import json
    import uuid
    from datetime import datetime, timezone
    from sqlalchemy import select
    from app.models.subscription import EmailDigestLog

    body = await request.body()
    try:
        payload = json.loads(body.decode("utf-8"))
    except Exception as e:
        return {"status": "error", "message": f"Invalid JSON: {str(e)}"}

    events = []
    if isinstance(payload, list):
        events = payload
    elif isinstance(payload, dict):
        events = [payload]
    else:
        return {"status": "ignored", "message": "Unknown payload structure"}

    processed_count = 0
    for evt in events:
        digest_log_id = None
        event_name = None
        recipient_email = None
        
        # 1. Parse Resend structure
        if "type" in evt and "data" in evt:
            event_name = evt["type"]
            data = evt["data"]
            tags = data.get("tags", {})
            if isinstance(tags, dict):
                digest_log_id = tags.get("digest_log_id")
            elif isinstance(tags, list):
                for tag in tags:
                    if tag.get("name") == "digest_log_id":
                        digest_log_id = tag.get("value")
                        break
            recipient_email = data.get("to", [None])[0] if data.get("to") else None
            
        # 2. Parse SendGrid structure
        elif "event" in evt:
            event_name = evt["event"]
            digest_log_id = evt.get("digest_log_id")
            recipient_email = evt.get("email")
            
        if not digest_log_id and not recipient_email:
            continue

        log_record = None
        if digest_log_id:
            try:
                log_uuid = uuid.UUID(digest_log_id)
                stmt = select(EmailDigestLog).where(EmailDigestLog.id == log_uuid)
                res = await db.execute(stmt)
                log_record = res.scalar_one_or_none()
            except Exception:
                pass
                
        if not log_record and recipient_email:
            stmt = select(EmailDigestLog).where(
                EmailDigestLog.recipient_email == recipient_email
            ).order_by(EmailDigestLog.sent_at.desc())
            res = await db.execute(stmt)
            log_record = res.scalars().first()

        if log_record:
            now_tz = datetime.now(timezone.utc)
            event_clean = event_name.lower().replace("email.", "")
            
            if event_clean in ["delivered", "deliver"]:
                log_record.delivered_at = now_tz
                log_record.status = "delivered"
            elif event_clean in ["opened", "open"]:
                log_record.opened_at = now_tz
                log_record.status = "opened"
            elif event_clean in ["clicked", "click"]:
                log_record.clicked_at = now_tz
                log_record.status = "clicked"
            elif event_clean in ["bounced", "bounce", "dropped", "failed"]:
                log_record.status = "failed"
                log_record.error_message = f"Webhook reported event: {event_name}"
                
            db.add(log_record)
            processed_count += 1

    if processed_count > 0:
        await db.commit()

    return {"status": "success", "processed_events": processed_count}


