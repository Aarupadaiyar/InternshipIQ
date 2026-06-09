"""
Verification Engine — Source-Aware Job Validation Pipeline

Strategy:
  - API-sourced jobs from JS-SPA sites (Unstop, Internshala, Wellfound, etc.)
    CANNOT be verified via HTTP page scraping because they render with JavaScript.
    For these sources: use STRUCTURAL validation (title, description, URL well-formed).
  
  - For sources that serve SSR HTML (company career pages), perform full HTTP verification.

Pipeline stages (in order):
  1. STRUCTURAL_CHECK — title, company, description not empty
  2. URL_VALIDATION  — URL well-formed, not generic careers hub
  3. HTTP_VERIFICATION — (SSR sources only) fetch page, check title + description presence
"""
from __future__ import annotations
import re
import urllib.parse
from html.parser import HTMLParser
import httpx

# Sources that use JavaScript rendering — HTTP verification will never find content
# For these, we skip HTTP verification and use structural + API-level validation only
JS_SPA_SOURCES = {
    "unstop",
    "internshala",
    "wellfound",
    "angelist",
    "greenhouse",
    "lever",
    "ashby",
    "workday",
    "remoteok",
    "remotive",
    "remote jobs",
    "ycombinator",
    "simplify",
    "handshake",
    "linkedin",
    "naukri",
    "foundit",
    "cutshort",
    "instahyre",
    "hirist",
    "freshersworld",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
}


class HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.result = []
        self.in_script_or_style = False

    def handle_starttag(self, tag, attrs):
        if tag in ["script", "style"]:
            self.in_script_or_style = True

    def handle_endtag(self, tag):
        if tag in ["script", "style"]:
            self.in_script_or_style = False

    def handle_data(self, data):
        if not self.in_script_or_style:
            self.result.append(data)

    def get_text(self) -> str:
        return " ".join(self.result)


def clean_html_to_text(html: str) -> str:
    try:
        extractor = HTMLTextExtractor()
        extractor.feed(html)
        return re.sub(r"\s+", " ", extractor.get_text()).strip()
    except Exception:
        return re.sub(r"<[^>]*>", " ", html)


def is_generic_careers_url(url: str) -> bool:
    parsed = urllib.parse.urlparse(url)
    path = parsed.path.lower().strip("/")
    query = parsed.query.lower()

    if not path or path in ["home", "index.html", "index.php"]:
        return True

    generic_patterns = [
        r"^careers?/?$",
        r"^jobs?/?$",
        r"^internships?/?$",
        r"^about/careers?/?$",
        r"^join-us?/?$",
        r"^work-with-us?/?$",
    ]
    for pattern in generic_patterns:
        if re.match(pattern, path):
            return True

    if "search=" in query or "keyword=" in query or "category=" in query:
        if "jobid" not in query and "job_id" not in query and "opportunity" not in query:
            return True

    return False


def _is_js_spa_source(source: str, url: str) -> bool:
    """Detect if a job URL comes from a JS-SPA that won't serve content to httpx."""
    if source:
        src_lower = source.lower()
        if any(known in src_lower for known in JS_SPA_SOURCES):
            return True
    # Also detect by URL domain
    try:
        domain = urllib.parse.urlparse(url).netloc.lower()
        for spa in JS_SPA_SOURCES:
            if spa in domain:
                return True
    except Exception:
        pass
    return False


