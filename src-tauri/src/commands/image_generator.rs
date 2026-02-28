use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::Rng;

static API_CONFIG: Mutex<Option<ApiConfig>> = Mutex::new(None);
static GENERATION_CONFIG: Mutex<Option<GenerationConfig>> = Mutex::new(None);
static GENERATION_TASKS: Lazy<Mutex<HashMap<String, GenerationTask>>> = Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiConfig {
    pub seedream: ModelConfig,
    pub banana_pro: ModelConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub base_url: String,
    pub api_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenerationParams {
    pub model: String,
    pub prompt: String,
    pub character_bindings: Vec<CharacterBindingInfo>,
    pub width: u32,
    pub height: u32,
    pub count: u32,
    pub quality: String,
    pub size: Option<String>,
    pub sequential_image_generation: Option<String>,
    pub response_format: Option<String>,
    pub watermark: Option<bool>,
    pub images: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterBindingInfo {
    #[serde(alias = "characterName")]
    pub character_name: String,
    #[serde(alias = "referenceImagePath")]
    pub reference_image_path: Option<String>,
    #[serde(alias = "imageType")]
    pub image_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenerationResult {
    pub success: bool,
    pub images: Vec<String>,
    pub error: Option<String>,
    #[serde(alias = "taskId", alias = "task_id")]
    pub task_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationProgress {
    #[serde(alias = "taskId")]
    pub task_id: String,
    pub status: String,
    pub progress: u32,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationConfig {
    pub model: String,
    pub width: u32,
    pub height: u32,
    pub count: u32,
    pub quality: String,
    pub size: Option<String>,
    #[serde(alias = "sequentialImageGeneration")]
    pub sequential_image_generation: Option<String>,
    #[serde(alias = "responseFormat")]
    pub response_format: Option<String>,
    pub watermark: Option<bool>,
}

#[derive(Debug, Clone)]
pub struct GenerationTask {
    pub status: String,
    pub progress: u32,
    pub message: Option<String>,
}

fn get_app_data_dir() -> PathBuf {
    let app_data = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("xuanchen-huiben");
    fs::create_dir_all(&app_data).ok();
    app_data
}

fn get_config_path() -> PathBuf {
    get_app_data_dir().join("api_config.json")
}

fn get_generation_config_path() -> PathBuf {
    get_app_data_dir().join("generation_config.json")
}

fn get_key_path() -> PathBuf {
    get_app_data_dir().join("key.bin")
}

fn get_or_create_key() -> Result<[u8; 32], String> {
    let key_path = get_key_path();
    
    if key_path.exists() {
        let key_data = fs::read(&key_path).map_err(|e| e.to_string())?;
        if key_data.len() == 32 {
            let mut key = [0u8; 32];
            key.copy_from_slice(&key_data);
            return Ok(key);
        }
    }
    
    let mut key = [0u8; 32];
    rand::thread_rng().fill(&mut key);
    
    fs::write(&key_path, &key).map_err(|e| e.to_string())?;
    
    Ok(key)
}

fn encrypt_data(data: &[u8], key: &[u8; 32]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    let ciphertext = cipher.encrypt(nonce, data).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);
    
    Ok(result)
}

fn decrypt_data(encrypted: &[u8], key: &[u8; 32]) -> Result<Vec<u8>, String> {
    if encrypted.len() < 12 {
        return Err("加密数据格式错误".to_string());
    }
    
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    
    let nonce = Nonce::from_slice(&encrypted[..12]);
    let ciphertext = &encrypted[12..];
    
    let plaintext = cipher.decrypt(nonce, ciphertext).map_err(|e| e.to_string())?;
    
    Ok(plaintext)
}

#[tauri::command]
pub fn save_api_config(config: ApiConfig) -> Result<bool, String> {
    let config_path = get_config_path();
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    
    let key = get_or_create_key()?;
    let encrypted = encrypt_data(json.as_bytes(), &key)?;
    
    fs::write(&config_path, encrypted).map_err(|e| e.to_string())?;
    
    let mut api_config = API_CONFIG.lock().map_err(|e| e.to_string())?;
    *api_config = Some(config);
    
    Ok(true)
}

#[tauri::command]
pub fn load_api_config() -> Result<ApiConfig, String> {
    let config_path = get_config_path();
    
    if config_path.exists() {
        let encrypted = fs::read(&config_path).map_err(|e| e.to_string())?;
        
        let key = get_or_create_key()?;
        let decrypted = decrypt_data(&encrypted, &key)?;
        let json = String::from_utf8(decrypted).map_err(|e| e.to_string())?;
        
        let config: ApiConfig = serde_json::from_str(&json).map_err(|e| e.to_string())?;
        
        let mut api_config = API_CONFIG.lock().map_err(|e| e.to_string())?;
        *api_config = Some(config.clone());
        
        Ok(config)
    } else {
        Err("API配置不存在".to_string())
    }
}

#[tauri::command]
pub fn get_default_api_config() -> ApiConfig {
    ApiConfig {
        seedream: ModelConfig {
            base_url: "https://eggfans.com".to_string(),
            api_key: "".to_string(),
        },
        banana_pro: ModelConfig {
            base_url: "https://api.zhongzhuan.chat".to_string(),
            api_key: "".to_string(),
        },
    }
}

#[tauri::command]
pub fn save_generation_config(config: GenerationConfig) -> Result<bool, String> {
    let config_path = get_generation_config_path();
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&config_path, json).map_err(|e| e.to_string())?;
    
    let mut gen_config = GENERATION_CONFIG.lock().map_err(|e| e.to_string())?;
    *gen_config = Some(config);
    
    Ok(true)
}

#[tauri::command]
pub fn load_generation_config() -> Result<GenerationConfig, String> {
    let config_path = get_generation_config_path();
    
    if config_path.exists() {
        let json = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        let config: GenerationConfig = serde_json::from_str(&json).map_err(|e| e.to_string())?;
        
        let mut gen_config = GENERATION_CONFIG.lock().map_err(|e| e.to_string())?;
        *gen_config = Some(config.clone());
        
        Ok(config)
    } else {
        Err("生成参数配置不存在".to_string())
    }
}

#[tauri::command]
pub fn get_default_generation_config() -> GenerationConfig {
    GenerationConfig {
        model: "seedream".to_string(),
        width: 1,
        height: 1,
        count: 1,
        quality: "standard".to_string(),
        size: Some("1024x1024".to_string()),
        sequential_image_generation: Some("disabled".to_string()),
        response_format: Some("url".to_string()),
        watermark: Some(false),
    }
}

#[tauri::command]
pub async fn generate_image(
    params: ImageGenerationParams,
) -> Result<ImageGenerationResult, String> {
    let task_id = format!("task_{}", chrono::Utc::now().timestamp_millis());
    
    {
        let mut tasks = GENERATION_TASKS.lock().map_err(|e| e.to_string())?;
        tasks.insert(task_id.clone(), GenerationTask {
            status: "pending".to_string(),
            progress: 0,
            message: Some("正在初始化...".to_string()),
        });
    }
    
    update_task_progress(&task_id, "processing", 10, "正在准备请求...");
    
    let api_config = {
        let config = API_CONFIG.lock().map_err(|e| e.to_string())?;
        config.clone()
    };
    
    let config = match api_config {
        Some(c) => c,
        None => {
            let config_path = get_config_path();
            eprintln!("Config path: {:?}", config_path);
            if config_path.exists() {
                eprintln!("Config file exists, attempting to decrypt...");
                let encrypted = fs::read(&config_path).map_err(|e| format!("读取配置文件失败: {}", e))?;
                let key = get_or_create_key().map_err(|e| format!("获取密钥失败: {}", e))?;
                let decrypted = decrypt_data(&encrypted, &key).map_err(|e| format!("解密失败: {}", e))?;
                let json = String::from_utf8(decrypted).map_err(|e| format!("UTF8转换失败: {}", e))?;
                eprintln!("Config JSON: {}", json);
                let loaded: ApiConfig = serde_json::from_str(&json).map_err(|e| format!("JSON解析失败: {}", e))?;
                let mut api_config = API_CONFIG.lock().map_err(|e| e.to_string())?;
                *api_config = Some(loaded.clone());
                loaded
            } else {
                return Err("请先配置API".to_string());
            }
        }
    };
    
    update_task_progress(&task_id, "processing", 30, "正在调用AI模型...");
    
    let model_config = match params.model.as_str() {
        "seedream" => config.seedream,
        "banana_pro" => config.banana_pro,
        _ => return Err("不支持的模型".to_string()),
    };
    
    eprintln!("Using model: {}, base_url: {}", params.model, model_config.base_url);
    
    if model_config.api_key.is_empty() {
        return Err("请先配置API Key".to_string());
    }
    
    // Convert local reference paths to base64 so the API can actually see them
    let mut api_images = params.images.clone().unwrap_or_default();
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    
    for binding in &params.character_bindings {
        if let Some(ref_path) = &binding.reference_image_path {
            if !ref_path.is_empty() {
                if let Ok(data) = fs::read(ref_path) {
                    // Start of image compression block. If an image is larger than 1MB or exceeds dimensions,
                    // we downscale it into a compact JPEG to save massive base64 payload size.
                    let max_data_len = 1024 * 1024; // 1MB threshold for direct upload
                    
                    let base64_str = if data.len() > max_data_len {
                        match image::load_from_memory(&data) {
                            Ok(img) => {
                                // Resize if too large, maintain aspect ratio
                                let resized = if img.width() > 1024 || img.height() > 1024 {
                                    img.resize(1024, 1024, image::imageops::FilterType::Lanczos3)
                                } else {
                                    img
                                };
                                
                                let mut buf = std::io::Cursor::new(Vec::new());
                                // Compress to JPEG (80% quality)
                                if resized.write_to(&mut buf, image::ImageOutputFormat::Jpeg(80)).is_ok() {
                                    STANDARD.encode(buf.into_inner())
                                } else {
                                    STANDARD.encode(&data)
                                }
                            }
                            Err(_) => STANDARD.encode(&data),
                        }
                    } else {
                        STANDARD.encode(&data)
                    };
                    
                    api_images.push(base64_str);
                }
            }
        }
    }
    // Only pass Some if we actually loaded reference images
    let final_images = if api_images.is_empty() { None } else { Some(api_images) };
    
    let prompt = build_prompt_with_bindings(&params);
    
    let result = match params.model.as_str() {
        "seedream" => call_seedream_api(&model_config, &prompt, params.size, params.sequential_image_generation, params.response_format, params.watermark, final_images).await,
        "banana_pro" => call_banana_pro_api(&model_config, &prompt, params.width, params.height, params.count, final_images).await,
        _ => Err("不支持的模型".to_string()),
    };
    
    match result {
        Ok(images) => {
            update_task_progress(&task_id, "completed", 100, "生成完成");
            
            {
                let mut tasks = GENERATION_TASKS.lock().map_err(|e| e.to_string())?;
                tasks.remove(&task_id);
            }
            
            Ok(ImageGenerationResult {
                success: true,
                images,
                task_id,
                error: None,
            })
        }
        Err(e) => {
            update_task_progress(&task_id, "failed", 0, &e);
            
            {
                let mut tasks = GENERATION_TASKS.lock().map_err(|e| e.to_string())?;
                tasks.remove(&task_id);
            }
            
            Ok(ImageGenerationResult {
                success: false,
                images: vec![],
                task_id,
                error: Some(e),
            })
        }
    }
}

fn build_prompt_with_bindings(params: &ImageGenerationParams) -> String {
    let mut final_prompt = params.prompt.clone();
    
    for binding in &params.character_bindings {
        if let Some(ref_path) = &binding.reference_image_path {
            if !ref_path.is_empty() {
                final_prompt = format!(
                    "{} [{}: {}]",
                    final_prompt,
                    binding.character_name,
                    ref_path
                );
            }
        }
    }
    
    final_prompt
}

async fn call_banana_pro_api(
    config: &ModelConfig,
    prompt: &str,
    width: u32,
    height: u32,
    count: u32,
    images: Option<Vec<String>>,
) -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    
    let aspect_ratio = calculate_aspect_ratio(width, height);
    
    let image_size = match width {
        0..=576 => "256k",
        577..=1024 => "1K",
        1025..=2048 => "2K",
        _ => "4K",
    };
    
    // Build parts with optional reference images
    let mut parts: Vec<serde_json::Value> = Vec::new();
    
    // Add reference images if any
    if let Some(ref imgs) = images {
        for img in imgs {
            let img_data = if img.starts_with("data:") {
                img.split(',').nth(1).unwrap_or(img.as_str()).to_string()
            } else {
                img.clone()
            };
            parts.push(serde_json::json!({
                "inlineData": {
                    "mimeType": "image/png",
                    "data": img_data
                }
            }));
        }
    }
    
    // Add text prompt
    parts.push(serde_json::json!({ "text": prompt }));
    
    let contents = vec![serde_json::json!({
        "role": "user",
        "parts": parts
    })];
    
    let request_body = serde_json::json!({
        "contents": contents,
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {
                "aspectRatio": aspect_ratio,
                "imageSize": image_size
            }
        }
    });

    eprintln!("Banana Pro API request body: {:?}", request_body);
    
    let url = format!(
        "{}/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key={}",
        config.base_url, config.api_key
    );
    eprintln!("Banana Pro API URL: {}", url);
    
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        eprintln!("Banana Pro API error response: {}", text);
        return Err(format!("API错误 {}: {}", status, text));
    }
    
    let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    
    eprintln!("Banana Pro API response: {:?}", data);
    
    // Check for error in response
    if let Some(error) = data.get("error") {
        return Err(format!("API返回错误: {:?}", error));
    }
    
    let images: Vec<String> = data["candidates"]
        .as_array()
        .and_then(|arr| {
            Some(arr.iter()
                .filter_map(|candidate| {
                    candidate["content"]["parts"]
                        .as_array()
                        .and_then(|parts| {
                            parts.iter().find_map(|part| {
                                part["inlineData"]["data"].as_str().map(|s| {
                                    let mime = part["inlineData"]["mimeType"].as_str().unwrap_or("image/png");
                                    format!("data:{};base64,{}", mime, s)
                                })
                            })
                        })
                })
                .collect::<Vec<_>>())
        })
        .unwrap_or_default();
    
    if images.is_empty() {
        return Err("未生成图片".to_string());
    }
    
    Ok(images)
}

