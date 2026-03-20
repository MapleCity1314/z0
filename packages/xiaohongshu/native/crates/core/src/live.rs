use reqwest::blocking::Client;
use reqwest::header::{HeaderMap, HeaderValue, COOKIE, REFERER, USER_AGENT};
use serde_json::{json, Value};
use std::env;

pub fn supports_command(cli_args: &[String]) -> bool {
    matches!(cli_args.first().map(String::as_str), Some("read"))
}

pub fn execute(cli_args: &[String]) -> Result<Value, String> {
    match cli_args.first().map(String::as_str) {
        Some("read") => read_payload(cli_args),
        _ => Err("Xiaohongshu native live command is not supported.".to_string()),
    }
}

fn read_payload(cli_args: &[String]) -> Result<Value, String> {
    let note_id_or_url = cli_args
        .get(1)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Xiaohongshu read requires a note id or URL.".to_string())?;
    let (note_id, xsec_token, xsec_source) = parse_note_reference(note_id_or_url);
    let url = if xsec_token.is_empty() {
        format!("https://www.xiaohongshu.com/explore/{note_id}")
    } else {
        format!(
            "https://www.xiaohongshu.com/explore/{note_id}?xsec_token={xsec_token}&xsec_source={}",
            if xsec_source.is_empty() {
                "pc_search"
            } else {
                xsec_source.as_str()
            }
        )
    };
    let html = fetch_html(&url)?;
    let state = parse_initial_state(&html)?;
    let note = extract_note(&state, &note_id)?;
    Ok(json!({
        "note": normalize_note(&note, &xsec_token, &xsec_source),
        "source": "native-live"
    }))
}

fn fetch_html(url: &str) -> Result<String, String> {
    let client = Client::builder()
        .build()
        .map_err(|error| error.to_string())?;
    let response = client
        .get(url)
        .headers(build_headers(url)?)
        .send()
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        return Err(format!(
            "Xiaohongshu note request failed with HTTP {}",
            response.status().as_u16()
        ));
    }

    response.text().map_err(|error| error.to_string())
}

fn build_headers(url: &str) -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();
    headers.insert(
        USER_AGENT,
        HeaderValue::from_static(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        ),
    );
    headers.insert(
        REFERER,
        HeaderValue::from_str(url).map_err(|error| error.to_string())?,
    );
    if let Some(cookie) = cookie_header() {
        headers.insert(
            COOKIE,
            HeaderValue::from_str(&cookie).map_err(|error| error.to_string())?,
        );
    }
    Ok(headers)
}

fn cookie_header() -> Option<String> {
    let a1 = env::var("XHS_A1")
        .ok()
        .or_else(|| env::var("XIAOHONGSHU_A1").ok())?;
    if a1.trim().is_empty() {
        None
    } else {
        Some(format!("a1={a1}"))
    }
}

fn parse_note_reference(value: &str) -> (String, String, String) {
    let trimmed = value.trim();
    let note_id = trimmed
        .split('/')
        .filter_map(|part| {
            let candidate = part.split('?').next().unwrap_or_default().trim();
            if candidate.is_empty()
                || candidate.contains("http")
                || matches!(candidate, "explore" | "discovery" | "item")
                || candidate.contains('.')
            {
                None
            } else {
                Some(candidate)
            }
        })
        .next_back()
        .unwrap_or(trimmed)
        .split('?')
        .next()
        .unwrap_or(trimmed)
        .to_string();
    let query = trimmed.split('?').nth(1).unwrap_or_default();
    let xsec_token = extract_query_value(query, "xsec_token");
    let xsec_source = extract_query_value(query, "xsec_source");
    (note_id, xsec_token, xsec_source)
}

fn extract_query_value(query: &str, key: &str) -> String {
    query
        .split('&')
        .find(|pair| pair.starts_with(&format!("{key}=")))
        .and_then(|pair| pair.split('=').nth(1))
        .unwrap_or_default()
        .to_string()
}

fn parse_initial_state(html: &str) -> Result<Value, String> {
    let marker = "window.__INITIAL_STATE__=";
    let start = html
        .find(marker)
        .ok_or_else(|| "Could not parse __INITIAL_STATE__ from HTML".to_string())?;
    let raw = extract_json_assignment(&html[start + marker.len()..])?;
    let cleaned = raw
        .replace(": undefined", ": \"\"")
        .replace(", undefined", ", \"\"");
    serde_json::from_str(&cleaned)
        .map_err(|error| format!("Failed to parse __INITIAL_STATE__ JSON: {error}"))
}

fn extract_json_assignment(script: &str) -> Result<&str, String> {
    let trimmed = script.trim_start();
    let start = trimmed
        .find('{')
        .ok_or_else(|| "Could not locate JSON body in __INITIAL_STATE__".to_string())?;
    let mut depth = 0usize;
    let mut in_string = false;
    let mut escaped = false;

    for (index, ch) in trimmed[start..].char_indices() {
        if escaped {
            escaped = false;
            continue;
        }

        match ch {
            '\\' if in_string => escaped = true,
            '"' => in_string = !in_string,
            '{' if !in_string => depth += 1,
            '}' if !in_string => {
                depth = depth.saturating_sub(1);
                if depth == 0 {
                    let end = start + index + ch.len_utf8();
                    return Ok(trimmed[start..end].trim());
                }
            }
            _ => {}
        }
    }

    Err("Could not locate complete __INITIAL_STATE__ JSON payload".to_string())
}

