# backend/services/api_auth.py
"""
API key dependency for FastAPI.

- DEMO_API_KEY: simple read-only key for external testers
- ADMIN_API_KEY: privileged key (used for admin/refresh)
- ALLOW_LOCAL_UNAUTH: if true (default) allows calls from localhost without x-api-key,
  so your local frontend keeps working unchanged.
"""

import os
from fastapi import Request, Header, HTTPException
from typing import Optional, Dict

DEMO_KEY = os.getenv("DEMO_API_KEY", "demo-key-123")
ADMIN_KEY = os.getenv("ADMIN_API_KEY", "admin-key-456")

ALLOW_LOCAL_UNAUTH = os.getenv("ALLOW_LOCAL_UNAUTH", "1") not in ("0", "false", "False")

def require_api_key(request: Request, x_api_key: Optional[str] = Header(None)) -> Dict:
    # If API key provided, validate
    if x_api_key:
        if x_api_key == ADMIN_KEY:
            return {"role": "admin"}
        if x_api_key == DEMO_KEY:
            return {"role": "demo"}
        raise HTTPException(status_code=401, detail="Invalid API key")

    # No key: allow local callers if permitted
    if ALLOW_LOCAL_UNAUTH:
        try:
            client_host = request.client.host
        except Exception:
            client_host = None
        if client_host in ("127.0.0.1", "::1", "localhost"):
            return {"role": "local"}

        host_header = request.headers.get("host", "")
        if "127.0.0.1" in host_header or "localhost" in host_header:
            return {"role": "local"}

    raise HTTPException(status_code=401, detail="Missing API key")