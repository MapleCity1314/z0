use serde_json::{json, Value};

pub fn normalize_nav_user(payload: &Value) -> Value {
    json!({
        "id": payload.get("mid").map(stringify_value).unwrap_or_default(),
        "name": payload.get("uname").and_then(Value::as_str).unwrap_or_default(),
        "username": payload.get("uname").and_then(Value::as_str).unwrap_or_default(),
        "level": payload
            .get("level_info")
            .and_then(|level| level.get("current_level"))
            .and_then(Value::as_i64)
            .unwrap_or(0),
        "coins": payload.get("money").and_then(Value::as_i64).unwrap_or(0),
        "sign": payload.get("sign").and_then(Value::as_str).unwrap_or_default(),
        "vip": payload.get("vipStatus").and_then(Value::as_i64).unwrap_or(0)
    })
}

pub fn normalize_video_summary(video: &Value) -> Value {
    let owner = video.get("owner").and_then(Value::as_object);
    let stat = video.get("stat").and_then(Value::as_object);
    let bvid = video
        .get("bvid")
        .and_then(Value::as_str)
        .unwrap_or_default();
    json!({
        "id": if !bvid.is_empty() { bvid.to_string() } else { video.get("aid").map(stringify_value).unwrap_or_default() },
        "bvid": bvid,
        "aid": video.get("aid").and_then(Value::as_i64).unwrap_or(0),
        "title": clean_html(video.get("title").and_then(Value::as_str).unwrap_or_default()),
        "description": video
            .get("desc")
            .or_else(|| video.get("description"))
            .and_then(Value::as_str)
            .unwrap_or_default(),
        "duration_seconds": video
            .get("duration")
            .and_then(Value::as_i64)
            .unwrap_or_else(|| parse_duration_text(video.get("duration").and_then(Value::as_str).unwrap_or_default())),
        "url": if bvid.is_empty() { String::new() } else { format!("https://www.bilibili.com/video/{bvid}") },
        "owner": {
            "id": owner.and_then(|owner| owner.get("mid")).map(stringify_value).unwrap_or_default(),
            "name": owner
                .and_then(|owner| owner.get("name").or_else(|| owner.get("uname")))
                .and_then(Value::as_str)
                .unwrap_or_default()
        },
        "stats": {
            "view": stat.and_then(|stat| stat.get("view")).and_then(Value::as_i64).unwrap_or_else(|| parse_count_text(video.get("play").and_then(Value::as_str).unwrap_or_default())),
            "danmaku": stat.and_then(|stat| stat.get("danmaku")).and_then(Value::as_i64).unwrap_or(0),
            "like": stat.and_then(|stat| stat.get("like")).and_then(Value::as_i64).unwrap_or(0),
            "coin": stat.and_then(|stat| stat.get("coin")).and_then(Value::as_i64).unwrap_or(0),
            "favorite": stat.and_then(|stat| stat.get("favorite")).and_then(Value::as_i64).unwrap_or(0),
            "share": stat.and_then(|stat| stat.get("share")).and_then(Value::as_i64).unwrap_or(0)
        }
    })
}

pub fn normalize_search_user(item: &Value) -> Value {
    json!({
        "id": item.get("mid").map(stringify_value).unwrap_or_default(),
        "name": item.get("uname").and_then(Value::as_str).unwrap_or_default(),
        "sign": clean_html(item.get("usign").and_then(Value::as_str).unwrap_or_default()),
        "fans": parse_count_text(item.get("fans").and_then(Value::as_str).unwrap_or_default()),
        "videos": parse_count_text(item.get("videos").and_then(Value::as_str).unwrap_or_default())
    })
}

pub fn normalize_profile_user(item: &Value) -> Value {
    json!({
        "id": item.get("mid").map(stringify_value).unwrap_or_default(),
        "name": item
            .get("name")
            .or_else(|| item.get("uname"))
            .and_then(Value::as_str)
            .unwrap_or_default(),
        "sign": item.get("sign").and_then(Value::as_str).unwrap_or_default(),
        "level": item.get("level").and_then(Value::as_i64).unwrap_or(0),
        "face": item.get("face").and_then(Value::as_str).unwrap_or_default(),
        "sex": item.get("sex").and_then(Value::as_str).unwrap_or_default()
    })
}

pub fn normalize_search_video(item: &Value) -> Value {
    json!({
        "id": item.get("bvid").and_then(Value::as_str).unwrap_or_default(),
        "bvid": item.get("bvid").and_then(Value::as_str).unwrap_or_default(),
        "title": clean_html(item.get("title").and_then(Value::as_str).unwrap_or_default()),
        "author": item.get("author").and_then(Value::as_str).unwrap_or_default(),
        "play": parse_count_text(item.get("play").and_then(Value::as_str).unwrap_or_default()),
        "duration": item.get("duration").and_then(Value::as_str).unwrap_or_default()
    })
}

