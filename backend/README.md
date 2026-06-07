# Internship IQ Backend

Production-ready FastAPI backend for user authentication, resume file storage, structured resume profile data, and matching preferences.

---

## Technical Stack

- **Framework:** FastAPI
- **Database:** PostgreSQL
- **ORM:** SQLAlchemy (Asyncio)
- **Migrations:** Alembic
- **Auth:** JWT Access Tokens (HS256)
- **Hashing:** Bcrypt (via Passlib)
- **Rate Limiting:** SlowAPI (Token Bucket / Client IP)
- **File Uploads:** Local File Storage (swappable to S3/R2)

---

## Setup Instructions

### 1. Prerequisites

- Python 3.10+
- PostgreSQL database (running locally or in Docker)

---

### 2. Installation

From the `backend` directory:

1. Create a Python virtual environment:
   ```bash
   python -m venv .venv
   ```

2. Activate the virtual environment:
   - **Windows (PowerShell):**
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   - **macOS/Linux:**
     ```bash
     source .venv/bin/activate
     ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

### 3. Environment Configuration

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` to configure your settings, especially:
   - `DATABASE_URL`: Ensure credentials and database name are correct.
   - `SECRET_KEY`: Generate a secure random string for JWT.

#### Quick Database Setup with Docker (Optional)

If you don't have PostgreSQL installed locally, you can run it via Docker:
```bash
docker run --name internshipiq-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=internshipiq -p 5432:5432 -d postgres:15-alpine
```

Ensure the database `internshipiq` exists before proceeding.

---

### 4. Database Migrations

Run database migrations to initialize tables and indexes:
```bash
alembic upgrade head
```

---

### 5. Running the Application

Start the local development server:
```bash
uvicorn app.main:app --reload
```

The server will start at `http://localhost:8000`.

---

## API Documentation

FastAPI automatically generates interactive API documentation. Once the server is running, visit:

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Key Features

1. **User Authentication:** `/auth/register` and `/auth/login` to obtain access tokens. Secure password hashing with constant-time comparison to prevent timing attacks.
2. **Resume Uploads:** `/resume/upload` accepts `.pdf` and `.docx` up to 10MB, saves them securely using UUID naming, and registers them.
3. **Structured Resume Profiles:** `/resume/{id}/profile` saves parsed skills, experience, projects, education, and raw text.
4. **Onboarding Preferences:** `/preferences` manages stipend limits, work mode (remote/hybrid/onsite), and location preferences.
5. **Unified Dashboard:** `/dashboard/profile` yields user profile details, active resume, and matching preferences in a single query chain.
6. **Rate Limiting:** Protects endpoints from abuse (e.g. login is restricted to 5/minute).
