mod http;
mod parser;

use serde_json::{json, Value};

use self::http::{api_get, api_get_wbi};
use self::parser::{
    extract_bvid, normalize_nav_user, normalize_profile_user, normalize_search_user,
    normalize_search_video, normalize_user_video, normalize_video_summary, option_value,
};

const DEFAULT_PAGE_SIZE: usize = 20;
const MAX_PAGE_SIZE: usize = 50;

pub fn auth_present() -> bool {
    http::sessdata().is_some()
}

pub fn supports_command(cli_args: &[String]) -> bool {
    matches!(
        cli_args.first().map(String::as_str),
        Some("status" | "whoami" | "video" | "search" | "hot" | "rank" | "user")
            | Some("user-videos")
    )
}

pub fn allows_anonymous(cli_args: &[String]) -> bool {
    matches!(
        cli_args.first().map(String::as_str),
        Some("video" | "search" | "hot" | "rank" | "user") | Some("user-videos")
    )
}

pub fn execute(cli_args: &[String]) -> Result<Value, String> {
    match cli_args.first().map(String::as_str) {
        Some("status") => status_payload(),
        Some("whoami") => whoami_payload(),
        Some("video") => video_payload(cli_args),
        Some("search") => search_payload(cli_args),
        Some("hot") => hot_payload(cli_args),
        Some("rank") => rank_payload(cli_args),
        Some("user") => user_payload(cli_args),
        Some("user-videos") => user_videos_payload(cli_args),
        _ => Err("Bilibili native live command is not supported.".to_string()),
    }
}

pub fn status_payload() -> Result<Value, String> {
    let payload = nav_payload()?;
    Ok(json!({
        "authenticated": true,
        "user": normalize_nav_user(&payload),
        "source": "native-live"
    }))
}

pub fn whoami_payload() -> Result<Value, String> {
    let payload = nav_payload()?;
    Ok(json!({
        "user": normalize_nav_user(&payload),
        "relation": {
            "following": payload.get("following").and_then(Value::as_i64).unwrap_or(0),
            "follower": payload.get("follower").and_then(Value::as_i64).unwrap_or(0)
        },
        "source": "native-live"
    }))
}

fn video_payload(cli_args: &[String]) -> Result<Value, String> {
    let bvid = extract_bvid(cli_args.get(1).map(String::as_str).unwrap_or_default())?;
    let url = format!("https://api.bilibili.com/x/web-interface/view?bvid={bvid}");
    let payload = api_get(&url)?;
    Ok(json!({
        "video": normalize_video_summary(&payload),
        "warnings": [],
        "source": "native-live"
    }))
}

