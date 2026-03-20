mod live;

use serde::Serialize;
use serde_json::{json, Value};
use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Serialize)]
pub struct BridgeResolution {
    pub command: String,
    pub args: Vec<String>,
    pub cwd: String,
}

#[derive(Debug, Serialize)]
struct TwitterUserFixture {
    id: String,
    name: String,
    username: String,
    #[serde(rename = "screenName")]
    screen_name: String,
    bio: String,
    location: String,
    url: String,
    followers: i64,
    following: i64,
    tweets: i64,
    likes: i64,
    verified: bool,
    #[serde(rename = "profileImageUrl")]
    profile_image_url: String,
    #[serde(rename = "createdAt")]
    created_at: String,
}

fn success_payload(data: Value) -> Value {
    json!({
        "ok": true,
        "schema_version": "1",
        "data": data
    })
}

fn error_payload(code: &str, message: &str) -> Value {
    json!({
        "ok": false,
        "schema_version": "1",
        "error": {
            "code": code,
            "message": message
        }
    })
}

fn fixture_user() -> TwitterUserFixture {
    let screen_name = env::var("TWITTER_SCREEN_NAME").unwrap_or_else(|_| "z0_native".to_string());
    TwitterUserFixture {
        id: "tw-user-001".to_string(),
        name: "Z0 Native Twitter".to_string(),
        username: screen_name.clone(),
        screen_name,
        bio: "Native Twitter fallback profile for z0 MCP.".to_string(),
        location: "Local".to_string(),
        url: "https://x.com/z0_native".to_string(),
        followers: 1280,
        following: 96,
        tweets: 342,
        likes: 812,
        verified: false,
        profile_image_url: "https://example.com/twitter/profile.png".to_string(),
        created_at: "2026-01-01T00:00:00Z".to_string(),
    }
}

fn fixture_tweets(label: &str, count: usize) -> Value {
    let tweets = (0..count)
        .map(|index| {
            json!({
                "id": format!("tw-{label}-{index:03}"),
                "text": format!("Fixture {label} tweet {}", index + 1),
                "author": {
                    "id": "tw-user-001",
                    "username": "z0_native",
                    "name": "Z0 Native Twitter"
                },
                "likes": 100 + index as i64,
                "retweets": 10 + index as i64,
                "replies": 5 + index as i64,
                "bookmarks": 3 + index as i64,
                "views": 1000 + (index as i64 * 25),
                "createdAt": format!("2026-01-{:02}T10:00:00Z", (index % 9) + 1),
                "url": format!("https://x.com/z0_native/status/tw-{label}-{index:03}")
            })
        })
        .collect::<Vec<_>>();

    success_payload(json!({
        "items": tweets,
        "source": "native-fixture"
    }))
}

fn native_status() -> Value {
    if !live::auth_present() {
        error_payload(
            "not_authenticated",
            "Twitter auth is not configured. Set TWITTER_AUTH_TOKEN and TWITTER_CT0 or enable the legacy bridge.",
        )
    } else {
        match live::status_payload() {
            Ok(user) => success_payload(json!({
                "authenticated": user.get("authenticated").and_then(Value::as_bool).unwrap_or(true),
                "user": user.get("user").cloned().unwrap_or(Value::Null),
                "source": user.get("source").cloned().unwrap_or(json!("native-live"))
            })),
            Err(error) => error_payload("not_authenticated", &error),
        }
    }
}

fn native_whoami() -> Value {
    if !live::auth_present() {
        error_payload(
            "not_authenticated",
            "Twitter auth is not configured. Set TWITTER_AUTH_TOKEN and TWITTER_CT0 or enable the legacy bridge.",
        )
    } else {
        match live::whoami_payload() {
            Ok(user) => success_payload(json!({
                "user": user.get("user").cloned().unwrap_or(Value::Null),
                "source": user.get("source").cloned().unwrap_or(json!("native-live"))
            })),
            Err(error) => error_payload("not_authenticated", &error),
        }
    }
}

fn native_fallback(cli_args: &[String]) -> Option<Value> {
    let command = cli_args.first()?.as_str();

    match command {
        "status" => Some(native_status()),
        "whoami" => Some(native_whoami()),
        "feed" => Some(fixture_tweets("feed", 3)),
        "bookmarks" => Some(fixture_tweets("bookmarks", 3)),
        "search" => Some(fixture_tweets("search", 3)),
        "tweet" => Some(success_payload(json!({
            "items": [
                {
                    "id": cli_args.get(1).cloned().unwrap_or_else(|| "tw-detail-001".to_string()),
                    "text": "Fixture tweet detail",
                    "author": {
                        "id": "tw-user-001",
                        "username": "z0_native",
                        "name": "Z0 Native Twitter"
                    },
                    "likes": 321,
                    "retweets": 42,
                    "replies": 12,
                    "createdAt": "2026-01-02T10:00:00Z",
                    "url": "https://x.com/z0_native/status/tw-detail-001"
                }
            ],
            "source": "native-fixture"
        }))),
        "article" => Some(success_payload(json!({
            "id": cli_args.get(1).cloned().unwrap_or_else(|| "tw-article-001".to_string()),
            "articleTitle": "Fixture Twitter Article",
            "articleText": "# Fixture\n\nNative article fallback.",
            "source": "native-fixture"
        }))),
        "user" => Some(success_payload(json!(fixture_user()))),
        "user-posts" => Some(fixture_tweets("user-posts", 3)),
        "followers" => Some(success_payload(json!({
            "items": [fixture_user()],
            "source": "native-fixture"
        }))),
        "following" => Some(success_payload(json!({
            "items": [fixture_user()],
            "source": "native-fixture"
        }))),
        _ => None,
    }
}

