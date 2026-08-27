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

    strip_userinfo(&mut parsed);

    if parsed.query().is_none() {
        return parsed.to_string();
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

pub fn redact_url_for_history(input: &str) -> String {
    if input.is_empty() {
        return input.to_string();
    }

    let Ok(mut parsed) = Url::parse(input) else {
        return input.to_string();
    };

    parsed.set_fragment(None);
    strip_userinfo(&mut parsed);

    if parsed.query().is_none() {
        return parsed.to_string();
    }

    let redacted_query = parsed
        .query_pairs()
        .map(|(key, _)| {
            let key = key.into_owned();
            let encoded_key = encode_form_component(&key, true);
            format!("{encoded_key}=%2A%2A%2A")
        })
        .collect::<Vec<_>>()
        .join("&");

    parsed.set_query(Some(&redacted_query));
    parsed.to_string()
}

/// Removes `user:password@` userinfo from the URL authority so stored or
/// displayed URLs never carry embedded credentials (audit finding C).
///
/// `Url::set_username(Some(""))` fails when a password is present with an
/// empty username (e.g. `http://:secret@example.com/`), so the password is
/// cleared first and the username afterwards.
fn strip_userinfo(parsed: &mut Url) {
    if parsed.username().is_empty() && parsed.password().is_none() {
        return;
    }

    let _ = parsed.set_password(None);
    let _ = parsed.set_username("");
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

#[cfg(test)]
mod tests {
    use super::{redact_url, redact_url_for_history};

    #[test]
    fn strips_embedded_userinfo_from_displayed_urls() {
        assert_eq!(
            redact_url("https://user:hunter2@example.com/api?token=abc"),
            "https://example.com/api?token=%2A%2A%2A"
        );
        assert_eq!(
            redact_url("https://user:hunter2@example.com/api"),
            "https://example.com/api"
        );
    }

    #[test]
    fn strips_embedded_userinfo_from_history_urls() {
        assert_eq!(
            redact_url_for_history("http://admin:secret@example.com/users?page=2#top"),
            "http://example.com/users?page=%2A%2A%2A"
        );
        assert_eq!(
            redact_url_for_history("http://:password-only@example.com/"),
            "http://example.com/"
        );
    }

    #[test]
    fn leaves_urls_without_userinfo_structurally_unchanged() {
        assert_eq!(
            redact_url_for_history("http://example.com/users"),
            "http://example.com/users"
        );
        assert_eq!(
            redact_url("http://example.com/users?page=2"),
            "http://example.com/users?page=2"
        );
    }

    #[test]
    fn redacts_sensitive_query_values_in_displayed_urls() {
        assert_eq!(
            redact_url("https://example.com/api?api_key=abc123&ok=1"),
            "https://example.com/api?api_key=%2A%2A%2A&ok=1"
        );
    }

    #[test]
    fn drops_fragments_and_redacts_all_query_names_for_history() {
        assert_eq!(
            redact_url_for_history("https://example.com/api?ok=1#profile"),
            "https://example.com/api?ok=%2A%2A%2A"
        );
    }
}