fn search_payload(cli_args: &[String]) -> Result<Value, String> {
    let query = cli_args
        .get(1)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Bilibili search requires a query.".to_string())?;
    let search_type = option_value(cli_args, &["--type"]).unwrap_or_else(|| "user".to_string());
    let page = option_value(cli_args, &["--page"])
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(1);
    let max = option_value(cli_args, &["--max"])
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(DEFAULT_PAGE_SIZE)
        .min(MAX_PAGE_SIZE);
    let encoded_query = urlencoding::encode(query);
    let url =
        format!(
        "https://api.bilibili.com/x/web-interface/search/type?search_type={}&keyword={}&page={}",
        if search_type == "video" { "video" } else { "bili_user" },
        encoded_query,
        page
    );
    let payload = api_get(&url)?;
    let items = payload
        .get("result")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .take(max)
                .map(|item| {
                    if search_type == "video" {
                        normalize_search_video(item)
                    } else {
                        normalize_search_user(item)
                    }
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    Ok(json!({
        "items": items,
        "source": "native-live"
    }))
}

fn hot_payload(cli_args: &[String]) -> Result<Value, String> {
    let page = option_value(cli_args, &["--page"])
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(1);
    let max = option_value(cli_args, &["--max"])
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(DEFAULT_PAGE_SIZE)
        .min(MAX_PAGE_SIZE);
    let url = format!("https://api.bilibili.com/x/web-interface/popular?pn={page}&ps={max}");
    let payload = api_get(&url)?;
    let items = payload
        .get("list")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .map(normalize_video_summary)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    Ok(json!({
        "items": items,
        "source": "native-live"
    }))
}

fn rank_payload(cli_args: &[String]) -> Result<Value, String> {
    let day = option_value(cli_args, &["--day"])
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| matches!(value, 3 | 7))
        .unwrap_or(3);
    let max = option_value(cli_args, &["--max"])
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(DEFAULT_PAGE_SIZE)
        .min(MAX_PAGE_SIZE);
    let url = format!("https://api.bilibili.com/x/web-interface/ranking/region?rid=0&day={day}");
    let payload = api_get(&url)?;
    let items = payload
        .get("list")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .take(max)
                .map(normalize_video_summary)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    Ok(json!({
        "day": day,
        "items": items,
        "source": "native-live"
    }))
}

fn user_payload(cli_args: &[String]) -> Result<Value, String> {
    let query = cli_args
        .get(1)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Bilibili user lookup requires a uid or name.".to_string())?;

    if query.chars().all(|char| char.is_ascii_digit()) {
        return user_by_uid(query);
    }

    let result = resolve_user_search_result(query)?;

    Ok(json!({
        "user": normalize_search_user(&result),
        "relation": {
            "following": 0,
            "follower": parser::parse_count_text(result.get("fans").and_then(Value::as_str).unwrap_or_default())
        },
        "source": "native-live"
    }))
}

fn user_videos_payload(cli_args: &[String]) -> Result<Value, String> {
    let query = cli_args
        .get(1)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Bilibili user-videos requires a uid or name.".to_string())?;
    let uid = if query.chars().all(|char| char.is_ascii_digit()) {
        query.to_string()
    } else {
        resolve_user_search_result(query)?
            .get("mid")
            .map(stringify_search_mid)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| format!("No Bilibili user found for query: {query}"))?
    };
    let max = option_value(cli_args, &["--max"])
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(DEFAULT_PAGE_SIZE)
        .min(MAX_PAGE_SIZE);

    let payload = api_get_wbi(
        "/x/space/wbi/arc/search",
        &[
            ("mid", uid.clone()),
            ("pn", "1".to_string()),
            ("ps", max.to_string()),
            ("order", "pubdate".to_string()),
            ("tid", "0".to_string()),
            ("keyword", String::new()),
            ("platform", "web".to_string()),
            ("web_location", "1550101".to_string()),
        ],
    )?;
    let items = payload
        .get("list")
        .and_then(|list| list.get("vlist"))
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .take(max)
                .map(normalize_user_video)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    Ok(json!({
        "uid": uid,
        "items": items,
        "source": "native-live"
    }))
}

fn user_by_uid(uid: &str) -> Result<Value, String> {
    let profile = api_get(&format!(
        "https://api.bilibili.com/x/space/acc/info?mid={uid}"
    ))?;
    let relation = api_get(&format!(
        "https://api.bilibili.com/x/relation/stat?vmid={uid}"
    ))?;

    Ok(json!({
        "user": normalize_profile_user(&profile),
        "relation": {
            "following": relation.get("following").and_then(Value::as_i64).unwrap_or(0),
            "follower": relation.get("follower").and_then(Value::as_i64).unwrap_or(0)
        },
        "source": "native-live"
    }))
}

fn resolve_user_search_result(query: &str) -> Result<Value, String> {
    let encoded_query = urlencoding::encode(query);
    let url = format!(
        "https://api.bilibili.com/x/web-interface/search/type?search_type=bili_user&keyword={}&page=1",
        encoded_query
    );
    let payload = api_get(&url)?;
    let result = payload
        .get("result")
        .and_then(Value::as_array)
        .and_then(|items| items.first())
        .ok_or_else(|| format!("No Bilibili user found for query: {query}"))?;
    Ok(result.clone())
}

fn stringify_search_mid(value: &Value) -> String {
    value
        .as_str()
        .map(ToString::to_string)
        .or_else(|| value.as_i64().map(|value| value.to_string()))
        .unwrap_or_default()
}

fn nav_payload() -> Result<Value, String> {
    if !auth_present() {
        return Err("Bilibili auth is not configured. Provide SESSDATA.".to_string());
    }
    api_get("https://api.bilibili.com/x/web-interface/nav")
}
