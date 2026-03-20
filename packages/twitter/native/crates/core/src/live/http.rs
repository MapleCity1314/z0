use super::parser;
use reqwest::blocking::{Client, Response};
use reqwest::header::{
    HeaderMap, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, AUTHORIZATION, COOKIE, ORIGIN, REFERER,
    USER_AGENT,
};
use serde_json::{json, Value};
use std::env;

pub fn auth_present() -> bool {
    env::var("TWITTER_AUTH_TOKEN").is_ok() && env::var("TWITTER_CT0").is_ok()
}

pub fn fetch_user_by_screen_name(screen_name: &str) -> Result<Value, String> {
    let variables = json!({
        "screen_name": screen_name.trim_start_matches('@'),
        "withSafetyModeUserFields": true
    });
    let features = json!({
        "hidden_profile_subscriptions_enabled": true,
        "rweb_tipjar_consumption_enabled": true,
        "responsive_web_graphql_exclude_directive_enabled": true,
        "verified_phone_label_enabled": false,
        "subscriptions_verification_info_is_identity_verified_enabled": true,
        "subscriptions_verification_info_verified_since_enabled": true,
        "highlights_tweets_tab_ui_enabled": true,
        "responsive_web_twitter_article_notes_tab_enabled": true,
        "subscriptions_feature_can_gift_premium": true,
        "creator_subscriptions_tweet_preview_api_enabled": true,
        "responsive_web_graphql_skip_user_profile_image_extensions_enabled": false,
        "responsive_web_graphql_timeline_navigation_enabled": true
    });
    let value = graphql_get("qRednkZG-rn1P6b48NINmQ", "UserByScreenName", variables, features, None)?;
    parser::parse_user_profile_from_graphql(&value)
        .ok_or_else(|| "Twitter user payload shape changed.".to_string())
}

pub fn fetch_me_live() -> Result<Value, String> {
    let value = api_get("https://x.com/i/api/1.1/account/multi/list.json")?;
    let screen_name = value
        .get("users")
        .and_then(Value::as_array)
        .and_then(|users| users.first())
        .and_then(|user| user.get("screen_name"))
        .and_then(Value::as_str)
        .or_else(|| {
            value.as_array()
                .and_then(|users| users.first())
                .and_then(|entry| entry.get("user"))
                .and_then(|user| user.get("screen_name"))
                .and_then(Value::as_str)
        })
        .ok_or_else(|| "Twitter whoami payload shape changed.".to_string())?;

    fetch_user_by_screen_name(screen_name)
}

pub fn graphql_get(
    query_id: &str,
    operation_name: &str,
    variables: Value,
    features: Value,
    field_toggles: Option<Value>,
) -> Result<Value, String> {
    let url = build_graphql_url(query_id, operation_name, variables, features, field_toggles);
    api_get(&url)
}

pub fn default_timeline_features() -> Value {
    json!({
        "responsive_web_graphql_exclude_directive_enabled": true,
        "verified_phone_label_enabled": false,
        "creator_subscriptions_tweet_preview_api_enabled": true,
        "responsive_web_graphql_timeline_navigation_enabled": true,
        "responsive_web_graphql_skip_user_profile_image_extensions_enabled": false,
        "c9s_tweet_anatomy_moderator_badge_enabled": true,
        "tweetypie_unmention_optimization_enabled": true,
        "responsive_web_edit_tweet_api_enabled": true,
        "graphql_is_translatable_rweb_tweet_is_translatable_enabled": true,
        "view_counts_everywhere_api_enabled": true,
        "longform_notetweets_consumption_enabled": true,
        "responsive_web_twitter_article_tweet_consumption_enabled": true,
        "longform_notetweets_rich_text_read_enabled": true,
        "longform_notetweets_inline_media_enabled": true,
        "rweb_video_timestamps_enabled": true,
        "responsive_web_media_download_video_enabled": true,
        "freedom_of_speech_not_reach_fetch_enabled": true,
        "standardized_nudges_misinfo": true,
        "responsive_web_enhance_cards_enabled": false
    })
}

