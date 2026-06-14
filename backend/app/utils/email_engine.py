from __future__ import annotations
import os
import logging
import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def generate_digest_html(user_name: str, high_match: List[Dict[str, Any]], med_match: List[Dict[str, Any]], stretch_match: List[Dict[str, Any]]) -> str:
    """
    Generates a premium, clean Neo-Brutalist dark theme HTML email for daily match digests.
    """
    # Inline CSS styles for safe email display
    bg_color = "#0B0F19"
    card_bg = "#111827"
    border_color = "#FFFFFF"
    text_color = "#FFFFFF"
    accent_red = "#FF6B6B"
    accent_yellow = "#FFD93D"
    accent_violet = "#C4B5FD"
    
    def render_job_card(job: Dict[str, Any]) -> str:
        skills_html = "".join([f'<span style="background: #1F2937; color: #E2E8F0; border: 1px solid #FFFFFF; padding: 2px 6px; font-size: 11px; margin-right: 4px; display: inline-block; margin-bottom: 4px;">{s}</span>' for s in job.get("skills", [])[:5]])
        gaps = job.get("gaps", [])
        gaps_html = ""
        if gaps:
            gaps_html = f'<div style="margin-top: 8px; font-size: 12px; color: {accent_red}; font-weight: bold;">SKILL GAPS: {", ".join(gaps)}</div>'
            
        return f"""
        <div style="background: {card_bg}; border: 3px solid {border_color}; padding: 16px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h4 style="margin: 0 0 4px; font-size: 16px; text-transform: uppercase; color: {text_color}; font-weight: 900;">{job['title']}</h4>
                    <div style="font-size: 13px; color: #E2E8F0; font-weight: 700; margin-bottom: 8px;">{job['company']} &middot; {job['location']} &middot; {job['posted_at']}</div>
                </div>
                <div style="background: {accent_yellow}; border: 2px solid {border_color}; color: #000000; padding: 4px 8px; font-size: 12px; font-weight: 900; font-family: monospace;">
                    {job['match_score']}% MATCH
                </div>
            </div>
            <div style="margin-top: 10px;">
                {skills_html}
            </div>
            {gaps_html}
            <div style="margin-top: 14px;">
                <a href="{job['source_url']}" target="_blank" style="background: {accent_red}; border: 2px solid {border_color}; color: #000000; text-decoration: none; padding: 8px 16px; font-size: 12px; font-weight: 900; text-transform: uppercase; display: inline-block;">
                    Apply on {job['source']} &rarr;
                </a>
            </div>
        </div>
        """

    high_html = "".join([render_job_card(j) for j in high_match]) if high_match else "<p style='color: #94A3B8; font-style: italic;'>No high match jobs found today.</p>"
    med_html = "".join([render_job_card(j) for j in med_match]) if med_match else "<p style='color: #94A3B8; font-style: italic;'>No medium match jobs found today.</p>"
    stretch_html = "".join([render_job_card(j) for j in stretch_match]) if stretch_match else "<p style='color: #94A3B8; font-style: italic;'>No stretch opportunities found today.</p>"

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Your InternshipIQ Daily Internship Digest</title>
    </head>
    <body style="background-color: {bg_color}; color: {text_color}; font-family: 'Space Grotesk', Helvetica, Arial, sans-serif; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: {bg_color}; border: 4px solid {border_color}; padding: 24px;">
            
            <!-- Logo Header -->
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="border: 3px solid {border_color}; background: {accent_yellow}; color: #000000; padding: 6px 16px; font-weight: 900; font-size: 16px; letter-spacing: 0.08em; display: inline-block; transform: rotate(-1.5deg);">
                    INTERNSHIP<span style="color: {accent_red};">IQ</span> PREMIUM DIGEST
                </div>
            </div>
            
            <h2 style="font-size: 24px; font-weight: 900; text-transform: uppercase; border-bottom: 4px solid {border_color}; padding-bottom: 12px; margin-top: 0;">
                HELLO {user_name.upper()},
            </h2>
            <p style="font-size: 15px; color: #E2E8F0; font-weight: 700; line-height: 1.5; margin-bottom: 24px;">
                Here are your personalized internship recommendations from the latest listings uploaded in the previous 24 hours. We matched these against the skills and preferences parsed in your profile.
            </p>
            
            <!-- High Match Section -->
            <h3 style="background: {accent_violet}; border: 2px solid {border_color}; color: #000000; display: inline-block; padding: 4px 10px; font-size: 13px; font-weight: 900; text-transform: uppercase; margin: 24px 0 12px;">
                🔥 High Match (&ge;80%)
            </h3>
            <div>
                {high_html}
            </div>
            
            <!-- Medium Match Section -->
            <h3 style="background: {accent_yellow}; border: 2px solid {border_color}; color: #000000; display: inline-block; padding: 4px 10px; font-size: 13px; font-weight: 900; text-transform: uppercase; margin: 24px 0 12px;">
                ⚡ Medium Match (70% - 79%)
            </h3>
            <div>
                {med_html}
            </div>
            
            <!-- Stretch Opportunities -->
            <h3 style="background: #E2E8F0; border: 2px solid {border_color}; color: #000000; display: inline-block; padding: 4px 10px; font-size: 13px; font-weight: 900; text-transform: uppercase; margin: 24px 0 12px;">
                🚀 Stretch Opportunities (50% - 69%)
            </h3>
            <div>
                {stretch_html}
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 40px; border-top: 4px solid {border_color}; padding-top: 20px; text-align: center; font-size: 12px; color: #94A3B8; font-family: monospace;">
                INTERNSHIPIQ &copy; 2026 &middot; PERSONALIZED DAILY RECOMMENDATIONS
            </div>
        </div>
    </body>
    </html>
    """

async def send_daily_digest_email(
    to_email: str,
    user_name: str,
    jobs: List[Dict[str, Any]],
    digest_log_id: str | None = None
) -> bool:
    """
    Groups matching jobs, formats as HTML, and sends using Resend API, SendGrid API, or SMTP.
    If no API keys or SMTP credentials are configured, falls back to a detailed logging driver.
    """
    high_match = [j for j in jobs if j["match_score"] >= 80]
    med_match = [j for j in jobs if 70 <= j["match_score"] < 80]
    stretch_match = [j for j in jobs if 50 <= j["match_score"] < 70]
    
    html_content = generate_digest_html(user_name, high_match, med_match, stretch_match)
    
    resend_api_key = os.environ.get("RESEND_API_KEY")
    sendgrid_api_key = os.environ.get("SENDGRID_API_KEY")
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASSWORD", "")
    smtp_from = os.environ.get("SMTP_FROM", "noreply@internshipiq.com")
    
    # 1. Try Resend API
    if resend_api_key:
        try:
            import httpx
            headers = {
                "Authorization": f"Bearer {resend_api_key}",
                "Content-Type": "application/json"
            }
            tags = [{"name": "digest_log_id", "value": str(digest_log_id)}] if digest_log_id else []
            payload = {
                "from": smtp_from if "@" in smtp_from else "InternshipIQ <onboarding@resend.dev>",
                "to": [to_email],
                "subject": "Your InternshipIQ Daily Internship Digest",
                "html": html_content,
                "tags": tags
            }
            async with httpx.AsyncClient() as client:
                resp = await client.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=10.0)
                if resp.status_code in [200, 201, 202]:
                    logger.info(f"Resend: Daily Digest email sent successfully to {to_email}")
                    return True
                else:
                    logger.error(f"Resend API error: {resp.status_code} - {resp.text}")
        except Exception as e:
            logger.error(f"Failed to send daily digest email via Resend to {to_email}: {e}")

    # 2. Try SendGrid API
    elif sendgrid_api_key:
        try:
            import httpx
            headers = {
                "Authorization": f"Bearer {sendgrid_api_key}",
                "Content-Type": "application/json"
            }
            custom_args = {"digest_log_id": str(digest_log_id)} if digest_log_id else {}
            payload = {
                "personalizations": [{
                    "to": [{"email": to_email}],
                    "custom_args": custom_args
                }],
                "from": {"email": smtp_from},
                "subject": "Your InternshipIQ Daily Internship Digest",
                "content": [{
                    "type": "text/html",
                    "value": html_content
                }]
            }
            async with httpx.AsyncClient() as client:
                resp = await client.post("https://api.sendgrid.com/v3/mail/send", json=payload, headers=headers, timeout=10.0)
                if resp.status_code in [200, 201, 202]:
                    logger.info(f"SendGrid: Daily Digest email sent successfully to {to_email}")
                    return True
                else:
                    logger.error(f"SendGrid API error: {resp.status_code} - {resp.text}")
        except Exception as e:
            logger.error(f"Failed to send daily digest email via SendGrid to {to_email}: {e}")

    # 3. Try SMTP
    is_mock = not smtp_user or not smtp_pass or smtp_user == "mock_user@gmail.com"
    if not is_mock:
        try:
            def send():
                msg = MIMEMultipart("alternative")
                msg["Subject"] = "Your InternshipIQ Daily Internship Digest"
                msg["From"] = smtp_from
                msg["To"] = to_email
                if digest_log_id:
                    msg["X-Digest-Log-ID"] = str(digest_log_id)
                
                part = MIMEText(html_content, "html")
                msg.attach(part)
                
                with smtplib.SMTP(smtp_host, smtp_port, timeout=10.0) as server:
                    if smtp_port == 587:
                        server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_from, to_email, msg.as_string())
                    
            await asyncio.to_thread(send)
            logger.info(f"SMTP: Daily Digest email sent successfully to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send daily digest email via SMTP to {to_email}: {e}")
            return False

    # 4. Fallback to mock logging driver
    logger.info(f"--- MOCK DAILY DIGEST EMAIL ---")
    logger.info(f"To: {to_email}")
    logger.info(f"Subject: Your InternshipIQ Daily Internship Digest")
    if digest_log_id:
        logger.info(f"Digest Log ID: {digest_log_id}")
    logger.info(f"Jobs Matched: {len(jobs)} total (High: {len(high_match)}, Med: {len(med_match)}, Stretch: {len(stretch_match)})")
    logger.info(f"--------------------------------")
    return True
