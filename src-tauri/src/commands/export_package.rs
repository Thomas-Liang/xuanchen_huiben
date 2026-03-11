use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Write};
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportRecord {
    pub id: String,
    pub prompt: String,
    pub model: String,
    pub width: u32,
    pub height: u32,
    pub quality: String,
    pub created_at: String,
    pub image_filename: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportPackage {
    pub name: String,
    pub export_time: String,
    pub record_count: usize,
    pub summary: ExportSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportSummary {
    pub total_records: usize,
    pub models_used: Vec<String>,
    pub date_range: Option<(String, String)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub model: Option<String>,
    pub prompt_keyword: Option<String>,
    pub character: Option<String>,
    pub selected_ids: Option<Vec<String>>,
}

fn get_current_datetime() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn get_export_timestamp() -> String {
    chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string()
}

pub fn collect_export_data(query: ExportQuery) -> Result<Vec<ExportRecord>, String> {
    let db = crate::storage::Storage::load_database()?;
    let mut records: Vec<ExportRecord> = db
        .history
        .items
        .iter()
        .map(|h| {
            let (width, height, quality) = if let Some(params) = h.params.as_object() {
                (
                    params
                        .get("width")
                        .and_then(|v| v.as_u64())
                        .map(|v| v as u32)
                        .unwrap_or(1024),
                    params
                        .get("height")
                        .and_then(|v| v.as_u64())
                        .map(|v| v as u32)
                        .unwrap_or(1024),
                    params
                        .get("quality")
                        .and_then(|v| v.as_str())
                        .unwrap_or("standard")
                        .to_string(),
                )
            } else {
                (1024, 1024, "standard".to_string())
            };

            ExportRecord {
                id: h.id.clone(),
                prompt: h.prompt.clone(),
                model: h.model.clone(),
                width,
                height,
                quality,
                created_at: h.created_at.clone(),
                image_filename: h.images.first().cloned(),
            }
        })
        .collect();

    if let Some(ref ids) = query.selected_ids {
        if !ids.is_empty() {
            records.retain(|r| ids.contains(&r.id));
            return Ok(records);
        }
    }

    if let Some(ref start) = query.start_date {
        records.retain(|r| r.created_at >= *start);
    }

    if let Some(ref end) = query.end_date {
        records.retain(|r| r.created_at <= *end);
    }

    if let Some(ref model) = query.model {
        records.retain(|r| r.model == *model);
    }

    if let Some(ref keyword) = query.prompt_keyword {
        let keyword_lower = keyword.to_lowercase();
        records.retain(|r| r.prompt.to_lowercase().contains(&keyword_lower));
    }

    if let Some(ref character) = query.character {
        let char_lower = character.to_lowercase();
        records.retain(|r| r.prompt.to_lowercase().contains(&char_lower));
    }

    Ok(records)
}

fn collect_images_for_records(records: &[ExportRecord]) -> Vec<(String, String)> {
    let mut images: Vec<(String, String)> = Vec::new();
    let app_dir = crate::storage::get_app_data_dir();
    let generated_dir = app_dir.join("generated_images");

    if !generated_dir.exists() {
        fs::create_dir_all(&generated_dir).ok();
    }

    for record in records {
        if let Some(ref img_path) = record.image_filename {
            // Check if it's a data URL (base64) - decode and save it
            if img_path.starts_with("data:") {
                if let Some(base64_data) = img_path.split(',').nth(1) {
                    use base64::{engine::general_purpose::STANDARD, Engine as _};
                    if let Ok(decoded) = STANDARD.decode(base64_data) {
                        let filename = format!("{}.png", &record.id[..record.id.len().min(20)]);
                        let filepath = generated_dir.join(&filename);
                        if let Err(e) = fs::write(&filepath, &decoded) {
                            eprintln!("Failed to write base64 image {}: {}", filepath.display(), e);
                        } else {
                            images.push((filename.clone(), filepath.to_string_lossy().to_string()));
                        }
                    }
                }
                continue;
            }

            // Check if it's a local file path
            let full_path = generated_dir.join(img_path);
            if full_path.exists() {
                images.push((img_path.clone(), full_path.to_string_lossy().to_string()));
            } else if img_path.starts_with("http") {
                // It's a URL, we'll download it during export
                images.push((img_path.clone(), img_path.clone()));
            }
        }
    }

    images
}

pub fn generate_json_index(records: &[ExportRecord], package_name: &str) -> String {
    let json_data = serde_json::json!({
        "package_name": package_name,
        "export_time": get_current_datetime(),
        "total_records": records.len(),
        "records": records.iter().map(|r| {
            serde_json::json!({
                "id": r.id,
                "prompt": r.prompt,
                "model": r.model,
                "width": r.width,
                "height": r.height,
                "quality": r.quality,
                "created_at": r.created_at,
                "image": r.image_filename.as_ref().map(|f| format!("assets/images/{}", f))
            })
        }).collect::<Vec<_>>()
    });

    serde_json::to_string_pretty(&json_data).unwrap_or_default()
}

pub fn generate_markdown_index(records: &[ExportRecord], package_name: &str) -> String {
    let mut md = String::new();
    md.push_str(&format!("# {}\n\n", package_name));
    md.push_str(&format!("- **导出时间**: {}\n", get_current_datetime()));
    md.push_str(&format!("- **记录总数**: {}\n\n", records.len()));

    let mut models: std::collections::HashSet<String> = std::collections::HashSet::new();
    for r in records {
        models.insert(r.model.clone());
    }
    md.push_str(&format!(
        "- **使用的模型**: {}\n\n",
        models
            .iter()
            .map(|s| s.as_str())
            .collect::<Vec<_>>()
            .join(", ")
    ));

    md.push_str("## 记录列表\n\n");
    md.push_str("| # | 模型 | 提示词 | 图片 |\n");
    md.push_str("|---|------|--------|------|\n");

    for (i, r) in records.iter().enumerate() {
        let prompt_preview = if r.prompt.len() > 50 {
            format!("{}...", &r.prompt[..50])
        } else {
            r.prompt.clone()
        };
        let img_link = r
            .image_filename
            .as_ref()
            .map(|f| format!("[查看](assets/images/{})", f))
            .unwrap_or_else(|| "-".to_string());

        md.push_str(&format!(
            "| {} | {} | {} | {} |\n",
            i + 1,
            r.model,
            prompt_preview,
            img_link
        ));
    }

    md
}

pub fn create_export_package(
    query: ExportQuery,
    output_path: &str,
    package_name: Option<String>,
) -> Result<ExportPackage, String> {
    let records = collect_export_data(query.clone())?;

    if records.is_empty() {
        return Err("没有找到符合条件的记录".to_string());
    }

    let name = package_name.unwrap_or_else(|| format!("export_{}", get_export_timestamp()));
    let zip_path = if output_path.ends_with(".zip") {
        output_path.to_string()
    } else {
        format!("{}/{}.zip", output_path, name)
    };

    let file = File::create(&zip_path).map_err(|e| format!("创建ZIP文件失败: {}", e))?;
    let mut zip = ZipWriter::new(file);

    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o644);

    let images = collect_images_for_records(&records);
    let total_items = 2 + images.len();
    let mut current_item = 0;

    zip.start_file("index.json", options)
        .map_err(|e| format!("创建索引文件失败: {}", e))?;
    let json_content = generate_json_index(&records, &name);
    zip.write_all(json_content.as_bytes())
        .map_err(|e| format!("写入JSON失败: {}", e))?;
    current_item += 1;

    zip.start_file("README.md", options)
        .map_err(|e| format!("创建README失败: {}", e))?;
    let md_content = generate_markdown_index(&records, &name);
    zip.write_all(md_content.as_bytes())
        .map_err(|e| format!("写入Markdown失败: {}", e))?;
    current_item += 1;

    for (filename, full_path) in &images {
        let mut buffer: Vec<u8>;

        if full_path.starts_with("http") {
            // Download from URL
            let client = reqwest::blocking::Client::new();
            let response = client
                .get(full_path)
                .send()
                .map_err(|e| format!("下载图片失败 {}: {}", filename, e))?;
            buffer = response
                .bytes()
                .map_err(|e| format!("读取下载内容失败 {}: {}", filename, e))?
                .to_vec();
        } else {
            // Read from local file
            let mut img_file =
                File::open(full_path).map_err(|e| format!("打开图片失败 {}: {}", filename, e))?;
            buffer = Vec::new();
            img_file
                .read_to_end(&mut buffer)
                .map_err(|e| format!("读取图片失败 {}: {}", filename, e))?;
        }

        let archive_path = format!(
            "assets/images/{}",
            filename.split('/').last().unwrap_or(filename)
        );
        zip.start_file(&archive_path, options)
            .map_err(|e| format!("创建图片文件失败 {}: {}", filename, e))?;
        zip.write_all(&buffer)
            .map_err(|e| format!("写入图片失败 {}: {}", filename, e))?;

        current_item += 1;
    }

    zip.finish()
        .map_err(|e| format!("完成ZIP打包失败: {}", e))?;

    let models: Vec<String> = records
        .iter()
        .map(|r| r.model.clone())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    let summary = ExportSummary {
        total_records: records.len(),
        models_used: models,
        date_range: query.start_date.zip(query.end_date),
    };

    Ok(ExportPackage {
        name,
        export_time: get_current_datetime(),
        record_count: records.len(),
        summary,
    })
}
