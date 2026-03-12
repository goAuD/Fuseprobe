mod commands;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::request::send_request,
            commands::history::load_history,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Fuseprobe desktop shell");
}
