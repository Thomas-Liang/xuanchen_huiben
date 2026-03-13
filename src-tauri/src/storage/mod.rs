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
    Utc::now().to_rfc3339()
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
    pub source_history_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct GenerationHistoryList {
    pub total: usize,
    pub items: Vec<GenerationHistory>,
}

impl Default for GenerationHistoryList {
    fn default() -> Self {
        Self {
            total: 0,
            items: vec![],
        }
    }
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
            source_history_id: None,
            created_at: now.clone(),
            updated_at: now,
        }
    }

    pub fn new_with_source(
        prompt: String,
        model: String,
        params: serde_json::Value,
        source_history_id: Option<String>,
    ) -> Self {
        let now = get_current_datetime();
        Self {
            id: format!("gen_{}", get_current_timestamp()),
            prompt,
            model,
            params,
            images: vec![],
            characters: vec![],
            status: "pending".to_string(),
            source_history_id,
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
#[serde(default)]
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
#[serde(default)]
pub struct ApiConfig {
    pub seedream: ApiProvider,
    pub banana_pro: ApiProvider,
    pub webhook: WebhookConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct WebhookConfig {
    pub enabled: bool,
    pub url: String,
    pub secret: String,
    pub retry_count: u32,
}

impl Default for WebhookConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            url: String::new(),
            secret: String::new(),
            retry_count: 3,
        }
    }
}

