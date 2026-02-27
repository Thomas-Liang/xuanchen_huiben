use base64::{engine::general_purpose, Engine as _};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

pub static CHARACTER_BINDINGS: Lazy<std::sync::Mutex<HashMap<String, CharacterBinding>>> =
    Lazy::new(|| std::sync::Mutex::new(HashMap::new()));

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterBinding {
    #[serde(alias = "characterName")]
    pub character_name: String,
    #[serde(alias = "referenceImagePath")]
    pub reference_image_path: Option<String>,
    #[serde(alias = "imageType")]
    pub image_type: String,
    #[serde(alias = "createdAt")]
    pub created_at: String,
    pub bound: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterBindingResult {
    pub success: bool,
    pub binding: Option<CharacterBinding>,
    pub error: Option<String>,
}

fn get_storage_dir() -> PathBuf {
    let app_data = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());

    let storage_dir = PathBuf::from(app_data)
        .join("xuanchen-huiben")
        .join("reference_images");

    if !storage_dir.exists() {
        let _ = fs::create_dir_all(&storage_dir);
    }

    storage_dir
}

#[tauri::command]
pub fn save_reference_image(
    character_name: String,
    image_data: String,
    image_type: String,
) -> Result<CharacterBinding, String> {
    if character_name.is_empty() {
        return Err("角色名称不能为空".to_string());
    }

    let storage_dir = get_storage_dir();
    let file_name = format!("{}_{}.png", character_name, chrono_timestamp());
    let file_path = storage_dir.join(&file_name);

    let image_bytes = if image_data.contains(',') {
        let parts: Vec<&str> = image_data.split(',').collect();
        if parts.len() != 2 {
            return Err("无效的图片数据格式".to_string());
        }
        general_purpose::STANDARD
            .decode(parts[1])
            .map_err(|e| format!("图片解码失败: {}", e))?
    } else {
        general_purpose::STANDARD
            .decode(&image_data)
            .map_err(|e| format!("图片解码失败: {}", e))?
    };

    fs::write(&file_path, &image_bytes).map_err(|e| format!("保存图片失败: {}", e))?;

    let binding = CharacterBinding {
        character_name: character_name.clone(),
        reference_image_path: Some(file_path.to_string_lossy().to_string()),
        image_type,
        created_at: chrono_now(),
        bound: true,
    };

    let mut bindings = CHARACTER_BINDINGS.lock().map_err(|e| e.to_string())?;
    bindings.insert(character_name, binding.clone());

    save_bindings_to_file(&bindings)?;

    Ok(binding)
}

#[tauri::command]
pub fn bind_character_reference(
    character_name: String,
    reference_image_path: String,
    image_type: String,
) -> Result<CharacterBinding, String> {
    if character_name.is_empty() {
        return Err("角色名称不能为空".to_string());
    }

    let path = PathBuf::from(&reference_image_path);
    if !path.exists() {
        return Err("参考图文件不存在".to_string());
    }

    let binding = CharacterBinding {
        character_name: character_name.clone(),
        reference_image_path: Some(reference_image_path),
        image_type,
        created_at: chrono_now(),
        bound: true,
    };

    let mut bindings = CHARACTER_BINDINGS.lock().map_err(|e| e.to_string())?;
    bindings.insert(character_name, binding.clone());

    save_bindings_to_file(&bindings)?;

    Ok(binding)
}

#[tauri::command]
pub fn unbind_character(character_name: String) -> Result<bool, String> {
    let mut bindings = CHARACTER_BINDINGS.lock().map_err(|e| e.to_string())?;

    if let Some(binding) = bindings.get_mut(&character_name) {
        binding.bound = false;
        binding.reference_image_path = None;
        save_bindings_to_file(&bindings)?;
        return Ok(true);
    }

    Ok(false)
}

#[tauri::command]
pub fn get_character_binding(character_name: String) -> Option<CharacterBinding> {
    let bindings = CHARACTER_BINDINGS.lock().ok()?;
    bindings.get(&character_name).cloned()
}

#[tauri::command]
pub fn get_all_bindings() -> Vec<CharacterBinding> {
    let bindings = CHARACTER_BINDINGS.lock().unwrap();
    bindings.values().cloned().collect()
}

#[tauri::command]
pub fn get_bindings_for_prompt(characters: Vec<String>) -> Vec<CharacterBinding> {
    let bindings = CHARACTER_BINDINGS.lock().unwrap();
    characters
        .iter()
        .filter_map(|name| bindings.get(name).cloned())
        .collect()
}

#[tauri::command]
pub fn delete_reference_image(character_name: String) -> Result<bool, String> {
    let mut bindings = CHARACTER_BINDINGS.lock().map_err(|e| e.to_string())?;

    if let Some(binding) = bindings.get(&character_name) {
        if let Some(ref path) = binding.reference_image_path {
            let _ = fs::remove_file(path);
        }
    }

    bindings.remove(&character_name);
    save_bindings_to_file(&bindings)?;

    Ok(true)
}

fn chrono_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", duration.as_millis())
}

fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", duration.as_secs())
}

fn save_bindings_to_file(bindings: &HashMap<String, CharacterBinding>) -> Result<(), String> {
    let app_data = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());

    let config_dir = PathBuf::from(app_data)
        .join("xuanchen-huiben")
        .join("config");

    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }

    let config_path = config_dir.join("character_bindings.json");
    let json = serde_json::to_string_pretty(bindings).map_err(|e| e.to_string())?;
    fs::write(config_path, json).map_err(|e| e.to_string())?;

    Ok(())
}

pub fn load_bindings_from_file() -> Result<(), String> {
    let app_data = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());

    let config_path = PathBuf::from(app_data)
        .join("xuanchen-huiben")
        .join("config")
        .join("character_bindings.json");

    if !config_path.exists() {
        return Ok(());
    }

    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;

    let loaded: HashMap<String, CharacterBinding> =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let mut bindings = CHARACTER_BINDINGS.lock().map_err(|e| e.to_string())?;
    *bindings = loaded;

    Ok(())
}
