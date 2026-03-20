use cookie_scoop::{
    get_cookies, to_cookie_header, BrowserName, CookieHeaderOptions, CookieMode,
    GetCookiesOptions,
};
use qrcode::render::unicode;
use qrcode::QrCode;
use reqwest::blocking::Client;
use serde_json::Value;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::thread::sleep;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Credential {
    pub cookie_header: String,
    pub saved_at_epoch_s: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AuthError {
    Unavailable(&'static str),
    NotAuthenticated,
    Io(String),
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct QrLoginSession {
    pub qr_id: String,
    pub qr_url: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BrowserProbeReport {
    pub cookie_header: Option<String>,
    pub warnings: Vec<String>,
}

fn current_epoch_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn credential_dir() -> PathBuf {
    if let Ok(value) = env::var("Z0_BOSS_CREDENTIAL_DIR") {
        return PathBuf::from(value);
    }

    let home = env::var("HOME").unwrap_or_else(|_| ".".into());
    PathBuf::from(home).join(".config/z0/boss")
}

fn credential_file() -> PathBuf {
    credential_dir().join("credential.txt")
}

pub fn credential_cookie_names(cookie_header: &str) -> Vec<String> {
    let mut names = cookie_header
        .split(';')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .filter_map(|part| part.split_once('=').map(|(name, _)| name.trim().to_owned()))
        .collect::<Vec<_>>();
    names.sort();
    names.dedup();
    names
}

pub fn credential_has_cookie(cookie_header: &str, name: &str) -> bool {
    credential_cookie_names(cookie_header)
        .iter()
        .any(|existing| existing == name)
}

pub fn load_credential() -> Result<Credential, AuthError> {
    let path = credential_file();
    let content = fs::read_to_string(path).map_err(|_| AuthError::NotAuthenticated)?;
    let mut lines = content.lines();
    let saved_at = lines
        .next()
        .and_then(|line| line.strip_prefix("saved_at="))
        .and_then(|raw| raw.parse::<u64>().ok())
        .ok_or(AuthError::NotAuthenticated)?;
    let cookie_header = lines
        .next()
        .and_then(|line| line.strip_prefix("cookie_header="))
        .map(str::to_owned)
        .ok_or(AuthError::NotAuthenticated)?;

    Ok(Credential {
        cookie_header,
        saved_at_epoch_s: saved_at,
    })
}

pub fn save_credential(cookie_header: &str) -> Result<Credential, AuthError> {
    let dir = credential_dir();
    fs::create_dir_all(&dir).map_err(|error| AuthError::Io(error.to_string()))?;

    let credential = Credential {
        cookie_header: cookie_header.trim().to_owned(),
        saved_at_epoch_s: current_epoch_seconds(),
    };

    let content = format!(
        "saved_at={}\ncookie_header={}\n",
        credential.saved_at_epoch_s, credential.cookie_header
    );

    fs::write(credential_file(), content).map_err(|error| AuthError::Io(error.to_string()))?;
    Ok(credential)
}

pub fn clear_credential() -> Result<(), AuthError> {
    match fs::remove_file(credential_file()) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(AuthError::Io(error.to_string())),
    }
}

pub fn login_from_browser_sources() -> Result<Credential, AuthError> {
    if let Ok(cookie_header) = env::var("BOSS_COOKIES") {
        if !cookie_header.trim().is_empty() {
            return save_credential(&merge_cookie_hints(&cookie_header));
        }
    }

    if let Ok(path) = env::var("BOSS_COOKIE_FILE") {
        let content = fs::read_to_string(path).map_err(|error| AuthError::Io(error.to_string()))?;
        if !content.trim().is_empty() {
            return save_credential(&merge_cookie_hints(content.trim()));
        }
    }

    if let Some(cookie_header) = load_cookie_scoop_browser_cookies() {
        return save_credential(&merge_cookie_hints(&cookie_header));
    }

    if let Some(cookie_header) = load_cookie_json_env() {
        return save_credential(&merge_cookie_hints(&cookie_header));
    }

    if let Some(cookie_header) = load_cookie_json_file() {
        return save_credential(&merge_cookie_hints(&cookie_header));
    }

    if let Some(cookie_header) = load_netscape_cookie_file() {
        return save_credential(&merge_cookie_hints(&cookie_header));
    }

    if let Some(cookie_header) = load_legacy_boss_cli_cookies() {
        return save_credential(&merge_cookie_hints(&cookie_header));
    }

    Err(AuthError::Unavailable(
        "No local browser source found. Set BOSS_COOKIES, BOSS_COOKIE_FILE, BOSS_COOKIES_JSON, BOSS_COOKIES_JSON_FILE, or BOSS_NETSCAPE_COOKIE_FILE.",
    ))
}

pub fn login_from_qr_sources() -> Result<Credential, AuthError> {
    if let Ok(cookie_header) = env::var("BOSS_QR_COOKIES") {
        if !cookie_header.trim().is_empty() {
            return save_credential(&merge_cookie_hints(&cookie_header));
        }
    }

    login_from_qr_flow()
}

pub fn login_from_qr_flow() -> Result<Credential, AuthError> {
    let client = Client::builder()
        .timeout(Duration::from_secs(35))
        .cookie_store(true)
        .build()
        .map_err(|error| AuthError::Io(error.to_string()))?;

    let session = start_qr_session(&client)?;
    println!("\n请使用 Boss 直聘 APP 扫码登录:\n");
    print_qr(&session.qr_url)?;
    println!("\n二维码链接: {}\n", session.qr_url);

    wait_for_scan(&client, &session.qr_id)?;
    println!("已扫码，请在手机上确认。");
    wait_for_confirm(&client, &session.qr_id)?;

    let credential = dispatch_qr_login(&client, &session.qr_id)?;
    save_credential(&credential.cookie_header)
}

pub fn start_qr_session(client: &Client) -> Result<QrLoginSession, AuthError> {
    let payload = client
        .post("https://www.zhipin.com/wapi/zppassport/captcha/randkey")
        .send()
        .map_err(|_| AuthError::Unavailable("Failed to request Boss QR session"))?
        .json::<Value>()
        .map_err(|_| AuthError::Unavailable("Boss QR session response was not JSON"))?;

    let qr_id = payload
        .get("zpData")
        .and_then(Value::as_object)
        .and_then(|data| data.get("qrId"))
        .and_then(Value::as_str)
        .ok_or(AuthError::Unavailable("Boss QR session response missing qrId"))?;

    Ok(QrLoginSession {
        qr_id: qr_id.to_owned(),
        qr_url: format!("https://www.zhipin.com/wapi/zpweixin/qrcode/getqrcode?content={qr_id}"),
    })
}

fn wait_for_scan(client: &Client, qr_id: &str) -> Result<(), AuthError> {
    for _ in 0..6 {
        let payload = client
            .get("https://www.zhipin.com/wapi/zppassport/qrcode/scan")
            .query(&[("uuid", qr_id)])
            .send()
            .map_err(|_| AuthError::Unavailable("Failed to poll Boss QR scan status"))?
            .json::<Value>()
            .map_err(|_| AuthError::Unavailable("Boss QR scan response was not JSON"))?;

        if payload.get("scaned").and_then(Value::as_bool) == Some(true) {
            return Ok(());
        }

        sleep(Duration::from_secs(1));
    }

    Err(AuthError::Unavailable("Boss QR scan timed out"))
}

fn wait_for_confirm(client: &Client, qr_id: &str) -> Result<(), AuthError> {
    for _ in 0..6 {
        let payload = client
            .get("https://www.zhipin.com/wapi/zppassport/qrcode/scanLogin")
            .query(&[("qrId", qr_id)])
            .send()
            .map_err(|_| AuthError::Unavailable("Failed to poll Boss QR confirmation status"))?
            .json::<Value>()
            .map_err(|_| AuthError::Unavailable("Boss QR confirmation response was not JSON"))?;

        if payload.get("login").and_then(Value::as_bool) == Some(true) {
            return Ok(());
        }

        sleep(Duration::from_secs(1));
    }

    Err(AuthError::Unavailable("Boss QR confirmation timed out"))
}

fn dispatch_qr_login(client: &Client, qr_id: &str) -> Result<Credential, AuthError> {
    let response = client
        .get("https://www.zhipin.com/wapi/zppassport/qrcode/dispatcher")
        .query(&[("qrId", qr_id), ("pk", "header-login")])
        .send()
        .map_err(|_| AuthError::Unavailable("Boss QR dispatcher request failed"))?;

    let mut parts = Vec::new();
    for cookie in response.cookies() {
        parts.push(format!("{}={}", cookie.name(), cookie.value()));
    }

    if parts.is_empty() {
        return Err(AuthError::Unavailable("Boss QR dispatcher returned no cookies"));
    }

    Ok(Credential {
        cookie_header: merge_cookie_hints(&parts.join("; ")),
        saved_at_epoch_s: current_epoch_seconds(),
    })
}

fn print_qr(data: &str) -> Result<(), AuthError> {
    let code = QrCode::new(data.as_bytes()).map_err(|error| AuthError::Io(error.to_string()))?;
    println!("{}", code.render::<unicode::Dense1x2>().quiet_zone(true).build());
    Ok(())
}

fn load_legacy_boss_cli_cookies() -> Option<String> {
    let home = env::var("HOME").ok()?;
    let path = PathBuf::from(home).join(".config/boss-cli/credential.json");
    let content = fs::read_to_string(path).ok()?;
    let value: Value = serde_json::from_str(&content).ok()?;
    let cookies = value.get("cookies")?.as_object()?;
    let mut parts = Vec::with_capacity(cookies.len());

    for (key, value) in cookies {
        let string_value = value.as_str()?;
        if !string_value.is_empty() {
            parts.push(format!("{key}={string_value}"));
        }
    }

    if parts.is_empty() {
        return None;
    }

    Some(parts.join("; "))
}

fn load_cookie_scoop_browser_cookies() -> Option<String> {
    probe_browser_sources().cookie_header
}

pub fn probe_browser_sources() -> BrowserProbeReport {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .ok();

    let Some(runtime) = runtime else {
        return BrowserProbeReport {
            cookie_header: None,
            warnings: vec!["failed to start tokio runtime for browser probe".into()],
        };
    };

    runtime.block_on(async move {
        let result = get_cookies(
            GetCookiesOptions::new("https://www.zhipin.com")
                .browsers(vec![
                    BrowserName::Chrome,
                    BrowserName::Edge,
                    BrowserName::Firefox,
                ])
                .mode(CookieMode::First),
        )
        .await;

        if result.cookies.is_empty() {
            return BrowserProbeReport {
                cookie_header: None,
                warnings: result
                    .warnings
                    .into_iter()
                    .map(|warning| warning.to_string())
                    .collect(),
            };
        }

        let header = to_cookie_header(&result.cookies, &CookieHeaderOptions::default());
        BrowserProbeReport {
            cookie_header: if header.trim().is_empty() {
                None
            } else {
                Some(header)
            },
            warnings: result
                .warnings
                .into_iter()
                .map(|warning| warning.to_string())
                .collect(),
        }
    })
}

fn load_cookie_json_env() -> Option<String> {
    let raw = env::var("BOSS_COOKIES_JSON").ok()?;
    parse_json_cookie_blob(&raw)
}

fn load_cookie_json_file() -> Option<String> {
    let path = env::var("BOSS_COOKIES_JSON_FILE").ok()?;
    let raw = fs::read_to_string(path).ok()?;
    parse_json_cookie_blob(&raw)
}

fn parse_json_cookie_blob(raw: &str) -> Option<String> {
    let value: Value = serde_json::from_str(raw).ok()?;

    if let Some(entries) = value.as_array() {
        let mut parts = Vec::new();
        for entry in entries {
            let domain = entry.get("domain").and_then(Value::as_str).unwrap_or_default();
            if !domain.contains("zhipin.com") {
                continue;
            }
            let name = entry.get("name").and_then(Value::as_str)?;
            let value = entry.get("value").and_then(Value::as_str)?;
            parts.push(format!("{name}={value}"));
        }
        return if parts.is_empty() { None } else { Some(parts.join("; ")) };
    }

    if let Some(object) = value.as_object() {
        let cookies = object.get("cookies").and_then(Value::as_array)?;
        return parse_json_cookie_blob(&Value::Array(cookies.clone()).to_string());
    }

    None
}

fn load_netscape_cookie_file() -> Option<String> {
    let path = env::var("BOSS_NETSCAPE_COOKIE_FILE").ok()?;
    let raw = fs::read_to_string(path).ok()?;
    let mut parts = Vec::new();

    for line in raw.lines() {
        if line.trim().is_empty() || line.starts_with('#') {
            continue;
        }

        let cols = line.split('\t').collect::<Vec<_>>();
        if cols.len() < 7 {
            continue;
        }

        let domain = cols[0];
        let name = cols[5];
        let value = cols[6];

        if domain.contains("zhipin.com") && !name.is_empty() {
            parts.push(format!("{name}={value}"));
        }
    }

    if parts.is_empty() {
        None
    } else {
        Some(parts.join("; "))
    }
}

fn merge_cookie_hints(cookie_header: &str) -> String {
    let mut parts = cookie_header
        .split(';')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .map(str::to_owned)
        .collect::<Vec<_>>();

    if let Ok(stoken) = env::var("BOSS_ZP_STOKEN") {
        let has_stoken = parts.iter().any(|part| part.starts_with("__zp_stoken__="));
        if !has_stoken && !stoken.trim().is_empty() {
            parts.push(format!("__zp_stoken__={}", stoken.trim()));
        }
    }

    parts.join("; ")
}

#[cfg(test)]
mod tests {
    use super::{
        clear_credential, credential_cookie_names, load_credential,
        login_from_browser_sources, parse_json_cookie_blob,
    };
    use std::env;
    use std::fs;
    use std::sync::Mutex;

    static ENV_LOCK: Mutex<()> = Mutex::new(());

    fn temp_dir(name: &str) -> std::path::PathBuf {
        let path = env::temp_dir().join(format!("z0-boss-auth-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&path);
        fs::create_dir_all(&path).expect("temp dir");
        path
    }

    #[test]
    fn saves_and_loads_credentials() {
        let _guard = ENV_LOCK.lock().expect("env lock");
        let dir = temp_dir("save-load");
        // SAFETY: tests here are single-process and scoped to this test.
        unsafe {
            env::set_var("Z0_BOSS_CREDENTIAL_DIR", &dir);
            env::set_var("BOSS_COOKIES", "wt2=abc; wbg=def");
        }

        let saved = login_from_browser_sources().expect("login");
        let loaded = load_credential().expect("load");
        assert_eq!(saved.cookie_header, loaded.cookie_header);

        clear_credential().expect("clear");
    }

    #[test]
    fn returns_not_authenticated_when_missing() {
        let _guard = ENV_LOCK.lock().expect("env lock");
        let dir = temp_dir("missing");
        // SAFETY: tests here are single-process and scoped to this test.
        unsafe {
            env::set_var("Z0_BOSS_CREDENTIAL_DIR", &dir);
            env::remove_var("BOSS_COOKIES");
            env::remove_var("BOSS_COOKIE_FILE");
        }

        assert!(load_credential().is_err());
    }

    #[test]
    fn parses_cookie_json_export() {
        let raw = r#"[{"domain":".zhipin.com","name":"wt2","value":"abc"},{"domain":".example.com","name":"x","value":"y"}]"#;
        let parsed = parse_json_cookie_blob(raw).expect("json cookies");
        assert_eq!(parsed, "wt2=abc");
    }

    #[test]
    fn extracts_cookie_names() {
        let names = credential_cookie_names("wt2=abc; __zp_stoken__=def; wt2=xyz");
        assert_eq!(names, vec!["__zp_stoken__", "wt2"]);
    }
}
