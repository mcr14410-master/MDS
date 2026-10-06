@echo off
rem Wie 2_Export, zusaetzlich 3D-Modell (glb) je Werkzeug-Baugruppe. Dauert laenger.
cd /d "%~dp0"
TS_LibExport.exe --export --glb
