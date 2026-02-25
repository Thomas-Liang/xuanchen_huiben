// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn parse_prompt(prompt: &str) -> Result<serde_json::Value, String> {
    if prompt.is_empty() {
        return Err("Prompt cannot be empty".to_string());
    }

    let mut characters: Vec<serde_json::Value> = vec![];
    let mut search_prompt = prompt.to_string();

    while let Some(at_pos) = search_prompt.find('@') {
        let remaining = &search_prompt[at_pos + 1..];
        let mut end_pos = 0;
        for (i, c) in remaining.chars().enumerate() {
            if !c.is_alphanumeric() && c != '_' {
                end_pos = i;
                break;
            }
            end_pos = i + 1;
        }

        if end_pos > 0 {
            let name = &remaining[..end_pos];
            if !characters.iter().any(|c| c["name"].as_str() == Some(name)) {
                characters.push(serde_json::json!({
                    "name": name,
                    "reference_image": serde_json::Value::Null,
                    "bound": false
                }));
            }
        }

        if end_pos < remaining.len() {
            search_prompt = remaining[end_pos..].to_string();
        } else {
            break;
        }
    }

    let clean_prompt = prompt.replace('@', "").trim().to_string();
    let segment_type = if clean_prompt.contains("在")
        || clean_prompt.contains("场景")
        || clean_prompt.contains("背景")
    {
        "scene"
    } else if clean_prompt.contains("做")
        || clean_prompt.contains("正在")
        || clean_prompt.contains("走")
        || clean_prompt.contains("跑")
    {
        "action"
    } else {
        "other"
    };

    let segments = if !clean_prompt.is_empty() {
        vec![serde_json::json!({
            "type": segment_type,
            "content": clean_prompt,
            "start_index": 0,
            "end_index": clean_prompt.len()
        })]
    } else {
        vec![]
    };

    Ok(serde_json::json!({
        "original": prompt,
        "segments": segments,
        "characters": characters
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, parse_prompt])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
