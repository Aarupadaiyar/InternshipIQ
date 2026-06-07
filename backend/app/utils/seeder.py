import asyncio
import uuid
import random
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.config import settings
from app.models.job import JobModel

# ── Seed Data Configuration ──────────────────────────────────────────────────

COMPANIES = [
    {"name": "Razorpay", "url": "https://razorpay.com/jobs/"},
    {"name": "Swiggy", "url": "https://careers.swiggy.com/"},
    {"name": "CRED", "url": "https://careers.cred.club/"},
    {"name": "Zepto", "url": "https://www.zepto.co/careers"},
    {"name": "Groww", "url": "https://groww.in/careers"},
    {"name": "PhonePe", "url": "https://careers.phonepe.com/"},
    {"name": "BrowserStack", "url": "https://www.browserstack.com/careers"},
    {"name": "Juspay", "url": "https://juspay.in/careers"},
    {"name": "Zomato", "url": "https://www.zomato.com/careers"},
    {"name": "Ola Electric", "url": "https://olaelectric.com/careers"},
    {"name": "Flipkart", "url": "https://www.flipkartcareers.com/"},
    {"name": "Meesho", "url": "https://meesho.careers/"},
    {"name": "Urban Company", "url": "https://careers.urbancompany.com/"},
    {"name": "Paytm", "url": "https://careers.paytm.com/"},
    {"name": "Notion", "url": "https://www.notion.so/careers"},
    {"name": "Vercel", "url": "https://vercel.com/careers"},
    {"name": "Figma", "url": "https://www.figma.com/careers/"},
    {"name": "Postman", "url": "https://www.postman.com/company/careers/"},
    {"name": "TCS", "url": "https://www.tcs.com/careers"},
    {"name": "Infosys", "url": "https://www.infosys.com/careers.html"},
    {"name": "Wipro", "url": "https://careers.wipro.com/global-careers"},
    {"name": "Cognizant", "url": "https://careers.cognizant.com/global/en"},
]

