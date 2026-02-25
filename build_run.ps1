& 'D:\Program Files\vs\VC\Auxiliary\Build\vcvars64.bat' 'x64' > $null
$env:Path = 'D:\Program Files\vs\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64;' + $env:Path
$env:LIB = 'D:\Program Files\vs\VC\Tools\MSVC\14.44.35207\lib\x64;C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\ucrt\x64;C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\um\x64;' + $env:LIB
Set-Location 'C:\Users\Administrator\xuanchen_huiben\src-tauri'
cargo build
