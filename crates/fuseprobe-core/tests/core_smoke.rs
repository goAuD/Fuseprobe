use fuseprobe_core::version;

#[test]
fn exposes_core_version() {
    assert!(!version().is_empty());
}
