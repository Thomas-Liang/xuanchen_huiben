use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptSegment {
    #[serde(rename = "type")]
    pub segment_type: String,
    pub content: String,
    pub start_index: usize,
    pub end_index: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterRef {
    pub name: String,
    pub reference_image: Option<String>,
    pub bound: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedPrompt {
    pub original: String,
    pub segments: Vec<PromptSegment>,
    pub characters: Vec<CharacterRef>,
}

static CHARACTER_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"@(\w+)").unwrap());

static SCENE_KEYWORDS: &[&str] = &[
    "在", "位于", "场景", "背景", "环境", "室内", "室外", "城市", "乡村", "森林", "海边", "山上",
    "天空", "夜晚", "白天",
];

static ACTION_KEYWORDS: &[&str] = &[
    "做", "正在", "进行", "行走", "奔跑", "跳跃", "坐着", "站立", "看着", "拿着", "穿着", "带着",
    "抱着", "走", "跑", "跳",
];

fn detect_segment_type(content: &str) -> String {
    let content_lower = content.to_lowercase();

    for keyword in SCENE_KEYWORDS.iter() {
        if content_lower.contains(&keyword.to_lowercase()) {
            return "scene".to_string();
        }
    }

    for keyword in ACTION_KEYWORDS.iter() {
        if content_lower.contains(&keyword.to_lowercase()) {
            return "action".to_string();
        }
    }

    if content_lower.contains("人")
        || content_lower.contains("角色")
        || content_lower.contains("character")
    {
        return "character".to_string();
    }

    if content_lower.contains("背景") || content_lower.contains("background") {
        return "background".to_string();
    }

    "other".to_string()
}

fn extract_character_references(prompt: &str) -> Vec<CharacterRef> {
    let mut characters = Vec::new();

    for cap in CHARACTER_PATTERN.captures_iter(prompt) {
        let name = cap
            .get(1)
            .map(|m| m.as_str().to_string())
            .unwrap_or_default();

        if !characters.iter().any(|c: &CharacterRef| c.name == name) {
            characters.push(CharacterRef {
                name,
                reference_image: None,
                bound: false,
            });
        }
    }

    characters
}

#[tauri::command]
pub fn parse_prompt(prompt: &str) -> Result<ParsedPrompt, String> {
    if prompt.is_empty() {
        return Err("Prompt cannot be empty".to_string());
    }

    let characters = extract_character_references(prompt);

    let clean_prompt = CHARACTER_PATTERN.replace_all(prompt, "").trim().to_string();

    let segments = if clean_prompt.is_empty() {
        vec![]
    } else {
        vec![PromptSegment {
            segment_type: detect_segment_type(&clean_prompt),
            content: clean_prompt.to_string(),
            start_index: 0,
            end_index: clean_prompt.len(),
        }]
    };

    Ok(ParsedPrompt {
        original: prompt.to_string(),
        segments,
        characters,
    })
}

#[tauri::command]
pub fn extract_character_names(prompt: &str) -> Vec<String> {
    extract_character_references(prompt)
        .iter()
        .map(|c| c.name.clone())
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            parse_prompt,
            extract_character_names
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
