mod api;
mod commands;
mod storage;

use api::create_api_router;
use commands::character_binding::{
    add_tag_to_reference, batch_add_tags, batch_delete_references, batch_move_to_folder,
    bind_character_reference, create_folder, delete_folder, delete_reference_image,
    get_all_bindings, get_all_tags, get_bindings_for_prompt, get_character_binding,
    get_folder_tree, get_folders, get_references_by_type, get_reference_images,
    load_bindings_from_file, load_folders_from_file, move_image_to_folder,
    remove_tag_from_reference, rename_folder, save_reference_image, search_reference_images,
    unbind_character,
};
use commands::image_generator::{
    generate_image, get_default_api_config, get_default_generation_config,
    get_generation_progress, load_api_config, load_generation_config,
    save_api_config, save_generation_config, test_api_connection,
};
use commands::prompt_parser::{batch_split_prompt, parse_prompt, test_parse};
use storage::Storage;
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

#[tauri::command]
fn save_text_to_file(content: String, file_path: String) -> Result<String, String> {
    std::fs::write(&file_path, content).map_err(|e| e.to_string())?;
    Ok(file_path)
}

// ==================== History Commands ====================

#[tauri::command]
fn add_history(history: storage::GenerationHistory) -> Result<storage::GenerationHistory, String> {
    storage::add_history(history)
}

#[tauri::command]
fn get_history(
    page: usize, 
    page_size: usize,
    model: Option<String>,
    prompt_keyword: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
    character: Option<String>,
    width_min: Option<u32>,
    width_max: Option<u32>,
    height_min: Option<u32>,
    height_max: Option<u32>,
    quality: Option<String>,
) -> Result<storage::GenerationHistoryList, String> {
    let filter = storage::HistoryFilter {
        model,
        prompt_keyword,
        start_date,
        end_date,
        character,
        width_min,
        width_max,
        height_min,
        height_max,
        quality,
    };
    storage::get_history(page, page_size, Some(filter))
}

#[tauri::command]
fn get_history_by_id(id: String) -> Result<Option<storage::GenerationHistory>, String> {
    storage::get_history_by_id(&id)
}

#[tauri::command]
fn update_history(id: String, history: storage::GenerationHistory) -> Result<storage::GenerationHistory, String> {
    storage::update_history(&id, history)
}

#[tauri::command]
fn delete_history(id: String) -> Result<(), String> {
    storage::delete_history(&id)
}

#[tauri::command]
fn clear_history() -> Result<(), String> {
    storage::clear_history()
}

// ==================== Character Binding Commands ====================

#[tauri::command]
fn add_character_binding(binding: storage::CharacterBindingData) -> Result<storage::CharacterBindingData, String> {
    storage::add_character_binding(binding)
}

#[tauri::command]
fn get_all_character_bindings() -> Result<Vec<storage::CharacterBindingData>, String> {
    storage::get_all_character_bindings()
}

#[tauri::command]
fn get_character_binding_by_id(id: String) -> Result<Option<storage::CharacterBindingData>, String> {
    storage::get_character_binding_by_id(&id)
}

#[tauri::command]
fn update_character_binding(id: String, binding: storage::CharacterBindingData) -> Result<storage::CharacterBindingData, String> {
    storage::update_character_binding(&id, binding)
}

#[tauri::command]
fn delete_character_binding(id: String) -> Result<(), String> {
    storage::delete_character_binding(&id)
}

// ==================== Image Organization Commands ====================

#[tauri::command]
fn analyze_reference_library() -> Result<commands::image_organization::OrganizationSuggestion, String> {
    let bindings = storage::get_all_character_bindings()?;
    commands::image_organization::analyze_reference_library(&bindings)
}

#[tauri::command]
fn execute_organization_action(action: commands::image_organization::OrganizationActionRequest) -> Result<commands::image_organization::OrganizationActionLog, String> {
    commands::image_organization::execute_organization_action(action)
}