impl Default for ApiConfig {
    fn default() -> Self {
        Self {
            seedream: ApiProvider::default(),
            banana_pro: ApiProvider::default(),
            webhook: WebhookConfig::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
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
#[serde(default)]
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
#[serde(default)]
pub struct UiConfig {
    pub sidebar_collapsed: bool,
    pub show_tutorial: bool,
    pub animation_enabled: bool,
    pub notification_enabled: bool,
}

impl Default for UiConfig {
    fn default() -> Self {
        Self {
            sidebar_collapsed: false,
            show_tutorial: true,
            animation_enabled: true,
            notification_enabled: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Database {
    pub version: String,
    pub created_at: String,
    pub updated_at: String,
    pub history: GenerationHistoryList,
    pub character_bindings: Vec<CharacterBindingData>,
    pub templates: Vec<CharacterTemplate>,
    pub prompt_templates: Vec<PromptTemplate>,
    pub prompt_histories: Vec<PromptHistoryItem>,
    pub saved_filters: Vec<SavedFilter>,
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
            prompt_templates: get_builtin_prompt_templates(),
            prompt_histories: vec![],
            saved_filters: vec![],
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

        let mut db: Database =
            serde_json::from_str(&content).map_err(|e| format!("解析数据库文件失败: {}", e))?;

        // Backward-compatible migration: seed built-in prompt templates for older databases.
        if db.prompt_templates.is_empty() {
            db.prompt_templates = get_builtin_prompt_templates();
            let _ = Self::save_database(&db);
        }

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

#[derive(Debug, Clone, serde::Deserialize)]
pub struct HistoryFilter {
    pub model: Option<String>,
    pub prompt_keyword: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub character: Option<String>,
    pub width_min: Option<u32>,
    pub width_max: Option<u32>,
    pub height_min: Option<u32>,
    pub height_max: Option<u32>,
    pub quality: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedFilter {
    pub id: String,
    pub name: String,
    pub model: Option<String>,
    pub prompt_keyword: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub character: Option<String>,
    pub width_min: Option<u32>,
    pub width_max: Option<u32>,
    pub height_min: Option<u32>,
    pub height_max: Option<u32>,
    pub quality: Option<String>,
    pub created_at: String,
}

pub fn get_history(
    page: usize,
    page_size: usize,
    filter: Option<HistoryFilter>,
) -> Result<GenerationHistoryList, String> {
    let db = Storage::load_database()?;

    let mut items = db.history.items.clone();

    if let Some(f) = filter {
        if let Some(model) = f.model {
            if !model.is_empty() {
                items.retain(|h| h.model == model);
            }
        }

        if let Some(keyword) = f.prompt_keyword {
            if !keyword.is_empty() {
                items.retain(|h| h.prompt.to_lowercase().contains(&keyword.to_lowercase()));
            }
        }

        if let Some(start) = f.start_date {
            if !start.is_empty() {
                if let Ok(start_dt) = chrono::DateTime::parse_from_rfc3339(&start) {
                    items.retain(|h| {
                        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&h.created_at) {
                            dt >= start_dt
                        } else {
                            // Fallback for old format
                            if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(
                                &h.created_at,
                                "%Y-%m-%d %H:%M:%S",
                            ) {
                                dt.and_utc() >= start_dt.with_timezone(&chrono::Utc)
                            } else {
                                false
                            }
                        }
                    });
                }
            }
        }

        if let Some(end) = f.end_date {
            if !end.is_empty() {
                if let Ok(end_dt) = chrono::DateTime::parse_from_rfc3339(&end) {
                    items.retain(|h| {
                        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&h.created_at) {
                            dt <= end_dt
                        } else {
                            // Fallback for old format
                            if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(
                                &h.created_at,
                                "%Y-%m-%d %H:%M:%S",
                            ) {
                                dt.and_utc() <= end_dt.with_timezone(&chrono::Utc)
                            } else {
                                false
                            }
                        }
                    });
                }
            }
        }

        if let Some(character) = f.character {
            if !character.is_empty() {
                items.retain(|h| {
                    h.characters
                        .iter()
                        .any(|c| c.to_lowercase().contains(&character.to_lowercase()))
                });
            }
        }

        if let Some(quality) = &f.quality {
            if !quality.is_empty() {
                items.retain(|h| {
                    let hist_quality = h
                        .params
                        .get("quality")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    hist_quality == *quality
                });
            }
        }

        if let (Some(w_min), Some(w_max)) = (f.width_min, f.width_max) {
            items.retain(|h| {
                let w = h
                    .params
                    .get("width")
                    .and_then(|v| v.as_u64())
                    .map(|v| v as u32)
                    .unwrap_or(0);
                w >= w_min && w <= w_max
            });
        }

        if let (Some(h_min), Some(h_max)) = (f.height_min, f.height_max) {
            items.retain(|h| {
                let height = h
                    .params
                    .get("height")
                    .and_then(|v| v.as_u64())
                    .map(|v| v as u32)
                    .unwrap_or(0);
                height >= h_min && height <= h_max
            });
        }
    }

    let total = items.len();
    let start = page * page_size;
    let end = (start + page_size).min(items.len());

    let items = if start < items.len() {
        items[start..end].to_vec()
    } else {
        vec![]
    };

    Ok(GenerationHistoryList { total, items })
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

// ==================== Prompt Template (US-13, US-25) ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptTemplate {
    pub id: String,
    pub name: String,
    pub content: String,
    pub category: String,
    #[serde(default)]
    pub group: String,
    pub is_favorite: bool,
    pub is_builtin: bool,
    pub variables: Vec<String>,
    pub usage_count: u32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptHistoryItem {
    pub id: String,
    pub prompt: String,
    pub use_count: u32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptTemplatePayload {
    pub name: String,
    pub content: String,
    pub category: String,
    pub group: Option<String>,
    pub is_favorite: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub imported: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
}

impl PromptTemplate {
    pub fn new(
        name: String,
        content: String,
        category: String,
        group: Option<String>,
        is_favorite: Option<bool>,
    ) -> Self {
        let now = get_current_datetime();
        let variables = extract_variables(&content);
        Self {
            id: format!("ptpl_{}", get_current_timestamp()),
            name,
            content,
            category,
            group: group.unwrap_or_else(|| "默认".to_string()),
            is_favorite: is_favorite.unwrap_or(false),
            is_builtin: false,
            variables,
            usage_count: 0,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

fn get_builtin_prompt_templates() -> Vec<PromptTemplate> {
    let now = get_current_datetime();

    let t1 = PromptTemplate {
        id: "ptpl_builtin_storybook".to_string(),
        name: "儿童绘本场景模板".to_string(),
        content: "儿童绘本风格，柔和光线，温暖色彩，在{地点}，{人物}正在{动作}，画面干净，构图清晰，适合3-8岁阅读".to_string(),
        category: "通用".to_string(),
        group: "内置".to_string(),
        is_favorite: false,
        is_builtin: true,
        variables: vec!["地点".to_string(), "人物".to_string(), "动作".to_string()],
        usage_count: 0,
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    let t2 = PromptTemplate {
        id: "ptpl_builtin_guofeng".to_string(),
        name: "国风插画模板".to_string(),
        content: "国风插画，细腻笔触，留白构图，{人物}身处{场景}，动作是{动作}，服饰与环境统一，画面有诗意氛围".to_string(),
        category: "风格".to_string(),
        group: "内置".to_string(),
        is_favorite: false,
        is_builtin: true,
        variables: vec!["人物".to_string(), "场景".to_string(), "动作".to_string()],
        usage_count: 0,
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    let t3 = PromptTemplate {
        id: "ptpl_builtin_cinematic".to_string(),
        name: "电影感写实模板".to_string(),
        content: "电影感写实风格，镜头语言明确，{人物}在{地点}执行{动作}，景深自然，光影对比清楚，细节真实".to_string(),
        category: "场景".to_string(),
        group: "内置".to_string(),
        is_favorite: false,
        is_builtin: true,
        variables: vec!["人物".to_string(), "地点".to_string(), "动作".to_string()],
        usage_count: 0,
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    vec![t1, t2, t3]
}

fn extract_variables(content: &str) -> Vec<String> {
    let mut vars = Vec::new();
    let mut in_var = false;
    let mut current_var = String::new();

    for ch in content.chars() {
        if ch == '{' {
            in_var = true;
            current_var.clear();
        } else if ch == '}' && in_var {
            in_var = false;
            if !current_var.is_empty() && !vars.contains(&current_var) {
                vars.push(current_var.clone());
            }
            current_var.clear();
        } else if in_var {
            current_var.push(ch);
        }
    }
    vars
}

pub fn add_prompt_template(payload: PromptTemplatePayload) -> Result<PromptTemplate, String> {
    let template = PromptTemplate::new(
        payload.name,
        payload.content,
        payload.category,
        payload.group,
        payload.is_favorite,
    );
    let mut db = Storage::load_database()?;
    db.prompt_templates.push(template.clone());
    Storage::save_database(&db)?;
    Ok(template)
}

pub fn get_all_prompt_templates() -> Result<Vec<PromptTemplate>, String> {
    let db = Storage::load_database()?;
    Ok(db.prompt_templates)
}

pub fn get_prompt_template_by_id(id: &str) -> Result<Option<PromptTemplate>, String> {
    let db = Storage::load_database()?;
    Ok(db.prompt_templates.iter().find(|t| t.id == id).cloned())
}

pub fn update_prompt_template(
    id: &str,
    payload: PromptTemplatePayload,
) -> Result<PromptTemplate, String> {
    let mut db = Storage::load_database()?;
    if let Some(idx) = db.prompt_templates.iter().position(|t| t.id == id) {
        let existing = &db.prompt_templates[idx];
        if existing.is_builtin {
            return Err("内置模板不可修改".to_string());
        }
        let mut template = existing.clone();
        template.name = payload.name;
        template.content = payload.content;
        template.category = payload.category;
        template.variables = extract_variables(&template.content);
        template.updated_at = get_current_datetime();
        db.prompt_templates[idx] = template.clone();
        Storage::save_database(&db)?;
        Ok(template)
    } else {
        Err("模板不存在".to_string())
    }
}

pub fn update_prompt_template_favorite(
    id: &str,
    is_favorite: bool,
) -> Result<PromptTemplate, String> {
    let mut db = Storage::load_database()?;
    if let Some(idx) = db.prompt_templates.iter().position(|t| t.id == id) {
        let mut template = db.prompt_templates[idx].clone();
        template.is_favorite = is_favorite;
        template.updated_at = get_current_datetime();
        db.prompt_templates[idx] = template.clone();
        Storage::save_database(&db)?;
        Ok(template)
    } else {
        Err("模板不存在".to_string())
    }
}

pub fn update_prompt_template_group(id: &str, group: &str) -> Result<PromptTemplate, String> {
    let mut db = Storage::load_database()?;
    if let Some(idx) = db.prompt_templates.iter().position(|t| t.id == id) {
        let existing = &db.prompt_templates[idx];
        if existing.is_builtin {
            return Err("内置模板不可修改分组".to_string());
        }
        let mut template = existing.clone();
        template.group = group.to_string();
        template.updated_at = get_current_datetime();
        db.prompt_templates[idx] = template.clone();
        Storage::save_database(&db)?;
        Ok(template)
    } else {
        Err("模板不存在".to_string())
    }
}

pub fn delete_prompt_template(id: &str) -> Result<(), String> {
    let mut db = Storage::load_database()?;
    if let Some(template) = db.prompt_templates.iter().find(|t| t.id == id) {
        if template.is_builtin {
            return Err("内置模板不可删除".to_string());
        }
    }
    let original_len = db.prompt_templates.len();
    db.prompt_templates.retain(|t| t.id != id);
    if db.prompt_templates.len() < original_len {
        Storage::save_database(&db)?;
        Ok(())
    } else {
        Err("模板不存在".to_string())
    }
}

pub fn increment_template_usage(id: &str) -> Result<(), String> {
    let mut db = Storage::load_database()?;
    if let Some(template) = db.prompt_templates.iter_mut().find(|t| t.id == id) {
        template.usage_count += 1;
        Storage::save_database(&db)?;
    }
    Ok(())
}

pub fn import_prompt_templates(
    templates: Vec<PromptTemplate>,
    strategy: &str,
) -> Result<ImportResult, String> {
    let mut db = Storage::load_database()?;
    let mut imported = 0;
    let mut skipped = 0;
    let mut errors = Vec::new();

    for mut template in templates {
        let existing = db.prompt_templates.iter().find(|t| t.id == template.id);

        match strategy {
            "skip" => {
                if existing.is_some() {
                    skipped += 1;
                    continue;
                }
            }
            "overwrite" => {
                if let Some(idx) = db.prompt_templates.iter().position(|t| t.id == template.id) {
                    template.is_builtin = db.prompt_templates[idx].is_builtin;
                    template.usage_count = db.prompt_templates[idx].usage_count;
                    template.created_at = db.prompt_templates[idx].created_at.clone();
                    db.prompt_templates[idx] = template.clone();
                    imported += 1;
                    continue;
                }
            }
            "rename" => {
                if existing.is_some() {
                    template.id = format!("{}_{}", template.id, get_current_timestamp());
                }
            }
            _ => {
                errors.push(format!("未知策略: {}", strategy));
                continue;
            }
        }

        template.is_builtin = false;
        template.id = format!("ptpl_{}", get_current_timestamp());
        db.prompt_templates.push(template);
        imported += 1;
    }

    Storage::save_database(&db)?;
    Ok(ImportResult {
        imported,
        skipped,
        errors,
    })
}

pub fn add_prompt_history(prompt: String) -> Result<PromptHistoryItem, String> {
    let normalized_prompt = prompt.trim().to_string();
    if normalized_prompt.is_empty() {
        return Err("提示词不能为空".to_string());
    }

    let mut db = Storage::load_database()?;
    let now = get_current_datetime();

    if let Some(existing) = db
        .prompt_histories
        .iter_mut()
        .find(|h| h.prompt.trim().eq_ignore_ascii_case(&normalized_prompt))
    {
        existing.prompt = normalized_prompt.clone();
        existing.use_count += 1;
        existing.updated_at = now.clone();
        let updated = existing.clone();
        db.prompt_histories
            .sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        if db.prompt_histories.len() > 50 {
            db.prompt_histories.truncate(50);
        }
        Storage::save_database(&db)?;
        return Ok(updated);
    }

    let item = PromptHistoryItem {
        id: format!("ph_{}", get_current_timestamp()),
        prompt: normalized_prompt,
        use_count: 1,
        created_at: now.clone(),
        updated_at: now,
    };

    db.prompt_histories.push(item.clone());
    db.prompt_histories
        .sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    if db.prompt_histories.len() > 50 {
        db.prompt_histories.truncate(50);
    }
    Storage::save_database(&db)?;
    Ok(item)
}

pub fn get_prompt_history(limit: Option<usize>) -> Result<Vec<PromptHistoryItem>, String> {
    let db = Storage::load_database()?;
    let mut items = db.prompt_histories;
    items.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    if let Some(l) = limit {
        items.truncate(l);
    }
    Ok(items)
}

pub fn delete_prompt_history(id: &str) -> Result<(), String> {
    let mut db = Storage::load_database()?;
    let original_len = db.prompt_histories.len();
    db.prompt_histories.retain(|h| h.id != id);
    if db.prompt_histories.len() < original_len {
        Storage::save_database(&db)?;
        Ok(())
    } else {
        Err("提示词历史不存在".to_string())
    }
}

pub fn clear_prompt_history() -> Result<(), String> {
    let mut db = Storage::load_database()?;
    db.prompt_histories.clear();
    Storage::save_database(&db)?;
    Ok(())
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

pub fn add_saved_filter(filter: SavedFilter) -> Result<SavedFilter, String> {
    let mut db = Storage::load_database()?;
    let new_filter = SavedFilter {
        id: filter.id,
        name: filter.name,
        model: filter.model,
        prompt_keyword: filter.prompt_keyword,
        start_date: filter.start_date,
        end_date: filter.end_date,
        character: filter.character,
        width_min: filter.width_min,
        width_max: filter.width_max,
        height_min: filter.height_min,
        height_max: filter.height_max,
        quality: filter.quality,
        created_at: get_current_datetime(),
    };
    db.saved_filters.push(new_filter.clone());
    Storage::save_database(&db)?;
    Ok(new_filter)
}

pub fn get_saved_filters() -> Result<Vec<SavedFilter>, String> {
    let db = Storage::load_database()?;
    Ok(db.saved_filters)
}

pub fn delete_saved_filter(id: &str) -> Result<bool, String> {
    let mut db = Storage::load_database()?;
    let len_before = db.saved_filters.len();
    db.saved_filters.retain(|f| f.id != id);
    if db.saved_filters.len() < len_before {
        Storage::save_database(&db)?;
        Ok(true)
    } else {
        Ok(false)
    }
}

// ==================== Statistics Models ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationStats {
    pub total_generations: u32,
    pub successful_generations: u32,
    pub failed_generations: u32,
    pub success_rate: f64,
    pub model_usage: Vec<ModelUsage>,
    pub daily_stats: Vec<DailyStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelUsage {
    pub model: String,
    pub count: u32,
    pub success_count: u32,
    pub failure_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyStats {
    pub date: String,
    pub total: u32,
    pub success: u32,
    pub failed: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiCallLog {
    pub id: String,
    pub model: String,
    pub endpoint: String,
    pub status: String,
    pub response_time_ms: u64,
    pub error_message: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiStats {
    pub total_calls: u32,
    pub successful_calls: u32,
    pub failed_calls: u32,
    pub avg_response_time_ms: f64,
    pub calls_by_model: Vec<ModelApiStats>,
    pub recent_logs: Vec<ApiCallLog>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelApiStats {
    pub model: String,
    pub call_count: u32,
    pub avg_response_time_ms: f64,
    pub success_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateUsage {
    pub template_id: String,
    pub template_name: String,
    pub usage_count: u32,
    pub is_favorite: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateStats {
    pub total_usages: u32,
    pub template_usage: Vec<TemplateUsage>,
    pub favorite_count: u32,
}

// ==================== Statistics Functions ====================

pub fn get_generation_stats(days: u32) -> Result<GenerationStats, String> {
    let db = Storage::load_database()?;

    let mut model_counts: std::collections::HashMap<String, (u32, u32, u32)> =
        std::collections::HashMap::new();
    let mut daily_counts: std::collections::HashMap<String, (u32, u32, u32)> =
        std::collections::HashMap::new();

    let total = db.history.items.len() as u32;
    let mut success = 0u32;
    let mut failed = 0u32;

    for item in &db.history.items {
        let (s, f) = if item.status == "completed" {
            success += 1;
            (1, 0)
        } else {
            failed += 1;
            (0, 1)
        };

        let entry = model_counts.entry(item.model.clone()).or_insert((0, 0, 0));
        entry.0 += 1;
        entry.1 += s;
        entry.2 += f;

        let date = item
            .created_at
            .split('T')
            .next()
            .unwrap_or(&item.created_at)
            .to_string();
        let entry = daily_counts.entry(date).or_insert((0, 0, 0));
        entry.0 += 1;
        entry.1 += s;
        entry.2 += f;
    }

    let model_usage: Vec<ModelUsage> = model_counts
        .into_iter()
        .map(|(model, (total, s, f))| ModelUsage {
            model,
            count: total,
            success_count: s,
            failure_count: f,
        })
        .collect();

    let daily_stats: Vec<DailyStats> = daily_counts
        .into_iter()
        .map(|(date, (total, success, failed))| DailyStats {
            date,
            total,
            success,
            failed,
        })
        .collect();

    let success_rate = if total > 0 {
        (success as f64 / total as f64) * 100.0
    } else {
        0.0
    };

    Ok(GenerationStats {
        total_generations: total,
        successful_generations: success,
        failed_generations: failed,
        success_rate,
        model_usage,
        daily_stats,
    })
}

pub fn get_api_stats(limit: u32) -> Result<ApiStats, String> {
    let db = Storage::load_database()?;

    let mut model_api_counts: std::collections::HashMap<String, (u32, u64, u32, u32)> =
        std::collections::HashMap::new();
    let mut total_response_time = 0u64;
    let mut success_count = 0u32;
    let mut failed_count = 0u32;
    let mut call_count = 0u32;

    for item in &db.history.items {
        call_count += 1;
        let is_success = item.status == "completed";
        let response_time = 1000u64;

        total_response_time += response_time;

        if is_success {
            success_count += 1;
        } else {
            failed_count += 1;
        }

        let entry = model_api_counts
            .entry(item.model.clone())
            .or_insert((0, 0, 0, 0));
        entry.0 += 1;
        entry.1 += response_time;
        if is_success {
            entry.2 += 1;
        } else {
            entry.3 += 1;
        }
    }

    let calls_by_model: Vec<ModelApiStats> = model_api_counts
        .into_iter()
        .map(|(model, (count, resp_time, s, f))| {
            let avg_time = if count > 0 {
                resp_time as f64 / count as f64
            } else {
                0.0
            };
            let rate = if count > 0 {
                (s as f64 / count as f64) * 100.0
            } else {
                0.0
            };
            ModelApiStats {
                model,
                call_count: count,
                avg_response_time_ms: avg_time,
                success_rate: rate,
            }
        })
        .collect();

    let avg_response_time = if call_count > 0 {
        total_response_time as f64 / call_count as f64
    } else {
        0.0
    };

    let recent_logs: Vec<ApiCallLog> = db
        .history
        .items
        .iter()
        .rev()
        .take(limit as usize)
        .map(|item| ApiCallLog {
            id: item.id.clone(),
            model: item.model.clone(),
            endpoint: "/api/generate".to_string(),
            status: if item.status == "completed" {
                "success".to_string()
            } else {
                "failed".to_string()
            },
            response_time_ms: 1000,
            error_message: None,
            created_at: item.created_at.clone(),
        })
        .collect();

    Ok(ApiStats {
        total_calls: call_count,
        successful_calls: success_count,
        failed_calls: failed_count,
        avg_response_time_ms: avg_response_time,
        calls_by_model,
        recent_logs,
    })
}

pub fn get_template_stats() -> Result<TemplateStats, String> {
    let db = Storage::load_database()?;

    let mut usage_map: std::collections::HashMap<String, (String, u32, bool)> =
        std::collections::HashMap::new();
    let mut total_usages = 0u32;

    for template in &db.prompt_templates {
        let usage = usage_map.entry(template.id.clone()).or_insert((
            template.name.clone(),
            0,
            template.is_favorite,
        ));
        usage.1 += 1;
        total_usages += 1;
    }

    let template_usage: Vec<TemplateUsage> = usage_map
        .into_iter()
        .map(|(id, (name, count, fav))| TemplateUsage {
            template_id: id,
            template_name: name,
            usage_count: count,
            is_favorite: fav,
        })
        .collect();

    let favorite_count = db.prompt_templates.iter().filter(|t| t.is_favorite).count() as u32;

    Ok(TemplateStats {
        total_usages,
        template_usage,
        favorite_count,
    })
}
