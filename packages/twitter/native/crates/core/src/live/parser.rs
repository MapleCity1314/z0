use serde_json::{json, Value};

pub fn parse_user_profile_from_graphql(value: &Value) -> Option<Value> {
    let result = value.get("data")?.get("user")?.get("result")?;
    let legacy = result.get("legacy")?;
    Some(json!({
        "id": result.get("rest_id").and_then(Value::as_str).unwrap_or_default(),
        "name": legacy.get("name").and_then(Value::as_str).unwrap_or_default(),
        "username": legacy.get("screen_name").and_then(Value::as_str).unwrap_or_default(),
        "screenName": legacy.get("screen_name").and_then(Value::as_str).unwrap_or_default(),
        "bio": legacy.get("description").and_then(Value::as_str).unwrap_or_default(),
        "location": legacy.get("location").and_then(Value::as_str).unwrap_or_default(),
        "url": legacy
            .get("entities")
            .and_then(|entities| entities.get("url"))
            .and_then(|url| url.get("urls"))
            .and_then(Value::as_array)
            .and_then(|urls| urls.first())
            .and_then(|value| value.get("expanded_url"))
            .and_then(Value::as_str)
            .unwrap_or_default(),
        "followers": legacy.get("followers_count").and_then(Value::as_i64).unwrap_or(0),
        "following": legacy.get("friends_count").and_then(Value::as_i64).unwrap_or(0),
        "tweets": legacy.get("statuses_count").and_then(Value::as_i64).unwrap_or(0),
        "likes": legacy.get("favourites_count").and_then(Value::as_i64).unwrap_or(0),
        "verified": result.get("is_blue_verified").and_then(Value::as_bool).unwrap_or(false)
            || legacy.get("verified").and_then(Value::as_bool).unwrap_or(false),
        "profileImageUrl": legacy.get("profile_image_url_https").and_then(Value::as_str).unwrap_or_default(),
        "createdAt": legacy.get("created_at").and_then(Value::as_str).unwrap_or_default()
    }))
}

pub fn parse_timeline_items(value: &Value) -> Vec<Value> {
    collect_timeline_entries(value)
        .into_iter()
        .filter_map(parse_tweet_result)
        .collect()
}

pub fn parse_article_title(result: &Value) -> Option<String> {
    deep_get(result, &["article", "article_results", "result", "title"])
        .and_then(Value::as_str)
        .map(ToString::to_string)
}

pub fn parse_article_text(result: &Value) -> Option<String> {
    let blocks = deep_get(result, &["article", "article_results", "result", "content_state", "blocks"])?
        .as_array()?;

    let mut parts = Vec::new();
    let mut ordered_counter = 0;
    for block in blocks {
        let block_type = block.get("type").and_then(Value::as_str).unwrap_or("unstyled");
        let text = block.get("text").and_then(Value::as_str).unwrap_or_default().trim();
        if text.is_empty() {
            continue;
        }

        if block_type != "ordered-list-item" {
            ordered_counter = 0;
        }

        match block_type {
            "header-one" => parts.push(format!("# {text}")),
            "header-two" => parts.push(format!("## {text}")),
            "header-three" => parts.push(format!("### {text}")),
            "blockquote" => parts.push(format!("> {text}")),
            "unordered-list-item" => parts.push(format!("- {text}")),
            "ordered-list-item" => {
                ordered_counter += 1;
                parts.push(format!("{ordered_counter}. {text}"));
            }
            "code-block" => parts.push(format!("```\n{text}\n```")),
            _ => parts.push(text.to_string()),
        }
    }

    if parts.is_empty() {
        None
    } else {
        Some(parts.join("\n\n"))
    }
}

pub fn deep_get<'a>(value: &'a Value, path: &[&str]) -> Option<&'a Value> {
    let mut current = value;
    for key in path {
        current = current.get(*key)?;
    }
    Some(current)
}

fn collect_timeline_entries(value: &Value) -> Vec<&Value> {
    let instruction_paths = [
        &["data", "home", "home_timeline_urt", "instructions"][..],
        &["data", "search_by_raw_query", "search_timeline", "timeline", "instructions"][..],
        &["data", "threaded_conversation_with_injections_v2", "instructions"][..],
        &["data", "tweetResult", "result", "timeline", "instructions"][..],
        &["data", "user", "result", "timeline_v2", "timeline", "instructions"][..],
    ];

    let mut tweets = Vec::new();
    for path in instruction_paths {
        if let Some(instructions) = deep_get(value, path).and_then(Value::as_array) {
            for instruction in instructions {
                let entries = instruction
                    .get("entries")
                    .and_then(Value::as_array)
                    .or_else(|| instruction.get("moduleItems").and_then(Value::as_array));

                if let Some(entries) = entries {
                    for entry in entries {
                        let content = entry.get("content").unwrap_or(entry);
                        if let Some(result) = deep_get(content, &["itemContent", "tweet_results", "result"]) {
                            tweets.push(result);
                        }
                        if let Some(items) = content.get("items").and_then(Value::as_array) {
                            for item in items {
                                if let Some(result) = deep_get(
                                    item,
                                    &["item", "itemContent", "tweet_results", "result"],
                                ) {
                                    tweets.push(result);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    tweets
}

fn parse_tweet_result(result: &Value) -> Option<Value> {
    let tweet_data = unwrap_tweet_result(result);
    if tweet_data.get("__typename").and_then(Value::as_str) == Some("TweetTombstone") {
        return None;
    }

    let core = tweet_data.get("core")?;
    let legacy = tweet_data.get("legacy")?;
    let user = deep_get(core, &["user_results", "result"])?;
    let user_legacy = user.get("legacy")?;
    let screen_name = user_legacy
        .get("screen_name")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let tweet_id = tweet_data.get("rest_id").and_then(Value::as_str).unwrap_or_default();

    Some(json!({
        "id": tweet_id,
        "text": deep_get(tweet_data, &["note_tweet", "note_tweet_results", "result", "text"])
            .and_then(Value::as_str)
            .or_else(|| legacy.get("full_text").and_then(Value::as_str))
            .unwrap_or_default(),
        "author": {
            "id": user.get("rest_id").and_then(Value::as_str).unwrap_or_default(),
            "username": screen_name,
            "screenName": screen_name,
            "name": user_legacy.get("name").and_then(Value::as_str).unwrap_or_default(),
            "verified": user.get("is_blue_verified").and_then(Value::as_bool).unwrap_or(false)
                || user_legacy.get("verified").and_then(Value::as_bool).unwrap_or(false)
        },
        "likes": legacy.get("favorite_count").and_then(Value::as_i64).unwrap_or(0),
        "retweets": legacy.get("retweet_count").and_then(Value::as_i64).unwrap_or(0),
        "replies": legacy.get("reply_count").and_then(Value::as_i64).unwrap_or(0),
        "quotes": legacy.get("quote_count").and_then(Value::as_i64).unwrap_or(0),
        "bookmarks": legacy.get("bookmark_count").and_then(Value::as_i64).unwrap_or(0),
        "views": deep_get(tweet_data, &["views", "count"])
            .and_then(Value::as_str)
            .and_then(|value| value.parse::<i64>().ok())
            .unwrap_or(0),
        "createdAt": legacy.get("created_at").and_then(Value::as_str).unwrap_or_default(),
        "lang": legacy.get("lang").and_then(Value::as_str).unwrap_or_default(),
        "url": format!("https://x.com/{screen_name}/status/{tweet_id}")
    }))
}

fn unwrap_tweet_result(result: &Value) -> &Value {
    if result.get("__typename").and_then(Value::as_str) == Some("TweetWithVisibilityResults") {
        result.get("tweet").unwrap_or(result)
    } else {
        result
    }
}

#[cfg(test)]
mod tests {
    use super::{parse_article_text, parse_timeline_items};
    use serde_json::json;

    #[test]
    fn parses_timeline_items_from_graphql_response() {
        let value = json!({
            "data": {
                "home": {
                    "home_timeline_urt": {
                        "instructions": [{
                            "entries": [{
                                "content": {
                                    "itemContent": {
                                        "tweet_results": {
                                            "result": {
                                                "rest_id": "123",
                                                "core": {
                                                    "user_results": {
                                                        "result": {
                                                            "rest_id": "u1",
                                                            "legacy": {
                                                                "screen_name": "z0",
                                                                "name": "Z0"
                                                            }
                                                        }
                                                    }
                                                },
                                                "legacy": {
                                                    "full_text": "hello",
                                                    "favorite_count": 1,
                                                    "retweet_count": 2,
                                                    "reply_count": 3,
                                                    "quote_count": 4,
                                                    "bookmark_count": 5,
                                                    "created_at": "now",
                                                    "lang": "en"
                                                },
                                                "views": { "count": "6" }
                                            }
                                        }
                                    }
                                }
                            }]
                        }]
                    }
                }
            }
        });

        let items = parse_timeline_items(&value);
        assert_eq!(items.len(), 1);
        assert_eq!(items[0]["id"], "123");
        assert_eq!(items[0]["author"]["username"], "z0");
    }

    #[test]
    fn parses_article_blocks_to_markdown() {
        let value = json!({
            "article": {
                "article_results": {
                    "result": {
                        "content_state": {
                            "blocks": [
                                { "type": "header-one", "text": "Title" },
                                { "type": "unstyled", "text": "Body" },
                                { "type": "ordered-list-item", "text": "One" }
                            ]
                        }
                    }
                }
            }
        });

        let text = parse_article_text(&value).unwrap();
        assert!(text.contains("# Title"));
        assert!(text.contains("Body"));
        assert!(text.contains("1. One"));
    }
}
