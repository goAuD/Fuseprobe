const TEXTUAL_CONTENT_TYPE_PREFIXES: &[&str] = &[
    "text/",
    "application/javascript",
    "application/problem+json",
    "application/x-www-form-urlencoded",
    "application/xml",
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BodyKind {
    Json,
    Text,
    Binary,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FormatResult {
    pub kind: BodyKind,
    pub content_type: String,
    pub byte_count: usize,
}

pub fn classify_response(content_type: &str, bytes: &[u8]) -> FormatResult {
    let mime_type = content_type
        .split(';')
        .next()
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();

    let kind = if is_json_content_type(content_type) {
        BodyKind::Json
    } else if is_textual_content_type(&mime_type)
        || (mime_type.is_empty() && is_probably_text(bytes))
    {
        BodyKind::Text
    } else {
        BodyKind::Binary
    };

    FormatResult {
        kind,
        content_type: mime_type,
        byte_count: bytes.len(),
    }
}

fn is_json_content_type(content_type: &str) -> bool {
    let mime_type = content_type
        .split(';')
        .next()
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();

    mime_type == "application/json" || mime_type.ends_with("+json")
}

fn is_textual_content_type(content_type: &str) -> bool {
    if content_type.is_empty() {
        return false;
    }

    if is_json_content_type(content_type) || content_type.ends_with("+xml") {
        return true;
    }

    TEXTUAL_CONTENT_TYPE_PREFIXES
        .iter()
        .any(|prefix| content_type.starts_with(prefix))
}

fn is_probably_text(raw_body: &[u8]) -> bool {
    raw_body.is_empty() || std::str::from_utf8(raw_body).is_ok()
}
