use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

static SHARES: Mutex<Option<HashMap<String, ShareRecord>>> = Mutex::new(None);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareData {
    pub version: String,
    #[serde(rename = "type")]
    pub data_type: String,
    pub created_at: String,
    pub expires_at: Option<String>,
    pub password_protected: bool,
    pub metadata: ShareMetadata,
    pub images: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareMetadata {
    pub prompt: String,
    pub model: String,
    pub params: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareRecord {
    pub id: String,
    pub data: ShareData,
    pub password: Option<String>,
    pub expires_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareInput {
    pub id: String,
    pub data: ShareData,
    pub password: Option<String>,
    pub expires_at: Option<String>,
}

fn get_share_file_path() -> PathBuf {
    let app_dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("xuanchen-huiben");
    fs::create_dir_all(&app_dir).ok();
    app_dir.join("shares.json")
}

fn load_shares() -> HashMap<String, ShareRecord> {
    let path = get_share_file_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(shares) = serde_json::from_str(&content) {
                return shares;
            }
        }
    }
    HashMap::new()
}

fn save_shares(shares: &HashMap<String, ShareRecord>) -> Result<(), String> {
    let path = get_share_file_path();
    let content = serde_json::to_string_pretty(shares).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

fn init_shares() {
    let mut guard = SHARES.lock().unwrap();
    if guard.is_none() {
        *guard = Some(load_shares());
    }
}

fn with_shares<F, R>(f: F) -> Result<R, String>
where
    F: FnOnce(&mut HashMap<String, ShareRecord>) -> Result<R, String>,
{
    init_shares();
    let mut guard = SHARES.lock().map_err(|e| e.to_string())?;
    let shares = guard.as_mut().ok_or("Shares not initialized")?;
    f(shares)
}

fn convert_image_to_base64(img: &str) -> String {
    if img.starts_with("data:") {
        return img.to_string();
    }

    let path = PathBuf::from(img);
    if path.exists() {
        if let Ok(bytes) = fs::read(&path) {
            use base64::{engine::general_purpose::STANDARD, Engine as _};
            let b64 = STANDARD.encode(&bytes);
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("png");
            let mime = match ext {
                "jpg" | "jpeg" => "image/jpeg",
                "png" => "image/png",
                "gif" => "image/gif",
                "webp" => "image/webp",
                _ => "image/png",
            };
            return format!("data:{};base64,{}", mime, b64);
        }
    }
    img.to_string()
}

#[tauri::command]
pub fn create_share(share: ShareInput) -> Result<ShareRecord, String> {
    let images: Vec<String> = share
        .data
        .images
        .iter()
        .map(|img| convert_image_to_base64(img))
        .collect();

    let data = ShareData {
        version: share.data.version,
        data_type: share.data.data_type,
        created_at: share.data.created_at,
        expires_at: share.data.expires_at,
        password_protected: share.data.password_protected,
        metadata: share.data.metadata,
        images,
    };

    let record = ShareRecord {
        id: share.id.clone(),
        data,
        password: share.password,
        expires_at: share.expires_at,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    with_shares(|shares| {
        shares.insert(share.id.clone(), record.clone());
        save_shares(shares)?;
        Ok(record)
    })
}

#[tauri::command]
pub fn get_share(id: String) -> Result<Option<ShareRecord>, String> {
    with_shares(|shares| {
        if let Some(record) = shares.get(&id) {
            if let Some(expires_at) = &record.expires_at {
                if let Ok(expires) = chrono::DateTime::parse_from_rfc3339(expires_at) {
                    if expires < chrono::Utc::now() {
                        return Ok(None);
                    }
                }
            }
            Ok(Some(record.clone()))
        } else {
            Ok(None)
        }
    })
}

#[tauri::command]
pub fn delete_share(id: String) -> Result<bool, String> {
    with_shares(|shares| {
        if shares.remove(&id).is_some() {
            save_shares(shares)?;
            Ok(true)
        } else {
            Ok(false)
        }
    })
}

#[tauri::command]
pub fn generate_share_html(data: ShareData, password: Option<String>) -> Result<String, String> {
    let images_html: String = data
        .images
        .iter()
        .enumerate()
        .map(|(i, img)| {
            format!(
                r#"<div class="image-container">
                <img src="{}" alt="Generated Image {}" />
            </div>"#,
                img,
                i + 1
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    let content_start = if password.is_some() {
        r#"
        <div id="password-check" style="display: none;">
            <input type="password" id="password-input" placeholder="请输入访问密码" />
            <button onclick="verifyPassword()">验证</button>
        </div>
        <div id="content" style="display: none;">"#
    } else {
        r#"<div id="content">"#
    };

    let password_script = if password.is_some() {
        format!(
            r#"
        <script>
            const correctPassword = "{}";
            document.getElementById('password-check').style.display = 'block';
            
            function verifyPassword() {{
                const input = document.getElementById('password-input').value;
                if (input === correctPassword) {{
                    document.getElementById('password-check').style.display = 'none';
                    document.getElementById('content').style.display = 'block';
                }} else {{
                    alert('密码错误');
                }}
            }}
        </script>"#,
            password.unwrap()
        )
    } else {
        String::new()
    };

    let expires_text = data
        .expires_at
        .as_ref()
        .map(|e| {
            format!(
                "有效期至: {}",
                chrono::DateTime::parse_from_rfc3339(e)
                    .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
                    .unwrap_or_else(|_| e.clone())
            )
        })
        .unwrap_or_else(|| "永久有效".to_string());

    let html = format!(
        r#"<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>泫晨懿然·灵犀绘梦 - 图片分享</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }}
        h1 {{
            color: #333;
            margin-bottom: 8px;
            font-size: 24px;
        }}
        .meta {{
            color: #666;
            font-size: 14px;
            margin-bottom: 24px;
        }}
        .prompt {{
            background: #f5f5f5;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
            font-size: 15px;
            line-height: 1.6;
            color: #333;
        }}
        .params {{
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 24px;
        }}
        .param {{
            background: #e8e8e8;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            color: #555;
        }}
        .images {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 16px;
        }}
        .image-container img {{
            width: 100%;
            height: auto;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }}
        .footer {{
            margin-top: 32px;
            text-align: center;
            color: #999;
            font-size: 13px;
        }}
        #password-check {{
            text-align: center;
            padding: 40px;
        }}
        #password-check input {{
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            width: 250px;
            margin-right: 12px;
        }}
        #password-check button {{
            padding: 12px 24px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>泫晨懿然·灵犀绘梦</h1>
        <p class="meta">分享时间: {} | {}</p>
        
        <h3>提示词</h3>
        <div class="prompt">{}</div>
        
        <div class="params">
            <span class="param">模型: {}</span>
        </div>
        
        {}
        
        <div class="footer">
            由泫晨懿然·灵犀绘梦助手生成
        </div>
    </div>
    {}
    {}
</body>
</html>"#,
        data.created_at,
        expires_text,
        data.metadata.prompt,
        data.metadata.model,
        content_start,
        images_html,
        password_script
    );

    Ok(html)
}
