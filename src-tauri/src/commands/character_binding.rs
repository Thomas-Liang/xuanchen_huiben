use base64::{engine::general_purpose, Engine as _};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

pub static CHARACTER_BINDINGS: Lazy<std::sync::Mutex<HashMap<String, CharacterBinding>>> =
    Lazy::new(|| std::sync::Mutex::new(HashMap::new()));

pub static REFERENCE_TAGS: Lazy<std::sync::Mutex<HashMap<String, Vec<String>>>> =
    Lazy::new(|| std::sync::Mutex::new(HashMap::new()));

pub static FOLDERS: Lazy<std::sync::Mutex<HashMap<String, Folder>>> =
    Lazy::new(|| std::sync::Mutex::new(HashMap::new()));

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Folder {
    pub id: String,
    pub name: String,
    #[serde(alias = "parentId")]
    pub parent_id: Option<String>,
    #[serde(alias = "createdAt")]
    pub created_at: String,
}

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
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(alias = "folderId")]
    pub folder_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReferenceImageQuery {
    pub image_type: Option<String>,
    pub search: Option<String>,
    pub tags: Option<Vec<String>>,
    #[serde(alias = "folderId")]
    pub folder_id: Option<String>,
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
        tags: Vec::new(),
        folder_id: None,
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
        tags: Vec::new(),
        folder_id: None,
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

    load_tags_from_file();

    Ok(())
}

#[tauri::command]
pub fn get_reference_images(query: Option<ReferenceImageQuery>) -> Vec<CharacterBinding> {
    let bindings = CHARACTER_BINDINGS.lock().unwrap();
    let tags = REFERENCE_TAGS.lock().unwrap();

    let mut result: Vec<CharacterBinding> = bindings.values().cloned().collect();

    result.iter_mut().for_each(|b| {
        if let Some(t) = tags.get(&b.character_name) {
            b.tags = t.clone();
        }
    });

    if let Some(q) = query {
        if let Some(ref img_type) = q.image_type {
            if !img_type.is_empty() {
                let img_type_str = img_type.as_str();
                result.retain(|b| {
                    b.image_type == *img_type || b.tags.iter().any(|t| t.contains(img_type_str))
                });
            }
        }

        if let Some(ref search) = q.search {
            if !search.is_empty() {
                let search_lower = search.to_lowercase();
                result.retain(|b| {
                    b.character_name.to_lowercase().contains(&search_lower)
                        || b.tags
                            .iter()
                            .any(|t| t.to_lowercase().contains(&search_lower))
                });
            }
        }

        if let Some(ref filter_tags) = q.tags {
            if !filter_tags.is_empty() {
                result.retain(|b| filter_tags.iter().any(|t| b.tags.contains(t)));
            }
        }

        if let Some(ref folder_id) = q.folder_id {
            if folder_id.is_empty() {
                result.retain(|b| b.folder_id.is_none());
            } else {
                result.retain(|b| b.folder_id.as_ref() == Some(folder_id));
            }
        }
    }

    result
}

#[tauri::command]
pub fn search_reference_images(keyword: String) -> Vec<CharacterBinding> {
    let query = ReferenceImageQuery {
        image_type: None,
        search: Some(keyword),
        tags: None,
        folder_id: None,
    };
    get_reference_images(Some(query))
}

#[tauri::command]
pub fn add_tag_to_reference(character_name: String, tag: String) -> Result<bool, String> {
    let tags_to_save;
    {
        let mut tags = REFERENCE_TAGS.lock().map_err(|e| e.to_string())?;

        let entry = tags.entry(character_name.clone()).or_insert_with(Vec::new);
        if !entry.contains(&tag) {
            entry.push(tag);
        }

        tags_to_save = tags.clone();
    }

    save_tags_to_file(&tags_to_save)?;

    let mut bindings = CHARACTER_BINDINGS.lock().map_err(|e| e.to_string())?;
    if let Some(binding) = bindings.get_mut(&character_name) {
        binding.tags = tags_to_save
            .get(&character_name)
            .cloned()
            .unwrap_or_default();
    }

    Ok(true)
}

#[tauri::command]
pub fn remove_tag_from_reference(character_name: String, tag: String) -> Result<bool, String> {
    let mut tags = REFERENCE_TAGS.lock().map_err(|e| e.to_string())?;

    if let Some(entry) = tags.get_mut(&character_name) {
        entry.retain(|t| t != &tag);
    }

    save_tags_to_file(&tags)?;

    let mut bindings = CHARACTER_BINDINGS.lock().map_err(|e| e.to_string())?;
    if let Some(binding) = bindings.get_mut(&character_name) {
        if let Some(entry) = tags.get(&character_name) {
            binding.tags = entry.clone();
        }
    }

    Ok(true)
}

