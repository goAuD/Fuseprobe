use std::net::{IpAddr, Ipv4Addr};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;

use fuseprobe_core::{
    execute_request, execute_request_with_resolver, HostResolver, RequestOptions,
    DEFAULT_MAX_REQUEST_BODY_BYTES, DEFAULT_MAX_REQUEST_HEADERS_BYTES, DEFAULT_MAX_RESPONSE_BYTES,
};
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
fn rejects_oversized_request_bodies_before_network_execution() {
    let body = "a".repeat(DEFAULT_MAX_REQUEST_BODY_BYTES + 1);

    let error = execute_request(
        "POST",
        "https://example.com/users",
        &body,
        "",
        &RequestOptions::default(),
    )
    .expect_err("oversized body should be rejected");

    assert_eq!(
        error,
        format!(
            "Request body exceeds the {} byte limit",
            DEFAULT_MAX_REQUEST_BODY_BYTES
        )
    );
}

#[test]
fn rejects_oversized_request_headers_before_header_parsing() {
    let headers = format!(
        "X-Long: {}",
        "a".repeat(DEFAULT_MAX_REQUEST_HEADERS_BYTES + 1)
    );

    let error = execute_request(
        "GET",
        "https://example.com/users",
        "",
        &headers,
        &RequestOptions::default(),
    )
    .expect_err("oversized headers should be rejected");

    assert_eq!(
        error,
        format!(
            "Request headers exceed the {} byte limit",
            DEFAULT_MAX_REQUEST_HEADERS_BYTES
        )
    );
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
    assert_eq!(result.body, "aaaaaaaa");
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
    let expected_redirect = format!("{address}/target?token=%2A%2A%2A");
    assert_eq!(
        result.redirect_location.as_deref(),
        Some(expected_redirect.as_str())
    );
    assert!(result.body.is_empty());
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
    assert!(result.body.is_empty());
    assert!(result.raw_body.is_empty());
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

// Audit finding A1: validation resolves the hostname once; the connection must
// reuse that validated address instead of re-resolving the name, even when a
// hostile resolver answers with a loopback address on the second lookup.
#[test]
fn connects_to_the_validated_address_even_when_dns_rebinds() {
    struct RebindingResolver {
        first_call_done: AtomicBool,
        calls: std::sync::atomic::AtomicUsize,
    }

    impl HostResolver for RebindingResolver {
        fn resolve(&self, _host: &str, _port: u16) -> Result<Vec<IpAddr>, String> {
            self.calls.fetch_add(1, Ordering::SeqCst);
            if self.first_call_done.swap(true, Ordering::SeqCst) {
                // Second answer: the attacker's loopback service.
                Ok(vec![IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1))])
            } else {
                // First answer: a public TEST-NET address the policy accepts.
                Ok(vec![IpAddr::V4(Ipv4Addr::new(203, 0, 113, 10))])
            }
        }
    }

    let server = Server::http("127.0.0.1:0").expect("server should bind");
    let (request_served, request_served_rx) = std::sync::mpsc::channel::<()>();

    // The worker stays detached: a correct run never contacts this listener,
    // so joining it would block forever.
    thread::spawn(move || {
        if let Ok(request) = server.recv() {
            let _ = request.respond(Response::from_string("attacker-controlled"));
            let _ = request_served.send(());
        }
    });

    let resolver = Arc::new(RebindingResolver {
        first_call_done: AtomicBool::new(false),
        calls: std::sync::atomic::AtomicUsize::new(0),
    });

    let result = execute_request_with_resolver(
        "GET",
        "http://fuseprobe-rebind.test/",
        "",
        "",
        &RequestOptions {
            timeout_seconds: 2,
            ..RequestOptions::default()
        },
        Arc::clone(&resolver) as Arc<dyn HostResolver>,
    );

    assert!(
        result.is_err(),
        "the connection must target the validated TEST-NET address, not the loopback listener"
    );
    assert!(
        request_served_rx.try_recv().is_err(),
        "the rebinding loopback listener must not receive the validated request"
    );
    assert_eq!(
        resolver.calls.load(Ordering::SeqCst),
        1,
        "the connection must reuse the validated resolution instead of re-resolving"
    );
}

