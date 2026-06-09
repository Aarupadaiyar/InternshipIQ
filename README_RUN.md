# InternshipIQ — Running & Activating Both Backend & Frontend

This guide explains how to configure, activate, and run both the FastAPI backend and Next.js frontend services on your local development machine.

---

## 🛠️ Prerequisites

Make sure you have the following installed:
- **Node.js** (v18.x or higher)
- **Python** (v3.10 or higher)
- **PostgreSQL** (running locally or via Docker)

---

## ⚙️ 1. Backend Setup (FastAPI)

Follow these steps to configure and run the FastAPI backend server:

### Step 1.1: Activate Virtual Environment
Open your terminal (PowerShell or command prompt on Windows, bash/zsh on macOS/Linux) and navigate to the `backend` folder:
```bash
cd backend
```

Create a virtual environment if not already done:
```bash
python -m venv .venv
```

Activate it:
- **Windows (PowerShell):**
  ```powershell
  .venv\Scripts\Activate.ps1
  ```
- **macOS/Linux:**
  ```bash
  source .venv/bin/activate
  ```

### Step 1.2: Install Requirements
Install python dependencies:
```bash
pip install -r requirements.txt
```

### Step 1.3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit the `.env` file to configure your local PostgreSQL database credentials:
```env
DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5432/internshipiq
SECRET_KEY=generate_a_random_jwt_secret_here
```
*(Optionally, configure your SMTP server settings for real emails, otherwise mock dispatch logs to the console automatically).*

### Step 1.4: Run Database Migrations
Apply Alembic migrations to setup all database tables (including subscriptions, payments, and scrapers):
```bash
alembic upgrade head
```

### Step 1.5: Start Backend Server
Start the development server using `uvicorn`:
```bash
uvicorn app.main:app --port 8000 --reload
```
The FastAPI backend is now running at **`http://localhost:8000`**. You can view the interactive documentation at `http://localhost:8000/docs`.

---

## 🌐 2. Frontend Setup (Next.js)

Open a new terminal window/tab and navigate to the project root directory:

### Step 2.1: Install Dependencies
Install the Node package dependencies:
```bash
npm install
```

### Step 2.2: Configure Environment Variables
Create a `.env.local` file in the root directory if it does not exist:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 2.3: Start Frontend Dev Server
Run the Next.js development server:
```bash
npm run dev
```
The Next.js frontend is now active at **`http://localhost:3000`**.

---

## 🚀 3. Integration & Subscription Workflows

Once both servers are running, the system supports full E2E execution:
1. **User Sign Up & Login**: Register or log in to access the Dashboard.
2. **Premium Upgrade**: Navigate to `/pricing` and choose Monthly or Yearly plan. It will automatically load the Razorpay checkout in Sandbox mode if test credentials are used. Click pay to instantly get the `👑 PREMIUM` status.
3. **Analytics Dashboard**: Visit `/analytics` to see live operational scraper pipelines, pass rates, and SVG trend charts updated in real time.
4. **Developer profile**: Visit `/developer` to view founder details for **Aarupadaiyar KJ** and try uploading custom photos.
5. **Background worker matching**: The backend runs an hourly task matching new job listings to user skills, sending daily email notifications to active premium users.