#[tauri::command]
fn undo_organization_action(log_id: String) -> Result<commands::image_organization::OrganizationActionLog, String> {
    commands::image_organization::undo_organization_action(log_id)
}

#[tauri::command]
fn get_organization_action_log() -> Vec<commands::image_organization::OrganizationActionLog> {
    commands::image_organization::get_organization_action_log()
}

#[tauri::command]
fn delete_duplicate_images(character_names: Vec<String>, keep_representative: bool) -> Result<usize, String> {
    commands::image_organization::delete_duplicate_images(character_names, keep_representative)
}

// ==================== Export Package Commands (US-27) ====================

#[tauri::command]
fn create_export_package(
    query: commands::export_package::ExportQuery,
    output_path: String,
    package_name: Option<String>,
) -> Result<commands::export_package::ExportPackage, String> {
    commands::export_package::create_export_package(query, &output_path, package_name)
}

#[tauri::command]
fn preview_export_data(query: commands::export_package::ExportQuery) -> Result<Vec<commands::export_package::ExportRecord>, String> {
    commands::export_package::collect_export_data(query)
}

// ==================== Template Commands ====================

#[tauri::command]
fn add_template(template: storage::CharacterTemplate) -> Result<storage::CharacterTemplate, String> {
    storage::add_template(template)
}

#[tauri::command]
fn get_all_templates() -> Result<Vec<storage::CharacterTemplate>, String> {
    storage::get_all_templates()
}

#[tauri::command]
fn get_template_by_id(id: String) -> Result<Option<storage::CharacterTemplate>, String> {
    storage::get_template_by_id(&id)
}

#[tauri::command]
fn update_template(id: String, template: storage::CharacterTemplate) -> Result<storage::CharacterTemplate, String> {
    storage::update_template(&id, template)
}

#[tauri::command]
fn delete_template(id: String) -> Result<(), String> {
    storage::delete_template(&id)
}

// ==================== Prompt Template Commands (US-13) ====================

#[tauri::command]
fn add_prompt_template(
    template: storage::PromptTemplatePayload,
) -> Result<storage::PromptTemplate, String> {
    storage::add_prompt_template(template)
}

#[tauri::command]
fn get_all_prompt_templates() -> Result<Vec<storage::PromptTemplate>, String> {
    storage::get_all_prompt_templates()
}

#[tauri::command]
fn get_prompt_template_by_id(id: String) -> Result<Option<storage::PromptTemplate>, String> {
    storage::get_prompt_template_by_id(&id)
}

#[tauri::command]
fn update_prompt_template(
    id: String,
    template: storage::PromptTemplatePayload,
) -> Result<storage::PromptTemplate, String> {
    storage::update_prompt_template(&id, template)
}

#[tauri::command]
fn delete_prompt_template(id: String) -> Result<(), String> {
    storage::delete_prompt_template(&id)
}

#[tauri::command]
fn increment_template_usage(id: String) -> Result<(), String> {
    storage::increment_template_usage(&id)
}

#[tauri::command]
fn update_prompt_template_favorite(id: String, is_favorite: bool) -> Result<storage::PromptTemplate, String> {
    storage::update_prompt_template_favorite(&id, is_favorite)
}

#[tauri::command]
fn update_prompt_template_group(id: String, group: String) -> Result<storage::PromptTemplate, String> {
    storage::update_prompt_template_group(&id, &group)
}

