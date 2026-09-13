@echo off
title FLOOD-X Platform Launcher
echo ================================================================
echo       FLOOD-X: AI-Powered Urban Flood Nowcasting & Digital Twin
echo       SIH Problem Statement SIH26085 - MoES / NCMRWF
echo ================================================================
echo Starting FLOOD-X Unified Engine and Dashboard...
echo Open locally at: http://127.0.0.1:8000
echo On another PC, use this computer's IPv4 address with port 8000.
echo ================================================================
cd /d "%~dp0backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause

