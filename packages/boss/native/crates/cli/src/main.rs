use std::env;
use std::path::PathBuf;
use std::process::ExitCode;
use std::process::Command;

use serde_json::{Map, Value};
use z0_boss_auth::{
    clear_credential, credential_cookie_names, credential_has_cookie, load_credential,
    login_from_browser_sources, login_from_qr_sources, probe_browser_sources, AuthError,
};
use z0_boss_core::{
    cities, find_job, history_jobs, interviews_jobs, json_array, json_bool, json_number,
    json_object, json_string, profile, recruiter_chats, recommended_jobs, search_jobs, BossChat,
    BossCity, BossJob,
};
use z0_boss_live::BossLiveClient;

fn main() -> ExitCode {
    let args = env::args().skip(1).collect::<Vec<_>>();

    match run(&args) {
        Ok(output) => {
            println!("{output}");
            ExitCode::SUCCESS
        }
        Err(error) => {
            println!("{}", error_json(&error));
            ExitCode::from(1)
        }
    }
}

fn run(args: &[String]) -> Result<String, AuthError> {
    match args {
        [group, command] if group == "auth" && command == "status" => auth_status(),
        [group, command] if group == "auth" && command == "self-check" => {
            auth_self_check()
        }
        [group, command] if group == "auth" && command == "login-browser" => auth_login_browser(),
        [group, command] if group == "auth" && command == "login-qr" => auth_login_qr(),
        [group, command] if group == "auth" && command == "logout" => auth_logout(),
        [group, command] if group == "profile" && command == "me" => profile_me(),
        [group, command, query] if group == "jobs" && command == "search" => jobs_search(query),
        [group, command] if group == "jobs" && command == "recommend" => jobs_recommend(),
        [group, command, security_id] if group == "jobs" && command == "detail" => {
            jobs_detail(security_id)
        }
        [group, command] if group == "jobs" && command == "history" => jobs_history(),
        [group, command] if group == "jobs" && command == "applied" => jobs_applied(),
        [group, command] if group == "jobs" && command == "interviews" => jobs_interviews(),
        [group, command] if group == "social" && command == "chat-list" => social_chat_list(),
        [group, command] if group == "meta" && command == "cities" => meta_cities(),
        _ => Err(AuthError::Unavailable("Unsupported command")),
    }
}

fn ensure_auth() -> Result<(), AuthError> {
    load_credential().map(|_| ())
}

fn auth_status() -> Result<String, AuthError> {
    match load_credential() {
        Ok(credential) => {
            let cookie_names = credential_cookie_names(&credential.cookie_header);
            let live_health = auth_live_health();

            Ok(json_object(&[
                ("ok", json_bool(true)),
                (
                    "data",
                    json_object(&[
                        ("authenticated", json_bool(true)),
                        ("credential_present", json_bool(true)),
                        (
                            "cookie_header_preview",
                            json_string(&preview_cookie_header(&credential.cookie_header)),
                        ),
                        ("cookieCount", json_number(cookie_names.len() as u64)),
                        (
                            "cookieNames",
                            json_array(
                                &cookie_names
                                    .iter()
                                    .map(|name| json_string(name))
                                    .collect::<Vec<_>>(),
                            ),
                        ),
                        (
                            "hasZpStoken",
                            json_bool(credential_has_cookie(
                                &credential.cookie_header,
                                "__zp_stoken__",
                            )),
                        ),
                        ("searchAuthenticated", json_bool(live_health.search_authenticated)),
                        (
                            "recommendAuthenticated",
                            json_bool(live_health.recommend_authenticated),
                        ),
                        (
                            "profileAuthenticated",
                            json_bool(live_health.profile_authenticated),
                        ),
                        (
                            "healthWarnings",
                            json_array(
                                &live_health
                                    .warnings
                                    .iter()
                                    .map(|warning| json_string(warning))
                                    .collect::<Vec<_>>(),
                            ),
                        ),
                    ]),
                ),
            ]))
        }
        Err(AuthError::NotAuthenticated) => Ok(json_object(&[
            ("ok", json_bool(true)),
            (
                "data",
                json_object(&[
                    ("authenticated", json_bool(false)),
                    ("credential_present", json_bool(false)),
                ]),
            ),
        ])),
        Err(error) => Err(error),
    }
}

fn auth_self_check() -> Result<String, AuthError> {
    let browser_probe = probe_browser_sources();
    let stored_credential = load_credential().ok();
    let live_health = auth_live_health();

    Ok(json_object(&[
        ("ok", json_bool(true)),
        (
            "data",
            json_object(&[
                (
                    "runtime",
                    json_object(&[
                        (
                            "platform",
                            json_string(std::env::consts::OS),
                        ),
                        (
                            "arch",
                            json_string(std::env::consts::ARCH),
                        ),
                        (
                            "workspaceRoot",
                            json_string(
                                &env::var("Z0_WORKSPACE_ROOT").unwrap_or_else(|_| "auto".into()),
                            ),
                        ),
                    ]),
                ),
                (
                    "storedCredential",
                    json_object(&[
                        ("present", json_bool(stored_credential.is_some())),
                        (
                            "hasZpStoken",
                            json_bool(
                                stored_credential
                                    .as_ref()
                                    .map(|credential| {
                                        credential_has_cookie(
                                            &credential.cookie_header,
                                            "__zp_stoken__",
                                        )
                                    })
                                    .unwrap_or(false),
                            ),
                        ),
                    ]),
                ),
                (
                    "browserProbe",
                    json_object(&[
                        (
                            "cookieFound",
                            json_bool(browser_probe.cookie_header.is_some()),
                        ),
                        (
                            "cookieNames",
                            json_array(
                                &browser_probe
                                    .cookie_header
                                    .as_ref()
                                    .map(|header| {
                                        credential_cookie_names(header)
                                            .iter()
                                            .map(|name| json_string(name))
                                            .collect::<Vec<_>>()
                                    })
                                    .unwrap_or_default(),
                            ),
                        ),
                        (
                            "warnings",
                            json_array(
                                &browser_probe
                                    .warnings
                                    .iter()
                                    .map(|warning| json_string(warning))
                                    .collect::<Vec<_>>(),
                            ),
                        ),
                    ]),
                ),
                (
                    "liveHealth",
                    json_object(&[
                        ("searchAuthenticated", json_bool(live_health.search_authenticated)),
                        (
                            "recommendAuthenticated",
                            json_bool(live_health.recommend_authenticated),
                        ),
                        (
                            "profileAuthenticated",
                            json_bool(live_health.profile_authenticated),
                        ),
                        (
                            "warnings",
                            json_array(
                                &live_health
                                    .warnings
                                    .iter()
                                    .map(|warning| json_string(warning))
                                    .collect::<Vec<_>>(),
                            ),
                        ),
                    ]),
                ),
                (
                    "envHints",
                    json_object(&[
                        (
                            "bossCookies",
                            json_bool(env::var("BOSS_COOKIES").is_ok()),
                        ),
                        (
                            "bossCookieFile",
                            json_bool(env::var("BOSS_COOKIE_FILE").is_ok()),
                        ),
                        (
                            "bossCookiesJson",
                            json_bool(env::var("BOSS_COOKIES_JSON").is_ok()),
                        ),
                        (
                            "bossCookiesJsonFile",
                            json_bool(env::var("BOSS_COOKIES_JSON_FILE").is_ok()),
                        ),
                        (
                            "bossNetscapeCookieFile",
                            json_bool(env::var("BOSS_NETSCAPE_COOKIE_FILE").is_ok()),
                        ),
                        (
                            "bossZpStoken",
                            json_bool(env::var("BOSS_ZP_STOKEN").is_ok()),
                        ),
                    ]),
                ),
            ]),
        ),
    ]))
}

struct AuthLiveHealth {
    profile_authenticated: bool,
    search_authenticated: bool,
    recommend_authenticated: bool,
    warnings: Vec<String>,
}

fn auth_live_health() -> AuthLiveHealth {
    let mut health = AuthLiveHealth {
        profile_authenticated: false,
        search_authenticated: false,
        recommend_authenticated: false,
        warnings: Vec::new(),
    };

    let client = match BossLiveClient::from_saved_credential() {
        Ok(client) => client,
        Err(_) => return health,
    };

    match client.profile_me() {
        Ok(_) => health.profile_authenticated = true,
        Err(error) => health.warnings.push(format!("profile: {}", auth_error_label(&error))),
    }

    match client.search_jobs("Rust") {
        Ok(_) => health.search_authenticated = true,
        Err(error) => health.warnings.push(format!("search: {}", auth_error_label(&error))),
    }

    match client.recommend_jobs() {
        Ok(_) => health.recommend_authenticated = true,
        Err(error) => health
            .warnings
            .push(format!("recommend: {}", auth_error_label(&error))),
    }

    health
}

fn auth_login_browser() -> Result<String, AuthError> {
    let credential = login_from_browser_sources()?;
    Ok(json_object(&[
        ("ok", json_bool(true)),
        (
            "data",
            json_object(&[
                ("authenticated", json_bool(true)),
                ("source", json_string("browser")),
                ("cookie_header_preview", json_string(&preview_cookie_header(&credential.cookie_header))),
            ]),
        ),
    ]))
}

fn auth_login_qr() -> Result<String, AuthError> {
    let credential = login_from_qr_sources()?;
    Ok(json_object(&[
        ("ok", json_bool(true)),
        (
            "data",
            json_object(&[
                ("authenticated", json_bool(true)),
                ("source", json_string("qr")),
                ("cookie_header_preview", json_string(&preview_cookie_header(&credential.cookie_header))),
            ]),
        ),
    ]))
}

fn auth_logout() -> Result<String, AuthError> {
    clear_credential()?;
    Ok(json_object(&[
        ("ok", json_bool(true)),
        ("data", json_object(&[("logged_out", json_bool(true))])),
    ]))
}

fn profile_me() -> Result<String, AuthError> {
    ensure_auth()?;
    if let Some(result) = try_live_json("profile_me", |client| client.profile_me()) {
        return result;
    }
    if let Some(result) = try_legacy_enveloped_command(&["me", "--json"]) {
        return result;
    }

    let me = profile();

    Ok(json_object(&[
        ("ok", json_bool(true)),
        (
            "data",
            json_object(&[
                ("name", json_string(me.name)),
                ("age", json_string(me.age)),
                ("degree", json_string(me.degree)),
                ("account", json_string(me.account)),
                ("city", json_string(me.city)),
            ]),
        ),
    ]))
}

fn jobs_search(query: &str) -> Result<String, AuthError> {
    ensure_auth()?;
    if let Some(result) = try_live_json("jobs_search", |client| client.search_jobs(query)) {
        return result;
    }
    if let Some(result) = try_legacy_enveloped_command(&["search", query, "--json"]) {
        return result;
    }

    Ok(job_list_payload(search_jobs(query)))
}

fn jobs_recommend() -> Result<String, AuthError> {
    ensure_auth()?;
    if let Some(result) = try_live_json("jobs_recommend", |client| client.recommend_jobs()) {
        return result;
    }
    if let Some(result) = try_legacy_enveloped_command(&["recommend", "--json"]) {
        return result;
    }

    Ok(job_list_payload(recommended_jobs()))
}

fn jobs_detail(security_id: &str) -> Result<String, AuthError> {
    ensure_auth()?;
    if let Some(result) = try_live_json("jobs_detail", |client| client.job_detail(security_id)) {
        return result;
    }
    if let Some(result) = try_legacy_enveloped_command(&["detail", security_id, "--json"]) {
        return result;
    }

    let job = find_job(security_id).ok_or(AuthError::Unavailable("Job not found"))?;

    Ok(json_object(&[
        ("ok", json_bool(true)),
        ("data", json_object(&[("job", job_json(&job))])),
    ]))
}

fn jobs_history() -> Result<String, AuthError> {
    ensure_auth()?;
    if let Some(result) = try_live_json("jobs_history", |client| client.history()) {
        return result;
    }
    if let Some(result) = try_legacy_enveloped_command(&["history", "--json"]) {
        return result;
    }

    Ok(job_list_payload(history_jobs()))
}

fn jobs_applied() -> Result<String, AuthError> {
    ensure_auth()?;
    if let Some(result) = try_live_json("jobs_applied", |client| client.applied()) {
        return result;
    }
    if let Some(result) = try_legacy_enveloped_command(&["applied", "--json"]) {
        return result;
    }

    Ok(job_list_payload(recommended_jobs()))
}

fn jobs_interviews() -> Result<String, AuthError> {
    ensure_auth()?;
    if let Some(result) = try_live_json("jobs_interviews", |client| client.interviews()) {
        return result;
    }
    if let Some(result) = try_legacy_enveloped_command(&["interviews", "--json"]) {
        return result;
    }

    Ok(job_list_payload(interviews_jobs()))
}

fn social_chat_list() -> Result<String, AuthError> {
    ensure_auth()?;
    if let Some(result) = try_live_json("social_chat_list", |client| client.chat_list()) {
        return result;
    }
    if let Some(result) = try_legacy_enveloped_command(&["chat", "--json"]) {
        return result;
    }

    let items = recruiter_chats()
        .iter()
        .map(chat_json)
        .collect::<Vec<_>>();

    Ok(json_object(&[
        ("ok", json_bool(true)),
        ("data", json_object(&[("items", json_array(&items))])),
    ]))
}

fn meta_cities() -> Result<String, AuthError> {
    if let Some(result) = try_legacy_enveloped_command(&["cities", "--json"]) {
        return result;
    }

    let items = cities().iter().map(city_json).collect::<Vec<_>>();
    Ok(json_object(&[
        ("ok", json_bool(true)),
        ("data", json_object(&[("items", json_array(&items))])),
    ]))
}

fn try_live_json(
    label: &str,
    action: impl FnOnce(&BossLiveClient) -> Result<Value, AuthError>,
) -> Option<Result<String, AuthError>> {
    if env::var("Z0_BOSS_FORCE_FIXTURE").ok().as_deref() == Some("1") {
        return None;
    }

    let client = BossLiveClient::from_saved_credential().ok()?;
    Some(
        action(&client)
            .map(|value| wrap_live_value(label, value))
            .map_err(|error| match error {
                AuthError::NotAuthenticated => AuthError::NotAuthenticated,
                _ => AuthError::Unavailable("Boss live backend failed"),
            }),
    )
}

fn wrap_live_value(label: &str, value: Value) -> String {
    let mut data = match value {
        Value::Object(object) => object,
        other => Map::from_iter([("value".into(), other)]),
    };
    data.insert("backendSource".into(), Value::String("rust-live".into()));
    data.insert("operation".into(), Value::String(label.into()));

    Value::Object(Map::from_iter([
        ("ok".into(), Value::Bool(true)),
        ("data".into(), Value::Object(data)),
    ]))
    .to_string()
}

fn job_list_payload(items: Vec<BossJob>) -> String {
    let list = items.iter().map(job_json).collect::<Vec<_>>();
    json_object(&[
        ("ok", json_bool(true)),
        (
            "data",
            json_object(&[
                ("count", json_number(list.len() as u64)),
                ("items", json_array(&list)),
            ]),
        ),
    ])
}

fn job_json(job: &BossJob) -> String {
    let skills = job
        .skills
        .iter()
        .map(|skill| json_string(skill))
        .collect::<Vec<_>>();

    json_object(&[
        ("securityId", json_string(job.security_id)),
        ("jobName", json_string(job.job_name)),
        ("brandName", json_string(job.brand_name)),
        ("salaryDesc", json_string(job.salary_desc)),
        ("city", json_string(job.city)),
        ("experience", json_string(job.experience)),
        ("degree", json_string(job.degree)),
        ("skills", json_array(&skills)),
        ("description", json_string(job.description)),
    ])
}

fn chat_json(chat: &BossChat) -> String {
    json_object(&[
        ("recruiter", json_string(chat.recruiter)),
        ("company", json_string(chat.company)),
        ("lastMessage", json_string(chat.last_message)),
    ])
}

fn city_json(city: &BossCity) -> String {
    json_object(&[
        ("code", json_string(city.code)),
        ("name", json_string(city.name)),
    ])
}

fn preview_cookie_header(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.len() <= 24 {
        return trimmed.to_owned();
    }

    format!("{}...", &trimmed[..24])
}

fn try_legacy_enveloped_command(args: &[&str]) -> Option<Result<String, AuthError>> {
    let raw = execute_legacy_command(args)?;
    Some(normalize_legacy_json(&raw))
}

