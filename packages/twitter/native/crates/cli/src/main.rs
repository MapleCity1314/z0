use std::env;
use std::path::PathBuf;
use z0_twitter_core::{execute_command, self_check};

fn package_root() -> PathBuf {
    env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn main() {
    let package_root = package_root();
    let args = env::args().skip(1).collect::<Vec<_>>();

    let payload = if args.len() == 2 && args[0] == "runtime" && args[1] == "self-check" {
        self_check(&package_root)
    } else {
        execute_command(&package_root, &args)
    };

    println!("{}", serde_json::to_string(&payload).expect("serialize"));
}
