@echo off
REM 请在 "x64 Native Tools Command Prompt for VS 2022" 中运行此脚本
REM 或者先运行: call "D:\Program Files\vs\VC\Auxiliary\Build\vcvars64.bat"

cd /d %~dp0
cd src-tauri

echo Building Tauri application...
cargo build

echo.
echo Build completed!
pause
