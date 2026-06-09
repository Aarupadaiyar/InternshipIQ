"""
InternshipIQ Scraper — Full Pipeline with Tracing and Rejection Logging

Pipeline for every scraped job:
  Found → Parsed → Structural Check → URL Validation → Verification → Deduplication → Saved

Every rejection is logged to rejection_logs with reason code and pipeline stage.
Scraper metrics are updated in the sources table after each run.
"""
import asyncio
import sys
import re
import time
import uuid as uuid_mod
from datetime import datetime, timezone, timedelta
import httpx
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func

from app.config import settings
from app.models.job import JobModel
from app.models.source import Source
from app.models.rejection_log import RejectionLog
from app.utils.verification_engine import verify_job
from app.utils.deduplication import is_duplicate

# ── Browser headers ────────────────────────────────────────────────────────────
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/html, application/xhtml+xml, */*",
    "Accept-Language": "en-US,en;q=0.9",
}

KNOWN_SKILLS = [
    "Python", "JavaScript", "TypeScript", "Java", "Go", "Rust", "C++", "C#", "Ruby", "Kotlin", "Swift",
    "React", "Next.js", "Node.js", "Express", "FastAPI", "Django", "Flask", "Spring", "GraphQL", "REST",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "AWS", "GCP", "Docker", "Kubernetes",
    "Terraform", "CI/CD", "Git", "Figma", "Jira", "Selenium", "Cypress", "Pytest", "Jest",
    "Data Analysis", "SQL", "Pandas", "NumPy", "Power BI", "Tableau", "Excel",
    "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "PyTorch", "TensorFlow", "Transformers",
    "UI/UX Design", "Product Design", "Penetration Testing", "Security"
]


def extract_skills_from_text(text: str) -> list[str]:
    lower_text = text.lower()
    found = []
    for skill in KNOWN_SKILLS:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if skill in ["C++", "C#"]:
            pattern = re.escape(skill.lower())
        if re.search(pattern, lower_text):
            found.append(skill)
    return found


def classify_job_domains(title: str, description: str, skills: list[str]) -> str:
    title_lower = title.lower()
    combined = (title + " " + description + " " + " ".join(skills)).lower()
    matched_domains = []

    if any(x in title_lower for x in ["machine learning", "ml", "artificial intelligence", "ai ", "nlp", "computer vision", "llm", "deep learning", "generative ai"]):
        matched_domains.append("AI / ML")
    elif any(x in combined for x in ["pytorch", "tensorflow", "scikit-learn", "keras", "neural network"]):
        matched_domains.append("AI / ML")

    if any(x in title_lower for x in ["data scientist", "data science"]):
        matched_domains.append("Data Science")

    if any(x in title_lower for x in ["data engineer", "data engineering"]):
        matched_domains.append("Data Engineering")
    elif any(x in combined for x in ["etl", "spark", "hadoop", "kafka", "data pipeline"]):
        matched_domains.append("Data Engineering")

    if any(x in title_lower for x in ["backend", "back-end", "back end"]):
        matched_domains.append("Backend")
    elif any(x in combined for x in ["node.js", "express.js", "fastapi", "django", "flask", "springboot", "spring boot", "java developer", "python developer", "golang", "go developer"]):
        matched_domains.append("Backend")

    if any(x in title_lower for x in ["frontend", "front-end", "front end", "ui/ux", "ui designer", "ux designer", "web designer", "graphic designer", "ui developer"]):
        matched_domains.append("Frontend")
    elif any(x in combined for x in ["react", "angular", "vue.js", "next.js", "html/css", "tailwind", "figma"]):
        matched_domains.append("Frontend")

    if any(x in title_lower for x in ["full stack", "fullstack", "mern", "mean", "web developer"]):
        matched_domains.append("Full Stack")

    if any(x in title_lower for x in ["cloud engineer", "cloud architect"]):
        matched_domains.append("Cloud")
    elif any(x in combined for x in ["aws", "azure", "gcp", "amazon web services"]):
        matched_domains.append("Cloud")

    if any(x in title_lower for x in ["devops", "sre", "site reliability"]):
        matched_domains.append("DevOps")
    elif any(x in combined for x in ["docker", "kubernetes", "jenkins", "ci/cd", "terraform", "ansible"]):
        matched_domains.append("DevOps")

    if any(x in title_lower for x in ["cybersecurity", "security analyst", "pentester", "penetration tester", "information security"]):
        matched_domains.append("Cybersecurity")

    if any(x in title_lower for x in ["qa", "quality assurance", "testing engineer", "software test", "test engineer"]):
        matched_domains.append("QA")
    elif any(x in combined for x in ["selenium", "cypress", "pytest", "playwright"]):
        matched_domains.append("QA")

    if any(x in title_lower for x in ["android", "ios", "flutter", "react native", "mobile dev"]):
        matched_domains.append("Mobile Development")

    if any(x in title_lower for x in ["blockchain", "solidity", "ethereum", "web3"]):
        matched_domains.append("Blockchain")

    if any(x in title_lower for x in ["embedded", "iot", "firmware", "microcontroller", "arduino", "raspberry pi"]):
        matched_domains.append("Embedded Systems")

    if any(x in title_lower for x in ["business analyst", "ba intern"]):
        matched_domains.append("Business Analyst")

    if any(x in title_lower for x in ["data analyst", "data analytics", "analytics intern"]):
        matched_domains.append("Data Analytics")

    if any(x in title_lower for x in ["digital marketing", "social media marketing", "smm"]):
        matched_domains.append("Digital Marketing")

    if any(x in title_lower for x in ["content writer", "content writing", "copywriter", "technical writer"]):
        matched_domains.append("Content Writing")

    if any(x in title_lower for x in ["marketing", "brand manager", "growth marketing"]):
        matched_domains.append("Marketing")

    if any(x in title_lower for x in ["hr ", "human resources", "talent acquisition", "recruitment"]):
        matched_domains.append("HR")

    if any(x in title_lower for x in ["finance", "financial", "accounting", "accountant", "investment research"]):
        matched_domains.append("Finance")

    if any(x in title_lower for x in ["sales", "business development", "bde", "inside sales"]):
        matched_domains.append("Sales")

    if any(x in title_lower for x in ["operations", "ops intern", "supply chain", "logistics"]):
        matched_domains.append("Operations")

    if any(x in title_lower for x in ["customer success", "customer support", "client success"]):
        matched_domains.append("Customer Success")

    if any(x in title_lower for x in ["consulting", "consultant"]):
        matched_domains.append("Consulting")

    if not matched_domains:
        matched_domains.append("Full Stack")

    return ",".join(list(set(matched_domains)))


def parse_salary(salary_str: str) -> tuple[int | None, int | None]:
    if not salary_str:
        return None, None
    cleaned = salary_str.replace("₹", "").replace(",", "").replace("$", "").lower().strip()

    def replace_k(match):
        return str(int(float(match.group(1)) * 1000))
    cleaned = re.sub(r"(\d+(?:\.\d+)?)\s*k\b", replace_k, cleaned)
    cleaned = re.sub(r"/\s*(month|pm|mo|yr|year|annum|day|week)", "", cleaned)

    range_match = re.search(r"(\d+)\s*(?:-|to)\s*(\d+)", cleaned)
    if range_match:
        try:
            return int(range_match.group(1)), int(range_match.group(2))
        except ValueError:
            pass

    single_match = re.search(r"(\d+)", cleaned)
    if single_match:
        try:
            val = int(single_match.group(1))
            return val, val
        except ValueError:
            pass

    return None, None


def infer_experience_level(title: str, description: str) -> str:
    text = (title + " " + description).lower()
    if any(x in text for x in ["1-2 years", "1 to 2 years", "2 years", "at least 1 year"]):
        return "1-2 Years"
    if any(x in text for x in ["0-1 years", "0 to 1 year", "1 year", "fresher", "freshers", "no experience"]):
        return "0-1 Years"
    return "0 Years"


def infer_internship_type(title: str, description: str) -> str:
    text = (title + " " + description).lower()
    if any(x in text for x in ["part time", "part-time", "parttime"]):
        return "Part Time"
    if any(x in text for x in ["contract", "contractual"]):
        return "Contract"
    if any(x in text for x in ["apprentice", "apprenticeship"]):
        return "Apprenticeship"
    return "Full Time"


MNC_COMPANIES = {
    "google", "microsoft", "amazon", "adobe", "cisco", "meta", "apple", "netflix",
    "nvidia", "stripe", "atlassian", "paypal", "vmware", "sap", "accenture",
    "infosys", "tcs", "wipro", "hcl", "tech mahindra", "capgemini", "deloitte",
    "ey", "pwc", "kpmg", "samsung", "bosch", "siemens", "shell", "unilever",
    "nestle", "pepsico", "ibm", "intel", "amd", "oracle", "salesforce"
}

STARTUP_COMPANIES = {
    "zepto", "swiggy", "zomato", "flipkart", "phonepe", "razorpay", "meesho",
    "myntra", "cred", "groww", "upstox", "angel one", "paytm", "freshworks",
    "zoho", "ola", "uber", "airbnb", "coinbase", "figma", "notion"
}


def infer_company_type(company: str) -> str:
    name = company.lower()
    if any(c in name for c in MNC_COMPANIES):
        return "MNC"
    if any(c in name for c in STARTUP_COMPANIES):
        return "Startup"
    return "Growth Stage"


def random_hex():
    return uuid_mod.uuid4().hex[:6]


# ── Pipeline Trace Logger ──────────────────────────────────────────────────────

async def log_rejection(session: AsyncSession, jd: dict, reason_code: str, reason_detail: str, pipeline_stage: str, run_id: str):
    """Log a rejected job to rejection_logs table."""
    log = RejectionLog(
        source=jd.get("source", "Unknown"),
        external_id=jd.get("external_id", ""),
        title=jd.get("title", "")[:500],
        company=jd.get("company", ""),
        url=jd.get("source_url", ""),
        rejection_reason=reason_code,
        rejection_detail=reason_detail[:1000] if reason_detail else None,
        pipeline_stage=pipeline_stage,
        scrape_run_id=run_id,
    )
    session.add(log)


# ── Unstop API Scraper ─────────────────────────────────────────────────────────

async def scrape_unstop() -> tuple[list[dict], int]:
    jobs = []
    total_found = 0

    async with httpx.AsyncClient(headers=HEADERS, timeout=15.0) as client:
        for page_num in range(1, 11):
            url = f"https://unstop.com/api/public/opportunity/search-result?opportunity=jobs&per_page=50&page={page_num}"
            try:
                res = await client.get(url, follow_redirects=True)
                if res.status_code != 200:
                    print(f"[Unstop] Page {page_num} failed: HTTP {res.status_code}", file=sys.stderr)
                    break

                data = res.json()
                items = data.get("data", {}).get("data", []) or data.get("data", []) or []
                if not items:
                    print(f"[Unstop] No items on page {page_num} — stopping pagination")
                    break

                total_found += len(items)
                print(f"[Unstop] Page {page_num}: {len(items)} items found")

                for j in items:
                    external_id = f"unstop-{j.get('id')}"
                    title = j.get("title") or j.get("job_title") or "Internship"
                    org = j.get("organisation") or {}
                    company = org.get("name") or j.get("company_name") or "Startup"
                    city = j.get("city") or j.get("location") or "India"
                    job_type = "Remote" if "remote" in city.lower() else "On-site"
                    desc_html = j.get("description") or j.get("short_description") or ""
                    description = re.sub(r"<[^>]*>", "", desc_html).strip()[:1500]
                    stipend = j.get("stipend") or "Stipend Negotiable"
                    source_url = j.get("seo_url") or f"https://unstop.com/jobs/{j.get('id')}"
                    posted_date = j.get("start_date") or datetime.now().strftime("%Y-%m-%d")
                    posted_at = str(posted_date).split("T")[0]
                    skills = extract_skills_from_text(title + " " + description)
                    domain = classify_job_domains(title, description, skills)
                    sal_min, sal_max = parse_salary(stipend)
                    exp_lvl = infer_experience_level(title, description)
                    int_type = infer_internship_type(title, description)
                    comp_type = infer_company_type(company)

                    jobs.append({
                        "external_id": external_id,
                        "title": title,
                        "company": company,
                        "location": city,
                        "type": job_type,
                        "salary": stipend,
                        "salary_min": sal_min,
                        "salary_max": sal_max,
                        "experience_level": exp_lvl,
                        "internship_type": int_type,
                        "company_type": comp_type,
                        "deadline_date": datetime.now(timezone.utc) + timedelta(days=30),
                        "source": "Unstop",
                        "domain": domain,
                        "source_url": source_url,
                        "posted_at": posted_at,
                        "description": description or f"Internship vacancy for {title} at {company}.",
                        "required_skills": skills,
                    })
            except Exception as e:
                print(f"[Unstop] Error on page {page_num}: {e}", file=sys.stderr)
                break

    print(f"[Unstop] Total parsed: {len(jobs)} jobs from {total_found} found")
    return jobs, total_found


# ── Internshala HTML Scraper ───────────────────────────────────────────────────

async def scrape_internshala() -> tuple[list[dict], int]:
    categories = [
        # Tech
        "web-development-internship",
        "machine-learning-internship",
        "python-internship",
        "data-science-internship",
        "design-internship",
        "software-development-internship",
        # Expanded tech
        "java-internship",
        "android-internship",
        "reactjs-internship",
        "nodejs-internship",
        "data-analytics-internship",
        "artificial-intelligence-internship",
        # Non-tech
        "digital-marketing-internship",
        "marketing-internship",
        "finance-internship",
        "hr-internship",
    ]
    jobs = []
    total_found = 0

    async with httpx.AsyncClient(headers=HEADERS, timeout=20.0) as client:
        for cat in categories:
            for page_num in range(1, 9):
                if page_num == 1:
                    url = f"https://internshala.com/internships/{cat}/"
                else:
                    url = f"https://internshala.com/internships/{cat}/page-{page_num}/"

                try:
                    res = await client.get(url, follow_redirects=True)
                    if res.status_code != 200:
                        print(f"[Internshala] [{cat}] Page {page_num}: HTTP {res.status_code} — stopping")
                        break

                    html = res.text
                    title_matches = re.findall(r'class="job-title-href"[^>]*href="([^"]+)"[^>]*>([^<]+)</a>', html)
                    if not title_matches:
                        print(f"[Internshala] [{cat}] Page {page_num}: No listings found — stopping")
                        break

                    company_matches = re.findall(r'class="company-name"[^>]*>\s*(.*?)\s*</p>', html, re.DOTALL)
                    location_matches = re.findall(r'class="[^"]*locations[^"]*"[^>]*>.*?<span>\s*(?:<a>)?([^<\n\r]+)', html, re.DOTALL)
                    stipend_matches = re.findall(r"class='stipend'[^>]*>([^<]+)</span>", html)
                    desc_matches = re.findall(r'class="about_job"[^>]*>.*?class="text"[^>]*>\s*(.*?)\s*</div>', html, re.DOTALL)

                    count = min(len(title_matches), len(company_matches), len(location_matches), len(stipend_matches), len(desc_matches))
                    total_found += count
                    print(f"[Internshala] [{cat}] Page {page_num}: {count} listings parsed")

                    for i in range(count):
                        link_href = title_matches[i][0].strip()
                        title = title_matches[i][1].strip()
                        company = company_matches[i].strip()
                        location = location_matches[i].replace("</a>", "").replace("</span>", "").strip()
                        stipend = stipend_matches[i].strip()
                        raw_desc = desc_matches[i].strip()
                        description = re.sub(r"<[^>]*>", "", raw_desc).strip()

                        source_url = f"https://internshala.com{link_href}"
                        match_slug = re.search(r"/internship/detail/([^/]+)", link_href)
                        slug_id = match_slug.group(1) if match_slug else f"shala-{i}-{random_hex()}"
                        external_id = f"internshala-{slug_id}"
                        job_type = "Remote" if "work from home" in location.lower() or "remote" in location.lower() else "On-site"

                        skills = extract_skills_from_text(title + " " + cat)
                        domain = classify_job_domains(title, description, skills)
                        sal_min, sal_max = parse_salary(stipend)
                        exp_lvl = infer_experience_level(title, description)
                        int_type = infer_internship_type(title, description)
                        comp_type = infer_company_type(company)

                        jobs.append({
                            "external_id": external_id,
                            "title": title,
                            "company": company,
                            "location": location,
                            "type": job_type,
                            "salary": stipend,
                            "salary_min": sal_min,
                            "salary_max": sal_max,
                            "experience_level": exp_lvl,
                            "internship_type": int_type,
                            "company_type": comp_type,
                            "deadline_date": datetime.now(timezone.utc) + timedelta(days=30),
                            "source": "Internshala",
                            "domain": domain,
                            "source_url": source_url,
                            "posted_at": datetime.now().strftime("%Y-%m-%d"),
                            "description": description,
                            "required_skills": skills,
                        })
                except Exception as e:
                    print(f"[Internshala] [{cat}] Page {page_num} error: {e}", file=sys.stderr)
                    break

    print(f"[Internshala] Total parsed: {len(jobs)} jobs from {total_found} found")
    return jobs, total_found


# ── Remotive API Scraper (Free Public API, Remote-first Internships) ────────────

async def scrape_remotive() -> tuple[list[dict], int]:
    """
    Remotive public API: https://remotive.com/api/remote-jobs
    Returns remote-first internships and entry-level roles.
    No auth required.
    """
    jobs = []
    total_found = 0
    categories = ["software-dev", "data", "design", "marketing", "product", "finance"]

    async with httpx.AsyncClient(headers=HEADERS, timeout=15.0) as client:
        for category in categories:
            try:
                url = f"https://remotive.com/api/remote-jobs?category={category}&limit=100"
                res = await client.get(url, follow_redirects=True)
                if res.status_code != 200:
                    print(f"[Remotive] [{category}] HTTP {res.status_code} — skipping")
                    continue

                data = res.json()
                items = data.get("jobs", [])
                total_found += len(items)
                print(f"[Remotive] [{category}]: {len(items)} items found")

                for j in items:
                    title = j.get("title") or "Remote Internship"
                    company = j.get("company_name") or "Remote Company"
                    location = j.get("candidate_required_location") or "Remote"
                    if not location or location.strip() == "":
                        location = "Remote"

                    desc_html = j.get("description") or ""
                    description = re.sub(r"<[^>]*>", "", desc_html).strip()[:1500]

                    if len(description.strip()) < 30:
                        continue  # skip jobs with no real description

                    source_url = j.get("url") or f"https://remotive.com/remote-jobs/{j.get('id', '')}"
                    external_id = f"remotive-{j.get('id', '')}"
                    tags = j.get("tags") or []
                    job_type_raw = j.get("job_type") or "full_time"

                    # Only include internship/entry-level or relevant tech roles
                    title_lower = title.lower()
                    is_intern = (
                        "intern" in title_lower or
                        "junior" in title_lower or
                        "entry" in title_lower or
                        "fresher" in title_lower or
                        "graduate" in title_lower or
                        "associate" in title_lower or
                        category in ["data", "design", "marketing", "product", "finance"]
                    )
                    if not is_intern:
                        continue

                    salary_raw = j.get("salary") or ""
                    sal_min, sal_max = parse_salary(salary_raw)
                    skills = extract_skills_from_text(title + " " + description + " " + " ".join(tags))
                    domain = classify_job_domains(title, description, skills)
                    exp_lvl = infer_experience_level(title, description)
                    int_type = "Full Time" if "full" in job_type_raw else "Part Time" if "part" in job_type_raw else "Contract"
                    comp_type = infer_company_type(company)

                    posted_raw = j.get("publication_date") or datetime.now().strftime("%Y-%m-%d")
                    posted_at = str(posted_raw)[:10]

                    jobs.append({
                        "external_id": external_id,
                        "title": title,
                        "company": company,
                        "location": location,
                        "type": "Remote",
                        "salary": salary_raw or "Competitive",
                        "salary_min": sal_min,
                        "salary_max": sal_max,
                        "experience_level": exp_lvl,
                        "internship_type": int_type,
                        "company_type": comp_type,
                        "deadline_date": datetime.now(timezone.utc) + timedelta(days=30),
                        "source": "Remote Jobs",
                        "domain": domain,
                        "source_url": source_url,
                        "posted_at": posted_at,
                        "description": description or f"Remote {title} role at {company}.",
                        "required_skills": skills,
                    })

            except Exception as e:
                print(f"[Remotive] [{category}] Error: {e}")
                continue

    print(f"[Remotive] Total parsed: {len(jobs)} jobs from {total_found} found")
    return jobs, total_found


# ── Main Aggregator with Full Pipeline Tracing ─────────────────────────────────

async def crawl_and_save():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    run_id = f"run-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    print(f"\n{'='*60}")
    print(f"SCRAPE RUN: {run_id}")
    print(f"{'='*60}\n")

    # ── Run all scrapers concurrently ─────────────────────────────────────────
    print("[SCRAPER] Starting all scrapers concurrently...")
    scrape_start = time.time()
    results = await asyncio.gather(
        scrape_unstop(),
        scrape_internshala(),
        scrape_remotive(),
        return_exceptions=True
    )
    total_runtime = time.time() - scrape_start
    print(f"[SCRAPER] All scrapers completed in {total_runtime:.2f}s")

    # Unpack results (handle exceptions)
    def unpack(result, name):
        if isinstance(result, Exception):
            print(f"[SCRAPER] {name} failed with exception: {result}")
            return [], 0
        return result

    unstop_jobs, unstop_found = unpack(results[0], "Unstop")
    shala_jobs, shala_found = unpack(results[1], "Internshala")
    remotive_jobs, remotive_found = unpack(results[2], "Remotive")

    sources_data = [
        {"name": "Unstop", "jobs": unstop_jobs, "found": unstop_found, "runtime": total_runtime},
        {"name": "Internshala", "jobs": shala_jobs, "found": shala_found, "runtime": total_runtime},
        {"name": "Remote Jobs", "jobs": remotive_jobs, "found": remotive_found, "runtime": total_runtime},
    ]

    # ── Per-source pipeline processing ────────────────────────────────────────
    for source_info in sources_data:
        src_name = source_info["name"]
        scraped_list = source_info["jobs"]
        found_count = source_info["found"]
        runtime = source_info["runtime"]

        # Pipeline counters
        counts = {
            "found": found_count,
            "parsed": len(scraped_list),
            "structural_rejected": 0,
            "url_rejected": 0,
            "verification_rejected": 0,
            "duplicate": 0,
            "saved": 0,
            "updated": 0,
        }

        print(f"\n{'-'*60}")
        print(f"[PIPELINE] {src_name} -- Processing {len(scraped_list)} parsed jobs")
        print(f"{'-'*60}")

        async with async_session() as session:
            # Load existing active jobs for deduplication
            stmt_active = select(JobModel).where(JobModel.is_active == True)
            res_active = await session.execute(stmt_active)
            existing_active_jobs = list(res_active.scalars().all())
            print(f"[PIPELINE] {src_name} — {len(existing_active_jobs)} existing active jobs loaded for dedup")

            for jd in scraped_list:
                # ── Stage 1+2: Structural + URL Verification ──────────────────
                verification = await verify_job(
                    title=jd["title"],
                    company=jd["company"],
                    description=jd["description"],
                    url=jd["source_url"],
                    source=src_name,
                )

                if not verification["verified"]:
                    reason_code = verification.get("reason_code", "VERIFICATION_FAILED")
                    stage = verification.get("pipeline_stage", "STRUCTURAL_CHECK")
                    jd["verification_status"] = "REJECTED"
                    jd["freshness_status"] = "BROKEN"
                    jd["status"] = "BROKEN_URL"
                    jd["is_active"] = False
                    jd["deleted_at"] = datetime.now(timezone.utc)
                    jd["last_verified"] = datetime.now(timezone.utc)
                    jd["application_url"] = jd["source_url"]
                    jd["direct_job_url"] = jd["source_url"]
                    jd["source_type"] = "TYPE_A"

                    # Track by stage
                    if stage == "STRUCTURAL_CHECK":
                        counts["structural_rejected"] += 1
                    elif stage == "URL_VALIDATION":
                        counts["url_rejected"] += 1
                    else:
                        counts["verification_rejected"] += 1

                    await log_rejection(session, jd, reason_code, verification["reason"], stage, run_id)
                else:
                    jd["verification_status"] = "VERIFIED"
                    jd["application_url"] = verification["final_url"]
                    jd["direct_job_url"] = jd["source_url"]
                    jd["source_type"] = "TYPE_A"
                    jd["freshness_status"] = "ACTIVE"
                    jd["last_verified"] = datetime.now(timezone.utc)
                    jd["status"] = "ACTIVE"
                    jd["is_active"] = True
                    jd["deleted_at"] = None

                    # ── Stage 3: Deduplication ─────────────────────────────────
                    is_dup = False
                    for ex in existing_active_jobs:
                        if is_duplicate(jd, {
                            "external_id": ex.external_id,
                            "title": ex.title,
                            "company": ex.company,
                            "location": ex.location,
                            "description": ex.description,
                            "source_type": ex.source_type or "",
                        }):
                            is_dup = True
                            break

                    if is_dup:
                        jd["status"] = "DUPLICATE"
                        jd["is_active"] = False
                        jd["deleted_at"] = datetime.now(timezone.utc)
                        counts["duplicate"] += 1
                        await log_rejection(session, jd, "DUPLICATE", "Matched an existing active job by title+company+description similarity", "DEDUPLICATION", run_id)

                # ── Stage 4: Save or Update ────────────────────────────────────
                stmt = select(JobModel).where(JobModel.external_id == jd["external_id"])
                res = await session.execute(stmt)
                existing = res.scalar()

                if existing:
                    # Update all fields
                    for field in ["title", "company", "location", "type", "salary", "salary_min", "salary_max",
                                  "experience_level", "internship_type", "company_type", "source_url",
                                  "application_url", "direct_job_url", "description", "required_skills",
                                  "verification_status", "freshness_status", "last_verified", "status",
                                  "is_active", "deleted_at", "domain"]:
                        if field in jd:
                            setattr(existing, field, jd[field])
                    counts["updated"] += 1
                else:
                    new_job = JobModel(**jd)
                    session.add(new_job)
                    if jd.get("is_active"):
                        existing_active_jobs.append(new_job)
                    counts["saved"] += 1

            await session.commit()

            # ── Update Sources Registry ────────────────────────────────────────
            stmt_source = select(Source).where(Source.source_name == src_name)
            res_source = await session.execute(stmt_source)
            src_record = res_source.scalar()

            stmt_active_count = select(func.count(JobModel.id)).where(
                JobModel.source == src_name,
                JobModel.is_active == True,
            )
            res_count = await session.execute(stmt_active_count)
            active_count = res_count.scalar() or 0

            if src_record:
                src_record.jobs_scraped = counts["parsed"]
                src_record.jobs_active = active_count
                src_record.last_run = datetime.now(timezone.utc)
                src_record.last_success = datetime.now(timezone.utc)
                src_record.scraper_status = "ACTIVE"
                await session.commit()

            # ── Print Pipeline Trace Report ────────────────────────────────────
            total_rejected = counts["structural_rejected"] + counts["url_rejected"] + counts["verification_rejected"] + counts["duplicate"]
            print(f"\n[REPORT] {src_name} Pipeline Trace (run: {run_id})")
            print(f"  Found (raw API/HTML):     {counts['found']}")
            print(f"  Parsed:                   {counts['parsed']}")
            print(f"  Structural rejected:      {counts['structural_rejected']}")
            print(f"  URL rejected:             {counts['url_rejected']}")
            print(f"  Verification rejected:    {counts['verification_rejected']}")
            print(f"  Duplicate:                {counts['duplicate']}")
            print(f"  Total rejected:           {total_rejected}")
            print(f"  Saved (new):              {counts['saved']}")
            print(f"  Updated (existing):       {counts['updated']}")
            print(f"  Active in DB now:         {active_count}")
            print(f"  Runtime:                  {runtime:.2f}s")
            if counts["parsed"] > 0:
                pass_rate = ((counts["parsed"] - total_rejected) / counts["parsed"]) * 100
                print(f"  Pass Rate:                {pass_rate:.1f}%")

    print(f"\n{'='*60}")
    print("SCRAPE COMPLETE")
    print(f"{'='*60}\n")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(crawl_and_save())