pub fn normalize_user_video(item: &Value) -> Value {
    let bvid = item.get("bvid").and_then(Value::as_str).unwrap_or_default();
    json!({
        "id": if bvid.is_empty() { item.get("aid").map(stringify_value).unwrap_or_default() } else { bvid.to_string() },
        "bvid": bvid,
        "aid": item.get("aid").and_then(Value::as_i64).unwrap_or(0),
        "title": clean_html(item.get("title").and_then(Value::as_str).unwrap_or_default()),
        "description": item.get("description").and_then(Value::as_str).unwrap_or_default(),
        "duration_seconds": parse_duration_text(item.get("length").and_then(Value::as_str).unwrap_or_default()),
        "url": if bvid.is_empty() { String::new() } else { format!("https://www.bilibili.com/video/{bvid}") },
        "stats": {
            "view": parse_count_text(&stringify_value(item.get("play").unwrap_or(&Value::Null))),
            "comment": parse_count_text(&stringify_value(item.get("comment").unwrap_or(&Value::Null))),
            "danmaku": parse_count_text(&stringify_value(item.get("video_review").unwrap_or(&Value::Null))),
        }
    })
}

pub fn option_value(cli_args: &[String], names: &[&str]) -> Option<String> {
    cli_args
        .windows(2)
        .find(|window| names.contains(&window[0].as_str()))
        .map(|window| window[1].clone())
}

pub fn extract_bvid(value: &str) -> Result<String, String> {
    let candidate = value
        .split('/')
        .find(|part| part.starts_with("BV"))
        .or_else(|| value.split('?').next())
        .unwrap_or_default()
        .trim();

    if candidate.starts_with("BV") && candidate.len() == 12 {
        Ok(candidate.to_string())
    } else {
        Err(format!("无法提取 BV 号: {value}"))
    }
}

pub fn parse_count_text(text: &str) -> i64 {
    text.replace(',', "").trim().parse::<i64>().unwrap_or(0)
}

fn clean_html(text: &str) -> String {
    let mut output = String::with_capacity(text.len());
    let mut in_tag = false;
    for ch in text.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => output.push(ch),
            _ => {}
        }
    }
    output.trim().to_string()
}

fn parse_duration_text(text: &str) -> i64 {
    let parts = text
        .split(':')
        .filter_map(|part| part.trim().parse::<i64>().ok())
        .collect::<Vec<_>>();
    match parts.as_slice() {
        [minutes, seconds] => (minutes * 60) + seconds,
        [hours, minutes, seconds] => (hours * 3600) + (minutes * 60) + seconds,
        _ => 0,
    }
}

fn stringify_value(value: &Value) -> String {
    value
        .as_str()
        .map(ToString::to_string)
        .or_else(|| value.as_i64().map(|value| value.to_string()))
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::{
        extract_bvid, normalize_profile_user, normalize_user_video, normalize_video_summary,
        parse_count_text,
    };
    use serde_json::json;

    #[test]
    fn extracts_bvid_from_url() {
        let bvid =
            extract_bvid("https://www.bilibili.com/video/BV1xx411c7mD/?spm_id_from=333.1007")
                .unwrap();
        assert_eq!(bvid, "BV1xx411c7mD");
    }

    #[test]
    fn parses_count_text() {
        assert_eq!(parse_count_text("12,345"), 12345);
    }

    #[test]
    fn normalizes_video_summary() {
        let value = normalize_video_summary(&json!({
            "bvid": "BV1xx411c7mD",
            "aid": 123,
            "title": "<em>Rust</em> 视频",
            "desc": "desc",
            "duration": 120,
            "owner": { "mid": 1, "name": "z0" },
            "stat": { "view": 100, "like": 5 }
        }));
        assert_eq!(value["id"], "BV1xx411c7mD");
        assert_eq!(value["owner"]["name"], "z0");
        assert_eq!(value["stats"]["view"], 100);
    }

    #[test]
    fn normalizes_profile_user() {
        let value = normalize_profile_user(&json!({
            "mid": 946974,
            "name": "TestUP",
            "sign": "hello",
            "level": 6,
            "sex": "男"
        }));
        assert_eq!(value["id"], "946974");
        assert_eq!(value["name"], "TestUP");
        assert_eq!(value["level"], 6);
    }

    #[test]
    fn normalizes_user_video() {
        let value = normalize_user_video(&json!({
            "bvid": "BV1xx411c7mD",
            "aid": 123,
            "title": "<em>Rust</em> 视频",
            "length": "01:30",
            "play": 100,
            "comment": 5,
            "video_review": 2
        }));
        assert_eq!(value["bvid"], "BV1xx411c7mD");
        assert_eq!(value["duration_seconds"], 90);
        assert_eq!(value["stats"]["view"], 100);
    }
}
