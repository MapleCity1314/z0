mod constants;

use reqwest::blocking::Client;
use reqwest::header::{ACCEPT, COOKIE, HeaderMap, HeaderValue, ORIGIN, REFERER, USER_AGENT};
use serde_json::Value;
use z0_boss_auth::{load_credential, AuthError};

use constants::{
    base_url, deliver_list_url, friend_list_url, headers, interview_data_url, job_detail_url,
    job_history_url, job_search_url, recommend_jobs_url, resume_baseinfo_url,
};

pub struct BossLiveClient {
    client: Client,
    base_url: String,
    cookie_header: String,
}

impl BossLiveClient {
    pub fn from_saved_credential() -> Result<Self, AuthError> {
        let credential = load_credential()?;
        Self::new(credential.cookie_header)
    }

    pub fn new(cookie_header: String) -> Result<Self, AuthError> {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|error| AuthError::Io(error.to_string()))?;

        Ok(Self {
            client,
            base_url: base_url(),
            cookie_header,
        })
    }

    pub fn search_jobs(&self, query: &str) -> Result<Value, AuthError> {
        self.get(job_search_url(), &[("query", query), ("city", "101010100"), ("page", "1"), ("pageSize", "15")])
    }

    pub fn recommend_jobs(&self) -> Result<Value, AuthError> {
        self.get(recommend_jobs_url(), &[("page", "1"), ("tag", "5"), ("isActive", "true")])
    }

    pub fn job_detail(&self, security_id: &str) -> Result<Value, AuthError> {
        self.get(job_detail_url(), &[("securityId", security_id)])
    }

    pub fn profile_me(&self) -> Result<Value, AuthError> {
        self.get(resume_baseinfo_url(), &[])
    }

    pub fn history(&self) -> Result<Value, AuthError> {
        self.get(job_history_url(), &[("page", "1")])
    }

    pub fn applied(&self) -> Result<Value, AuthError> {
        self.get(deliver_list_url(), &[("page", "1")])
    }

    pub fn interviews(&self) -> Result<Value, AuthError> {
        self.get(interview_data_url(), &[])
    }

    pub fn chat_list(&self) -> Result<Value, AuthError> {
        self.get(friend_list_url(), &[])
    }

    fn get(&self, path: &str, params: &[(&str, &str)]) -> Result<Value, AuthError> {
        let url = format!("{}{}", self.base_url, path);
        let mut headers = build_headers(&self.cookie_header, &url)?;

        if path == job_search_url() {
            let referer = format!("{}/web/geek/job?query={}", self.base_url, params[0].1);
            headers.insert(REFERER, HeaderValue::from_str(&referer).map_err(|error| AuthError::Io(error.to_string()))?);
        }

        let response = self
            .client
            .get(url)
            .headers(headers)
            .query(params)
            .send()
            .map_err(|_| AuthError::Unavailable("Boss live request failed"))?;

        let status = response.status();
        let payload: Value = response
            .json()
            .map_err(|_| AuthError::Unavailable("Boss live response was not JSON"))?;

        if !status.is_success() {
            return Err(AuthError::Unavailable("Boss live endpoint returned a non-success status"));
        }

        let code = payload.get("code").and_then(Value::as_i64).unwrap_or(-1);

        if code == 0 {
            return Ok(payload
                .get("zpData")
                .cloned()
                .unwrap_or(Value::Object(Default::default())));
        }

        if code == 37 {
            return Err(AuthError::NotAuthenticated);
        }

        Err(AuthError::Unavailable("Boss live endpoint returned an API error"))
    }
}

fn build_headers(cookie_header: &str, referer: &str) -> Result<HeaderMap, AuthError> {
    let mut headers_map = HeaderMap::new();
    headers_map.insert(
        USER_AGENT,
        HeaderValue::from_static(headers().user_agent),
    );
    headers_map.insert(ACCEPT, HeaderValue::from_static("application/json, text/plain, */*"));
    headers_map.insert(ORIGIN, HeaderValue::from_static("https://www.zhipin.com"));
    headers_map.insert(
        REFERER,
        HeaderValue::from_str(referer).map_err(|error| AuthError::Io(error.to_string()))?,
    );
    headers_map.insert(
        COOKIE,
        HeaderValue::from_str(cookie_header).map_err(|error| AuthError::Io(error.to_string()))?,
    );

    Ok(headers_map)
}

#[cfg(test)]
mod tests {
    use super::build_headers;
    use reqwest::header::COOKIE;

    #[test]
    fn injects_cookie_header() {
        let headers = build_headers("wt2=abc", "https://www.zhipin.com/web/geek/job").expect("headers");
        assert_eq!(headers.get(COOKIE).and_then(|value| value.to_str().ok()), Some("wt2=abc"));
    }
}
