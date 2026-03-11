use base64::{engine::general_purpose::STANDARD, Engine};
use image::GenericImageView;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageFeature {
    pub character_name: String,
    pub image_path: String,
    pub hash: String,
    pub width: u32,
    pub height: u32,
    pub file_size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateGroup {
    pub representative: ImageFeature,
    pub duplicates: Vec<ImageFeature>,
    pub similarity: f64,
    pub suggested_action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagSuggestion {
    pub character_name: String,
    pub suggested_tags: Vec<String>,
    pub confidence: f64,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationSuggestion {
    pub duplicates: Vec<DuplicateGroup>,
    pub tag_suggestions: Vec<TagSuggestion>,
    pub total_images: usize,
    pub duplicate_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationAction {
    pub action_type: String,
    pub target: String,
    pub details: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationActionLog {
    pub id: String,
    pub action_type: String,
    pub target: String,
    pub original_value: Option<String>,
    pub new_value: Option<String>,
    pub timestamp: String,
    pub undone: bool,
}

fn get_current_timestamp() -> String {
    chrono::Utc::now().format("%Y%m%d_%H%M%S%f").to_string()
}

fn get_current_datetime() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn calculate_image_hash(image_path: &str) -> Result<String, String> {
    let path = Path::new(image_path);
    if !path.exists() {
        return Err(format!("图片文件不存在: {}", image_path));
    }

    let img = image::open(path).map_err(|e| format!("无法打开图片: {}", e))?;

    let resized = img.resize_exact(8, 8, image::imageops::FilterType::Nearest);
    let gray = resized.to_luma8();

    let mut pixels: Vec<u8> = gray.pixels().map(|p| p.0[0]).collect();
    let avg: u32 = pixels.iter().map(|&p| p as u32).sum::<u32>() / 64;

    let mut hash = String::new();
    for &pixel in &pixels {
        hash.push(if pixel > avg as u8 { '1' } else { '0' });
    }

    Ok(hash)
}

fn get_image_dimensions(image_path: &str) -> Result<(u32, u32), String> {
    let path = Path::new(image_path);
    let img = image::open(path).map_err(|e| format!("无法打开图片: {}", e))?;
    Ok(img.dimensions())
}

fn get_file_size(image_path: &str) -> Result<u64, String> {
    let metadata = fs::metadata(image_path).map_err(|e| format!("无法获取文件信息: {}", e))?;
    Ok(metadata.len())
}

pub fn extract_image_features(
    character_bindings: &[crate::storage::CharacterBindingData],
) -> Result<Vec<ImageFeature>, String> {
    let mut features = Vec::new();

    for binding in character_bindings {
        if let Some(ref image_path) = binding.reference_image_path {
            let path = Path::new(image_path);
            if !path.exists() {
                continue;
            }

            let hash = match calculate_image_hash(image_path) {
                Ok(h) => h,
                Err(e) => {
                    println!("计算图片哈希失败 {}: {}", binding.character_name, e);
                    continue;
                }
            };

            let (width, height) = match get_image_dimensions(image_path) {
                Ok(dims) => dims,
                Err(_) => (0, 0),
            };

            let file_size = match get_file_size(image_path) {
                Ok(size) => size,
                Err(_) => 0,
            };

            features.push(ImageFeature {
                character_name: binding.character_name.clone(),
                image_path: image_path.clone(),
                hash,
                width,
                height,
                file_size,
            });
        }
    }

    Ok(features)
}

fn hamming_distance(hash1: &str, hash2: &str) -> u32 {
    if hash1.len() != hash2.len() {
        return 100;
    }

    let mut distance = 0;
    for (h1, h2) in hash1.chars().zip(hash2.chars()) {
        if h1 != h2 {
            distance += 1;
        }
    }
    distance
}

fn calculate_similarity(hash1: &str, hash2: &str) -> f64 {
    let max_distance = 256.0;
    let distance = hamming_distance(hash1, hash2) as f64;
    ((max_distance - distance) / max_distance) * 100.0
}

fn are_dimensions_similar(w1: u32, h1: u32, w2: u32, h2: u32) -> bool {
    let w_ratio = w1 as f64 / (w2 as f64).max(1.0);
    let h_ratio = h1 as f64 / (h2 as f64).max(1.0);
    (w_ratio >= 0.8 && w_ratio <= 1.25) && (h_ratio >= 0.8 && h_ratio <= 1.25)
}

fn are_file_sizes_similar(s1: u64, s2: u64) -> bool {
    if s1 == 0 || s2 == 0 {
        return false;
    }
    let ratio = s1 as f64 / (s2 as f64).max(1.0);
    ratio >= 0.7 && ratio <= 1.4
}

pub fn detect_duplicates(features: &[ImageFeature]) -> Vec<DuplicateGroup> {
    let mut duplicate_groups = Vec::new();
    let mut processed: std::collections::HashSet<String> = std::collections::HashSet::new();

    for i in 0..features.len() {
        if processed.contains(&features[i].character_name) {
            continue;
        }

        let mut duplicates = Vec::new();
        let representative = &features[i];

        for j in (i + 1)..features.len() {
            if processed.contains(&features[j].character_name) {
                continue;
            }

            let candidate = &features[j];

            let hash_similarity = calculate_similarity(&representative.hash, &candidate.hash);

            let dimensions_match = are_dimensions_similar(
                representative.width,
                representative.height,
                candidate.width,
                candidate.height,
            );

            let size_match = are_file_sizes_similar(representative.file_size, candidate.file_size);

            if hash_similarity >= 95.0
                || (hash_similarity >= 85.0 && dimensions_match && size_match)
            {
                duplicates.push(candidate.clone());
                processed.insert(candidate.character_name.clone());
            }
        }

        if !duplicates.is_empty() {
            let avg_similarity: f64 = duplicates
                .iter()
                .map(|d| calculate_similarity(&representative.hash, &d.hash))
                .sum::<f64>()
                / duplicates.len() as f64;

            let suggested_action = if avg_similarity >= 98.0 {
                "建议删除重复项，保留质量最优的".to_string()
            } else {
                "可能是相似图片，请人工确认".to_string()
            };

            duplicate_groups.push(DuplicateGroup {
                representative: representative.clone(),
                duplicates,
                similarity: avg_similarity,
                suggested_action,
            });
            processed.insert(representative.character_name.clone());
        }
    }

    duplicate_groups
}

fn suggest_tags_based_on_image_type(image_type: &str) -> Vec<String> {
    match image_type {
        "人物" => vec!["可爱".to_string(), "帅气".to_string(), "美丽".to_string()],
        "人脸" => vec!["精致".to_string(), "清秀".to_string(), "硬朗".to_string()],
        "全身" => vec!["动态".to_string(), "静态".to_string(), "休闲".to_string()],
        "场景" => vec!["室内".to_string(), "室外".to_string(), "自然".to_string()],
        _ => vec![],
    }
}

fn suggest_tags_based_on_character_name(name: &str) -> Vec<String> {
    let name_lower = name.to_lowercase();
    let mut tags = Vec::new();

    if name_lower.contains("男") || name_lower.contains("boy") || name_lower.contains("man") {
        tags.push("男性".to_string());
    }
    if name_lower.contains("女") || name_lower.contains("girl") || name_lower.contains("woman") {
        tags.push("女性".to_string());
    }
    if name_lower.contains("孩") || name_lower.contains("kid") || name_lower.contains("child") {
        tags.push("儿童".to_string());
    }
    if name_lower.contains("老") || name_lower.contains("old") {
        tags.push("老年".to_string());
    }

    tags
}

pub fn generate_tag_suggestions(
    character_bindings: &[crate::storage::CharacterBindingData],
) -> Vec<TagSuggestion> {
    let mut suggestions = Vec::new();

    for binding in character_bindings {
        if binding.tags.is_empty() {
            let mut suggested_tags = Vec::new();
            suggested_tags.extend(suggest_tags_based_on_image_type(&binding.image_type));
            suggested_tags.extend(suggest_tags_based_on_character_name(
                &binding.character_name,
            ));

            if !suggested_tags.is_empty() {
                suggestions.push(TagSuggestion {
                    character_name: binding.character_name.clone(),
                    suggested_tags,
                    confidence: 0.7,
                    reason: "基于图片类型和角色名称推断".to_string(),
                });
            }
        }
    }

    suggestions
}

pub fn analyze_reference_library(
    character_bindings: &[crate::storage::CharacterBindingData],
) -> Result<OrganizationSuggestion, String> {
    let features = extract_image_features(character_bindings)?;
    let duplicates = detect_duplicates(&features);
    let tag_suggestions = generate_tag_suggestions(character_bindings);

    let total_images = character_bindings
        .iter()
        .filter(|b| b.reference_image_path.is_some())
        .count();

    let duplicate_count: usize = duplicates.iter().map(|g| g.duplicates.len()).sum();

    Ok(OrganizationSuggestion {
        duplicates,
        tag_suggestions,
        total_images,
        duplicate_count,
    })
}

static mut ACTION_LOG: Option<Vec<OrganizationActionLog>> = None;

fn get_action_log() -> &'static mut Vec<OrganizationActionLog> {
    unsafe {
        if ACTION_LOG.is_none() {
            ACTION_LOG = Some(Vec::new());
        }
        ACTION_LOG.as_mut().unwrap()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationActionRequest {
    pub action_type: String,
    pub target: String,
    pub new_tags: Option<Vec<String>>,
    pub keep_representative: Option<bool>,
}

pub fn execute_organization_action(
    action: OrganizationActionRequest,
) -> Result<OrganizationActionLog, String> {
    let log_id = format!("org_{}", get_current_timestamp());
    let now = get_current_datetime();

    match action.action_type.as_str() {
        "apply_tags" => {
            if let Some(tags) = &action.new_tags {
                let mut db = crate::storage::Storage::load_database()?;
                if let Some(binding) = db
                    .character_bindings
                    .iter_mut()
                    .find(|b| b.character_name == action.target)
                {
                    let original_tags = binding.tags.clone();
                    binding.tags = tags.clone();
                    binding.updated_at = now.clone();
                    crate::storage::Storage::save_database(&db)?;

                    let log = OrganizationActionLog {
                        id: log_id,
                        action_type: action.action_type.clone(),
                        target: action.target.clone(),
                        original_value: Some(
                            serde_json::to_string(&original_tags).unwrap_or_default(),
                        ),
                        new_value: Some(serde_json::to_string(tags).unwrap_or_default()),
                        timestamp: now,
                        undone: false,
                    };
                    get_action_log().push(log.clone());
                    return Ok(log);
                }
            }
            Err("未找到对应的角色绑定".to_string())
        }
        "delete_duplicates" => {
            let keep_rep = action.keep_representative.unwrap_or(true);
            let mut deleted_count = 0;

            let mut db = crate::storage::Storage::load_database()?;

            if let Some(binding) = db
                .character_bindings
                .iter_mut()
                .find(|b| b.character_name == action.target)
            {
                if !keep_rep {
                    if let Some(ref img_path) = binding.reference_image_path {
                        if Path::new(img_path).exists() {
                            fs::remove_file(img_path)
                                .map_err(|e| format!("删除图片失败: {}", e))?;
                        }
                    }
                    binding.reference_image_path = None;
                    binding.bound = false;
                    binding.updated_at = now.clone();
                    deleted_count = 1;
                }
            }

            crate::storage::Storage::save_database(&db)?;

            let log = OrganizationActionLog {
                id: log_id,
                action_type: action.action_type.clone(),
                target: action.target,
                original_value: Some("deleted".to_string()),
                new_value: Some(
                    if keep_rep {
                        "kept_representative"
                    } else {
                        "deleted_all"
                    }
                    .to_string(),
                ),
                timestamp: now,
                undone: false,
            };
            get_action_log().push(log.clone());
            Ok(log)
        }
        _ => Err("未知的操作类型".to_string()),
    }
}

pub fn undo_organization_action(log_id: String) -> Result<OrganizationActionLog, String> {
    let log = get_action_log()
        .iter_mut()
        .find(|l| l.id == log_id)
        .ok_or("未找到操作记录")?;

    if log.undone {
        return Err("该操作已被撤销".to_string());
    }

    let now = get_current_datetime();

    match log.action_type.as_str() {
        "apply_tags" => {
            let original_tags: Vec<String> = log
                .original_value
                .as_ref()
                .and_then(|v| serde_json::from_str(v).ok())
                .unwrap_or_default();

            let mut db = crate::storage::Storage::load_database()?;
            if let Some(binding) = db
                .character_bindings
                .iter_mut()
                .find(|b| b.character_name == log.target)
            {
                binding.tags = original_tags.clone();
                binding.updated_at = now.clone();
                crate::storage::Storage::save_database(&db)?;
            }
            log.undone = true;
            Ok(log.clone())
        }
        "delete_duplicates" => {
            log.undone = true;
            Ok(log.clone())
        }
        _ => Err("无法撤销此操作类型".to_string()),
    }
}

pub fn get_organization_action_log() -> Vec<OrganizationActionLog> {
    get_action_log().clone()
}

pub fn delete_duplicate_images(
    character_names: Vec<String>,
    keep_representative: bool,
) -> Result<usize, String> {
    let mut deleted_count = 0;
    let mut db = crate::storage::Storage::load_database()?;
    let now = get_current_datetime();

    for name in &character_names {
        if let Some(binding) = db
            .character_bindings
            .iter_mut()
            .find(|b| b.character_name == *name)
        {
            if !keep_representative {
                if let Some(ref img_path) = binding.reference_image_path {
                    if Path::new(img_path).exists() {
                        let _ = fs::remove_file(img_path);
                    }
                }
                binding.reference_image_path = None;
                binding.bound = false;
            }
            binding.updated_at = now.clone();
            deleted_count += 1;
        }
    }

    crate::storage::Storage::save_database(&db)?;

    let log_id = format!("org_{}", get_current_timestamp());
    let log = OrganizationActionLog {
        id: log_id,
        action_type: "batch_delete_duplicates".to_string(),
        target: format!("{} items", character_names.len()),
        original_value: Some(serde_json::to_string(&character_names).unwrap_or_default()),
        new_value: Some(
            if keep_representative {
                "kept"
            } else {
                "deleted"
            }
            .to_string(),
        ),
        timestamp: now,
        undone: false,
    };
    get_action_log().push(log);

    Ok(deleted_count)
}