DOMAINS = {
    "Frontend Development": {
        "titles": ["Frontend Developer Intern", "ReactJS Intern", "UI Developer Intern", "Web Development Intern"],
        "skills": ["JavaScript", "React", "TypeScript", "HTML", "CSS", "TailwindCSS", "Next.js", "Redux", "Figma"],
        "description": "Join our frontend engineering team to build premium, fast web user interfaces. You will work on feature development, responsive designs, component libraries, and API integrations under senior developer mentorship.",
        "salary_range": (15000, 35000)
    },
    "Backend Development": {
        "titles": ["Backend Engineer Intern", "Node.js Developer Intern", "Python Backend Intern", "API Engineering Intern"],
        "skills": ["Python", "Node.js", "Express", "FastAPI", "PostgreSQL", "MongoDB", "Redis", "REST APIs", "SQL"],
        "description": "Work on core backend business logic, database migrations, caching strategies, and REST/GraphQL API design. You will optimize query performance, maintain server architecture, and ensure scalability.",
        "salary_range": (20000, 45000)
    },
    "Full Stack Development": {
        "titles": ["Full Stack Developer Intern", "Software Engineering Intern (Full Stack)", "MERN Stack Intern"],
        "skills": ["JavaScript", "TypeScript", "React", "Node.js", "Express", "PostgreSQL", "Git", "REST APIs", "TailwindCSS"],
        "description": "Work across the entire stack from responsive UI designs to database design. Build, test, and ship complete features while collaborating closely with product designers and backend engineers.",
        "salary_range": (20000, 40000)
    },
    "Mobile Development (Android/iOS)": {
        "titles": ["Mobile App Developer Intern", "Flutter Intern", "React Native Intern", "iOS Engineering Intern"],
        "skills": ["Kotlin", "Swift", "Flutter", "React Native", "Dart", "JavaScript", "Firebase", "Git", "REST APIs"],
        "description": "Collaborate in designing, building, and deploying native or cross-platform mobile applications. You will debug app screens, hook up push notifications, and optimize performance.",
        "salary_range": (15000, 35000)
    },
    "UI/UX Design": {
        "titles": ["Product Design Intern", "UI/UX Designer Intern", "Graphic Design Intern", "Interaction Design Intern"],
        "skills": ["Figma", "Adobe XD", "Illustrator", "Prototyping", "User Research", "Wireframing", "CSS"],
        "description": "Help design next-generation products. You will build user journey maps, high-fidelity wireframes, interface prototypes, and conduct design reviews and usability testing.",
        "salary_range": (12000, 30000)
    },
    "Product Management": {
        "titles": ["Associate Product Manager Intern", "Product Operations Intern", "Business Analyst Intern"],
        "skills": ["Product Strategy", "User Research", "Agile", "Scrum", "Jira", "Data Analysis", "SQL", "Excel"],
        "description": "Define product specs, collaborate with design and engineering teams to launch new features, run user surveys, analyze metrics, and manage sprint backlogs.",
        "salary_range": (25000, 50000)
    },
    "DevOps & Cloud": {
        "titles": ["DevOps Engineer Intern", "Cloud Infrastructure Intern", "SRE Intern", "Systems Intern"],
        "skills": ["AWS", "Docker", "Kubernetes", "Linux", "Bash", "Terraform", "CI/CD", "GitHub Actions", "Nginx"],
        "description": "Assist in automating software delivery pipelines, managing cloud infrastructure, configuring container clusters, and monitoring application health metrics.",
        "salary_range": (20000, 45000)
    },
    "Data Science & Analytics": {
        "titles": ["Data Analyst Intern", "Data Science Intern", "Business Intelligence Intern", "Data Engineer Intern"],
        "skills": ["Python", "SQL", "Pandas", "NumPy", "Excel", "Power BI", "Tableau", "Statistics", "A/B Testing"],
        "description": "Extract insights from complex transaction datasets, construct dashboards, run analytics reports, and model business cohorts to support data-driven decision making.",
        "salary_range": (15000, 35000)
    },
    "Machine Learning & AI": {
        "titles": ["Machine Learning Intern", "AI Engineer Intern", "NLP Engineering Intern", "Computer Vision Intern"],
        "skills": ["Python", "PyTorch", "TensorFlow", "Scikit-learn", "HuggingFace", "Transformers", "NLP", "LLM", "RAG"],
        "description": "Develop and fine-tune machine learning and AI models, train embeddings, implement Retrieval-Augmented Generation (RAG) flows, and work with LLM APIs for structured extraction.",
        "salary_range": (25000, 60000)
    },
    "Cybersecurity": {
        "titles": ["Security Analyst Intern", "Penetration Tester Intern", "Information Security Intern"],
        "skills": ["Linux", "Network Security", "Cryptography", "OWASP", "Wireshark", "Python", "Vulnerability Assessment"],
        "description": "Assist in running security scans, reviewing application code for OWASP vulnerabilities, auditing access logs, and identifying threat vectors in our networks.",
        "salary_range": (18000, 40000)
    },
    "Software Testing / QA": {
        "titles": ["Quality Assurance Intern", "QA Automation Intern", "Software Test Engineer Intern"],
        "skills": ["Selenium", "Cypress", "Python", "JavaScript", "Jest", "Manual Testing", "Test Automation", "Jira"],
        "description": "Write and execute manual test cases, design test automation suites for web/mobile apps, document bugs, and ensure standard product delivery quality.",
        "salary_range": (12000, 28000)
    },
    "Marketing & Sales": {
        "titles": ["Digital Marketing Intern", "Growth Hacking Intern", "Business Development Intern", "Content Marketing Intern"],
        "skills": ["SEO", "Google Analytics", "Content Writing", "Copywriting", "Excel", "Social Media", "Communication"],
        "description": "Drive user growth, manage social channels, execute SEO campaigns, compile market research, write engaging blogs, and assist sales cycles.",
        "salary_range": (10000, 25000)
    }
}

SOURCES = [
    {"name": "LinkedIn", "url": "https://www.linkedin.com/jobs/search/?keywords=internship"},
    {"name": "Internshala", "url": "https://internshala.com/internships/"},
    {"name": "Unstop", "url": "https://unstop.com/jobs"}
]

