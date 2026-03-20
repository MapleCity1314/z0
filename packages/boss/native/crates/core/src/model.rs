#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BossJob {
    pub security_id: &'static str,
    pub job_name: &'static str,
    pub brand_name: &'static str,
    pub salary_desc: &'static str,
    pub city: &'static str,
    pub experience: &'static str,
    pub degree: &'static str,
    pub skills: &'static [&'static str],
    pub description: &'static str,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BossProfile {
    pub name: &'static str,
    pub age: &'static str,
    pub degree: &'static str,
    pub account: &'static str,
    pub city: &'static str,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BossChat {
    pub recruiter: &'static str,
    pub company: &'static str,
    pub last_message: &'static str,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BossCity {
    pub code: &'static str,
    pub name: &'static str,
}
