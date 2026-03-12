use std::thread;

use fuseprobe_core::{execute_request, RequestOptions, DEFAULT_MAX_RESPONSE_BYTES};
use tiny_http::{Header, Response, Server, StatusCode};

#[test]
fn defaults_to_no_redirect_following() {
    let options = RequestOptions::default();
    assert!(!options.follow_redirects);
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
        &RequestOptions::default(),
    )
    .expect("request should succeed");

    worker.join().expect("worker should exit");

    assert_eq!(result.status_code, 200);
    assert!(result.is_json);
    assert_eq!(result.content_type, "application/json");
    assert_eq!(result.charset, "utf-8");
    assert!(result.body.contains("\"ok\": true"));
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
        ..RequestOptions::default()
    };

    let result = execute_request("GET", &address, "", "", &options)
        .expect("request should succeed");

    worker.join().expect("worker should exit");

    assert!(result.truncated);
    assert!(result.body.contains("Output truncated at 8 bytes"));
}