LOCATIONS = [
    {"name": "Bangalore, Karnataka", "type": "On-site"},
    {"name": "Mumbai, Maharashtra", "type": "On-site"},
    {"name": "Delhi NCR (Gurgaon / Noida)", "type": "On-site"},
    {"name": "Hyderabad, Telangana", "type": "On-site"},
    {"name": "Pune, Maharashtra", "type": "On-site"},
    {"name": "Chennai, Tamil Nadu", "type": "On-site"},
    {"name": "Remote", "type": "Remote"},
    {"name": "Hybrid (Bangalore)", "type": "Hybrid"},
    {"name": "Hybrid (Mumbai)", "type": "Hybrid"}
]

# ── Seed Logic ───────────────────────────────────────────────────────────────

def generate_random_job(index: int) -> JobModel:
    domain_name = random.choice(list(DOMAINS.keys()))
    domain_info = DOMAINS[domain_name]
    
    company = random.choice(COMPANIES)
    source = random.choice(SOURCES)
    location_obj = random.choice(LOCATIONS)
    
    title = random.choice(domain_info["titles"])
    
    # Mix up titles to add variance
    if random.random() < 0.15:
        title = f"Junior {title.replace(' Intern', '')}"
    
    # 5% chance of unpaid, else stipend
    if random.random() < 0.05:
        stipend = "Unpaid"
    else:
        min_s, max_s = domain_info["salary_range"]
        stipend_val = round(random.randint(min_s, max_s), -3)
        stipend = f"₹{stipend_val:,} / month"
        
    location = location_obj["name"]
    job_type = "Remote" if location == "Remote" else location_obj["type"]
    
    # Formulate unique external_id
    external_id = f"seeder-{index}-{company['name'].lower().replace(' ', '-')}-{slug()}"
    
    # Required skills (subset of domain skills + optionally generic skills)
    num_skills = random.randint(4, 7)
    skills = list(set(random.sample(domain_info["skills"], min(len(domain_info["skills"]), num_skills))))
    
    # Random date in last 7 days
    posted_date = datetime.now() - timedelta(days=random.randint(0, 7))
    posted_str = posted_date.strftime("%Y-%m-%d")
    
    # Construct a real-looking url
    if source["name"] == "Internshala":
        job_url = f"https://internshala.com/internship/detail/{company['name'].lower()}-internship-{index}"
    elif source["name"] == "Unstop":
        job_url = f"https://unstop.com/jobs/{company['name'].lower()}-hiring-{index}"
    else:
        job_url = f"{company['url']}?job_id={index}"
        
    description = f"{domain_info['description']}\n\nKey Responsibilities:\n- Collaborate with multidisciplinary teams to design and build features.\n- Write clean, maintainable, and tested code/designs.\n- Participating in code/design reviews and standups.\n- Requirements: Good understanding of {', '.join(skills[:3])}."

    return JobModel(
        external_id=external_id,
        title=title,
        company=company["name"],
        location=location,
        type=job_type,
        salary=stipend,
        source=source["name"],
        domain=domain_name,
        source_url=job_url,
        posted_at=posted_str,
        description=description,
        required_skills=skills
    )

def slug():
    return Math.random().toString(36).slice(2, 6) if False else uuid.uuid4().hex[:6]

async def seed_jobs():
    print("Initializing Seeder...")
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Check current count
        result = await session.execute(select(JobModel))
        existing_jobs = result.scalars().all()
        
        # We want to ensure at least 1000 jobs.
        target_count = 1050
        missing_count = target_count - len(existing_jobs)
        
        if missing_count <= 0:
            print(f"Database already has {len(existing_jobs)} jobs. No seeding required.")
            await engine.dispose()
            return
            
        print(f"Seeding {missing_count} jobs into PostgreSQL database...")
        
        batch_size = 100
        jobs_batch = []
        for i in range(missing_count):
            job = generate_random_job(i)
            jobs_batch.append(job)
            
            if len(jobs_batch) >= batch_size:
                session.add_all(jobs_batch)
                await session.commit()
                print(f"Committed batch {i+1}/{missing_count}")
                jobs_batch = []
                
        if jobs_batch:
            session.add_all(jobs_batch)
            await session.commit()
            print(f"Committed final batch.")
            
        print("Seeding completed successfully!")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_jobs())
