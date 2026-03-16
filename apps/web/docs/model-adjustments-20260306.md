# 模型接入与切换调整记录（2026-03-06）

本文记录本次围绕 `z0` 模型分层、Provider 接入方式、前端交互和故障排查的调整，便于后续维护。

## 1. 目标

- 将前端模型选择统一为三档封装：`z0-mini` / `z0-pro` / `z0-max`
- 前端不暴露底层供应商模型
- 支持输入区手动开关“思考模式”
- 修复/增强模型调用失败时的可观测性

## 2. 当前模型分层

位置：`lib/agent/model.ts`

- `z0-mini`
  - 标准：`kimi:k2.5` -> `kimi-k2.5`
  - 思考：`kimi:thinking` -> `kimi-thinking`
- `z0-pro`
  - 标准：`google:3.1-flash` -> `gemini-3.1-flash`
  - 思考：`google:3.1-pro` -> `gemini-3.1-pro`
- `z0-max`
  - 标准：`claude:sonnet46`
  - 思考：`claude:opus46`

> 说明：`z0-max` 底层走 Anthropic Provider，模型名通过环境变量可覆盖。

## 3. Provider 调整结论

- `z0-max` 最终采用：`@ai-sdk/anthropic`
- 期间尝试过 `@ai-sdk/openai-compatible`，用于排查网关兼容性，但最终按需求改回 Anthropic 包
- `ANTHROPIC_BASE_URL` 会归一化到 `/v1` 路径

## 4. 前端与 API 行为变更

### 4.1 模型选择器

位置：`components/chat/chat-input.tsx`

- 模型列表仅显示 `z0-mini / z0-pro / z0-max`
- 不再展示底层模型清单

### 4.2 思考按钮

位置：
- `components/chat/chat-input.tsx`
- `components/chat/chat.tsx`

新增输入区“思考模式”按钮（Brain 图标）：
- 开启时：请求体 `isReasoning = true`
- 关闭时：请求体 `isReasoning = false`

### 4.3 Chat API

位置：`app/(chat)/api/chat/route.ts`

- 默认模型：`z0-mini`
- 仅接受：`z0-mini | z0-pro | z0-max`
- `getModelFromServer(model, { isReasoning })` 决定标准/思考模型

## 5. 错误处理与可观测性改动

### 5.1 前端错误透传

位置：`lib/utils.ts`

- 修复 JSON 解析分支吞掉 `ChatSDKError` 的问题
- 非 JSON 错误体（例如网关纯文本/非标准结构）会作为 `cause` 回传

### 5.2 UI 错误展示

位置：`components/chat/chat.tsx`

- toast 显示 `message + cause`，方便快速定位网关/模型问题

### 5.3 后端错误提示增强

位置：`app/(chat)/api/chat/route.ts`

- `z0-max` 在 `404/503/Service Unavailable` 场景会附加配置提示（模型名/baseURL）
- `z0-max` 默认禁用工具调用，降低网关在 tool-use 场景的失败概率
  - 通过 `Z0_MAX_ENABLE_TOOLS=true` 可开启

## 6. 与网关联调实测结论

对 `https://cursor.scihub.edu.kg/api/v1/messages` 做直接联调（同环境变量）后：

- `claude-sonnet-4.6`：失败（resource not found）
- `claude-opus4.6`：失败（resource not found）
- `claude-opus-4-6`：成功（200）
- 其他别名存在 5xx 不稳定

因此，当前默认值建议优先使用网关已验证可用的模型 ID。

## 7. 当前推荐环境变量

```bash
# Anthropic 网关
ANTHROPIC_API_KEY=...
ANTHROPIC_BASE_URL=https://cursor.scihub.edu.kg/api

# z0-max 模型映射（可按网关支持覆盖）
CLAUDE_SONNET_MODEL=claude-sonnet-4-6
CLAUDE_OPUS_MODEL=claude-opus-4-6

# 可选：仅网关确认支持 tool-use 时再打开
Z0_MAX_ENABLE_TOOLS=false
```

## 8. 相关文件清单

- `lib/agent/model.ts`
- `app/(chat)/api/chat/route.ts`
- `components/chat/chat.tsx`
- `components/chat/chat-input.tsx`
- `lib/utils.ts`
- `app/(chat)/api/citation/route.ts`
- `lib/agent/memory/mem0.ts`

