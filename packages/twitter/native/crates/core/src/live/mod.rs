mod http;
mod parser;

use serde_json::{json, Value};

const DEFAULT_MAX_COUNT: usize = 20;
const MAX_COUNT_LIMIT: usize = 100;

pub fn auth_present() -> bool {
    http::auth_present()
}

pub fn supports_command(cli_args: &[String]) -> bool {
    matches!(
        cli_args.first().map(String::as_str),
        Some("status" | "whoami" | "feed" | "search" | "tweet" | "article" | "user" | "user-posts")
    )
}

pub fn execute(cli_args: &[String]) -> Result<Value, String> {
    match cli_args.first().map(String::as_str) {
        Some("status") => Ok(status_payload()?),
        Some("whoami") => Ok(whoami_payload()?),
        Some("feed") => feed_payload(cli_args),
        Some("search") => search_payload(cli_args),
        Some("tweet") => tweet_payload(cli_args),
        Some("article") => article_payload(cli_args),
        Some("user") => user_payload(cli_args),
        Some("user-posts") => user_posts_payload(cli_args),
        _ => Err("Twitter native live command is not supported.".to_string()),
    }
}

pub fn status_payload() -> Result<Value, String> {
    Ok(json!({
        "authenticated": true,
        "user": http::fetch_me_live()?,
        "source": "native-live"
    }))
}

pub fn whoami_payload() -> Result<Value, String> {
    Ok(json!({
        "user": http::fetch_me_live()?,
        "source": "native-live"
    }))
}

pub fn fetch_user_by_screen_name(screen_name: &str) -> Result<Value, String> {
    http::fetch_user_by_screen_name(screen_name)
}

fn feed_payload(cli_args: &[String]) -> Result<Value, String> {
    let timeline = option_value(cli_args, &["-t", "--timeline"]).unwrap_or_else(|| "for-you".to_string());
    let operation_name = if timeline == "following" {
        "HomeLatestTimeline"
    } else {
        "HomeTimeline"
    };
    let query_id = if timeline == "following" {
        "U0cdisy7QFIoTfu3-Okw0A"
    } else {
        "HCosKfLNW1AcOo3la3mMgg"
    };
    let count = max_count(cli_args, DEFAULT_MAX_COUNT);
    let variables = json!({
        "count": count,
        "includePromotedContent": false,
        "latestControlAvailable": true,
        "requestContext": "launch"
    });
    let value = http::graphql_get(
        query_id,
        operation_name,
        variables,
        http::default_timeline_features(),
        None,
    )?;
    Ok(json!({
        "items": parser::parse_timeline_items(&value),
        "source": "native-live"
    }))
}

fn search_payload(cli_args: &[String]) -> Result<Value, String> {
    let query = cli_args
        .get(1)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Twitter search requires a query.".to_string())?;
    let product = option_value(cli_args, &["-t", "--tab"]).unwrap_or_else(|| "Top".to_string());
    let count = max_count(cli_args, DEFAULT_MAX_COUNT);
    let variables = json!({
        "rawQuery": query,
        "querySource": "typed_query",
        "product": product,
        "count": count
    });
    let value = http::graphql_get(
        "MJpyQGqgklrVl_0X9gNy3A",
        "SearchTimeline",
        variables,
        http::default_timeline_features(),
        None,
    )?;
    Ok(json!({
        "items": parser::parse_timeline_items(&value),
        "source": "native-live"
    }))
}

fn tweet_payload(cli_args: &[String]) -> Result<Value, String> {
    let tweet_id = normalize_tweet_id(cli_args.get(1).map(String::as_str).unwrap_or_default())?;
    let count = max_count(cli_args, DEFAULT_MAX_COUNT);
    let variables = json!({
        "focalTweetId": tweet_id,
        "referrer": "tweet",
        "with_rux_injections": false,
        "includePromotedContent": true,
        "rankingMode": "Relevance",
        "withCommunity": true,
        "withQuickPromoteEligibilityTweetFields": true,
        "withBirdwatchNotes": true,
        "withVoice": true,
        "count": count
    });
    let field_toggles = json!({
        "withArticleRichContentState": true,
        "withArticlePlainText": false,
        "withGrokAnalyze": false,
        "withDisallowedReplyControls": false
    });
    let value = http::graphql_get(
        "nBS-WpgA6ZG0CyNHD517JQ",
        "TweetDetail",
        variables,
        http::default_timeline_features(),
        Some(field_toggles),
    )?;
    Ok(json!({
        "items": parser::parse_timeline_items(&value),
        "source": "native-live"
    }))
}

fn article_payload(cli_args: &[String]) -> Result<Value, String> {
    let tweet_id = normalize_tweet_id(cli_args.get(1).map(String::as_str).unwrap_or_default())?;
    let variables = json!({
        "tweetId": tweet_id,
        "withCommunity": false,
        "includePromotedContent": false,
        "withVoice": false
    });
    let features = json!({
        "longform_notetweets_consumption_enabled": true,
        "responsive_web_twitter_article_tweet_consumption_enabled": true,
        "longform_notetweets_rich_text_read_enabled": true,
        "longform_notetweets_inline_media_enabled": true,
        "articles_preview_enabled": true,
        "responsive_web_graphql_exclude_directive_enabled": true,
        "verified_phone_label_enabled": false
    });
    let field_toggles = json!({
        "withArticleRichContentState": true,
        "withArticlePlainText": true
    });
    let value = http::graphql_get(
        "7xflPyRiUxGVbJd4uWmbfg",
        "TweetResultByRestId",
        variables,
        features,
        Some(field_toggles),
    )?;
    let result = parser::deep_get(&value, &["data", "tweetResult", "result"])
        .ok_or_else(|| "Twitter article payload shape changed.".to_string())?;

    Ok(json!({
        "id": result.get("rest_id").and_then(Value::as_str).unwrap_or(tweet_id.as_str()),
        "articleTitle": parser::parse_article_title(result).unwrap_or_default(),
        "articleText": parser::parse_article_text(result).unwrap_or_default(),
        "source": "native-live"
    }))
}

fn user_payload(cli_args: &[String]) -> Result<Value, String> {
    let handle = cli_args
        .get(1)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Twitter user lookup requires a handle.".to_string())?;
    fetch_user_by_screen_name(handle)
}

fn user_posts_payload(cli_args: &[String]) -> Result<Value, String> {
    let handle = cli_args
        .get(1)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "Twitter user-posts requires a handle.".to_string())?;
    let user = fetch_user_by_screen_name(handle)?;
    let user_id = user
        .get("id")
        .and_then(Value::as_str)
        .ok_or_else(|| "Twitter user lookup did not return a user id.".to_string())?;
    let count = max_count(cli_args, DEFAULT_MAX_COUNT);
    let variables = json!({
        "userId": user_id,
        "count": count,
        "withQuickPromoteEligibilityTweetFields": true,
        "withVoice": true,
        "withV2Timeline": true
    });
    let value = http::graphql_get(
        "E3opETHurmVJflFsUBVuUQ",
        "UserTweets",
        variables,
        http::default_timeline_features(),
        None,
    )?;
    Ok(json!({
        "items": parser::parse_timeline_items(&value),
        "source": "native-live"
    }))
}

fn normalize_tweet_id(value: &str) -> Result<String, String> {
    let raw = value.trim();
    if raw.is_empty() {
        return Err("Tweet ID or URL is required.".to_string());
    }

    let candidate = raw
        .trim_end_matches('/')
        .split('/')
        .next_back()
        .unwrap_or(raw)
        .split('?')
        .next()
        .unwrap_or(raw)
        .split('#')
        .next()
        .unwrap_or(raw);

    if candidate.chars().all(|char| char.is_ascii_digit()) {
        Ok(candidate.to_string())
    } else {
        Err(format!("Invalid tweet ID: {value}"))
    }
}

fn max_count(cli_args: &[String], default: usize) -> usize {
    option_value(cli_args, &["--max", "-n"])
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(default)
        .min(MAX_COUNT_LIMIT)
}

fn option_value(cli_args: &[String], names: &[&str]) -> Option<String> {
    cli_args
        .windows(2)
        .find(|window| names.contains(&window[0].as_str()))
        .map(|window| window[1].clone())
}

#[cfg(test)]
mod tests {
    use super::normalize_tweet_id;

    #[test]
    fn normalizes_tweet_id_from_url() {
        let tweet_id = normalize_tweet_id("https://x.com/z0/status/1234567890?s=20").unwrap();
        assert_eq!(tweet_id, "1234567890");
    }
}
