import os
import shutil
from sqlmodel import SQLModel, create_engine, Session

# When running in Vercel serverless environment, ensure writable SQLite database in /tmp
if os.getenv("VERCEL") and not os.getenv("DATABASE_URL"):
    tmp_db = "/tmp/stockwatch.db"
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    src_db = os.path.join(repo_root, "stockwatch.db")
    if not os.path.exists(tmp_db) and os.path.exists(src_db):
        try:
            shutil.copyfile(src_db, tmp_db)
        except Exception:
            pass
    DATABASE_URL = f"sqlite:///{tmp_db}"
else:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./stockwatch.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

def init_db():
    from backend import models
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
