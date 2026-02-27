use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use serde::Deserialize;

use crate::commands::character_binding::{CharacterBinding, CHARACTER_BINDINGS};
use crate::commands::prompt_parser::parse_prompt_internal;
use crate::commands::prompt_parser::ParsedPrompt;
use crate::commands::image_generator::{
    ApiConfig, CharacterBindingInfo, GenerationConfig, ImageGenerationParams, ImageGenerationResult,
};

#[derive(Debug, Deserialize)]
pub struct ImageQuery {
    path: String,
}

pub async fn api_get_image(
    axum::extract::Query(query): axum::extract::Query<ImageQuery>
) -> Result<impl axum::response::IntoResponse, axum::http::StatusCode> {
    eprintln!("api_get_image: Start reading path: '{}'", query.path);
    match std::fs::read(&query.path) {
        Ok(data) => {
            eprintln!("api_get_image: success, format size: {}", data.len());
            let path_lower = query.path.to_lowercase();
            let mime_type = if path_lower.ends_with(".png") {
                "image/png"
            } else if path_lower.ends_with(".jpg") || path_lower.ends_with(".jpeg") {
                "image/jpeg"
            } else if path_lower.ends_with(".webp") {
                "image/webp"
            } else if path_lower.ends_with(".gif") {
                "image/gif"
            } else {
                "application/octet-stream"
            };
            
            Ok((
                [(axum::http::header::CONTENT_TYPE, mime_type)],
                data
            ))
        }
        Err(e) => {
            eprintln!("api_get_image: failed to read error: {:?}", e);
            Err(axum::http::StatusCode::NOT_FOUND)
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct ParseBody {
    prompt: String,
}

#[derive(Debug, Deserialize)]
pub struct BindingsQuery {
    characters: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BindBody {
    #[serde(alias = "characterName", alias = "character_name")]
    character_name: String,
    #[serde(alias = "referenceImagePath", alias = "reference_image_path")]
    reference_image_path: Option<String>,
    #[serde(alias = "imageType", alias = "image_type")]
    image_type: String,
}

#[derive(Debug, Deserialize)]
pub struct SaveImageBody {
    #[serde(alias = "characterName", alias = "character_name")]
    character_name: String,
    #[serde(alias = "imageData", alias = "image_data")]
    image_data: String,
    #[serde(alias = "imageType", alias = "image_type")]
    image_type: String,
}

#[derive(Debug, Deserialize)]
pub struct UnbindBody {
    #[serde(alias = "characterName", alias = "character_name")]
    character_name: String,
}

async fn api_parse_prompt(axum::Json(body): axum::Json<ParseBody>) -> Result<axum::Json<ParsedPrompt>, String> {
    let result = parse_prompt_internal(&body.prompt).map_err(|e| e.to_string())?;
    Ok(axum::Json(result))
}

async fn api_get_all_bindings() -> Result<axum::Json<Vec<CharacterBinding>>, String> {
    let bindings = CHARACTER_BINDINGS.lock().map_err(|e| e.to_string())?;
    let result: Vec<CharacterBinding> = bindings.values().cloned().collect();
    Ok(axum::Json(result))
}

async fn api_get_bindings_for_prompt(
    axum::Json(body): axum::Json<BindingsQuery>,
) -> Result<axum::Json<Vec<CharacterBinding>>, String> {
    let characters: Vec<String> = body
        .characters
        .map(|c| c.split(',').map(|s| s.to_string()).collect())
        .unwrap_or_default();
    
    let bindings = CHARACTER_BINDINGS.lock().map_err(|e| e.to_string())?;
    let result: Vec<CharacterBinding> = characters
        .iter()
        .filter_map(|name| bindings.get(name).cloned())
        .collect();
    Ok(axum::Json(result))
}

async fn api_save_reference_image(
    axum::Json(body): axum::Json<SaveImageBody>,
) -> Result<axum::Json<CharacterBinding>, String> {
    use crate::commands::character_binding::save_reference_image;
    let result = save_reference_image(
        body.character_name,
        body.image_data,
        body.image_type,
    ).map_err(|e| e.to_string())?;
    Ok(axum::Json(result))
}

async fn api_bind_character_reference(
    axum::Json(body): axum::Json<BindBody>,
) -> Result<axum::Json<CharacterBinding>, String> {
    use crate::commands::character_binding::bind_character_reference;
    let result = bind_character_reference(
        body.character_name,
        body.reference_image_path.unwrap_or_default(),
        body.image_type,
    ).map_err(|e| e.to_string())?;
    Ok(axum::Json(result))
}

async fn api_unbind_character(
    axum::Json(body): axum::Json<UnbindBody>,
) -> Result<axum::Json<bool>, String> {
    use crate::commands::character_binding::unbind_character;
    let result = unbind_character(body.character_name).unwrap_or(false);
    Ok(axum::Json(result))
}

#[derive(Debug, Deserialize)]
pub struct GenerateImageBody {
    model: String,
    prompt: String,
    #[serde(alias = "characterBindings", alias = "character_bindings")]
    character_bindings: Vec<CharacterBindingInfoBody>,
    width: u32,
    height: u32,
    count: u32,
    quality: String,
    size: Option<String>,
    #[serde(alias = "sequentialImageGeneration", alias = "sequential_image_generation")]
    sequential_image_generation: Option<String>,
    #[serde(alias = "responseFormat", alias = "response_format")]
    response_format: Option<String>,
    watermark: Option<bool>,
    images: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct CharacterBindingInfoBody {
    #[serde(alias = "characterName", alias = "character_name")]
    character_name: String,
    #[serde(alias = "referenceImagePath", alias = "reference_image_path")]
    reference_image_path: Option<String>,
    #[serde(alias = "imageType", alias = "image_type")]
    image_type: Option<String>,
}

async fn api_generate_image(
    axum::Json(body): axum::Json<serde_json::Value>,
) -> Result<axum::Json<crate::commands::image_generator::ImageGenerationResult>, String> {
    use crate::commands::image_generator::{generate_image, CharacterBindingInfo, ImageGenerationParams, ImageGenerationResult};
    
    let model = body.get("model").and_then(|v| v.as_str()).unwrap_or("seedream").to_string();
    let prompt = body.get("prompt").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let width = body.get("width").and_then(|v| v.as_u64()).unwrap_or(1024) as u32;
    let height = body.get("height").and_then(|v| v.as_u64()).unwrap_or(1024) as u32;
    let count = body.get("count").and_then(|v| v.as_u64()).unwrap_or(1) as u32;
    let quality = body.get("quality").and_then(|v| v.as_str()).unwrap_or("standard").to_string();
    
    let character_bindings: Vec<CharacterBindingInfo> = if let Some(arr) = body.get("characterBindings").or_else(|| body.get("character_bindings")).and_then(|v| v.as_array()) {
        arr.iter().filter_map(|b| {
            let character_name = b.get("characterName").or_else(|| b.get("character_name"))?.as_str()?.to_string();
            let reference_image_path = b.get("referenceImagePath").or_else(|| b.get("reference_image_path")).and_then(|v| v.as_str()).map(|s| s.to_string());
            let image_type = b.get("imageType").or_else(|| b.get("image_type")).and_then(|v| v.as_str()).unwrap_or("人物").to_string();
            Some(CharacterBindingInfo { character_name, reference_image_path, image_type })
        }).collect()
    } else {
        vec![]
    };
    
    let params = ImageGenerationParams {
        model,
        prompt,
        character_bindings,
        width,
        height,
        count,
        quality,
        size: body.get("size").and_then(|v| v.as_str()).map(|s| s.to_string()),
        sequential_image_generation: body.get("sequentialImageGeneration").or_else(|| body.get("sequential_image_generation")).and_then(|v| v.as_str()).map(|s| s.to_string()),
        response_format: body.get("responseFormat").or_else(|| body.get("response_format")).and_then(|v| v.as_str()).map(|s| s.to_string()),
        watermark: body.get("watermark").and_then(|v| v.as_bool()),
        images: body.get("images").and_then(|v| v.as_array()).map(|arr| {
            arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect()
        }),
    };
    
    let result = generate_image(params).await.unwrap_or(ImageGenerationResult {
        success: false,
        images: vec![],
        error: Some("生成失败".to_string()),
        task_id: String::new(),
    });
    eprintln!("generate_image result: {:?}", result);
    Ok(axum::Json(result))
}

#[derive(Debug, Deserialize)]
pub struct ApiConfigBody {
    seedream: Option<ModelConfigBody>,
    banana_pro: Option<ModelConfigBody>,
}

#[derive(Debug, Deserialize)]
pub struct ModelConfigBody {
    #[serde(alias = "baseUrl", alias = "base_url")]
    base_url: Option<String>,
    #[serde(alias = "apiKey", alias = "api_key")]
    api_key: Option<String>,
}

async fn api_save_config(
    axum::Json(body): axum::Json<ApiConfigBody>,
) -> Result<axum::Json<bool>, String> {
    use crate::commands::image_generator::{save_api_config, get_default_api_config, ApiConfig, ModelConfig};
    
    let default_config = get_default_api_config();
    
    let config = ApiConfig {
        seedream: ModelConfig {
            base_url: body.seedream.as_ref().and_then(|c| c.base_url.clone()).unwrap_or(default_config.seedream.base_url),
            api_key: body.seedream.as_ref().and_then(|c| c.api_key.clone()).unwrap_or(default_config.seedream.api_key),
        },
        banana_pro: ModelConfig {
            base_url: body.banana_pro.as_ref().and_then(|c| c.base_url.clone()).unwrap_or(default_config.banana_pro.base_url),
            api_key: body.banana_pro.as_ref().and_then(|c| c.api_key.clone()).unwrap_or(default_config.banana_pro.api_key),
        },
    };
    let result = save_api_config(config).unwrap_or(false);
    Ok(axum::Json(result))
}

async fn api_get_default_config(
) -> Result<axum::Json<serde_json::Value>, String> {
    use crate::commands::image_generator::get_default_api_config;
    let config = get_default_api_config();
    let json = serde_json::json!({
        "seedream": {
            "baseUrl": config.seedream.base_url,
            "apiKey": config.seedream.api_key,
        },
        "bananaPro": {
            "baseUrl": config.banana_pro.base_url,
            "apiKey": config.banana_pro.api_key,
        }
    });
    Ok(axum::Json(json))
}

#[derive(Debug, Deserialize)]
pub struct GenerationConfigBody {
    model: String,
    width: u32,
    height: u32,
    count: u32,
    quality: String,
    size: Option<String>,
    sequential_image_generation: Option<String>,
    response_format: Option<String>,
    watermark: Option<bool>,
}

async fn api_save_generation_config(
    axum::Json(body): axum::Json<GenerationConfigBody>,
) -> axum::Json<bool> {
    use crate::commands::image_generator::save_generation_config;
    let config = GenerationConfig {
        model: body.model,
        width: body.width,
        height: body.height,
        count: body.count,
        quality: body.quality,
        size: body.size,
        sequential_image_generation: body.sequential_image_generation,
        response_format: body.response_format,
        watermark: body.watermark,
    };
    let result = save_generation_config(config);
    match result {
        Ok(r) => axum::Json(r),
        Err(e) => {
            eprintln!("save_generation_config error: {}", e);
            axum::Json(false)
        }
    }
}

async fn api_load_generation_config() -> Result<axum::Json<crate::commands::image_generator::GenerationConfig>, String> {
    use crate::commands::image_generator::{load_generation_config, GenerationConfig};
    let result = load_generation_config().unwrap_or(GenerationConfig {
        model: "seedream".to_string(),
        width: 1024,
        height: 1024,
        count: 1,
        quality: "standard".to_string(),
        size: Some("1024x1024".to_string()),
        sequential_image_generation: Some("disabled".to_string()),
        response_format: Some("url".to_string()),
        watermark: Some(false),
    });
    Ok(axum::Json(result))
}

async fn api_get_default_generation_config() -> Result<axum::Json<crate::commands::image_generator::GenerationConfig>, String> {
    use crate::commands::image_generator::get_default_generation_config;
    let result = get_default_generation_config();
    Ok(axum::Json(result))
}

#[derive(Debug, Deserialize)]
pub struct TestConnectionBody {
    model: String,
    #[serde(alias = "baseUrl", alias = "base_url")]
    base_url: Option<String>,
    #[serde(alias = "apiKey", alias = "api_key")]
    api_key: Option<String>,
}

async fn api_test_connection(
    axum::Json(body): axum::Json<TestConnectionBody>,
) -> Result<axum::Json<bool>, String> {
    use crate::commands::image_generator::test_api_connection;
    let result = test_api_connection(
        body.model,
        body.base_url,
        body.api_key,
    ).await.unwrap_or(false);
    Ok(axum::Json(result))
}

pub fn create_api_router() -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);
    
    Router::new()
        .route("/api/parse", post(api_parse_prompt))
        .route("/api/bindings", get(api_get_all_bindings))
        .route("/api/bindings/for-prompt", post(api_get_bindings_for_prompt))
        .route("/api/save-image", post(api_save_reference_image))
        .route("/api/bind", post(api_bind_character_reference))
        .route("/api/unbind", post(api_unbind_character))
        .route("/api/generate", post(api_generate_image))
        .route("/api/image", get(api_get_image))
        .route("/api/config/save", post(api_save_config))
        .route("/api/config/default", get(api_get_default_config))
        .route("/api/test-connection", post(api_test_connection))
        .route("/api/generation-config/save", post(api_save_generation_config))
        .route("/api/generation-config/load", get(api_load_generation_config))
        .route("/api/generation-config/default", get(api_get_default_generation_config))
        .layer(axum::extract::DefaultBodyLimit::max(50 * 1024 * 1024))
        .layer(cors)
}
