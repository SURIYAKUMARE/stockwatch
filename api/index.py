import sys
import os

# Ensure backend and root paths are available
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(parent_dir, "backend")

for p in [parent_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.main import app

# Export app for Vercel Serverless Function
__all__ = ["app"]
