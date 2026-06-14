from __future__ import annotations
import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin_user
from app.database.session import get_db
from app.models.user import User
from app.models.subscription import PremiumUser, Payment, EmailDigestLog
from app.models.job import JobModel
from app.models.rejection_log import RejectionLog
from app.schemas.user import UserResponse

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/metrics", summary="Get system-wide metrics and aggregates")
async def get_system_metrics(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Exposes complete system KPIs for the administrator dashboard:
    Total Users, Premium Users, Free Users, Active Users, Scrape Stats, Revenue.
    """
    # 1. User counts
    stmt_total = select(func.count(User.id))
    total_users = (await db.execute(stmt_total)).scalar() or 0

    stmt_active = select(func.count(User.id)).where(User.is_active == True)
    active_users = (await db.execute(stmt_active)).scalar() or 0

    now = datetime.now(timezone.utc)
    stmt_premium = select(func.count(PremiumUser.id)).where(
        PremiumUser.is_premium == True,
        PremiumUser.premium_until >= now
    )
    premium_users = (await db.execute(stmt_premium)).scalar() or 0
    free_users = max(0, total_users - premium_users)

    # 2. Jobs stats
    stmt_jobs_active = select(func.count(JobModel.id)).where(JobModel.is_active == True)
    jobs_active = (await db.execute(stmt_jobs_active)).scalar() or 0

    stmt_jobs_verified = select(func.count(JobModel.id)).where(JobModel.verification_status == "VERIFIED")
    jobs_verified = (await db.execute(stmt_jobs_verified)).scalar() or 0

    stmt_rejections = select(func.count(RejectionLog.id))
    jobs_rejected = (await db.execute(stmt_rejections)).scalar() or 0
    
    # Total scraped is active jobs + rejected logs + any rejected jobs in JobModel
    stmt_jobs_rejected_model = select(func.count(JobModel.id)).where(JobModel.verification_status == "REJECTED")
    jobs_rejected_model = (await db.execute(stmt_jobs_rejected_model)).scalar() or 0
    
    total_jobs_scraped = jobs_active + jobs_rejected + jobs_rejected_model

    # 3. Email digest logs
    stmt_digests = select(func.count(EmailDigestLog.id)).where(EmailDigestLog.status == "sent")
    email_digests_sent = (await db.execute(stmt_digests)).scalar() or 0

    # 4. Revenue
    stmt_rev = select(func.sum(Payment.amount)).where(Payment.status == "captured")
    total_revenue = float((await db.execute(stmt_rev)).scalar() or 0.0)

    return {
        "total_users": total_users,
        "premium_users": premium_users,
        "free_users": free_users,
        "active_users": active_users,
        "jobs_scraped": total_jobs_scraped,
        "jobs_verified": jobs_verified or jobs_active,
        "jobs_rejected": jobs_rejected + jobs_rejected_model,
        "email_digests_sent": email_digests_sent,
        "revenue": total_revenue,
    }

@router.get("/users", summary="Get filterable and searchable users list")
async def get_users_list(
    q: Optional[str] = Query(None, description="Search term for name or email"),
    role: Optional[str] = Query(None, description="Filter by role (FREE, PREMIUM, ADMIN)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    premium_status: Optional[str] = Query(None, description="Filter by premium status ('active', 'expired', 'none')"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Returns a paginated list of users with search and filter conditions.
    """
    stmt = select(User)
    
    # 1. Apply Search filter
    if q:
        search_pattern = f"%{q.lower().strip()}%"
        stmt = stmt.where(or_(
            func.lower(User.full_name).like(search_pattern),
            func.lower(User.email).like(search_pattern)
        ))
        
    # 2. Apply Role filter
    if role:
        stmt = stmt.where(User.role == role.upper().strip())
        
    # 3. Apply Active filter
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)

    # 4. Apply Premium/Subscription filter
    if premium_status:
        now = datetime.now(timezone.utc)
        if premium_status == "active":
            stmt = stmt.join(PremiumUser, User.id == PremiumUser.user_id).where(
                PremiumUser.is_premium == True,
                PremiumUser.premium_until >= now
            )
        elif premium_status == "expired":
            stmt = stmt.join(PremiumUser, User.id == PremiumUser.user_id).where(
                or_(
                    PremiumUser.is_premium == False,
                    PremiumUser.premium_until < now
                )
            )
        elif premium_status == "none":
            # Users that are not in PremiumUser table or not premium
            stmt = stmt.outerjoin(PremiumUser, User.id == PremiumUser.user_id).where(
                or_(
                    PremiumUser.id == None,
                    and_(PremiumUser.is_premium == False, PremiumUser.premium_until < now)
                )
            )

    # Calculate total count for pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_count = (await db.execute(count_stmt)).scalar() or 0

    # Paginate and fetch
    stmt = stmt.offset((page - 1) * limit).limit(limit).order_by(User.created_at.desc())
    res = await db.execute(stmt)
    users = res.scalars().all()

    return {
        "total": total_count,
        "page": page,
        "limit": limit,
        "users": [UserResponse.model_validate(u) for u in users]
    }

@router.get("/users/export", summary="Export filtered users list as CSV")
async def export_users_csv(
    q: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    premium_status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Generates and streams a CSV of filtered users.
    """
    stmt = select(User)
    
    if q:
        search_pattern = f"%{q.lower().strip()}%"
        stmt = stmt.where(or_(
            func.lower(User.full_name).like(search_pattern),
            func.lower(User.email).like(search_pattern)
        ))
        
    if role:
        stmt = stmt.where(User.role == role.upper().strip())
        
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)

    if premium_status:
        now = datetime.now(timezone.utc)
        if premium_status == "active":
            stmt = stmt.join(PremiumUser, User.id == PremiumUser.user_id).where(
                PremiumUser.is_premium == True,
                PremiumUser.premium_until >= now
            )
        elif premium_status == "expired":
            stmt = stmt.join(PremiumUser, User.id == PremiumUser.user_id).where(
                or_(
                    PremiumUser.is_premium == False,
                    PremiumUser.premium_until < now
                )
            )
        elif premium_status == "none":
            stmt = stmt.outerjoin(PremiumUser, User.id == PremiumUser.user_id).where(
                or_(
                    PremiumUser.id == None,
                    and_(PremiumUser.is_premium == False, PremiumUser.premium_until < now)
                )
            )

    stmt = stmt.order_by(User.created_at.desc())
    res = await db.execute(stmt)
    users = res.scalars().all()

    # Generate CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "User ID", "Full Name", "Email", "Role", "Active Status", 
        "Last Login", "Created At", "Updated At"
    ])
    
    for u in users:
        writer.writerow([
            str(u.id),
            u.full_name,
            u.email,
            u.role,
            "Active" if u.is_active else "Inactive",
            u.last_login.isoformat() if u.last_login else "Never",
            u.created_at.isoformat(),
            u.updated_at.isoformat()
        ])

    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=users_export_{int(datetime.now().timestamp())}.csv"
        }
    )

@router.post("/users/{user_id}/role", summary="Update a user's role")
async def update_user_role(
    user_id: uuid.UUID,
    role: str = Query(..., description="Target role (FREE, PREMIUM, ADMIN)"),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Admin utility to manually update any user's role.
    """
    target_role = role.upper().strip()
    if target_role not in ["FREE", "PREMIUM", "ADMIN"]:
        raise HTTPException(status_code=400, detail="Invalid role. Use FREE, PREMIUM, or ADMIN.")

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = target_role
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {"status": "success", "message": f"User role updated to {target_role}", "user": UserResponse.model_validate(user)}
