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

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FormattedResponse {
    pub body: String,
    pub raw_text: String,
    pub is_json: bool,
    pub is_binary: bool,
    pub truncated: bool,
    pub content_type: String,
    pub byte_count: usize,
    pub charset: String,
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

pub fn extract_charset(content_type: &str) -> String {
    if content_type.is_empty() {
        return "utf-8".to_string();
    }

    for part in content_type.split(';').skip(1) {
        let mut segments = part.trim().splitn(2, '=');
        let key = segments.next().unwrap_or_default().trim();
        let value = segments.next().unwrap_or_default().trim().trim_matches('"');
        if key.eq_ignore_ascii_case("charset") && !value.is_empty() {
            return value.to_string();
        }
    }

    "utf-8".to_string()
}

pub fn format_response_body(
    content_type: &str,
    raw_body: &[u8],
    truncated: bool,
) -> FormattedResponse {
    let raw_body = raw_body.to_vec();
    let format = classify_response(content_type, &raw_body);
    let charset = extract_charset(content_type);

    if format.kind == BodyKind::Binary {
        return FormattedResponse {
            body: String::new(),
            raw_text: String::new(),
            is_json: false,
            is_binary: true,
            truncated,
            content_type: format.content_type,
            byte_count: raw_body.len(),
            charset,
        };
    }

    let raw_text = decode_text_body(&raw_body, &charset);
    let mut rendered_body = raw_text.clone();
    let is_json = format.kind == BodyKind::Json;

    if is_json {
        rendered_body = prettify_json(&rendered_body);
    }

    FormattedResponse {
        body: rendered_body,
        raw_text,
        is_json,
        is_binary: false,
        truncated,
        content_type: format.content_type,
        byte_count: raw_body.len(),
        charset,
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

fn decode_text_body(raw_body: &[u8], charset: &str) -> String {
    match charset.to_ascii_lowercase().as_str() {
        "utf-8" | "utf8" | "" => String::from_utf8_lossy(raw_body).into_owned(),
        "us-ascii" | "ascii" => raw_body.iter().map(|byte| *byte as char).collect(),
        _ => String::from_utf8_lossy(raw_body).into_owned(),
    }
}

fn prettify_json(text: &str) -> String {
    serde_json::from_str::<serde_json::Value>(text)
        .and_then(|value| serde_json::to_string_pretty(&value))
        .unwrap_or_else(|_| text.to_string())
}