fn extract_note(state: &Value, note_id: &str) -> Result<Value, String> {
    let detail_map = state
        .get("note")
        .and_then(|note| note.get("noteDetailMap"))
        .and_then(Value::as_object)
        .ok_or_else(|| "Note not found in HTML state: empty noteDetailMap".to_string())?;

    let entry = detail_map
        .get(note_id)
        .or_else(|| detail_map.values().next())
        .and_then(|entry| entry.get("note"))
        .cloned()
        .ok_or_else(|| "Note not found in HTML state".to_string())?;

    Ok(entry)
}

fn normalize_note(note: &Value, xsec_token: &str, xsec_source: &str) -> Value {
    let user = note.get("user").unwrap_or(&Value::Null);
    let interact = note.get("interact_info").unwrap_or(&Value::Null);
    let tags = note
        .get("tag_list")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.get("name").and_then(Value::as_str))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let note_id = note
        .get("note_id")
        .or_else(|| note.get("id"))
        .and_then(Value::as_str)
        .unwrap_or_default();
    json!({
        "id": note_id,
        "title": note
            .get("title")
            .or_else(|| note.get("display_title"))
            .and_then(Value::as_str)
            .unwrap_or_default(),
        "content": note.get("desc").and_then(Value::as_str).unwrap_or_default(),
        "author": user.get("nickname").and_then(Value::as_str).unwrap_or_default(),
        "author_info": {
            "user_id": user.get("user_id").and_then(Value::as_str).unwrap_or_default(),
            "nickname": user.get("nickname").and_then(Value::as_str).unwrap_or_default(),
            "avatar": user.get("image").and_then(Value::as_str).unwrap_or_default()
        },
        "note_type": match note.get("type").and_then(Value::as_str).unwrap_or_default() {
            "video" => "video",
            _ => "image"
        },
        "liked_count": stringify_count(interact.get("liked_count")),
        "collected_count": stringify_count(interact.get("collected_count")),
        "comment_count": stringify_count(interact.get("comment_count")),
        "share_count": stringify_count(interact.get("share_count")),
        "tags": tags,
        "xsec_token": xsec_token,
        "xsec_source": xsec_source,
        "image_count": note.get("image_list").and_then(Value::as_array).map(|items| items.len()).unwrap_or(0),
        "url": if xsec_token.is_empty() {
            format!("https://www.xiaohongshu.com/explore/{note_id}")
        } else {
            format!(
                "https://www.xiaohongshu.com/explore/{note_id}?xsec_token={xsec_token}&xsec_source={}",
                if xsec_source.is_empty() { "pc_search" } else { xsec_source }
            )
        }
    })
}

fn stringify_count(value: Option<&Value>) -> String {
    value
        .and_then(Value::as_str)
        .map(ToString::to_string)
        .or_else(|| value.and_then(Value::as_i64).map(|value| value.to_string()))
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::{
        extract_json_assignment, normalize_note, parse_initial_state, parse_note_reference,
    };
    use serde_json::json;

    #[test]
    fn parses_note_reference_from_url() {
        let (note_id, token, source) = parse_note_reference(
            "https://www.xiaohongshu.com/explore/65f00abc1234567890defabc?xsec_token=token123&xsec_source=pc_search",
        );
        assert_eq!(note_id, "65f00abc1234567890defabc");
        assert_eq!(token, "token123");
        assert_eq!(source, "pc_search");
    }

    #[test]
    fn parses_discovery_item_reference() {
        let (note_id, token, source) = parse_note_reference(
            "https://www.xiaohongshu.com/discovery/item/65f00abc1234567890defabc?xsec_token=token456",
        );
        assert_eq!(note_id, "65f00abc1234567890defabc");
        assert_eq!(token, "token456");
        assert_eq!(source, "");
    }

    #[test]
    fn parses_initial_state_from_html() {
        let html = r#"<script>window.__INITIAL_STATE__={"note":{"noteDetailMap":{"note-1":{"note":{"note_id":"note-1"}}}}}</script>"#;
        let value = parse_initial_state(html).unwrap();
        assert_eq!(
            value["note"]["noteDetailMap"]["note-1"]["note"]["note_id"],
            "note-1"
        );
    }

    #[test]
    fn extracts_json_assignment_with_spaces_and_semicolon() {
        let raw = extract_json_assignment(r#" {"note":{"value":"ok"}};</script>"#).unwrap();
        assert_eq!(raw, r#"{"note":{"value":"ok"}}"#);
    }

    #[test]
    fn normalizes_note_payload() {
        let note = normalize_note(
            &json!({
                "note_id": "note-1",
                "title": "Title",
                "desc": "Body",
                "type": "video",
                "user": { "nickname": "z0", "user_id": "user-1" },
                "interact_info": { "liked_count": "1" },
                "image_list": [{}, {}],
                "tag_list": [{ "name": "travel" }]
            }),
            "token-1",
            "pc_search",
        );
        assert_eq!(note["id"], "note-1");
        assert_eq!(note["author"], "z0");
        assert_eq!(note["image_count"], 2);
        assert_eq!(note["note_type"], "video");
        assert_eq!(note["author_info"]["user_id"], "user-1");
        assert_eq!(note["tags"][0], "travel");
        assert_eq!(note["xsec_token"], "token-1");
    }
}
