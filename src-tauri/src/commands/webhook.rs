use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookPayload {
    pub event: String,
    pub timestamp: String,
    pub data: WebhookData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookData {
    pub task_id: String,
    pub status: String,
    pub images: Vec<String>,
    pub prompt: String,
    pub model: String,
}

pub fn send_webhook(
    url: &str,
    secret: &str,
    payload: &WebhookPayload,
    retry_count: u32,
) -> Result<(), String> {
    if url.is_empty() {
        return Err("Webhook URL is empty".to_string());
    }

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let payload_json = serde_json::to_string(payload).map_err(|e| e.to_string())?;

    let mut last_error = String::new();

    for attempt in 0..retry_count.max(1) {
        if attempt > 0 {
            println!("Webhook retry attempt {} of {}", attempt, retry_count);
            std::thread::sleep(Duration::from_secs(2_u64.pow(attempt as u32)));
        }

        let mut request = client.post(url);

        if !secret.is_empty() {
            use sha2::{Digest, Sha256};
            let mut hasher = Sha256::new();
            hasher.update(payload_json.as_bytes());
            hasher.update(secret.as_bytes());
            let signature = format!("{:x}", hasher.finalize());
            request = request.header("X-Webhook-Signature", signature);
        }

        request = request
            .header("Content-Type", "application/json")
            .header("User-Agent", "Xuanchen-Huiben/1.0");

        match request.body(payload_json.clone()).send() {
            Ok(response) => {
                if response.status().is_success() {
                    println!("Webhook sent successfully to {}", url);
                    return Ok(());
                } else {
                    last_error = format!("HTTP {}", response.status());
                    println!("Webhook failed: {}", last_error);
                }
            }
            Err(e) => {
                last_error = e.to_string();
                println!("Webhook request error: {}", last_error);
            }
        }
    }

    Err(format!(
        "Webhook failed after {} attempts: {}",
        retry_count, last_error
    ))
}

pub fn create_webhook_payload(
    task_id: &str,
    status: &str,
    images: Vec<String>,
    prompt: &str,
    model: &str,
) -> WebhookPayload {
    WebhookPayload {
        event: if status == "success" {
            "generation.completed".to_string()
        } else {
            "generation.failed".to_string()
        },
        timestamp: chrono::Utc::now().to_rfc3339(),
        data: WebhookData {
            task_id: task_id.to_string(),
            status: status.to_string(),
            images,
            prompt: prompt.to_string(),
            model: model.to_string(),
        },
    }
}
