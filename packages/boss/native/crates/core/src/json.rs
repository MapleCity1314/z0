pub fn escape_json(value: &str) -> String {
    let mut output = String::with_capacity(value.len() + 8);

    for ch in value.chars() {
        match ch {
            '"' => output.push_str("\\\""),
            '\\' => output.push_str("\\\\"),
            '\n' => output.push_str("\\n"),
            '\r' => output.push_str("\\r"),
            '\t' => output.push_str("\\t"),
            _ => output.push(ch),
        }
    }

    output
}

pub fn json_string(value: &str) -> String {
    format!("\"{}\"", escape_json(value))
}

pub fn json_number(value: u64) -> String {
    value.to_string()
}

pub fn json_bool(value: bool) -> String {
    value.to_string()
}

pub fn json_array(items: &[String]) -> String {
    format!("[{}]", items.join(","))
}

pub fn json_object(fields: &[(&str, String)]) -> String {
    let pairs = fields
        .iter()
        .map(|(key, value)| format!("{}:{}", json_string(key), value))
        .collect::<Vec<_>>();

    format!("{{{}}}", pairs.join(","))
}

#[cfg(test)]
mod tests {
    use super::{json_array, json_object, json_string};

    #[test]
    fn escapes_quotes() {
        assert_eq!(json_string("a\"b"), "\"a\\\"b\"");
    }

    #[test]
    fn builds_objects() {
        let value = json_object(&[("ok", "true".into()), ("name", json_string("Boss"))]);
        assert_eq!(value, "{\"ok\":true,\"name\":\"Boss\"}");
    }

    #[test]
    fn builds_arrays() {
        let value = json_array(&[json_string("a"), json_string("b")]);
        assert_eq!(value, "[\"a\",\"b\"]");
    }
}
