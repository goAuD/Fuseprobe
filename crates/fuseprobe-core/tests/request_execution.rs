use std::thread;

use fuseprobe_core::{execute_request, RequestOptions, DEFAULT_MAX_RESPONSE_BYTES};
use tiny_http::{Header, Response, Server, StatusCode};

#[test]
fn defaults_to_no_redirect_following() {
    let options = RequestOptions::default();
    assert!(!options.follow_redirects);
    assert!(!options.allow_unsafe_targets);
}

#[test]
fn enforces_a_max_response_size() {
    let options = RequestOptions::default();
    assert_eq!(options.max_response_bytes, DEFAULT_MAX_RESPONSE_BYTES);
}

#[test]
fn keeps_a_timeout_default() {
    let options = RequestOptions::default();
    assert_eq!(options.timeout_seconds, 10);
}

#[test]
fn executes_json_requests_and_formats_the_response() {
    let server = Server::http("127.0.0.1:0").expect("server should bind");
    let address = format!("http://{}", server.server_addr());

    let worker = thread::spawn(move || {
        let request = server.recv().expect("request should arrive");
        assert_eq!(request.method().as_str(), "POST");
        assert_eq!(request.url(), "/users");

        let response = Response::from_string(r#"{"ok":true,"source":"rust"}"#)
            .with_status_code(StatusCode(200))
            .with_header(
                Header::from_bytes("Content-Type", "application/json; charset=utf-8")
                    .expect("header should be valid"),
            );

        request.respond(response).expect("response should be sent");
    });

    let result = execute_request(
        "POST",
        &format!("{address}/users"),
        r#"{"name":"Dana"}"#,
        "Accept: application/json",
        &unsafe_target_options(),
    )
    .expect("request should succeed");

    worker.join().expect("worker should exit");

    assert_eq!(result.status_code, 200);
    assert!(result.is_json);
    assert_eq!(result.content_type, "application/json");
    assert_eq!(result.charset, "utf-8");
    assert!(result.body.contains("\"ok\": true"));
    assert_eq!(result.raw_body, r#"{"ok":true,"source":"rust"}"#);
    assert_eq!(
        result.headers.get("content-type").map(String::as_str),
        Some("application/json; charset=utf-8")
    );
}

#[test]
fn rejects_invalid_header_lines_before_network_execution() {
    let error = execute_request(
        "GET",
        "https://example.com",
        "",
        "Authorization Bearer nope",
        &RequestOptions::default(),
    )
    .expect_err("header parsing should fail");

    assert_eq!(error, "Invalid header on line 1: expected 'Name: Value'");
}

#[test]
fn truncates_large_text_responses() {
    let server = Server::http("127.0.0.1:0").expect("server should bind");
    let address = format!("http://{}", server.server_addr());

    let worker = thread::spawn(move || {
        let request = server.recv().expect("request should arrive");
        let response = Response::from_string("a".repeat(32))
            .with_status_code(StatusCode(200))
            .with_header(
                Header::from_bytes("Content-Type", "text/plain; charset=utf-8")
                    .expect("header should be valid"),
            );

        request.respond(response).expect("response should be sent");
    });

    let options = RequestOptions {
        max_response_bytes: 8,
        ..unsafe_target_options()
    };

    let result =
        execute_request("GET", &address, "", "", &options).expect("request should succeed");

    worker.join().expect("worker should exit");

    assert!(result.truncated);
    assert!(result.body.contains("Output truncated at 8 bytes"));
}

#[test]
fn does_not_follow_redirects_and_redacts_sensitive_location_values() {
    let server = Server::http("127.0.0.1:0").expect("server should bind");
    let address = format!("http://{}", server.server_addr());
    let redirect_target = format!("{address}/target?token=secret");

    let worker = thread::spawn(move || {
        let request = server.recv().expect("request should arrive");
        assert_eq!(request.url(), "/redirect");

        let response = Response::empty(StatusCode(302)).with_header(
            Header::from_bytes("Location", redirect_target)
                .expect("location header should be valid"),
        );

        request.respond(response).expect("response should be sent");
    });

    let result = execute_request(
        "GET",
        &format!("{address}/redirect"),
        "",
        "",
        &unsafe_target_options(),
    )
    .expect("request should succeed");

    worker.join().expect("worker should exit");

    assert_eq!(result.status_code, 302);
    assert!(result.body.contains("Redirect not followed. Location:"));
    assert!(result.body.contains("token=%2A%2A%2A"));
    assert!(!result.body.contains("token=secret"));
}

#[test]
fn omits_binary_responses_from_text_rendering() {
    let server = Server::http("127.0.0.1:0").expect("server should bind");
    let address = format!("http://{}", server.server_addr());

    let worker = thread::spawn(move || {
        let request = server.recv().expect("request should arrive");
        let response = Response::from_data(vec![0_u8, 159, 146, 150])
            .with_status_code(StatusCode(200))
            .with_header(
                Header::from_bytes("Content-Type", "application/octet-stream")
                    .expect("header should be valid"),
            );

        request.respond(response).expect("response should be sent");
    });

    let result = execute_request("GET", &address, "", "", &unsafe_target_options())
        .expect("request should succeed");

    worker.join().expect("worker should exit");

    assert!(result.is_binary);
    assert!(!result.is_json);
    assert_eq!(result.content_type, "application/octet-stream");
    assert!(result
        .body
        .contains("[Binary response omitted: application/octet-stream"));
    assert_eq!(result.body, result.raw_body);
}

#[test]
fn rejects_local_targets_by_default() {
    let error = execute_request(
        "GET",
        "http://127.0.0.1:8080/health",
        "",
        "",
        &RequestOptions::default(),
    )
    .expect_err("loopback target should be rejected");

    assert!(error.contains("Unsafe mode / Local targets"));
}

fn unsafe_target_options() -> RequestOptions {
    RequestOptions {
        allow_unsafe_targets: true,
        ..RequestOptions::default()
    }
}
