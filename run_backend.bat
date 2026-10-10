@echo off
echo Starting StockWatch PHC Backend (FastAPI + SQLModel)...
py -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
pause