#[tauri::command]
pub fn get_all_tags() -> Vec<String> {
    let tags = REFERENCE_TAGS.lock().unwrap();
    let mut all_tags: Vec<String> = tags.values().flatten().cloned().collect();
    all_tags.sort();
    all_tags.dedup();
    all_tags
}

#[tauri::command]
pub fn get_references_by_type(image_type: String) -> Vec<CharacterBinding> {
    let query = ReferenceImageQuery {
        image_type: Some(image_type),
        search: None,
        tags: None,
        folder_id: None,
    };
    get_reference_images(Some(query))
}

pub fn load_tags_from_file() {
    let app_data = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());

    let config_path = PathBuf::from(app_data)
        .join("xuanchen-huiben")
        .join("config")
        .join("reference_tags.json");

    if !config_path.exists() {
        return;
    }

    if let Ok(content) = fs::read_to_string(&config_path) {
        if let Ok(loaded) = serde_json::from_str::<HashMap<String, Vec<String>>>(&content) {
            let mut tags = REFERENCE_TAGS.lock().unwrap();
            *tags = loaded;
        }
    }
}

fn save_tags_to_file(tags: &HashMap<String, Vec<String>>) -> Result<(), String> {
    let app_data = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());

    let config_dir = PathBuf::from(app_data)
        .join("xuanchen-huiben")
        .join("config");

    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }

    let config_path = config_dir.join("reference_tags.json");
    let json = serde_json::to_string_pretty(tags).map_err(|e| e.to_string())?;
    fs::write(config_path, json).map_err(|e| e.to_string())?;

    Ok(())
}

fn generate_folder_id() -> String {
    format!("folder_{}", chrono_timestamp())
}

#[tauri::command]
pub fn create_folder(name: String, parent_id: Option<String>) -> Result<Folder, String> {
    let normalized_name = name.trim();
    if normalized_name.is_empty() {
        return Err("文件夹名称不能为空".to_string());
    }

    if let Some(ref pid) = parent_id {
        let folders = FOLDERS.lock().map_err(|e| e.to_string())?;
        if !folders.contains_key(pid) {
            return Err("父文件夹不存在".to_string());
        }
    }

    let mut folders = FOLDERS.lock().map_err(|e| e.to_string())?;

    let duplicated = folders.values().any(|f| {
        f.parent_id == parent_id
            && f.name.trim().eq_ignore_ascii_case(normalized_name)
    });
    if duplicated {
        return Err("同级目录下已存在同名文件夹".to_string());
    }

    let folder = Folder {
        id: generate_folder_id(),
        name: normalized_name.to_string(),
        parent_id,
        created_at: chrono_now(),
    };

    folders.insert(folder.id.clone(), folder.clone());

    let _ = save_folders_to_file(&folders);

    Ok(folder)
}

#[tauri::command]
pub fn rename_folder(id: String, new_name: String) -> Result<Folder, String> {
    let normalized_name = new_name.trim();
    if normalized_name.is_empty() {
        return Err("文件夹名称不能为空".to_string());
    }

    let mut folders = FOLDERS.lock().map_err(|e| e.to_string())?;

    let parent_id = folders
        .get(&id)
        .ok_or("文件夹不存在")?
        .parent_id
        .clone();

    let duplicated = folders.values().any(|f| {
        f.id != id
            && f.parent_id == parent_id
            && f.name.trim().eq_ignore_ascii_case(normalized_name)
    });
    if duplicated {
        return Err("同级目录下已存在同名文件夹".to_string());
    }

    let folder = folders.get_mut(&id).ok_or("文件夹不存在")?;
    folder.name = normalized_name.to_string();

    let result = folder.clone();
    let _ = save_folders_to_file(&folders);

    Ok(result)
}

#[tauri::command]
pub fn delete_folder(id: String) -> Result<bool, String> {
    let mut folders = FOLDERS.lock().map_err(|e| e.to_string())?;

    if !folders.contains_key(&id) {
        return Err("文件夹不存在".to_string());
    }

    let mut to_delete = vec![id.clone()];
    let all_ids: Vec<String> = folders.keys().cloned().collect();
    for fid in all_ids {
        if let Some(f) = folders.get(&fid) {
            if let Some(ref pid) = f.parent_id {
                if pid == &id && !to_delete.contains(&fid) {
                    to_delete.push(fid);
                }
            }
        }
    }

    for fid in &to_delete {
        folders.remove(fid);
    }

    let _ = save_folders_to_file(&folders);

    let mut bindings = CHARACTER_BINDINGS.lock().map_err(|e| e.to_string())?;
    for binding in bindings.values_mut() {
        if let Some(ref folder_id) = binding.folder_id {
            if to_delete.contains(folder_id) {
                binding.folder_id = None;
            }
        }
    }

    Ok(true)
}

