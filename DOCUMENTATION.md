# InternshipIQ Project Documentation & Guide

This document explains what modifications we made to the project, why they were made, and provides a simple guide on how to run the application locally.

---

## 1. What We Did (Summary of Changes)

### 🔒 Repository & API Key Security
* **Updated `.gitignore`:** Configured the repository to permanently ignore sensitive and temporary files:
  * Local configuration files containing API keys (`.env`, `.env.local`).
  * Python virtual environments (`.venv`).
  * SQLite database files (`internshipiq.db`).
  * Frontend compilation folders (`.next/`, `tsconfig.tsbuildinfo`).
  * Python bytecode caches (`__pycache__/`, `*.pyc`).
* **Cleaned Git Cache:** Safely untracked previously committed virtual environments (`.venv`) and databases (`internshipiq.db`) from the Git history, keeping them strictly on your local disk.

### ✨ Interactive 3D Elements (Three.js)
* **Added `ThreeDBackground.tsx`:** Created an interactive, floating particle network canvas using Three.js. 
* Particles float slowly and are interconnected by fading lines.
* The system subtly tilts/parallax-glides based on mouse movement.
* It is fully optimized with performance and cleanup hooks (disposing components on unmount to prevent memory leaks).

### 💼 Jobs Grid on Landing Page
* **Latest Job Listings:** The landing page now fetches the **6 latest internships** directly from your database and presents them in a beautiful, glassmorphic layout.
* **Instant Landing Page Search:** Added a search bar in the hero section that lets users search directly and redirects them to `/jobs?search=...`.

### ⏱️ Automated 10-Minute Scraper
* **Scheduled Scraping:** Integrated a background task worker loop in FastAPI using the modern `lifespan` manager context.
* When you start the backend API, it boots up the periodic scraper in the background.
* It runs a crawl from **Unstop** and **Internshala** immediately (with a 5-second initial delay so it doesn't block startup) and then loops every **10 minutes (600 seconds)** to add new listings automatically.

---

## 2. How to Run the Project Locally

To run the application, you need two terminals open (one for the backend and one for the frontend).

### 🖥️ Step A: Run the Backend (FastAPI)
1. Open a terminal and navigate to the `backend` folder (remember to use **quotes** if your path has spaces):
   ```powershell
   cd "C:\Users\aarup\OneDrive\Desktop\repository folder\InternshipIQ\backend"
   ```
2. **Fixing/Recreating the Virtual Environment (if you get "Fatal error in launcher"):**
   Because the project folder was moved or renamed, the python path inside `.venv` may be broken. To fix it, run these commands in the `backend` directory to recreate it:
   ```powershell
   # 1. Remove the old virtual environment
   Remove-Item -Recurse -Force .venv
   
   # 2. Re-create it
   python -m venv .venv
   
   # 3. Activate it
   .venv\Scripts\Activate.ps1
   
   # 4. Install dependencies (using python -m pip to bypass broken launchers)
   python -m pip install -r requirements.txt
   ```
3. Start the FastAPI server using the Python module syntax (which bypasses broken launchers):
   ```powershell
   python -m uvicorn app.main:app --reload --port 8000
   ```
*The backend is now running on `http://localhost:8000`!*

### 🎨 Step B: Run the Frontend (Next.js)
1. Open a second terminal and navigate to the **root** folder (not the `.next` folder):
   ```powershell
   cd "C:\Users\aarup\OneDrive\Desktop\repository folder\InternshipIQ"
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
*The frontend is now running on `http://localhost:3000`.*

---

## 3. How to Deploy to Production Safely

When putting your app on the internet (e.g., Vercel for frontend, Render or AWS for backend):
1. **Frontend:** Add your new API keys (`GROQ_API_KEY`, `GEMINI_API_KEY`) under the **Environment Variables** section in the Vercel dashboard settings.
2. **Backend:** Add your Postgres `DATABASE_URL` and `SECRET_KEY` in the Render/AWS dashboard settings.
3. *Never put your actual keys in code or files that get pushed to GitHub!*
