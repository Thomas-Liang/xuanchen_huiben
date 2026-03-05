use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

pub fn get_app_data_dir() -> PathBuf {
    let app_data = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());

    let data_dir = PathBuf::from(app_data).join("xuanchen-huiben");

    if !data_dir.exists() {
        let _ = fs::create_dir_all(&data_dir);
    }

    data_dir
}

pub fn get_storage_dir(sub_dir: &str) -> PathBuf {
    let storage_dir = get_app_data_dir().join(sub_dir);

    if !storage_dir.exists() {
        let _ = fs::create_dir_all(&storage_dir);
    }

    storage_dir
}

pub fn get_current_timestamp() -> String {
    Utc::now().format("%Y%m%d_%H%M%S").to_string()
}

pub fn get_current_datetime() -> String {
    Utc::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationHistory {
    pub id: String,
    pub prompt: String,
    pub model: String,
    pub params: serde_json::Value,
    pub images: Vec<String>,
    pub characters: Vec<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationHistoryList {
    pub total: usize,
    pub items: Vec<GenerationHistory>,
}

impl GenerationHistory {
    pub fn new(prompt: String, model: String, params: serde_json::Value) -> Self {
        let now = get_current_datetime();
        Self {
            id: format!("gen_{}", get_current_timestamp()),
            prompt,
            model,
            params,
            images: vec![],
            characters: vec![],
            status: "pending".to_string(),
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub reference_image_path: Option<String>,
    pub image_type: String,
    pub tags: Vec<String>,
    pub variables: Vec<TemplateVariable>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateVariable {
    pub name: String,
    pub description: String,
    pub default_value: Option<String>,
}

impl CharacterTemplate {
    pub fn new(name: String, description: String, image_type: String) -> Self {
        let now = get_current_datetime();
        Self {
            id: format!("tpl_{}", get_current_timestamp()),
            name,
            description,
            reference_image_path: None,
            image_type,
            tags: vec![],
            variables: vec![],
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub language: String,
    pub api_config: ApiConfig,
    pub generation_config: GenerationConfig,
    pub ui_config: UiConfig,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            language: "zh-CN".to_string(),
            api_config: ApiConfig::default(),
            generation_config: GenerationConfig::default(),
            ui_config: UiConfig::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiConfig {
    pub seedream: ApiProvider,
    pub banana_pro: ApiProvider,
}

impl Default for ApiConfig {
    fn default() -> Self {
        Self {
            seedream: ApiProvider::default(),
            banana_pro: ApiProvider::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiProvider {
    pub base_url: String,
    pub api_key: String,
    pub enabled: bool,
}

impl Default for ApiProvider {
    fn default() -> Self {
        Self {
            base_url: String::new(),
            api_key: String::new(),
            enabled: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationConfig {
    pub default_model: String,
    pub default_size: String,
    pub default_quality: String,
    pub watermark: bool,
    pub concurrent_limit: u32,
}

impl Default for GenerationConfig {
    fn default() -> Self {
        Self {
            default_model: "seedream".to_string(),
            default_size: "1024x1024".to_string(),
            default_quality: "standard".to_string(),
            watermark: false,
            concurrent_limit: 3,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiConfig {
    pub sidebar_collapsed: bool,
    pub show_tutorial: bool,
    pub animation_enabled: bool,
}

impl Default for UiConfig {
    fn default() -> Self {
        Self {
            sidebar_collapsed: false,
            show_tutorial: true,
            animation_enabled: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Database {
    pub version: String,
    pub created_at: String,
    pub updated_at: String,
    pub history: GenerationHistoryList,
    pub character_bindings: Vec<CharacterBindingData>,
    pub templates: Vec<CharacterTemplate>,
    pub settings: AppSettings,
}

impl Default for Database {
    fn default() -> Self {
        let now = get_current_datetime();
        Self {
            version: "1.0.0".to_string(),
            created_at: now.clone(),
            updated_at: now,
            history: GenerationHistoryList {
                total: 0,
                items: vec![],
            },
            character_bindings: vec![],
            templates: vec![],
            settings: AppSettings::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterBindingData {
    pub id: String,
    pub character_name: String,
    pub reference_image_path: Option<String>,
    pub image_type: String,
    pub tags: Vec<String>,
    pub bound: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl CharacterBindingData {
    pub fn new(character_name: String, image_type: String) -> Self {
        let now = get_current_datetime();
        Self {
            id: format!("cb_{}", get_current_timestamp()),
            character_name,
            reference_image_path: None,
            image_type,
            tags: vec![],
            bound: false,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

pub struct Storage;

impl Storage {
    pub fn init() -> Result<(), String> {
        let app_dir = get_app_data_dir();

        let dirs = vec![
            "reference_images",
            "generated_images",
            "templates",
            "exports",
            "backups",
        ];

        for dir in dirs {
            let path = app_dir.join(dir);
            if !path.exists() {
                fs::create_dir_all(&path).map_err(|e| format!("创建目录失败: {}", e))?;
            }
        }

        let db_path = app_dir.join("database.json");
        if !db_path.exists() {
            let db = Database::default();
            let json = serde_json::to_string_pretty(&db)
                .map_err(|e| format!("序列化数据库失败: {}", e))?;
            fs::write(&db_path, json).map_err(|e| format!("写入数据库文件失败: {}", e))?;
        }

        Ok(())
    }

    pub fn load_database() -> Result<Database, String> {
        let db_path = get_app_data_dir().join("database.json");

        if !db_path.exists() {
            return Ok(Database::default());
        }

        let content =
            fs::read_to_string(&db_path).map_err(|e| format!("读取数据库文件失败: {}", e))?;

        let db: Database =
            serde_json::from_str(&content).map_err(|e| format!("解析数据库文件失败: {}", e))?;

        Ok(db)
    }

    pub fn save_database(db: &Database) -> Result<(), String> {
        let db_path = get_app_data_dir().join("database.json");

        let mut db = db.clone();
        db.updated_at = get_current_datetime();

        let json =
            serde_json::to_string_pretty(&db).map_err(|e| format!("序列化数据库失败: {}", e))?;

        fs::write(&db_path, json).map_err(|e| format!("写入数据库文件失败: {}", e))?;

        Ok(())
    }

    pub fn get_database_path() -> PathBuf {
        get_app_data_dir().join("database.json")
    }

    pub fn backup_database() -> Result<String, String> {
        let db_path = get_app_data_dir().join("database.json");
        let backup_dir = get_storage_dir("backups");

        let timestamp = get_current_timestamp();
        let backup_path = backup_dir.join(format!("database_{}.json", timestamp));

        if db_path.exists() {
            fs::copy(&db_path, &backup_path).map_err(|e| format!("备份失败: {}", e))?;
        }

        Ok(backup_path.to_string_lossy().to_string())
    }

    pub fn restore_database(backup_path: &str) -> Result<(), String> {
        let db_path = get_app_data_dir().join("database.json");

        fs::copy(backup_path, &db_path).map_err(|e| format!("恢复失败: {}", e))?;

        Ok(())
    }

    pub fn get_storage_info() -> Result<StorageInfo, String> {
        let app_dir = get_app_data_dir();

        let mut total_size: u64 = 0;
        let mut file_count: u32 = 0;

        fn walk_dir(path: &PathBuf, size: &mut u64, count: &mut u32) {
            if let Ok(entries) = fs::read_dir(path) {
                for entry in entries.flatten() {
                    if let Ok(metadata) = entry.metadata() {
                        if metadata.is_file() {
                            *size += metadata.len();
                            *count += 1;
                        } else if metadata.is_dir() {
                            walk_dir(&entry.path(), size, count);
                        }
                    }
                }
            }
        }

        walk_dir(&app_dir, &mut total_size, &mut file_count);

        Ok(StorageInfo {
            total_size,
            file_count,
            path: app_dir.to_string_lossy().to_string(),
        })
    }
}

// ==================== History CRUD ====================

pub fn add_history(history: GenerationHistory) -> Result<GenerationHistory, String> {
    let mut db = Storage::load_database()?;
    db.history.items.insert(0, history.clone());
    db.history.total = db.history.items.len();
    Storage::save_database(&db)?;
    Ok(history)
}

pub fn get_history(page: usize, page_size: usize) -> Result<GenerationHistoryList, String> {
    let db = Storage::load_database()?;
    let start = page * page_size;
    let end = (start + page_size).min(db.history.items.len());

    let items = if start < db.history.items.len() {
        db.history.items[start..end].to_vec()
    } else {
        vec![]
    };

    Ok(GenerationHistoryList {
        total: db.history.total,
        items,
    })
}

pub fn get_history_by_id(id: &str) -> Result<Option<GenerationHistory>, String> {
    let db = Storage::load_database()?;
    Ok(db.history.items.iter().find(|h| h.id == id).cloned())
}

pub fn update_history(id: &str, history: GenerationHistory) -> Result<GenerationHistory, String> {
    let mut db = Storage::load_database()?;
    if let Some(idx) = db.history.items.iter().position(|h| h.id == id) {
        db.history.items[idx] = history.clone();
        Storage::save_database(&db)?;
        Ok(history)
    } else {
        Err("历史记录不存在".to_string())
    }
}

pub fn delete_history(id: &str) -> Result<(), String> {
    let mut db = Storage::load_database()?;
    let original_len = db.history.items.len();
    db.history.items.retain(|h| h.id != id);
    if db.history.items.len() < original_len {
        db.history.total = db.history.items.len();
        Storage::save_database(&db)?;
        Ok(())
    } else {
        Err("历史记录不存在".to_string())
    }
}

pub fn clear_history() -> Result<(), String> {
    let mut db = Storage::load_database()?;
    db.history.items.clear();
    db.history.total = 0;
    Storage::save_database(&db)?;
    Ok(())
}

// ==================== Character Binding CRUD ====================

pub fn add_character_binding(
    binding: CharacterBindingData,
) -> Result<CharacterBindingData, String> {
    let mut db = Storage::load_database()?;
    db.character_bindings.push(binding.clone());
    Storage::save_database(&db)?;
    Ok(binding)
}

pub fn get_all_character_bindings() -> Result<Vec<CharacterBindingData>, String> {
    let db = Storage::load_database()?;
    Ok(db.character_bindings)
}

pub fn get_character_binding_by_id(id: &str) -> Result<Option<CharacterBindingData>, String> {
    let db = Storage::load_database()?;
    Ok(db.character_bindings.iter().find(|b| b.id == id).cloned())
}

pub fn get_character_binding_by_name(name: &str) -> Result<Option<CharacterBindingData>, String> {
    let db = Storage::load_database()?;
    Ok(db
        .character_bindings
        .iter()
        .find(|b| b.character_name == name)
        .cloned())
}

pub fn update_character_binding(
    id: &str,
    binding: CharacterBindingData,
) -> Result<CharacterBindingData, String> {
    let mut db = Storage::load_database()?;
    if let Some(idx) = db.character_bindings.iter().position(|b| b.id == id) {
        db.character_bindings[idx] = binding.clone();
        Storage::save_database(&db)?;
        Ok(binding)
    } else {
        Err("角色绑定不存在".to_string())
    }
}

pub fn delete_character_binding(id: &str) -> Result<(), String> {
    let mut db = Storage::load_database()?;
    let original_len = db.character_bindings.len();
    db.character_bindings.retain(|b| b.id != id);
    if db.character_bindings.len() < original_len {
        Storage::save_database(&db)?;
        Ok(())
    } else {
        Err("角色绑定不存在".to_string())
    }
}

// ==================== Template CRUD ====================

pub fn add_template(template: CharacterTemplate) -> Result<CharacterTemplate, String> {
    let mut db = Storage::load_database()?;
    db.templates.push(template.clone());
    Storage::save_database(&db)?;
    Ok(template)
}

pub fn get_all_templates() -> Result<Vec<CharacterTemplate>, String> {
    let db = Storage::load_database()?;
    Ok(db.templates)
}

pub fn get_template_by_id(id: &str) -> Result<Option<CharacterTemplate>, String> {
    let db = Storage::load_database()?;
    Ok(db.templates.iter().find(|t| t.id == id).cloned())
}

pub fn update_template(id: &str, template: CharacterTemplate) -> Result<CharacterTemplate, String> {
    let mut db = Storage::load_database()?;
    if let Some(idx) = db.templates.iter().position(|t| t.id == id) {
        db.templates[idx] = template.clone();
        Storage::save_database(&db)?;
        Ok(template)
    } else {
        Err("模板不存在".to_string())
    }
}

pub fn delete_template(id: &str) -> Result<(), String> {
    let mut db = Storage::load_database()?;
    let original_len = db.templates.len();
    db.templates.retain(|t| t.id != id);
    if db.templates.len() < original_len {
        Storage::save_database(&db)?;
        Ok(())
    } else {
        Err("模板不存在".to_string())
    }
}

// ==================== Settings CRUD ====================

pub fn get_settings() -> Result<AppSettings, String> {
    let db = Storage::load_database()?;
    Ok(db.settings)
}

pub fn save_settings(settings: AppSettings) -> Result<AppSettings, String> {
    let mut db = Storage::load_database()?;
    db.settings = settings.clone();
    Storage::save_database(&db)?;
    Ok(settings)
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StorageInfo {
    pub total_size: u64,
    pub file_count: u32,
    pub path: String,
}

pub fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}
