import asyncio
import sys
import re
import urllib.parse
from datetime import datetime
import httpx
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.config import settings
from app.models.job import JobModel

# Headers to prevent rate-limiting and simulate a real browser request
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
        # Match word boundaries or symbols
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        # Special case for C++ / C# / .NET
        if skill in ["C++", "C#"]:
            pattern = re.escape(skill.lower())
        if re.search(pattern, lower_text):
            found.append(skill)
    return found if found else ["Git", "SQL", "Python", "JavaScript"] # Fallbacks


def map_title_to_domain(title: str, description: str) -> str:
    combined = (title + " " + description).lower()
    if "machine learning" in combined or "ml" in combined or "ai" in combined or "artificial intelligence" in combined or "nlp" in combined or "computer vision" in combined or "transformer" in combined or "llm" in combined:
        return "Machine Learning & AI"
    if "data scientist" in combined or "data analyst" in combined or "analytics" in combined or "tableau" in combined or "power bi" in combined:
        return "Data Science & Analytics"
    if "devops" in combined or "cloud" in combined or "aws" in combined or "kubernetes" in combined or "docker" in combined or "sre" in combined or "infrastructure" in combined:
        return "DevOps & Cloud"
    if "cyber" in combined or "security" in combined or "penetration" in combined or "infosec" in combined:
        return "Cybersecurity"
    if "qa" in combined or "test" in combined or "selenium" in combined or "cypress" in combined or "quality assurance" in combined:
        return "Software Testing / QA"
    if "product manager" in combined or "apm" in combined or "product operations" in combined:
        return "Product Management"
    if "ui/ux" in combined or "design" in combined or "figma" in combined or "graphics" in combined or "ux" in combined:
        return "UI/UX Design"
    if "android" in combined or "ios" in combined or "flutter" in combined or "react native" in combined or "mobile app" in combined:
        return "Mobile Development (Android/iOS)"
    if "frontend" in combined or "react" in combined or "angular" in combined or "vue" in combined or "web developer" in combined or "html" in combined:
        return "Frontend Development"
    if "backend" in combined or "node" in combined or "django" in combined or "fastapi" in combined or "springboot" in combined or "database" in combined or "sql" in combined:
        return "Backend Development"
    if "full stack" in combined or "fullstack" in combined or "mern" in combined:
        return "Full Stack Development"
    if "marketing" in combined or "sales" in combined or "growth" in combined or "seo" in combined or "business development" in combined:
        return "Marketing & Sales"
    return "Full Stack Development"


# ─── Unstop API Scraper ───────────────────────────────────────────────────────

async def scrape_unstop() -> list[dict]:
    url = "https://unstop.com/api/public/opportunity/search-result?opportunity=jobs&per_page=50"
    jobs = []
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=15.0) as client:
            res = await client.get(url)
            if res.status_code != 200:
                print(f"Unstop API request failed with status {res.status_code}")
                return []
                
            data = res.json()
            items = data.get("data", {}).get("data", []) or data.get("data", []) or []
            
            for j in items:
                external_id = f"unstop-{j.get('id')}"
                title = j.get("title") or j.get("job_title") or "Internship"
                
                org = j.get("organisation") or {}
                company = org.get("name") or j.get("company_name") or "Startup"
                
                city = j.get("city") or j.get("location") or "India"
                job_type = "Remote" if "remote" in city.lower() else "On-site"
                
                desc_html = j.get("description") or j.get("short_description") or ""
                description = re.sub(r"<[^>]*>", "", desc_html).strip()[:1000]
                
                stipend = j.get("stipend") or "Stipend Negotiable"
                source_url = f"https://unstop.com/jobs/{j.get('public_url') or j.get('id')}"
                
                posted_date = j.get("start_date") or datetime.now().strftime("%Y-%m-%d")
                posted_at = str(posted_date).split("T")[0]
                
                skills = extract_skills_from_text(title + " " + description)
                domain = map_title_to_domain(title, description)
                
                jobs.append({
                    "external_id": external_id,
                    "title": title,
                    "company": company,
                    "location": city,
                    "type": job_type,
                    "salary": stipend,
                    "source": "Unstop",
                    "domain": domain,
                    "source_url": source_url,
                    "posted_at": posted_at,
                    "description": description or f"Internship vacancy for {title} at {company}.",
                    "required_skills": skills,
                })
        print(f"Successfully scraped {len(jobs)} jobs from Unstop.")
    except Exception as e:
        print(f"Unstop scraper error: {e}", file=sys.stderr)
    return jobs


