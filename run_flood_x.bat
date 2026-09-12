@echo off
title FLOOD-X Platform Launcher
echo ================================================================
echo       FLOOD-X: AI-Powered Urban Flood Nowcasting & Digital Twin
echo       SIH Problem Statement SIH26085 - MoES / NCMRWF
echo ================================================================
echo Starting FLOOD-X Unified Engine and Dashboard...
echo Open your browser at: http://127.0.0.1:8000
echo ================================================================
cd /d "%~dp0backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause

