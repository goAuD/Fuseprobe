mod commands;
mod paths;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::load())
        .invoke_handler(tauri::generate_handler![
            commands::request::send_request,
            commands::history::load_history,
            commands::history::delete_history_entry,
            commands::history::clear_history,
            commands::settings::load_security_settings,
            commands::settings::update_security_settings,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Fuseprobe desktop shell");
}