# ─── Internshala HTML Parser ─────────────────────────────────────────────────

async def scrape_internshala() -> list[dict]:
    # We query major listing categories to extract clean HTML content
    categories = [
        "web-development-internship",
        "machine-learning-internship",
        "python-internship",
        "data-science-internship",
        "design-internship",
        "software-development-internship"
    ]
    jobs = []
    
    async with httpx.AsyncClient(headers=HEADERS, timeout=20.0) as client:
        for cat in categories:
            url = f"https://internshala.com/internships/{cat}/"
            try:
                res = await client.get(url)
                if res.status_code != 200:
                    continue
                
                html = res.text
                
                # We use regex to parse clean structured patterns from the Internshala HTML
                title_matches = re.findall(r'class="[^"]*heading_4_5[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)</a>', html)
                company_matches = re.findall(r'class="[^"]*company-name[^"]*"[^>]*>\s*(?:<a[^>]*>)?([^<\n\r]+)(?:</a>)?', html)
                location_matches = re.findall(r'class="[^"]*location-link[^"]*"[^>]*>([^<]+)</a>', html)
                stipend_matches = re.findall(r'class="[^"]*stipend[^"]*"[^>]*>\s*<span[^>]*>([^<]+)</span>', html)
                
                count = min(len(title_matches), len(company_matches), len(location_matches))
                for i in range(count):
                    link_href = title_matches[i][0].strip()
                    title = title_matches[i][1].strip()
                    company = company_matches[i].strip()
                    location = location_matches[i].strip()
                    
                    stipend = "Unpaid"
                    if i < len(stipend_matches):
                        stipend = stipend_matches[i].strip()
                        
                    source_url = f"https://internshala.com{link_href}"
                    
                    # Extract unique slug from link href
                    match_slug = re.search(r'/internship/detail/([^/]+)', link_href)
                    slug_id = match_slug.group(1) if match_slug else f"shala-{i}-{random_hex()}"
                    
                    external_id = f"internshala-{slug_id}"
                    job_type = "Remote" if "work from home" in location.lower() or "remote" in location.lower() else "On-site"
                    
                    skills = extract_skills_from_text(title + " " + cat)
                    description = f"Active {title} internship vacancy at {company}. Location: {location}. stipend/Salary: {stipend}. Apply directly on Internshala portal using the listing URL."
                    domain = map_title_to_domain(title, description)
                    
                    jobs.append({
                        "external_id": external_id,
                        "title": title,
                        "company": company,
                        "location": location,
                        "type": job_type,
                        "salary": stipend,
                        "source": "Internshala",
                        "domain": domain,
                        "source_url": source_url,
                        "posted_at": datetime.now().strftime("%Y-%m-%d"),
                        "description": description,
                        "required_skills": skills,
                    })
            except Exception as e:
                print(f"Failed parsing category {cat}: {e}", file=sys.stderr)
                
    print(f"Successfully scraped {len(jobs)} jobs from Internshala.")
    return jobs


def random_hex():
    import uuid
    return uuid.uuid4().hex[:6]


# ─── Main Aggregator ─────────────────────────────────────────────────────────

async def crawl_and_save():
    print("Starting Live Crawling from Unstop & Internshala...")
    unstop_jobs = await scrape_unstop()
    shala_jobs = await scrape_internshala()
    
    all_scraped = unstop_jobs + shala_jobs
    if not all_scraped:
        print("No jobs scraped. Aborting.")
        return
        
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        added = 0
        updated = 0
        for jd in all_scraped:
            # Check if job already exists by external_id
            stmt = select(JobModel).where(JobModel.external_id == jd["external_id"])
            res = await session.execute(stmt)
            existing = res.scalar()
            
            if existing:
                # Update attributes
                existing.title = jd["title"]
                existing.company = jd["company"]
                existing.location = jd["location"]
                existing.type = jd["type"]
                existing.salary = jd["salary"]
                existing.source_url = jd["source_url"]
                existing.description = jd["description"]
                existing.required_skills = jd["required_skills"]
                updated += 1
            else:
                new_job = JobModel(**jd)
                session.add(new_job)
                added += 1
                
        await session.commit()
        print(f"Aggregator complete. Added {added} new internships, updated {updated} existing internships.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(crawl_and_save())
