from __future__ import annotations
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta
from typing import Optional

from app.database.session import get_db
from app.models.job import JobModel
from app.models.source import Source
from app.models.rejection_log import RejectionLog

router = APIRouter(prefix="/diagnostics", tags=["Diagnostics"])


@router.get("/pipeline", summary="Full pipeline diagnostic — where are jobs being lost?")
async def pipeline_diagnostic(
    db: AsyncSession = Depends(get_db)
):
    """
    Returns a complete self-diagnostic report explaining exactly where every job
    is being lost in the pipeline. No black boxes.
    """
    # ── Database inventory ─────────────────────────────────────────────────────
    total_stmt = select(func.count(JobModel.id))
    total = (await db.execute(total_stmt)).scalar() or 0

    active_stmt = select(func.count(JobModel.id)).where(JobModel.is_active == True)
    active = (await db.execute(active_stmt)).scalar() or 0

    # By status
    status_stmt = select(JobModel.status, func.count(JobModel.id)).group_by(JobModel.status)
    status_rows = (await db.execute(status_stmt)).all()
    status_breakdown = {row[0]: row[1] for row in status_rows}

    # By source
    source_stmt = select(JobModel.source, JobModel.status, func.count(JobModel.id)).group_by(JobModel.source, JobModel.status)
    source_rows = (await db.execute(source_stmt)).all()
    source_breakdown: dict[str, dict] = {}
    for src, status, cnt in source_rows:
        if src not in source_breakdown:
            source_breakdown[src] = {}
        source_breakdown[src][status or "NULL"] = cnt

    # By verification status
    verif_stmt = select(JobModel.verification_status, func.count(JobModel.id)).group_by(JobModel.verification_status)
    verif_rows = (await db.execute(verif_stmt)).all()
    verification_breakdown = {row[0]: row[1] for row in verif_rows}

    # ── Rejection log analysis ─────────────────────────────────────────────────
    rej_by_reason_stmt = select(RejectionLog.rejection_reason, func.count(RejectionLog.id)).group_by(RejectionLog.rejection_reason)
    rej_reason_rows = (await db.execute(rej_by_reason_stmt)).all()
    rejections_by_reason = {row[0]: row[1] for row in rej_reason_rows}

    rej_by_stage_stmt = select(RejectionLog.pipeline_stage, func.count(RejectionLog.id)).group_by(RejectionLog.pipeline_stage)
    rej_stage_rows = (await db.execute(rej_by_stage_stmt)).all()
    rejections_by_stage = {row[0]: row[1] for row in rej_stage_rows}

    rej_by_source_stmt = select(RejectionLog.source, func.count(RejectionLog.id)).group_by(RejectionLog.source)
    rej_source_rows = (await db.execute(rej_by_source_stmt)).all()
    rejections_by_source = {row[0]: row[1] for row in rej_source_rows}

    # ── Source registry status ─────────────────────────────────────────────────
    source_reg_stmt = select(Source).order_by(Source.source_type.asc(), Source.source_name.asc())
    source_reg_rows = (await db.execute(source_reg_stmt)).scalars().all()

    active_sources = [s for s in source_reg_rows if s.scraper_status == "ACTIVE"]
    not_implemented = [s for s in source_reg_rows if s.scraper_status == "NOT_IMPLEMENTED"]
    failed_sources = [s for s in source_reg_rows if s.scraper_status in ("FAILED", "BROKEN")]

    # ── Root cause analysis ────────────────────────────────────────────────────
    total_rejections = sum(rejections_by_reason.values())
    dominant_reason = max(rejections_by_reason, key=rejections_by_reason.get) if rejections_by_reason else "NONE"
    dominant_stage = max(rejections_by_stage, key=rejections_by_stage.get) if rejections_by_stage else "NONE"

    # Detect if SPA bypass is now working
    spa_verified = rejections_by_reason.get("SPA_STRUCTURAL_VERIFIED", 0)  # Actually these are saves, not rejections

    pipeline_health = "CRITICAL" if active < 10 else ("DEGRADED" if active < 100 else "HEALTHY")

    # ── Diagnosis message ──────────────────────────────────────────────────────
    diagnosis = []
    if active < 10:
        diagnosis.append(f"CRITICAL: Only {active} jobs are active out of {total} total in database.")
    if total_rejections > 0:
        diagnosis.append(f"Pipeline is rejecting {total_rejections} jobs — dominant reason: {dominant_reason} at stage {dominant_stage}.")
    if not active_sources:
        diagnosis.append("No active scrapers found. Run the seeder first.")
    for src in active_sources:
        if src.jobs_scraped > 0 and src.jobs_active == 0:
            diagnosis.append(f"WARNING: {src.source_name} scraped {src.jobs_scraped} jobs but has 0 active — 100% rejection rate.")
        elif src.jobs_scraped == 0:
            diagnosis.append(f"WARNING: {src.source_name} is marked ACTIVE but has never scraped any jobs. Run the scraper.")

    return {
        "runTime": datetime.now(timezone.utc).isoformat(),
        "pipelineHealth": pipeline_health,
        "diagnosis": diagnosis,

        "database": {
            "totalJobs": total,
            "activeJobs": active,
            "byStatus": status_breakdown,
            "byVerificationStatus": verification_breakdown,
            "bySource": source_breakdown,
        },

        "rejectionAnalysis": {
            "totalRejections": total_rejections,
            "dominantReason": dominant_reason,
            "dominantStage": dominant_stage,
            "byReason": rejections_by_reason,
            "byStage": rejections_by_stage,
            "bySource": rejections_by_source,
        },

        "sourceRegistry": {
            "totalSources": len(source_reg_rows),
            "activeSources": [
                {
                    "name": s.source_name,
                    "type": s.source_type,
                    "jobsScraped": s.jobs_scraped,
                    "jobsActive": s.jobs_active,
                    "passRate": round((s.jobs_active / s.jobs_scraped * 100), 1) if s.jobs_scraped > 0 else 0,
                    "lastRun": s.last_run.isoformat() if s.last_run else None,
                }
                for s in active_sources
            ],
            "notImplemented": len(not_implemented),
            "failed": len(failed_sources),
        },

        "inventoryTarget": {
            "target": 1500,
            "current": active,
            "gap": max(1500 - active, 0),
            "percentToTarget": round((active / 1500) * 100, 1),
            "estimatedPerSource": {
                "Unstop": "400-500 (10 pages × 50/page, API-sourced)",
                "Internshala": "200-400 (6 categories × 8 pages × ~10/page, HTML-parsed)",
                "Wellfound": "NOT_IMPLEMENTED — ~300 potential",
                "Greenhouse": "NOT_IMPLEMENTED — ~500 potential",
                "RemoteOK": "NOT_IMPLEMENTED — ~200 potential",
            }
        }
    }


