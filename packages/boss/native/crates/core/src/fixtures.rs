use crate::model::{BossChat, BossCity, BossJob, BossProfile};

const JOBS: [BossJob; 4] = [
    BossJob {
        security_id: "boss-sec-001",
        job_name: "Rust Backend Engineer",
        brand_name: "z0 Labs",
        salary_desc: "35-55K",
        city: "上海",
        experience: "3-5年",
        degree: "本科",
        skills: &["Rust", "Postgres", "MCP"],
        description: "负责高性能工具链、MCP 服务和后端抽象。",
    },
    BossJob {
        security_id: "boss-sec-002",
        job_name: "AI Product Engineer",
        brand_name: "z0 Labs",
        salary_desc: "30-45K",
        city: "杭州",
        experience: "3-5年",
        degree: "本科",
        skills: &["TypeScript", "Next.js", "AI SDK"],
        description: "负责 z0 的 agent 产品面和工具编排。",
    },
    BossJob {
        security_id: "boss-sec-003",
        job_name: "Platform Reliability Engineer",
        brand_name: "Cloud Harbor",
        salary_desc: "28-40K",
        city: "深圳",
        experience: "5-10年",
        degree: "本科",
        skills: &["Kubernetes", "SRE", "Go"],
        description: "负责服务稳定性、可观测性和成本治理。",
    },
    BossJob {
        security_id: "boss-sec-004",
        job_name: "Data Infrastructure Engineer",
        brand_name: "Signal Grid",
        salary_desc: "25-38K",
        city: "北京",
        experience: "1-3年",
        degree: "硕士",
        skills: &["Python", "Airflow", "Warehouse"],
        description: "负责数据同步、特征层和批流处理。",
    },
];

const PROFILE: BossProfile = BossProfile {
    name: "候选人A",
    age: "28岁",
    degree: "本科",
    account: "candidate@example.com",
    city: "上海",
};

const CHATS: [BossChat; 2] = [
    BossChat {
        recruiter: "李经理",
        company: "z0 Labs",
        last_message: "你好，方便约个时间聊一下吗？",
    },
    BossChat {
        recruiter: "王女士",
        company: "Cloud Harbor",
        last_message: "你的经历和岗位比较匹配。",
    },
];

const CITIES: [BossCity; 4] = [
    BossCity { code: "101020100", name: "上海" },
    BossCity { code: "101210100", name: "杭州" },
    BossCity { code: "101280600", name: "深圳" },
    BossCity { code: "101010100", name: "北京" },
];

pub fn profile() -> BossProfile {
    PROFILE.clone()
}

pub fn recruiter_chats() -> Vec<BossChat> {
    CHATS.to_vec()
}

pub fn cities() -> Vec<BossCity> {
    CITIES.to_vec()
}

pub fn recommended_jobs() -> Vec<BossJob> {
    JOBS[..2].to_vec()
}

pub fn history_jobs() -> Vec<BossJob> {
    JOBS[1..3].to_vec()
}

pub fn interviews_jobs() -> Vec<BossJob> {
    JOBS[2..4].to_vec()
}

pub fn search_jobs(query: &str) -> Vec<BossJob> {
    let query_lower = query.trim().to_lowercase();

    JOBS.iter()
        .filter(|job| {
            let name = job.job_name.to_lowercase();
            let brand = job.brand_name.to_lowercase();
            let skills = job.skills.join(" ").to_lowercase();
            name.contains(&query_lower)
                || brand.contains(&query_lower)
                || skills.contains(&query_lower)
        })
        .cloned()
        .collect()
}

pub fn find_job(security_id: &str) -> Option<BossJob> {
    JOBS.iter()
        .find(|job| job.security_id == security_id)
        .cloned()
}

#[cfg(test)]
mod tests {
    use super::{find_job, search_jobs};

    #[test]
    fn filters_jobs_by_keyword() {
      let result = search_jobs("rust");
      assert_eq!(result.len(), 1);
      assert_eq!(result[0].security_id, "boss-sec-001");
    }

    #[test]
    fn finds_one_job() {
      let result = find_job("boss-sec-002").expect("job");
      assert_eq!(result.brand_name, "z0 Labs");
    }
}
