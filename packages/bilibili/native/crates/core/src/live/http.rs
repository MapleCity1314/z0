use md5;
use reqwest::blocking::Client;
use reqwest::header::{HeaderMap, HeaderValue, COOKIE, REFERER, USER_AGENT};
use serde_json::Value;
use std::env;
use std::time::{SystemTime, UNIX_EPOCH};

const WBI_MIXIN_KEY_ENC_TAB: [usize; 64] = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29,
    28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25,
    54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

pub fn api_get(url: &str) -> Result<Value, String> {
    let client = Client::builder()
        .build()
        .map_err(|error| error.to_string())?;
    let response = send_get(&client, url)?;

    parse_response(response)
}

pub fn api_get_wbi(path: &str, params: &[(&str, String)]) -> Result<Value, String> {
    let mut all_params = params.to_vec();
    all_params.push(("wts", current_wts().to_string()));
    all_params.sort_by(|left, right| left.0.cmp(right.0));

    let key = wbi_mixin_key()?;
    let query = encode_wbi_params(&all_params);
    let w_rid = format!("{:x}", md5::compute(format!("{query}{key}")));
    let url = format!("https://api.bilibili.com{path}?{query}&w_rid={w_rid}");

    api_get(&url)
}

fn send_get(client: &Client, url: &str) -> Result<reqwest::blocking::Response, String> {
    client
        .get(url)
        .headers(build_headers(url)?)
        .send()
        .map_err(|error| error.to_string())
}

fn parse_response(response: reqwest::blocking::Response) -> Result<Value, String> {
    if response.status().as_u16() == 401 || response.status().as_u16() == 403 {
        return Err("Bilibili auth is invalid or expired.".to_string());
    }
    if !response.status().is_success() {
        return Err(format!(
            "Bilibili request failed with HTTP {}",
            response.status().as_u16()
        ));
    }

    let value = response
        .json::<Value>()
        .map_err(|error| error.to_string())?;
    if value.get("code").and_then(Value::as_i64).unwrap_or(0) != 0 {
        return Err(format!(
            "Bilibili API returned code {}: {}",
            value.get("code").and_then(Value::as_i64).unwrap_or(-1),
            value
                .get("message")
                .and_then(Value::as_str)
                .unwrap_or("unknown error")
        ));
    }

    value
        .get("data")
        .cloned()
        .ok_or_else(|| "Bilibili response payload shape changed.".to_string())
}

fn current_wts() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

fn wbi_mixin_key() -> Result<String, String> {
    let payload = api_get("https://api.bilibili.com/x/web-interface/nav")?;
    let wbi_img = payload
        .get("wbi_img")
        .ok_or_else(|| "Bilibili nav payload did not include wbi_img".to_string())?;
    let img_key = extract_filename(
        wbi_img
            .get("img_url")
            .and_then(Value::as_str)
            .unwrap_or_default(),
    );
    let sub_key = extract_filename(
        wbi_img
            .get("sub_url")
            .and_then(Value::as_str)
            .unwrap_or_default(),
    );
    let source = format!("{img_key}{sub_key}");

    if source.is_empty() {
        return Err("Bilibili WBI key source was empty.".to_string());
    }

    Ok(WBI_MIXIN_KEY_ENC_TAB
        .iter()
        .filter_map(|index| source.chars().nth(*index))
        .take(32)
        .collect())
}

fn extract_filename(value: &str) -> String {
    value
        .rsplit('/')
        .next()
        .unwrap_or_default()
        .split('.')
        .next()
        .unwrap_or_default()
        .to_string()
}

fn encode_wbi_params(params: &[(&str, String)]) -> String {
    params
        .iter()
        .map(|(key, value)| {
            let sanitized = sanitize_wbi_value(value);
            format!(
                "{}={}",
                urlencoding::encode(key),
                urlencoding::encode(&sanitized)
            )
        })
        .collect::<Vec<_>>()
        .join("&")
}

fn sanitize_wbi_value(value: &str) -> String {
    value
        .chars()
        .filter(|ch| !matches!(ch, '!' | '\'' | '(' | ')' | '*'))
        .collect()
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
        HeaderValue::from_str(if url.contains("/view?") {
            "https://www.bilibili.com/"
        } else {
            "https://www.bilibili.com"
        })
        .map_err(|error| error.to_string())?,
    );
    if let Some(sessdata) = sessdata() {
        headers.insert(
            COOKIE,
            HeaderValue::from_str(&format!("SESSDATA={sessdata}"))
                .map_err(|error| error.to_string())?,
        );
    }
    Ok(headers)
}

pub fn sessdata() -> Option<String> {
    env::var("BILIBILI_SESSDATA")
        .ok()
        .or_else(|| env::var("BILI_SESSDATA").ok())
        .filter(|value| !value.trim().is_empty())
}

#[cfg(test)]
mod tests {
    use super::{encode_wbi_params, extract_filename, sanitize_wbi_value};

    #[test]
    fn strips_disallowed_wbi_characters() {
        assert_eq!(sanitize_wbi_value("a!b'c(d)e*f"), "abcdef");
    }

    #[test]
    fn extracts_filename_without_extension() {
        assert_eq!(
            extract_filename("https://i0.hdslb.com/bfs/wbi/abc123.png"),
            "abc123"
        );
    }

    #[test]
    fn encodes_sorted_wbi_params() {
        let query = encode_wbi_params(&[
            ("keyword", "rust web".to_string()),
            ("mid", "1".to_string()),
        ]);
        assert_eq!(query, "keyword=rust%20web&mid=1");
    }
}
