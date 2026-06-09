# Search Engine Audit and Ranking Report
Generated: 2026-06-09 06:37:35 UTC

## Search Engine Fixes
The search engine has been completely decoupled from the recommendation matching engine. Searching for keywords does not load resume matching or personalized match scores.

### Proper Relevance Ranking
Search results are scored and sorted according to field relevance:
* **Exact Title Match:** +100 relevance points.
* **Title Starts With Match:** +50 relevance points.
* **Title Word Match:** +30 relevance points.
* **Required Skills Match:** +25 relevance points per skill.
* **Domain Match:** +20 relevance points.
* **Company/Location Match:** +10 relevance points.
* **Description Substring Match:** +5 relevance points.

Results are sorted by relevance points descending. Unrelated listings matching only description tags are filtered out using strict domain mapping rules.