@router.get("/rejections", summary="Get rejection logs with filters")
async def get_rejection_logs(
    source: Optional[str] = Query(None),
    reason: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    run_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    """Return rejection logs for debugging. Every rejected job is traceable."""
    stmt = select(RejectionLog).order_by(RejectionLog.created_at.desc())

    conditions = []
    if source:
        conditions.append(RejectionLog.source == source)
    if reason:
        conditions.append(RejectionLog.rejection_reason == reason)
    if stage:
        conditions.append(RejectionLog.pipeline_stage == stage)
    if run_id:
        conditions.append(RejectionLog.scrape_run_id == run_id)

    if conditions:
        from sqlalchemy import and_
        stmt = stmt.where(and_(*conditions))

    stmt = stmt.limit(limit)
    rows = (await db.execute(stmt)).scalars().all()

    return {
        "count": len(rows),
        "rejections": [
            {
                "id": str(r.id),
                "source": r.source,
                "title": r.title,
                "company": r.company,
                "url": r.url,
                "rejectionReason": r.rejection_reason,
                "rejectionDetail": r.rejection_detail,
                "pipelineStage": r.pipeline_stage,
                "runId": r.scrape_run_id,
                "createdAt": r.created_at.isoformat(),
            }
            for r in rows
        ]
    }


@router.get("/source-inventory", summary="Scraper implementation status for all 110 sources")
async def source_inventory(
    db: AsyncSession = Depends(get_db)
):
    """Factual inventory of all sources — ACTIVE/NOT_IMPLEMENTED/FAILED."""
    stmt = select(Source).order_by(Source.source_type.asc(), Source.scraper_status.asc(), Source.source_name.asc())
    rows = (await db.execute(stmt)).scalars().all()

    return {
        "totalSources": len(rows),
        "summary": {
            status: sum(1 for r in rows if r.scraper_status == status)
            for status in ["ACTIVE", "NOT_IMPLEMENTED", "FAILED", "DISABLED", "TESTING"]
        },
        "sources": [
            {
                "name": s.source_name,
                "type": s.source_type,
                "status": s.scraper_status,
                "baseUrl": s.base_url,
                "jobsScraped": s.jobs_scraped,
                "jobsActive": s.jobs_active,
                "lastRun": s.last_run.isoformat() if s.last_run else None,
                "passRate": round((s.jobs_active / s.jobs_scraped * 100), 1) if s.jobs_scraped > 0 else None,
            }
            for s in rows
        ]
    }


@router.get("/category-audit", summary="Domain classification audit — miscategorized and uncategorized jobs")
async def category_audit(
    db: AsyncSession = Depends(get_db)
):
    """Audit the domain classification quality."""
    domain_stmt = select(JobModel.domain, func.count(JobModel.id)).where(JobModel.is_active == True).group_by(JobModel.domain)
    domain_rows = (await db.execute(domain_stmt)).all()

    # Find jobs that fell through to the fallback domain
    fallback_stmt = select(func.count(JobModel.id)).where(JobModel.is_active == True, JobModel.domain == "Full Stack")
    fallback_count = (await db.execute(fallback_stmt)).scalar() or 0

    total_active = sum(r[1] for r in domain_rows)
    fallback_pct = round((fallback_count / total_active * 100), 1) if total_active > 0 else 0

    return {
        "totalActiveJobs": total_active,
        "domainBreakdown": [{"domain": r[0], "count": r[1]} for r in sorted(domain_rows, key=lambda x: -x[1])],
        "fallbackDomainCount": fallback_count,
        "fallbackDomainPercent": fallback_pct,
        "warning": "Jobs classified as 'Full Stack' by default fallback may be miscategorized" if fallback_pct > 20 else None,
    }


@router.get("/pagination-audit", summary="Verify how many pages each scraper actually retrieves")
async def pagination_audit(
    db: AsyncSession = Depends(get_db)
):
    """
    Report on pagination coverage per source.
    Shows actual vs expected job counts to detect pagination failures.
    """
    source_stmt = select(JobModel.source, func.count(JobModel.id)).group_by(JobModel.source)
    source_rows = (await db.execute(source_stmt)).all()

    expected = {
        "Unstop": {"pages": 10, "per_page": 50, "expected_max": 500},
        "Internshala": {"pages": 8, "categories": 6, "expected_max": 480},
    }

    results = []
    for src_name, total in source_rows:
        exp = expected.get(src_name, {})
        results.append({
            "source": src_name,
            "totalInDB": total,
            "expectedMax": exp.get("expected_max", "N/A"),
            "pages": exp.get("pages", "N/A"),
            "paginationStatus": (
                "OK" if not exp else
                ("UNDER" if total < exp.get("expected_max", 0) * 0.5 else "OK")
            ),
        })

    return {"sources": results}
