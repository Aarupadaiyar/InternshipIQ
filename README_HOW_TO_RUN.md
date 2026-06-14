Step 1: Database Setup (Prerequisite)
Before starting the servers, ensure you have a running PostgreSQL database.

Ensure your PostgreSQL service is started.
Create a database named internshipiq (if not already created).
Step 2: Set Up & Run the FastAPI Backend (Terminal 1)
Open a terminal (PowerShell is recommended) and run:

powershell
# 1. Navigate to the backend directory
cd "c:\Users\aarup\OneDrive\Desktop\repository folder\InternshipIQ\backend"
# 2. Create the Python virtual environment
python -m venv .venv
# 3. Activate the virtual environment
.venv\Scripts\Activate.ps1
# 4. Install all Python dependencies
pip install -r requirements.txt
# 5. Copy the environment variables example file
copy .env.example .env
# 6. Open the .env file and update the DATABASE_URL with your PostgreSQL credentials
# Example line in .env: DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/internshipiq
# 7. Apply database migrations to build the tables
alembic upgrade head
# 8. Start the FastAPI server
uvicorn app.main:app --port 8000 --reload
Keep this terminal window open. The backend is now running at http://localhost:8000.

Step 3: Set Up & Run the Next.js Frontend (Terminal 2)
Open a new, separate terminal window and run:

powershell
# 1. Navigate to the project root directory
cd "c:\Users\aarup\OneDrive\Desktop\repository folder\InternshipIQ"
# 2. Install Node.js dependencies
npm install
# 3. Create/verify environment configuration file (.env.local) in root
# Ensure it contains: NEXT_PUBLIC_API_URL=http://localhost:8000
# 4. Start the Next.js development server
npm run dev
Keep this terminal window open. The frontend is now running at http://localhost:3000.

Step 4: Verify Your Setup
Web App: Open http://localhost:3000 in your web browser.
Backend API Docs: Open http://localhost:8000/docs to view interactive API documentation.