fn calculate_aspect_ratio(width: u32, height: u32) -> String {
    let gcd = gcd_u32(width, height);
    let w = width / gcd;
    let h = height / gcd;
    format!("{}:{}", w, h)
}

fn gcd_u32(a: u32, b: u32) -> u32 {
    if b == 0 {
        a
    } else {
        gcd_u32(b, a % b)
    }
}

async fn call_seedream_api(
    config: &ModelConfig,
    prompt: &str,
    size: Option<String>,
    sequential_image_generation: Option<String>,
    response_format: Option<String>,
    watermark: Option<bool>,
    images: Option<Vec<String>>,
) -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    
    let mut request_body = serde_json::json!({
        "model": "doubao-seedream-4-0-250828",
        "prompt": prompt,
    });
    
    if let Some(s) = size {
        request_body["size"] = serde_json::json!(s);
    } else {
        request_body["size"] = serde_json::json!("2K");
    }
    
    if let Some(s) = sequential_image_generation {
        request_body["sequential_image_generation"] = serde_json::json!(s);
        if s == "auto" {
            request_body["sequential_image_generation_options"] = serde_json::json!({
                "max_images": 3
            });
        }
    } else {
        request_body["sequential_image_generation"] = serde_json::json!("auto");
        request_body["sequential_image_generation_options"] = serde_json::json!({
            "max_images": 3
        });
    }
    
    if let Some(rf) = response_format {
        request_body["response_format"] = serde_json::json!(rf);
    }
    
    if let Some(w) = watermark {
        request_body["watermark"] = serde_json::json!(w);
    } else {
        request_body["watermark"] = serde_json::json!(false);
    }
    
    if let Some(imgs) = images {
        if !imgs.is_empty() {
            // Seedream API requires proper base64 data URIs
            let formatted_images: Vec<String> = imgs.iter().map(|b64| {
                if b64.starts_with("data:") {
                    b64.clone()
                } else {
                    format!("data:image/png;base64,{}", b64)
                }
            }).collect();
            request_body["image"] = serde_json::json!(formatted_images);
        }
    }
    
    eprintln!("Seedream API request: {:?}", request_body);
    
    let response = client
        .post(&format!("{}/v1/images/generations", config.base_url))
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("API错误 {}: {}", status, text));
    }
    
    let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    
    eprintln!("Seedream API response: {:?}", data);
    
    let images: Vec<String> = data["data"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|item| item["url"].as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    
    Ok(images)
}

