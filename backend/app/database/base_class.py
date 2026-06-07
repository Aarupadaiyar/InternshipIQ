from __future__ import annotations

"""
Declarative base class for SQLAlchemy.
Defined separately to prevent circular imports.
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Common base class for all ORM models."""
    pass
