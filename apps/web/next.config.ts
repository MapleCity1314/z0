import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: true, // 暂时禁用，与 COEP 头有冲突

  //WebContainer 需要 SharedArrayBuffer，必须设置这些响应头
  //暂时完全禁用来测试
  async headers() {
    return [
      {
        source: "/((?!_next/).*)",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