#[tauri::command]
fn export_prompt_templates(ids: Vec<String>) -> Result<String, String> {
    let templates = storage::get_all_prompt_templates()?;
    let filtered: Vec<_> = templates.into_iter().filter(|t| ids.contains(&t.id)).collect();
    serde_json::to_string_pretty(&filtered).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_prompt_templates(json_data: String, strategy: String) -> Result<storage::ImportResult, String> {
    let templates: Vec<storage::PromptTemplate> = serde_json::from_str(&json_data).map_err(|e| e.to_string())?;
    storage::import_prompt_templates(templates, &strategy)
}

#[tauri::command]
fn add_prompt_history(prompt: String) -> Result<storage::PromptHistoryItem, String> {
    storage::add_prompt_history(prompt)
}

#[tauri::command]
fn get_prompt_history(limit: Option<usize>) -> Result<Vec<storage::PromptHistoryItem>, String> {
    storage::get_prompt_history(limit)
}

#[tauri::command]
fn delete_prompt_history(id: String) -> Result<(), String> {
    storage::delete_prompt_history(&id)
}

#[tauri::command]
fn clear_prompt_history() -> Result<(), String> {
    storage::clear_prompt_history()
}

// ==================== Saved Filter Commands ====================

#[tauri::command]
fn add_saved_filter(filter: storage::SavedFilter) -> Result<storage::SavedFilter, String> {
    storage::add_saved_filter(filter)
}

#[tauri::command]
fn get_saved_filters() -> Result<Vec<storage::SavedFilter>, String> {
    storage::get_saved_filters()
}

#[tauri::command]
fn delete_saved_filter(id: String) -> Result<bool, String> {
    storage::delete_saved_filter(&id)
}

// ==================== Settings Commands ====================

#[tauri::command]
fn get_settings() -> Result<storage::AppSettings, String> {
    storage::get_settings()
}

#[tauri::command]
fn save_settings(settings: storage::AppSettings) -> Result<storage::AppSettings, String> {
    storage::save_settings(settings)
}

// ==================== Statistics Commands ====================

#[tauri::command]
fn get_generation_stats(days: u32) -> Result<storage::GenerationStats, String> {
    storage::get_generation_stats(days)
}

#[tauri::command]
fn get_api_stats(limit: u32) -> Result<storage::ApiStats, String> {
    storage::get_api_stats(limit)
}

#[tauri::command]
fn get_template_stats() -> Result<storage::TemplateStats, String> {
    storage::get_template_stats()
}

#[tokio::main]
pub async fn main() {
    if let Err(e) = Storage::init() {
        eprintln!("存储初始化失败: {}", e);
    }
    
    let _ = load_bindings_from_file();
    let _ = load_folders_from_file();
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

            let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyP);
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
            batch_split_prompt,
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
            save_text_to_file,
            // History CRUD
            add_history,
            get_history,
            get_history_by_id,
            update_history,
            delete_history,
            clear_history,
            // Character Binding CRUD
            add_character_binding,
            get_all_character_bindings,
            get_character_binding_by_id,
            update_character_binding,
            delete_character_binding,
            // Template CRUD
            add_template,
            get_all_templates,
            get_template_by_id,
            update_template,
            delete_template,
            // Settings CRUD
            get_settings,
            save_settings,
            // Statistics
            get_generation_stats,
            get_api_stats,
            get_template_stats,
            // Folder CRUD
            create_folder,
            rename_folder,
            delete_folder,
            get_folders,
            get_folder_tree,
            move_image_to_folder,
            batch_delete_references,
            batch_move_to_folder,
            batch_add_tags,
            // Prompt Template CRUD
            add_prompt_template,
            get_all_prompt_templates,
            get_prompt_template_by_id,
            update_prompt_template,
            delete_prompt_template,
            increment_template_usage,
            update_prompt_template_favorite,
            update_prompt_template_group,
            export_prompt_templates,
            import_prompt_templates,
            add_prompt_history,
            get_prompt_history,
            delete_prompt_history,
            clear_prompt_history,
            add_saved_filter,
            get_saved_filters,
            delete_saved_filter,
            // Image Organization
            analyze_reference_library,
            execute_organization_action,
            undo_organization_action,
            get_organization_action_log,
            delete_duplicate_images,
            // Export Package (US-27)
            create_export_package,
            preview_export_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    let _ = api_handle.await;
}
