import asyncio
import httpx
import re

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

async def run():
    url = "https://unstop.com/jobs/videographer-video-editor-estateone-1696966"
    async with httpx.AsyncClient(headers=HEADERS, timeout=15.0, follow_redirects=True) as client:
        res = await client.get(url)
        print(f"STATUS: {res.status_code}")
        print(f"CONTENT-LENGTH: {len(res.text)}")
        # Check if it's a JS-rendered SPA (no real content in HTML)
        text = res.text.lower()
        has_title = "videographer" in text
        has_apply = "apply" in text
        has_app_root = "app-root" in text or "ng-version" in text or "__next" in text or "react" in text.lower()
        print(f"HAS TITLE IN HTML: {has_title}")
        print(f"HAS APPLY IN HTML: {has_apply}")
        print(f"IS JS SPA (no SSR): {has_app_root}")
        print(f"HTML SNIPPET (first 2000 chars):")
        print(res.text[:2000])

asyncio.run(run())