fn update_task_progress(task_id: &str, status: &str, progress: u32, message: &str) {
    if let Ok(mut tasks) = GENERATION_TASKS.lock() {
        if let Some(task) = tasks.get_mut(task_id) {
            task.status = status.to_string();
            task.progress = progress;
            task.message = Some(message.to_string());
        }
    }
}

#[tauri::command]
pub fn get_generation_progress(task_id: String) -> Result<GenerationProgress, String> {
    let tasks = GENERATION_TASKS.lock().map_err(|e| e.to_string())?;
    
    if let Some(task) = tasks.get(&task_id) {
        Ok(GenerationProgress {
            task_id,
            status: task.status.clone(),
            progress: task.progress,
            message: task.message.clone(),
        })
    } else {
        Err("任务不存在".to_string())
    }
}

#[tauri::command]
pub async fn test_api_connection(model: String, base_url: Option<String>, api_key: Option<String>) -> Result<bool, String> {
    let provided_config = base_url.is_some() && api_key.is_some();
    
    let (model_config, _) = if provided_config {
        (
            ModelConfig {
                base_url: base_url.unwrap(),
                api_key: api_key.unwrap(),
            },
            true
        )
    } else {
        let api_config = {
            let config = API_CONFIG.lock().map_err(|e| e.to_string())?;
            config.clone()
        };
        
        let config = match api_config {
            Some(c) => c,
            None => {
                let config_path = get_config_path();
                if config_path.exists() {
                    let encrypted = fs::read(&config_path).map_err(|e| e.to_string())?;
                    let key = get_or_create_key()?;
                    let decrypted = decrypt_data(&encrypted, &key)?;
                    let json = String::from_utf8(decrypted).map_err(|e| e.to_string())?;
                    let loaded: ApiConfig = serde_json::from_str(&json).map_err(|e| e.to_string())?;
                    let mut api_config = API_CONFIG.lock().map_err(|e| e.to_string())?;
                    *api_config = Some(loaded.clone());
                    loaded
                } else {
                    return Err("请先配置API".to_string());
                }
            }
        };
        
        let model_config = match model.as_str() {
            "seedream" => config.seedream,
            "banana_pro" => config.banana_pro,
            _ => return Err("不支持的模型".to_string()),
        };
        
        if model_config.api_key.is_empty() {
            return Err("API Key未配置".to_string());
        }
        
        (model_config, false)
    };
    
    if model_config.api_key.is_empty() {
        return Err("API Key未配置".to_string());
    }
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;
    
    let test_url = format!("{}/v1/models", model_config.base_url);
    
    let response = client
        .get(&test_url)
        .header("Authorization", format!("Bearer {}", model_config.api_key))
        .send()
        .await
        .map_err(|e| format!("连接失败: {}", e))?;
    
    if response.status().is_success() || response.status().as_u16() == 401 {
        Ok(true)
    } else {
        Err(format!("API返回错误: {}", response.status()))
    }
}

pub fn load_config_from_file() {
    let config_path = get_config_path();
    if config_path.exists() {
        if let Ok(encrypted) = fs::read(&config_path) {
            if let Ok(key) = get_or_create_key() {
                if let Ok(decrypted) = decrypt_data(&encrypted, &key) {
                    if let Ok(json) = String::from_utf8(decrypted) {
                        if let Ok(config) = serde_json::from_str::<ApiConfig>(&json) {
                            let mut api_config = API_CONFIG.lock().unwrap();
                            *api_config = Some(config);
                        }
                    }
                }
            }
        }
    }
    
    let gen_config_path = get_generation_config_path();
    if gen_config_path.exists() {
        if let Ok(json) = fs::read_to_string(&gen_config_path) {
            if let Ok(config) = serde_json::from_str::<GenerationConfig>(&json) {
                let mut gen_config = GENERATION_CONFIG.lock().unwrap();
                *gen_config = Some(config);
            }
        }
    }
}
