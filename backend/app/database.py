import os
import shutil
from sqlmodel import SQLModel, create_engine, Session

# When running in Vercel serverless environment, ensure writable SQLite database in /tmp
if os.getenv("VERCEL") and not os.getenv("DATABASE_URL"):
    tmp_db = "/tmp/stockwatch.db"
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    repo_root = os.path.abspath(os.path.join(backend_dir, ".."))
    src_db_candidates = [
        os.path.join(backend_dir, "stockwatch.db"),
        os.path.join(repo_root, "stockwatch.db"),
        os.path.join(os.getcwd(), "stockwatch.db"),
        os.path.join(os.getcwd(), "backend", "stockwatch.db")
    ]
    if not os.path.exists(tmp_db):
        copied = False
        for src in src_db_candidates:
            if os.path.exists(src):
                try:
                    shutil.copyfile(src, tmp_db)
                    copied = True
                    break
                except Exception:
                    pass
        if not copied:
            try:
                DATABASE_URL = f"sqlite:///{tmp_db}"
                connect_args = {"check_same_thread": False}
                engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)
                from backend.seed import seed_all
                seed_all()
            except Exception:
                pass
    DATABASE_URL = f"sqlite:///{tmp_db}"
else:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./stockwatch.db")

# Normalize legacy postgres:// scheme to postgresql:// for SQLAlchemy
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine_kwargs = {"echo": False, "connect_args": connect_args}
if not DATABASE_URL.startswith("sqlite"):
    engine_kwargs["pool_pre_ping"] = True

engine = create_engine(DATABASE_URL, **engine_kwargs)

from sqlmodel import SQLModel, create_engine, Session, text

def init_db():
    from backend import models
    SQLModel.metadata.create_all(engine)
    # Safe backward-compatible migrations for existing SQLite databases
    with engine.connect() as conn:
        for col_def in ["notes TEXT", "reply_notes TEXT"]:
            try:
                conn.execute(text(f"ALTER TABLE availabilityenquiry ADD COLUMN {col_def}"))
                conn.commit()
            except Exception:
                pass

def get_session():
    with Session(engine) as session:
        yield session
