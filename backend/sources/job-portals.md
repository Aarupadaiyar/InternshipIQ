# Scraped Job Portals Listing
Generated: 2026-06-09 06:37:35 UTC

This file registers the 10 top internship portals integrated into the InternshipIQ registry:

### Internshala
* **Base URL:** https://internshala.com
* **Opportunity URL Pattern:** `https://internshala.com/internship/detail/{slug}`
* **Verification Method:** HTTP 200 checks, title/description regex match, and application form indicators.
* **Scraping Strategy:** HTML scraping via HTTP requests for major categories.
* **Last Scrape Count:** 770 jobs saved

### Wellfound
* **Base URL:** https://wellfound.com
* **Opportunity URL Pattern:** `https://wellfound.com/jobs?role=internship`
* **Verification Method:** HTTP 200, redirect analysis, and job description verification.
* **Scraping Strategy:** API checking or browser simulation.
* **Last Scrape Count:** 0 jobs saved

### Unstop
* **Base URL:** https://unstop.com
* **Opportunity URL Pattern:** `https://unstop.com/jobs/{slug}`
* **Verification Method:** Public JSON API check and direct URL verification.
* **Scraping Strategy:** Crawling public JSON search results API and extracting direct URLs.
* **Last Scrape Count:** 150 jobs saved

### LinkedIn
* **Base URL:** https://linkedin.com
* **Opportunity URL Pattern:** `https://www.linkedin.com/jobs/view/{id}`
* **Verification Method:** HTTP status check on public job view endpoint.
* **Scraping Strategy:** Request public job pages using mock browser headers.
* **Last Scrape Count:** 0 jobs saved

### Foundit
* **Base URL:** https://www.foundit.in
* **Opportunity URL Pattern:** `https://www.foundit.in/job/{id}`
* **Verification Method:** HTTP 200 check and job listing validation.
* **Scraping Strategy:** Crawling listing search queries.
* **Last Scrape Count:** 0 jobs saved

### Naukri
* **Base URL:** https://www.naukri.com
* **Opportunity URL Pattern:** `https://www.naukri.com/job-listings-{slug}`
* **Verification Method:** HTTP status checking and structured markup check.
* **Scraping Strategy:** Scrape using specific headers.
* **Last Scrape Count:** 0 jobs saved

### Cutshort
* **Base URL:** https://cutshort.io
* **Opportunity URL Pattern:** `https://cutshort.io/job/{id}`
* **Verification Method:** HTTP 200 and description verification.
* **Scraping Strategy:** HTML parsing of public job post page.
* **Last Scrape Count:** 0 jobs saved

### Instahyre
* **Base URL:** https://www.instahyre.com
* **Opportunity URL Pattern:** `https://www.instahyre.com/jobs/{slug}`
* **Verification Method:** Checking page title and apply action.
* **Scraping Strategy:** HTML parsing of job listing pages.
* **Last Scrape Count:** 0 jobs saved

### Hirist
* **Base URL:** https://www.hirist.tech
* **Opportunity URL Pattern:** `https://www.hirist.tech/j/{id}.html`
* **Verification Method:** HTTP status code checking and title confirmation.
* **Scraping Strategy:** Parsing public page details.
* **Last Scrape Count:** 0 jobs saved

### Freshersworld
* **Base URL:** https://www.freshersworld.com
* **Opportunity URL Pattern:** `https://www.freshersworld.com/jobs/{slug}`
* **Verification Method:** HTTP 200 checks.
* **Scraping Strategy:** Scraping public job category feeds.
* **Last Scrape Count:** 0 jobs saved