fn api_get(url: &str) -> Result<Value, String> {
    let client = twitter_client()?;
    let headers = twitter_headers()?;
    let response = client
        .get(url)
        .headers(headers)
        .send()
        .map_err(|error| error.to_string())?;
    parse_json_response(response, "Twitter request")
}

fn build_graphql_url(
    query_id: &str,
    operation_name: &str,
    variables: Value,
    features: Value,
    field_toggles: Option<Value>,
) -> String {
    let compact_features = features
        .as_object()
        .map(|features| {
            features
                .iter()
                .filter(|(_, value)| !matches!(value, Value::Bool(false)))
                .map(|(key, value)| (key.clone(), value.clone()))
                .collect::<serde_json::Map<String, Value>>()
        })
        .unwrap_or_default();

    let mut url = format!(
        "https://x.com/i/api/graphql/{query_id}/{operation_name}?variables={}&features={}",
        urlencoding::encode(&variables.to_string()),
        urlencoding::encode(&Value::Object(compact_features).to_string())
    );

    if let Some(field_toggles) = field_toggles {
        url.push_str("&fieldToggles=");
        url.push_str(&urlencoding::encode(&field_toggles.to_string()));
    }

    url
}

fn bearer_token() -> &'static str {
    "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
}

fn cookie_header() -> Option<String> {
    if let Ok(cookie_string) = env::var("TWITTER_COOKIE_STRING") {
        if !cookie_string.trim().is_empty() {
            return Some(cookie_string);
        }
    }

    let auth_token = env::var("TWITTER_AUTH_TOKEN").ok()?;
    let ct0 = env::var("TWITTER_CT0").ok()?;
    Some(format!("auth_token={auth_token}; ct0={ct0}"))
}

fn twitter_client() -> Result<Client, String> {
    Client::builder().build().map_err(|error| error.to_string())
}

fn twitter_headers() -> Result<HeaderMap, String> {
    let cookie = cookie_header().ok_or_else(|| "Missing Twitter cookie header".to_string())?;
    let ct0 = env::var("TWITTER_CT0").map_err(|_| "Missing TWITTER_CT0".to_string())?;

    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", bearer_token())).map_err(|error| error.to_string())?,
    );
    headers.insert(COOKIE, HeaderValue::from_str(&cookie).map_err(|error| error.to_string())?);
    headers.insert("x-csrf-token", HeaderValue::from_str(&ct0).map_err(|error| error.to_string())?);
    headers.insert("x-twitter-active-user", HeaderValue::from_static("yes"));
    headers.insert("x-twitter-auth-type", HeaderValue::from_static("OAuth2Session"));
    headers.insert("x-twitter-client-language", HeaderValue::from_static("en"));
    headers.insert(
        USER_AGENT,
        HeaderValue::from_static(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        ),
    );
    headers.insert(ORIGIN, HeaderValue::from_static("https://x.com"));
    headers.insert(REFERER, HeaderValue::from_static("https://x.com/"));
    headers.insert(ACCEPT, HeaderValue::from_static("*/*"));
    headers.insert(ACCEPT_LANGUAGE, HeaderValue::from_static("en-US,en;q=0.9"));
    headers.insert(
        "sec-ch-ua",
        HeaderValue::from_static("\"Chromium\";v=\"133\", \"Not(A:Brand\";v=\"99\", \"Google Chrome\";v=\"133\""),
    );
    headers.insert("sec-ch-ua-mobile", HeaderValue::from_static("?0"));
    headers.insert("sec-ch-ua-platform", HeaderValue::from_static("\"macOS\""));
    headers.insert("sec-fetch-dest", HeaderValue::from_static("empty"));
    headers.insert("sec-fetch-mode", HeaderValue::from_static("cors"));
    headers.insert("sec-fetch-site", HeaderValue::from_static("same-origin"));
    Ok(headers)
}

fn parse_json_response(response: Response, label: &str) -> Result<Value, String> {
    let status = response.status();
    if status.as_u16() == 401 || status.as_u16() == 403 {
        return Err("Twitter auth is invalid or expired.".to_string());
    }
    if !status.is_success() {
        return Err(format!("{label} failed with HTTP {}", status.as_u16()));
    }
    response.json::<Value>().map_err(|error| error.to_string())
}
