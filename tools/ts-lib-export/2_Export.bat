@echo off
rem Vollstaendiger Export beider Bibliotheken fuer den MDS-Import (nur lesend). TopSolid muss laufen.
cd /d "%~dp0"
TS_LibExport.exe --export
