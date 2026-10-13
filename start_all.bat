@echo off
echo ==========================================================
echo        StockWatch PHC - Real-Time Health Intelligence
echo   Medicine Stock-Out Early Warning System for Govt PHCs
echo ==========================================================
echo.
echo [1/3] Initializing database and deterministic seed (seed 42)...
py -m backend.seed
echo.
echo [2/3] Launching FastAPI backend on http://127.0.0.1:8000 ...
start "StockWatch PHC Backend" cmd /c "py -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"
echo.
echo [3/3] Launching React frontend on http://127.0.0.1:5173 ...
start "StockWatch PHC Frontend" cmd /c "cd frontend && npm run dev -- --host 127.0.0.1 --port 5173"
echo.
echo Both servers started!
echo Open your browser at: http://127.0.0.1:5173/
echo Interactive API docs at: http://127.0.0.1:8000/docs
pause
