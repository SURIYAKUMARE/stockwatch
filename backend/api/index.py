import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
parent_dir = os.path.dirname(backend_dir)

for p in [backend_dir, parent_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.main import app

__all__ = ["app"]
