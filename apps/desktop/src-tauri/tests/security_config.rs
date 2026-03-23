use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

use serde_json::Value;

fn fixture_path(relative: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(relative)
}

#[test]
fn tauri_config_uses_a_non_null_csp() {
    let payload = fs::read_to_string(fixture_path("tauri.conf.json"))
        .expect("tauri config should be readable");
    let config: Value = serde_json::from_str(&payload).expect("tauri config should be valid json");

    let csp = config
        .get("app")
        .and_then(|app| app.get("security"))
        .and_then(|security| security.get("csp"))
        .and_then(Value::as_str)
        .expect("tauri csp should be a string");

    assert!(!csp.trim().is_empty(), "csp should not be empty");
    assert!(
        csp.contains("script-src 'self'") || csp.contains("default-src 'self'"),
        "csp should restrict script execution to local bundled assets"
    );
    assert!(
        csp.contains("connect-src"),
        "csp should explicitly scope connection targets"
    );
    assert!(
        csp.contains("object-src 'none'"),
        "csp should disable legacy plugin/object execution"
    );
    assert!(
        !csp.contains("'unsafe-inline'"),
        "csp should not allow inline script or style execution"
    );
}

#[test]
fn default_capability_does_not_use_core_default() {
    let payload = fs::read_to_string(fixture_path("capabilities/default.json"))
        .expect("default capability should be readable");
    let capability: Value =
        serde_json::from_str(&payload).expect("default capability should be valid json");

    let permissions = capability
        .get("permissions")
        .and_then(Value::as_array)
        .expect("permissions should be an array")
        .iter()
        .filter_map(Value::as_str)
        .collect::<BTreeSet<_>>();

    assert!(
        !permissions.contains("core:default"),
        "default capability must not re-enable the full core permission bundle"
    );

    let expected_permissions = BTreeSet::from([
        "allow-send-request",
        "allow-load-history",
        "allow-delete-history-entry",
        "allow-clear-history",
        "allow-load-security-settings",
        "allow-update-security-settings",
    ]);

    assert_eq!(
        permissions, expected_permissions,
        "default capability should expose only the audited desktop command surface"
    );
}
