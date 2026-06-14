from __future__ import annotations
import asyncio
import pytest
from app.database.session import engine


@pytest.fixture(autouse=True)
def cleanup_connections():
    """
    Dispose async engine connection pool after each test.
    Uses a sync wrapper so both sync and async tests can consume this fixture.
    """
    yield
    # Run async dispose in a fresh event loop to avoid cross-loop conflicts.
    try:
        loop = asyncio.new_event_loop()
        loop.run_until_complete(engine.dispose())
    finally:
        loop.close()
