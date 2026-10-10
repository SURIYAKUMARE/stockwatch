import sys
import os

# Ensure backend directory and repo root are in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(backend_dir)
for p in [backend_dir, parent_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

# If 'backend' package is not already loaded or resolvable,
# synthesize the 'backend' package pointing to backend_dir
if "backend" not in sys.modules:
    import types
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [backend_dir]
    backend_pkg.__file__ = os.path.join(backend_dir, "__init__.py")
    sys.modules["backend"] = backend_pkg

from backend.app.main import app

__all__ = ["app"]
