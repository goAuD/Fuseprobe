use fuseprobe_core::{classify_response, BodyKind};

#[test]
fn recognizes_json_content_types_with_suffix() {
    let result = classify_response("application/problem+json", br#"{"ok":true}"#);
    assert_eq!(result.kind, BodyKind::Json);
}

#[test]
fn marks_non_text_responses_as_binary() {
    let result = classify_response("application/octet-stream", &[0, 159, 146, 150]);
    assert_eq!(result.kind, BodyKind::Binary);
}

#[test]
fn treats_utf8_without_content_type_as_text() {
    let result = classify_response("", b"hello");
    assert_eq!(result.kind, BodyKind::Text);
}