// Audit finding A2: when redirect following is enabled, every hop is
// revalidated and followed through the pinned resolver.
#[test]
fn follows_redirects_and_revalidates_each_hop() {
    let server = Server::http("127.0.0.1:0").expect("server should bind");
    let address = format!("http://{}", server.server_addr());
    let final_address = format!("{address}/final");

    let worker = thread::spawn(move || {
        let first = server.recv().expect("first request should arrive");
        assert_eq!(first.url(), "/redirect");
        first
            .respond(
                Response::empty(StatusCode(302)).with_header(
                    Header::from_bytes("Location", final_address)
                        .expect("location header should be valid"),
                ),
            )
            .expect("redirect should be sent");

        let second = server.recv().expect("second request should arrive");
        assert_eq!(second.url(), "/final");
        second
            .respond(
                Response::from_string("final-stop").with_status_code(StatusCode(200)),
            )
            .expect("response should be sent");
    });

    let result = execute_request(
        "GET",
        &format!("{address}/redirect"),
        "",
        "",
        &RequestOptions {
            follow_redirects: true,
            ..unsafe_target_options()
        },
    )
    .expect("redirect chain should be followed");

    worker.join().expect("worker should exit");

    assert_eq!(result.status_code, 200);
    assert!(result.body.contains("final-stop"));
}

#[test]
fn stops_redirect_chains_after_the_limit() {
    let server = Server::http("127.0.0.1:0").expect("server should bind");
    let address = format!("http://{}", server.server_addr());
    let hop_address = address.clone();

    let worker = thread::spawn(move || {
        for hop in 0..11 {
            let request = server.recv().expect("redirect request should arrive");
            assert_eq!(request.url(), format!("/hop{hop}"));
            request
                .respond(
                    Response::empty(StatusCode(302)).with_header(
                        Header::from_bytes("Location", format!("{hop_address}/hop{}", hop + 1))
                            .expect("location header should be valid"),
                    ),
                )
                .expect("redirect should be sent");
        }
    });

    let error = execute_request(
        "GET",
        &format!("{address}/hop0"),
        "",
        "",
        &RequestOptions {
            follow_redirects: true,
            ..unsafe_target_options()
        },
    )
    .expect_err("an 11-hop redirect chain must hit the limit");

    worker.join().expect("worker should exit");
    // reqwest wraps `attempt.error(...)` payloads in its error source, so the
    // top-level message names the redirect failure; the 11-hop chain proves the
    // limit (the worker served exactly hop0..hop10).
    assert!(error.contains("error following redirect"));
}

// Audit area B: header values with control characters (CRLF injection, NUL)
// are rejected before any network I/O happens. Non-ASCII bytes (obs-text) are
// RFC-legal field bytes and stay allowed.
#[test]
fn rejects_header_values_with_control_characters_before_network_io() {
    let control_char_error = execute_request(
        "GET",
        "http://example.com/",
        "",
        "X-Injection: value\rX-Second: injected",
        &RequestOptions::default(),
    )
    .expect_err("control characters in header values must be rejected");

    assert!(control_char_error.contains("Invalid header on line 1"));
    assert!(control_char_error.contains("control characters"));

    let nul_error = execute_request(
        "GET",
        "http://example.com/",
        "",
        "X-Note: value\u{0}tail",
        &RequestOptions::default(),
    )
    .expect_err("NUL bytes in header values must be rejected");

    assert!(nul_error.contains("Invalid header on line 1"));
}

fn unsafe_target_options() -> RequestOptions {
    RequestOptions {
        allow_unsafe_targets: true,
        ..RequestOptions::default()
    }
}
