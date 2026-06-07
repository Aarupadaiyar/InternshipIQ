from __future__ import annotations

"""
Rate limiting configuration using slowapi.
Provides a global Limiter instance.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Configure rate limiter key function to use the client remote IP address
limiter = Limiter(key_func=get_remote_address)
