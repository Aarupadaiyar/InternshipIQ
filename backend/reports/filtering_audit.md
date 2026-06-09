# Filtering Engine Audit and Stacking Report
Generated: 2026-06-09 06:37:35 UTC

## Filtering Architecture
* **Strict Server-side Domain Filtering:** Jobs are strictly classified based on title-first keywords into one of the 12 core domains. Selecting a domain (e.g. Machine Learning & AI) returns *only* matching jobs.
* **Stacking Filter Logic:** All active query filters (Keyword, Domain, Source, Type/Remote, Company, Location) are stacked in the SQL statement.
