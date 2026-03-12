use url::Url;

const SENSITIVE_QUERY_KEYS: &[&str] = &[
    "access_token",
    "api_key",
    "apikey",
    "auth",
    "client_secret",
    "key",
    "password",
    "secret",
    "signature",
    "token",
];

pub fn redact_url(input: &str) -> String {
    if input.is_empty() {
        return input.to_string();
    }

    let Ok(mut parsed) = Url::parse(input) else {
        return input.to_string();
    };

    if parsed.query().is_none() {
        return input.to_string();
    }

    let redacted_query = parsed
        .query_pairs()
        .map(|(key, value)| {
            let key = key.into_owned();
            let encoded_key = encode_form_component(&key, true);
            let encoded_value = if SENSITIVE_QUERY_KEYS.contains(&key.to_ascii_lowercase().as_str())
            {
                "%2A%2A%2A".to_string()
            } else {
                encode_form_component(&value, false)
            };

            format!("{}={}", encoded_key, encoded_value)
        })
        .collect::<Vec<_>>()
        .join("&");

    parsed.set_query(Some(&redacted_query));
    parsed.to_string()
}

fn encode_form_component(value: &str, is_key: bool) -> String {
    let serialized = if is_key {
        let mut serializer = url::form_urlencoded::Serializer::new(String::new());
        serializer.append_pair(value, "v");
        serializer.finish()
    } else {
        let mut serializer = url::form_urlencoded::Serializer::new(String::new());
        serializer.append_pair("k", value);
        serializer.finish()
    };

    if is_key {
        serialized
            .rsplit_once('=')
            .map(|(key, _)| key.to_string())
            .unwrap_or(serialized)
    } else {
        serialized
            .split_once('=')
            .map(|(_, encoded)| encoded.to_string())
            .unwrap_or(serialized)
    }
}
