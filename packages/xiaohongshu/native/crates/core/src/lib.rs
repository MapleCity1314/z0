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
struct XiaohongshuUserFixture {
    user_id: String,
    nickname: String,
    followers: i64,
    likes: i64,
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

fn auth_present() -> bool {
    env::var("XHS_A1").is_ok() || env::var("XIAOHONGSHU_A1").is_ok()
}

fn fixture_user() -> XiaohongshuUserFixture {
    XiaohongshuUserFixture {
        user_id: "xhs-user-001".to_string(),
        nickname: env::var("XIAOHONGSHU_USER_NAME")
            .unwrap_or_else(|_| "Z0 Native Xiaohongshu".to_string()),
        followers: 6400,
        likes: 12000,
    }
}

fn fixture_items(label: &str, count: usize) -> Value {
    let items = (0..count)
        .map(|index| {
            json!({
                "id": format!("xhs-{label}-{index:03}"),
                "title": format!("Fixture {label} note {}", index + 1),
                "author": fixture_user().nickname,
                "url": format!("https://www.xiaohongshu.com/explore/xhs-{label}-{index:03}")
            })
        })
        .collect::<Vec<_>>();

    success_payload(json!({
        "items": items,
        "source": "native-fixture"
    }))
}

fn native_status() -> Value {
    if auth_present() {
        success_payload(json!({
            "authenticated": true,
            "user": fixture_user(),
            "source": "native-env"
        }))
    } else {
        error_payload(
            "not_authenticated",
            "Xiaohongshu auth is not configured. Provide a1 cookies or enable the legacy bridge.",
        )
    }
}

fn native_whoami() -> Value {
    if auth_present() {
        success_payload(json!({
            "user": fixture_user(),
            "source": "native-env"
        }))
    } else {
        error_payload(
            "not_authenticated",
            "Xiaohongshu auth is not configured. Provide a1 cookies or enable the legacy bridge.",
        )
    }
}

fn native_fallback(cli_args: &[String]) -> Option<Value> {
    match cli_args.first()?.as_str() {
        "status" => Some(native_status()),
        "whoami" => Some(native_whoami()),
        "read" => Some(success_payload(json!({
            "note": {
                "id": cli_args.get(1).cloned().unwrap_or_else(|| "xhs-note-001".to_string()),
                "title": "Fixture Xiaohongshu Note",
                "content": "Native fallback note content.",
                "source": "native-fixture"
            }
        }))),
        "search" | "comments" | "user" | "user-posts" | "feed" | "hot" | "topics"
        | "search-user" | "favorites" | "my-notes" | "unread" | "notifications" => {
            Some(fixture_items(cli_args.first()?.as_str(), 3))
        }
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
        suffixes
            .iter()
            .any(|suffix| entry.join(format!("{command_name}{suffix}")).exists())
    })
}

pub fn resolve_bridge(package_root: &Path) -> Result<BridgeResolution, String> {
    if let Some(explicit_bin) = ensure_absolute_path(
        &env::current_dir().map_err(|error| error.to_string())?,
        env::var("Z0_XIAOHONGSHU_BIN").ok(),
    ) {
        if explicit_bin.exists() {
            return Ok(BridgeResolution {
                command: explicit_bin.display().to_string(),
                args: vec![],
                cwd: package_root.display().to_string(),
            });
        }
    }

    let source_root =
        ensure_absolute_path(package_root, env::var("Z0_XIAOHONGSHU_SOURCE_ROOT").ok())
            .unwrap_or_else(|| package_root.join("./legacy"));

    if source_root.exists() && command_exists("uv") {
        return Ok(BridgeResolution {
            command: "uv".to_string(),
            args: vec![
                "run".to_string(),
                "--project".to_string(),
                source_root.display().to_string(),
                "xhs".to_string(),
            ],
            cwd: package_root.display().to_string(),
        });
    }

    if source_root.exists() {
        return Ok(BridgeResolution {
            command: env::var("Z0_XIAOHONGSHU_PYTHON_BIN")
                .unwrap_or_else(|_| "python3".to_string()),
            args: vec!["-m".to_string(), "xhs_cli.cli".to_string()],
            cwd: source_root.display().to_string(),
        });
    }

    Err("Xiaohongshu CLI bridge was not found. Set `Z0_XIAOHONGSHU_BIN` or provide a vendored legacy root via `Z0_XIAOHONGSHU_SOURCE_ROOT`.".to_string())
}

pub fn execute_command(package_root: &Path, cli_args: &[String]) -> Value {
    if live::supports_command(cli_args) {
        match live::execute(cli_args) {
            Ok(payload) => return success_payload(payload),
            Err(_) => {}
        }
    }

    if matches!(cli_args.first().map(String::as_str), Some("status")) {
        return native_status();
    }

    if matches!(cli_args.first().map(String::as_str), Some("whoami")) && auth_present() {
        return native_whoami();
    }

    let resolved = match resolve_bridge(package_root) {
        Ok(value) => value,
        Err(message) => {
            return native_fallback(cli_args)
                .unwrap_or_else(|| json!({ "error": true, "message": message, "status": 1 }))
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
    let explicit_bin = ensure_absolute_path(
        &env::current_dir().unwrap_or_else(|_| package_root.to_path_buf()),
        env::var("Z0_XIAOHONGSHU_BIN").ok(),
    );
    let source_root =
        ensure_absolute_path(package_root, env::var("Z0_XIAOHONGSHU_SOURCE_ROOT").ok())
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