fn execute_legacy_command(args: &[&str]) -> Option<String> {
    let workspace_root = env::var("Z0_WORKSPACE_ROOT")
        .ok()
        .map(PathBuf::from)
        .or_else(detect_workspace_root)
        .unwrap_or_else(|| env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
    let legacy_pythonpath = workspace_root.join("packages/boss-cli");

    if !legacy_pythonpath.exists() {
        return None;
    }

    let python_bin = env::var("Z0_BOSS_LEGACY_BIN").unwrap_or_else(|_| "python3".into());
    let existing_pythonpath = env::var("PYTHONPATH").ok();
    let pythonpath = match existing_pythonpath {
        Some(current) if !current.is_empty() => {
            format!("{}:{}", legacy_pythonpath.display(), current)
        }
        _ => legacy_pythonpath.display().to_string(),
    };

    let output = Command::new(python_bin)
        .arg("-m")
        .arg("boss_cli.cli")
        .args(args)
        .current_dir(workspace_root)
        .env("PYTHONPATH", pythonpath)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8(output.stdout).ok()?;
    let trimmed = stdout.trim();

    if trimmed.is_empty() {
        return None;
    }

    Some(trimmed.to_owned())
}

fn normalize_legacy_json(raw: &str) -> Result<String, AuthError> {
    let mut value: Value =
        serde_json::from_str(raw).map_err(|_| AuthError::Unavailable("Legacy bridge returned invalid JSON"))?;

    match &mut value {
        Value::Object(object) if object.contains_key("ok") => {
            annotate_backend_source(object, "legacy-python");

            if matches!(object.get("ok"), Some(Value::Bool(false))) {
                return Err(map_legacy_error(object));
            }

            Ok(value.to_string())
        }
        Value::Object(object) => {
            let mut data = Map::new();
            for (key, value) in object.clone() {
                data.insert(key, value);
            }
            data.insert("backendSource".into(), Value::String("legacy-python".into()));

            Ok(
                Value::Object(Map::from_iter([
                    ("ok".into(), Value::Bool(true)),
                    ("data".into(), Value::Object(data)),
                ]))
                .to_string(),
            )
        }
        _ => Err(AuthError::Unavailable(
            "Legacy bridge returned an unsupported JSON shape",
        )),
    }
}

fn annotate_backend_source(object: &mut Map<String, Value>, source: &str) {
    match object.get_mut("data") {
        Some(Value::Object(data)) => {
            data.insert("backendSource".into(), Value::String(source.into()));
        }
        None => {
            object.insert(
                "data".into(),
                Value::Object(Map::from_iter([(
                    "backendSource".into(),
                    Value::String(source.into()),
                )])),
            );
        }
        _ => {}
    }
}

fn map_legacy_error(object: &Map<String, Value>) -> AuthError {
    let code = object
        .get("error")
        .and_then(Value::as_object)
        .and_then(|error| error.get("code"))
        .and_then(Value::as_str)
        .unwrap_or("upstream_error");

    match code {
        "not_authenticated" => AuthError::NotAuthenticated,
        _ => AuthError::Unavailable("Legacy bridge command failed"),
    }
}

fn detect_workspace_root() -> Option<PathBuf> {
    let mut current = env::current_dir().ok()?;

    loop {
        if current.join("pnpm-workspace.yaml").exists() {
            return Some(current);
        }

        if !current.pop() {
            return None;
        }
    }
}

fn auth_error_label(error: &AuthError) -> String {
    match error {
        AuthError::Unavailable(message) => (*message).to_owned(),
        AuthError::NotAuthenticated => "not authenticated".into(),
        AuthError::Io(message) => message.clone(),
    }
}

fn error_json(error: &AuthError) -> String {
    let (code, message) = match error {
        AuthError::Unavailable(message) => ("auth_unavailable", (*message).to_owned()),
        AuthError::NotAuthenticated => (
            "not_authenticated",
            "Boss authentication is required for this command.".to_owned(),
        ),
        AuthError::Io(message) => ("io_error", message.clone()),
    };

    json_object(&[
        ("ok", json_bool(false)),
        (
            "error",
            json_object(&[
                ("code", json_string(code)),
                ("message", json_string(&message)),
            ]),
        ),
    ])
}

#[cfg(test)]
mod tests {
    use super::{execute_legacy_command, normalize_legacy_json};
    use std::env;
    use std::fs;
    use std::path::PathBuf;

    fn temp_dir(name: &str) -> PathBuf {
        let path = env::temp_dir().join(format!("z0-boss-cli-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&path);
        fs::create_dir_all(path.join("packages/boss-cli")).expect("temp tree");
        path
    }

    #[test]
    fn normalizes_legacy_envelope_and_marks_source() {
        let value = normalize_legacy_json(r#"{"ok":true,"data":{"name":"Boss"}}"#)
            .expect("normalized");
        assert!(value.contains("\"backendSource\":\"legacy-python\""));
    }

    #[test]
    fn wraps_plain_status_json() {
        let value = normalize_legacy_json(r#"{"authenticated":true,"credential_present":true}"#)
            .expect("normalized");
        assert!(value.contains("\"ok\":true"));
        assert!(value.contains("\"backendSource\":\"legacy-python\""));
    }

    #[test]
    fn executes_configured_legacy_bin() {
        let root = temp_dir("legacy-bin");
        let script = root.join("fake-python.sh");
        fs::write(
            &script,
            "#!/bin/sh\nprintf '{\"ok\":true,\"data\":{\"hello\":\"world\"}}'\n",
        )
        .expect("script");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&script, fs::Permissions::from_mode(0o755)).expect("chmod");
        }

        // SAFETY: test-scoped environment setup.
        unsafe {
            env::set_var("Z0_WORKSPACE_ROOT", &root);
            env::set_var("Z0_BOSS_LEGACY_BIN", &script);
        }

        let output = execute_legacy_command(&["status", "--json"]).expect("legacy output");
        assert!(output.contains("\"ok\":true"));
    }
}