fn ensure_absolute_path(base_path: &Path, input: Option<String>) -> Option<PathBuf> {
    let input = input?;
    let candidate = PathBuf::from(input);
    if candidate.is_absolute() {
        Some(candidate)
    } else {
        Some(base_path.join(candidate))
    }
}

fn command_exists(command_name: &str) -> bool {
    let path_value = env::var_os("PATH").unwrap_or_default();
    let path_ext_value = env::var("PATHEXT").unwrap_or_else(|_| ".EXE;.CMD;.BAT;.COM".to_string());
    let suffixes = if cfg!(windows) {
        path_ext_value
            .split(';')
            .filter(|value| !value.is_empty())
            .map(|value| value.to_ascii_lowercase())
            .collect::<Vec<_>>()
    } else {
        vec![String::new()]
    };

    env::split_paths(&path_value).any(|entry| {
        suffixes.iter().any(|suffix| {
            let candidate = entry.join(format!("{command_name}{suffix}"));
            candidate.exists()
        })
    })
}

pub fn resolve_bridge(package_root: &Path) -> Result<BridgeResolution, String> {
    if let Some(explicit_bin) =
        ensure_absolute_path(&env::current_dir().map_err(|error| error.to_string())?, env::var("Z0_TWITTER_BIN").ok())
    {
        if explicit_bin.exists() {
            return Ok(BridgeResolution {
                command: explicit_bin.display().to_string(),
                args: vec![],
                cwd: package_root.display().to_string(),
            });
        }
    }

    let source_root = ensure_absolute_path(package_root, env::var("Z0_TWITTER_SOURCE_ROOT").ok())
        .unwrap_or_else(|| package_root.join("./legacy"));

    if source_root.exists() && command_exists("uv") {
        return Ok(BridgeResolution {
            command: "uv".to_string(),
            args: vec![
                "run".to_string(),
                "--project".to_string(),
                source_root.display().to_string(),
                "twitter".to_string(),
            ],
            cwd: package_root.display().to_string(),
        });
    }

    if source_root.exists() {
        return Ok(BridgeResolution {
            command: env::var("Z0_TWITTER_PYTHON_BIN").unwrap_or_else(|_| "python3".to_string()),
            args: vec!["-m".to_string(), "twitter_cli.cli".to_string()],
            cwd: source_root.display().to_string(),
        });
    }

    Err("Twitter CLI bridge was not found. Set `Z0_TWITTER_BIN` or provide a vendored legacy root via `Z0_TWITTER_SOURCE_ROOT`.".to_string())
}

pub fn execute_command(package_root: &Path, cli_args: &[String]) -> Value {
    if live::supports_command(cli_args) && live::auth_present() {
        match live::execute(cli_args) {
            Ok(payload) => return success_payload(payload),
            Err(error) if matches!(cli_args.first().map(String::as_str), Some("status" | "whoami")) => {
                return error_payload("not_authenticated", &error)
            }
            Err(_) => {}
        }
    }

    let resolved = match resolve_bridge(package_root) {
        Ok(value) => value,
        Err(message) => {
            return native_fallback(cli_args).unwrap_or_else(|| {
                json!({
                    "error": true,
                    "message": message,
                    "status": 1
                })
            })
        }
    };

    let output = Command::new(&resolved.command)
        .args(&resolved.args)
        .args(cli_args)
        .current_dir(&resolved.cwd)
        .output();

    let output = match output {
        Ok(value) => value,
        Err(error) => return json!({ "error": true, "message": error.to_string(), "status": 1 }),
    };

    if !output.status.success() {
      let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
      let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
      return json!({
          "error": true,
          "message": if stderr.is_empty() { stdout } else { stderr },
          "status": output.status.code().unwrap_or(1)
      });
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    serde_json::from_str(&stdout).unwrap_or_else(|_| json!({ "ok": true, "rawText": stdout }))
}

pub fn self_check(package_root: &Path) -> Value {
    let explicit_bin =
        ensure_absolute_path(&env::current_dir().unwrap_or_else(|_| package_root.to_path_buf()), env::var("Z0_TWITTER_BIN").ok());
    let source_root = ensure_absolute_path(package_root, env::var("Z0_TWITTER_SOURCE_ROOT").ok())
        .unwrap_or_else(|| package_root.join("./legacy"));
    let uv_available = command_exists("uv");

    match resolve_bridge(package_root) {
        Ok(resolution) => json!({
            "ok": true,
            "resolution": resolution,
            "explicitBinPresent": explicit_bin.is_some_and(|path| path.exists()),
            "legacyRootPresent": source_root.exists(),
            "uvAvailable": uv_available
        }),
        Err(error) => json!({
            "ok": false,
            "error": error,
            "explicitBinPresent": explicit_bin.is_some_and(|path| path.exists()),
            "legacyRootPresent": source_root.exists(),
            "uvAvailable": uv_available
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::{execute_command, native_status, self_check};
    use serde_json::json;
    use std::path::Path;

    #[test]
    fn reports_missing_bridge_when_unavailable() {
        let value = self_check(Path::new("/tmp/does-not-exist"));
        assert_eq!(value["ok"], false);
    }

    #[test]
    fn returns_structured_native_status_without_bridge() {
        let value = native_status();
        assert_eq!(value["schema_version"], "1");
    }

    #[test]
    fn falls_back_to_fixtures_for_feed_without_bridge() {
        let value = execute_command(
            Path::new("/tmp/does-not-exist"),
            &["feed".to_string(), "--json".to_string()],
        );
        assert_eq!(value["ok"], true);
        assert_eq!(value["data"]["source"], json!("native-fixture"));
    }
}
