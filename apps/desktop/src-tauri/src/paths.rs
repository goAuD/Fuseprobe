use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct StoragePaths {
    pub history_file: PathBuf,
    pub settings_file: PathBuf,
    pub legacy_history_files: Vec<PathBuf>,
    pub legacy_settings_files: Vec<PathBuf>,
}

pub fn resolve_storage_paths() -> Result<StoragePaths, String> {
    let config_root = dirs::config_dir().ok_or_else(|| {
        "Fuseprobe could not resolve a local config directory. Persistent settings and history are unavailable.".to_string()
    })?;
    let app_dir = config_root.join("Fuseprobe");
    let (legacy_history_files, legacy_settings_files) = if let Some(home_root) = dirs::home_dir() {
        let legacy_fuseprobe_dir = home_root.join(".fuseprobe");
        let legacy_nanoman_dir = home_root.join(".nanoman");
        (
            vec![
                legacy_fuseprobe_dir.join("history.json"),
                legacy_nanoman_dir.join("history.json"),
            ],
            vec![legacy_fuseprobe_dir.join("settings.json")],
        )
    } else {
        (Vec::new(), Vec::new())
    };

    Ok(StoragePaths {
        history_file: app_dir.join("history.json"),
        settings_file: app_dir.join("settings.json"),
        legacy_history_files,
        legacy_settings_files,
    })
}

#[cfg(test)]
mod tests {
    use super::resolve_storage_paths;

    #[test]
    fn resolves_storage_inside_the_os_config_directory() {
        let paths = resolve_storage_paths().expect("storage paths should resolve");
        let config_root = dirs::config_dir().expect("os config dir should exist");

        assert!(paths.history_file.starts_with(&config_root));
        assert!(paths.settings_file.starts_with(&config_root));
        assert_eq!(
            paths.history_file.parent().expect("history parent"),
            paths.settings_file.parent().expect("settings parent"),
        );
    }
}
