& 'D:\Program Files\vs\VC\Auxiliary\Build\vcvars64.bat' 'x64' > $null

$env:RUSTFLAGS = "-C target-feature=+crt-static"

cargo check --manifest-path C:\Users\Administrator\xuanchen_huiben\src-tauri\Cargo.toml