async def verify_job(
    title: str,
    company: str,
    description: str,
    url: str,
    source: str = "",
) -> dict[str, str | bool]:
    """
    Verify a job listing. Returns full result dict with reason chain.
    
    Returns:
        {
            "verified": bool,
            "status": "VERIFIED" | "REJECTED",
            "reason": str,        # human-readable rejection reason
            "reason_code": str,   # machine code (BROKEN_URL, TITLE_CHECK_FAILED, etc.)
            "pipeline_stage": str,
            "final_url": str
        }
    """
    # ── Stage 1: Structural Check ──────────────────────────────────────────────
    if not title or not title.strip():
        return {
            "verified": False, "status": "REJECTED",
            "reason": "Job title is empty or missing",
            "reason_code": "INVALID_TITLE",
            "pipeline_stage": "STRUCTURAL_CHECK",
            "final_url": url,
        }

    if not company or not company.strip():
        return {
            "verified": False, "status": "REJECTED",
            "reason": "Company name is empty or missing",
            "reason_code": "MISSING_COMPANY",
            "pipeline_stage": "STRUCTURAL_CHECK",
            "final_url": url,
        }

    if not description or len(description.strip()) < 20:
        return {
            "verified": False, "status": "REJECTED",
            "reason": f"Description is too short ({len(description.strip()) if description else 0} chars, need 20+)",
            "reason_code": "EMPTY_DESCRIPTION",
            "pipeline_stage": "STRUCTURAL_CHECK",
            "final_url": url,
        }

    # ── Stage 2: URL Validation ────────────────────────────────────────────────
    parsed = urllib.parse.urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return {
            "verified": False, "status": "REJECTED",
            "reason": "URL has invalid protocol or missing domain",
            "reason_code": "BROKEN_URL",
            "pipeline_stage": "URL_VALIDATION",
            "final_url": url,
        }

    if is_generic_careers_url(url):
        return {
            "verified": False, "status": "REJECTED",
            "reason": "URL points to a generic careers hub index page (not a specific job)",
            "reason_code": "BROKEN_URL",
            "pipeline_stage": "URL_VALIDATION",
            "final_url": url,
        }

    # ── Stage 3: JS-SPA Bypass ────────────────────────────────────────────────
    # For JS-rendered SPAs, HTTP verification is impossible — the page returns
    # an empty Angular/React shell. Trust the API data instead.
    if _is_js_spa_source(source, url):
        return {
            "verified": True, "status": "VERIFIED",
            "reason": f"API-sourced job from JS-SPA ({source or parsed.netloc}). Structural validation passed. HTTP verification bypassed.",
            "reason_code": "SPA_STRUCTURAL_VERIFIED",
            "pipeline_stage": "URL_VALIDATION",
            "final_url": url,
        }

    # ── Stage 4: HTTP Verification (SSR sources only) ─────────────────────────
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=12.0, follow_redirects=True) as client:
            res = await client.get(url)

            if res.status_code != 200:
                return {
                    "verified": False, "status": "REJECTED",
                    "reason": f"HTTP {res.status_code} response from job page",
                    "reason_code": "HTTP_ERROR",
                    "pipeline_stage": "HTTP_VERIFICATION",
                    "final_url": str(res.url),
                }

            final_url = str(res.url)

            if is_generic_careers_url(final_url) or "login" in final_url.lower():
                return {
                    "verified": False, "status": "REJECTED",
                    "reason": "Redirected to generic portal index or login page",
                    "reason_code": "BROKEN_URL",
                    "pipeline_stage": "HTTP_VERIFICATION",
                    "final_url": final_url,
                }

            html_content = res.text

            # Check if the page is itself a JS SPA (detected after fetching)
            if ("ng-version" in html_content or "angular" in html_content[:3000].lower() or
                    "window.prerenderReady" in html_content[:3000] or
                    "__NEXT_DATA__" not in html_content and len(re.sub(r"<[^>]*>", "", html_content[:2000]).strip()) < 200):
                # SPA detected post-fetch — content not available
                return {
                    "verified": True, "status": "VERIFIED",
                    "reason": "JS-SPA detected post-fetch. Structural validation passed.",
                    "reason_code": "SPA_STRUCTURAL_VERIFIED",
                    "pipeline_stage": "HTTP_VERIFICATION",
                    "final_url": final_url,
                }

            page_text = clean_html_to_text(html_content).lower()

            # Title check
            stop_words = {"intern", "internship", "hiring", "job", "opportunity", "co-op", "role"}
            title_words = [w.lower() for w in re.findall(r"\b\w+\b", title) if w.lower() not in stop_words]
            if not title_words:
                title_words = [title.lower()]

            matched_words = [w for w in title_words if w in page_text]
            title_match_ratio = len(matched_words) / len(title_words) if title_words else 0

            if title_match_ratio < 0.6:
                return {
                    "verified": False, "status": "REJECTED",
                    "reason": f"Job title words not found on SSR page (matched {round(title_match_ratio*100)}%)",
                    "reason_code": "TITLE_CHECK_FAILED",
                    "pipeline_stage": "TITLE_CHECK",
                    "final_url": final_url,
                }

            # Description check
            desc_keywords = [
                "requirement", "responsibility", "qualification", "experience",
                "skill", "description", "about", "role", "what you", "we are looking",
                "duties", "intern"
            ]
            has_keywords = any(kw in page_text for kw in desc_keywords)

            if not has_keywords or len(page_text) < 300:
                return {
                    "verified": False, "status": "REJECTED",
                    "reason": "Job description or responsibilities section not found on SSR page",
                    "reason_code": "DESCRIPTION_CHECK_FAILED",
                    "pipeline_stage": "DESCRIPTION_CHECK",
                    "final_url": final_url,
                }

            # Apply button check
            apply_keywords = [
                "apply", "submit", "register", "apply now", "apply online",
                "easy apply", "apply for this job", "apply today", "fill out"
            ]
            has_apply = any(kw in page_text for kw in apply_keywords) or any(kw in html_content.lower() for kw in apply_keywords)

            if not has_apply:
                return {
                    "verified": False, "status": "REJECTED",
                    "reason": "Apply button or 'Apply' action not found on SSR page",
                    "reason_code": "APPLY_CHECK_FAILED",
                    "pipeline_stage": "APPLY_CHECK",
                    "final_url": final_url,
                }

            return {
                "verified": True, "status": "VERIFIED",
                "reason": "All checks passed: title, description, apply action verified on SSR page",
                "reason_code": "FULL_HTTP_VERIFIED",
                "pipeline_stage": "APPLY_CHECK",
                "final_url": final_url,
            }

    except httpx.ConnectTimeout:
        return {
            "verified": False, "status": "REJECTED",
            "reason": "Connection timed out during HTTP verification",
            "reason_code": "TIMEOUT",
            "pipeline_stage": "HTTP_VERIFICATION",
            "final_url": url,
        }
    except httpx.HTTPError as e:
        return {
            "verified": False, "status": "REJECTED",
            "reason": f"HTTP error: {str(e)[:200]}",
            "reason_code": "HTTP_ERROR",
            "pipeline_stage": "HTTP_VERIFICATION",
            "final_url": url,
        }
    except Exception as e:
        return {
            "verified": False, "status": "REJECTED",
            "reason": f"Unexpected error during verification: {str(e)[:200]}",
            "reason_code": "PARSE_ERROR",
            "pipeline_stage": "HTTP_VERIFICATION",
            "final_url": url,
        }
