mod api;
mod commands;

use api::create_api_router;
use commands::character_binding::{
    add_tag_to_reference, bind_character_reference, delete_reference_image, get_all_bindings,
    get_all_tags, get_bindings_for_prompt, get_character_binding, get_references_by_type,
    get_reference_images, load_bindings_from_file, load_tags_from_file, remove_tag_from_reference,
    save_reference_image, search_reference_images, unbind_character,
};
use commands::image_generator::{
    generate_image, get_default_api_config, get_default_generation_config,
    get_generation_progress, load_api_config, load_generation_config,
    save_api_config, save_generation_config, test_api_connection,
};
use commands::prompt_parser::{parse_prompt, test_parse};
use std::net::SocketAddr;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Window, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn save_image_to_file(image_url: String, file_path: String) -> Result<String, String> {
    if image_url.starts_with("data:image") {
        let base64_data = image_url
            .split(',')
            .nth(1)
            .ok_or("Invalid base64 data")?;
        let decoded = base64::Engine::decode(
            &base64::engine::general_purpose::STANDARD,
            base64_data,
        )
        .map_err(|e| e.to_string())?;
        std::fs::write(&file_path, decoded).map_err(|e| e.to_string())?;
        Ok(file_path)
    } else if image_url.starts_with("http://") || image_url.starts_with("https://") {
        let response = reqwest::get(&image_url)
            .await
            .map_err(|e| e.to_string())?;
        let bytes = response.bytes().await.map_err(|e| e.to_string())?;
        std::fs::write(&file_path, bytes).map_err(|e| e.to_string())?;
        Ok(file_path)
    } else {
        Err("Unsupported image format".to_string())
    }
}

#[tokio::main]
pub async fn main() {
    let _ = load_bindings_from_file();
    commands::image_generator::load_config_from_file();
    commands::character_binding::load_tags_from_file();

    let api_router = create_api_router();
    let addr = SocketAddr::from(([127, 0, 0, 1], 8888));
    
    let api_handle = tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
        println!("HTTP API running at http://{}", listener.local_addr().unwrap());
        axum::serve(listener, api_router).await.unwrap();
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let hide_item = MenuItem::with_id(app, "hide", "最小化到托盘", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(Image::from_path("icons/icon.png").unwrap_or_else(|_| {
                    Image::from_bytes(include_bytes!("../icons/32x32.png")).unwrap()
                }))
                .menu(&menu)
                .tooltip("泫晨懿然·灵犀绘梦助手")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "hide" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyP);
            let app_handle = app.handle().clone();
            app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
                println!("快捷键被触发, event: {:?}", event);
                if let Some(window) = app_handle.get_webview_window("main") {
                    let is_visible = window.is_visible().unwrap_or(false);
                    println!("窗口当前可见状态: {}", is_visible);
                    if is_visible {
                        println!("最小化到托盘");
                        let _ = window.hide();
                    } else {
                        println!("从托盘唤醒窗口");
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.unminimize();
                    }
                }
            })?;

            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });
            }

            Ok(())
        })
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
            get_reference_images,
            search_reference_images,
            add_tag_to_reference,
            remove_tag_from_reference,
            get_all_tags,
            get_references_by_type,
            generate_image,
            get_generation_progress,
            save_api_config,
            load_api_config,
            get_default_api_config,
            test_api_connection,
            save_generation_config,
            load_generation_config,
            get_default_generation_config,
            save_image_to_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    let _ = api_handle.await;
}
