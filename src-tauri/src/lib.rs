mod api;
mod commands;

use api::create_api_router;
use commands::character_binding::{
    bind_character_reference, delete_reference_image, get_all_bindings, get_bindings_for_prompt,
    get_character_binding, load_bindings_from_file, save_reference_image, unbind_character,
};
use commands::image_generator::{
    generate_image, get_default_api_config, get_default_generation_config,
    get_generation_progress, load_api_config, load_generation_config,
    save_api_config, save_generation_config, test_api_connection,
};
use commands::prompt_parser::{parse_prompt, test_parse};
use std::net::SocketAddr;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tokio::main]
pub async fn main() {
    let _ = load_bindings_from_file();
    commands::image_generator::load_config_from_file();

    let api_router = create_api_router();
    let addr = SocketAddr::from(([127, 0, 0, 1], 8888));
    
    let api_handle = tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        println!("HTTP API running at http://{}", listener.local_addr().unwrap());
        axum::serve(listener, api_router).await.unwrap();
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            parse_prompt,
            test_parse,
            save_reference_image,
            bind_character_reference,
            unbind_character,
            get_character_binding,
            get_all_bindings,
            get_bindings_for_prompt,
            delete_reference_image,
            generate_image,
            get_generation_progress,
            save_api_config,
            load_api_config,
            get_default_api_config,
            test_api_connection,
            save_generation_config,
            load_generation_config,
            get_default_generation_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    let _ = api_handle.await;
}
