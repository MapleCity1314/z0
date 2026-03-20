pub struct StaticHeaders {
    pub user_agent: &'static str,
}

pub fn headers() -> StaticHeaders {
    StaticHeaders {
        user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    }
}

pub fn base_url() -> String {
    std::env::var("Z0_BOSS_BASE_URL").unwrap_or_else(|_| "https://www.zhipin.com".into())
}

pub fn job_search_url() -> &'static str {
    "/wapi/zpgeek/search/joblist.json"
}

pub fn job_detail_url() -> &'static str {
    "/wapi/zpgeek/job/detail.json"
}

pub fn recommend_jobs_url() -> &'static str {
    "/wapi/zprelation/interaction/geekGetJob"
}

pub fn resume_baseinfo_url() -> &'static str {
    "/wapi/zpgeek/resume/baseinfo/query.json"
}

pub fn job_history_url() -> &'static str {
    "/wapi/zpgeek/history/joblist.json"
}

pub fn deliver_list_url() -> &'static str {
    "/wapi/zprelation/resume/geekDeliverList"
}

pub fn interview_data_url() -> &'static str {
    "/wapi/zpinterview/geek/interview/data.json"
}

pub fn friend_list_url() -> &'static str {
    "/wapi/zprelation/friend/getGeekFriendList.json"
}