#[tauri::command]
pub fn get_folders(parent_id: Option<String>) -> Vec<Folder> {
    let folders = match FOLDERS.lock() {
        Ok(f) => f,
        Err(_) => return Vec::new(),
    };

    folders
        .values()
        .filter(|f| f.parent_id == parent_id)
        .cloned()
        .collect()
}

#[tauri::command]
pub fn get_folder_tree() -> Vec<Folder> {
    let folders = match FOLDERS.lock() {
        Ok(f) => f,
        Err(_) => return Vec::new(),
    };

    folders.values().cloned().collect()
}

#[tauri::command]
pub fn move_image_to_folder(
    character_name: String,
    folder_id: Option<String>,
) -> Result<bool, String> {
    let mut folders = FOLDERS.lock().map_err(|e| e.to_string())?;

    if let Some(ref fid) = folder_id {
        if !folders.contains_key(fid) {
            return Err("目标文件夹不存在".to_string());
        }
    }
    drop(folders);

    let mut bindings = CHARACTER_BINDINGS.lock().map_err(|e| e.to_string())?;
    let binding = bindings.get_mut(&character_name).ok_or("图片不存在")?;
    binding.folder_id = folder_id;

    save_bindings_to_file(&bindings)?;

    Ok(true)
}

fn save_folders_to_file(folders: &HashMap<String, Folder>) -> Result<(), String> {
    let app_data = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());

    let config_dir = PathBuf::from(app_data)
        .join("xuanchen-huiben")
        .join("config");

    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }

    let config_path = config_dir.join("folders.json");
    let json = serde_json::to_string_pretty(folders).map_err(|e| e.to_string())?;
    fs::write(config_path, json).map_err(|e| e.to_string())?;

    Ok(())
}

pub fn load_folders_from_file() {
    let app_data = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());

    let config_path = PathBuf::from(app_data)
        .join("xuanchen-huiben")
        .join("config")
        .join("folders.json");

    if let Ok(content) = fs::read_to_string(&config_path) {
        if let Ok(loaded) = serde_json::from_str::<HashMap<String, Folder>>(&content) {
            let mut folders = FOLDERS.lock().unwrap();
            *folders = loaded;
        }
    }
}

#[tauri::command]
pub fn batch_delete_references(character_names: Vec<String>) -> Result<bool, String> {
    let mut bindings = CHARACTER_BINDINGS.lock().map_err(|e| e.to_string())?;

    for name in &character_names {
        if let Some(binding) = bindings.get(name) {
            if let Some(ref path) = binding.reference_image_path {
                let _ = fs::remove_file(path);
            }
        }
        bindings.remove(name);
    }

    save_bindings_to_file(&bindings)?;

    Ok(true)
}

#[tauri::command]
pub fn batch_move_to_folder(
    character_names: Vec<String>,
    folder_id: Option<String>,
) -> Result<bool, String> {
    let mut folders = FOLDERS.lock().map_err(|e| e.to_string())?;

    if let Some(ref fid) = folder_id {
        if !folders.contains_key(fid) {
            return Err("目标文件夹不存在".to_string());
        }
    }
    drop(folders);

    let mut bindings = CHARACTER_BINDINGS.lock().map_err(|e| e.to_string())?;

    for name in &character_names {
        if let Some(binding) = bindings.get_mut(name) {
            binding.folder_id = folder_id.clone();
        }
    }

    save_bindings_to_file(&bindings)?;

    Ok(true)
}

#[tauri::command]
pub fn batch_add_tags(character_names: Vec<String>, tags: Vec<String>) -> Result<bool, String> {
    let tags_to_save;
    {
        let mut tag_store = REFERENCE_TAGS.lock().map_err(|e| e.to_string())?;

        for name in &character_names {
            let entry = tag_store.entry(name.clone()).or_insert_with(Vec::new);
            for tag in &tags {
                if !entry.contains(tag) {
                    entry.push(tag.clone());
                }
            }
        }

        tags_to_save = tag_store.clone();
    }

    save_tags_to_file(&tags_to_save)?;

    let mut bindings = CHARACTER_BINDINGS.lock().map_err(|e| e.to_string())?;
    for name in &character_names {
        if let Some(binding) = bindings.get_mut(name) {
            if let Some(t) = tags_to_save.get(name) {
                binding.tags = t.clone();
            }
        }
    }

    Ok(true)
}
