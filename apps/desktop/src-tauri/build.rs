fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&[
                "send_request",
                "load_history",
                "delete_history_entry",
                "clear_history",
                "load_security_settings",
                "update_security_settings",
            ]),
        ),
    )
    .expect("failed to run tauri build script");
}
