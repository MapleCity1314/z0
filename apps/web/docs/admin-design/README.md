# Z0-Agent 管理后台设计文档

> ✅ **Phase 1 已完成** - 基础框架、独立认证、仪表盘、用户/对话/项目/反馈/版本管理

## 项目概述

本文档为 Z0-Agent AI 助手平台设计一个多功能现代化管理后台与仪表盘系统。

## 已实现功能

### 访问入口
- 登录页: `/admin/login`
- 管理后台: `/admin`
- 独立的管理员认证系统（与用户认证分离）

### 认证系统
- 独立的 AdminSession 表存储管理员会话
- 仅 role="admin" 的用户可登录
- 基于 Cookie 的会话管理（7天有效期）
- 支持 IP 和 UserAgent 记录

### 已完成模块
1. ✅ 仪表盘 - 统计卡片、最近活动
2. ✅ 用户管理 - 列表、详情、统计
3. ✅ 对话管理 - 列表、消息查看
4. ✅ 项目管理 - 列表、详情、文件预览
5. ✅ 反馈管理 - 列表、统计、状态更新、回复
6. ✅ 版本管理 - 列表、创建、发布、归档

### 技术特点
- RSC 优先架构，服务端数据获取
- Server Actions 处理所有数据变更（无客户端直接调用数据库）
- Vercel 风格简洁 UI
- 状态颜色编码 (成功/警告/危险/信息)
- 响应式设计
- 可折叠侧边栏

### 数据库扩展
运行迁移: `pnpm db:migrate`

新增表:
- `AdminSession` - 管理员会话
- `AuditLog` - 操作审计日志
- `SystemConfig` - 系统配置
- `AIUsageLog` - AI 使用统计
- `Notification` - 通知

User 表新增字段:
- `role` - 用户角色 (user/admin/moderator)
- `status` - 账户状态 (active/inactive/banned)
- `lastLoginAt` - 最后登录时间

### 创建管理员账户
```sql
UPDATE "User" SET role = 'admin' WHERE email = 'your-email@example.com';
```

---

### 当前系统分析

**技术栈**
- 框架: Next.js 16 + React 19
- 数据库: PostgreSQL + Drizzle ORM
- UI: Radix UI + Tailwind CSS + Framer Motion
- AI: Vercel AI SDK (支持 OpenAI/DeepSeek/Google/Ollama 等)
- 状态管理: Zustand + SWR

**现有数据模型**
| 表名 | 说明 | 关键字段 |
|------|------|----------|
| User | 用户 | id, name, email, avatar, password |
| Chat | 对话 | id, title, userId, projectId |
| Message | 消息 | id, chatId, role, parts, attachments |
| Project | 项目 | id, name, type, status, files, visibility |
| Artifact | 代码产物 | id, chatId, title, language, code |
| Feedback | 反馈 | id, type, status, priority, adminResponse |
| VersionUpdate | 版本更新 | version, type, features, status |
| Memory | 用户记忆 | id, userId, memory, category |

---

## 管理后台功能模块设计

### 1. 仪表盘 (Dashboard)

#### 1.1 核心指标卡片
- **用户统计**: 总用户数、今日新增、活跃用户(DAU/MAU)
- **对话统计**: 总对话数、今日对话、平均对话长度
- **项目统计**: 总项目数、公开项目、部署成功率
- **AI 使用量**: Token 消耗、API 调用次数、模型分布

#### 1.2 趋势图表
- 用户增长趋势 (7天/30天/90天)
- 对话量趋势
- AI 调用量趋势
- 项目创建趋势

#### 1.3 实时动态
- 最新注册用户
- 最新创建的对话
- 最新提交的反馈
- 系统告警通知

---

### 2. 用户管理 (User Management)

#### 2.1 用户列表
- 分页展示所有用户
- 搜索: 按名称、邮箱搜索
- 筛选: 注册时间、活跃状态
- 排序: 注册时间、最后活跃

#### 2.2 用户详情
- 基本信息查看/编辑
- 关联数据统计 (对话数、项目数、反馈数)
- 用户活动时间线
- 用户记忆管理

#### 2.3 用户操作
- 创建用户
- 编辑用户信息
- 重置密码
- 禁用/启用账户
- 删除用户 (级联删除关联数据)

#### 2.4 角色权限 (扩展)
- 角色定义: Admin / Moderator / User
- 权限分配
- 操作日志

---

### 3. 对话管理 (Chat Management)

#### 3.1 对话列表
- 分页展示所有对话
- 搜索: 按标题、用户搜索
- 筛选: 时间范围、关联项目
- 排序: 创建时间、消息数量

#### 3.2 对话详情
- 对话元信息
- 消息列表 (支持分页加载)
- 关联的 Artifact 列表
- 关联的项目信息

#### 3.3 对话操作
- 查看完整对话内容
- 导出对话记录
- 删除对话

---

### 4. 项目管理 (Project Management)

#### 4.1 项目列表
- 分页展示所有项目
- 搜索: 按名称、描述搜索
- 筛选: 类型(vue/react/nextjs)、状态、可见性
- 排序: 创建时间、更新时间、浏览量

#### 4.2 项目详情
- 项目元信息
- 文件结构预览
- 构建配置查看
- 部署信息

#### 4.3 项目操作
- 编辑项目信息
- 更改可见性 (公开/私有)
- 管理标签
- 删除项目

#### 4.4 社区项目审核
- 待审核项目列表
- 审核通过/拒绝
- 精选项目推荐

---

### 5. 反馈管理 (Feedback Management)

#### 5.1 反馈列表
- 分页展示所有反馈
- 搜索: 按标题、内容搜索
- 筛选: 类型、状态、优先级、分类
- 排序: 创建时间、优先级

#### 5.2 反馈详情
- 反馈完整内容
- 提交者信息
- 附件查看
- 元数据 (浏览器、系统信息)

#### 5.3 反馈处理
- 更新状态: pending → reviewing → planned → completed/rejected
- 设置优先级
- 添加管理员回复
- 分配处理人

#### 5.4 反馈统计
- 按类型分布
- 按状态分布
- 处理效率统计
- 热门问题分析

---

### 6. 版本管理 (Version Management)

#### 6.1 版本列表
- 所有版本记录
- 筛选: 类型(major/minor/patch)、状态
- 排序: 版本号、发布时间

#### 6.2 版本详情
- 版本信息
- 更新日志 (features/improvements/bugFixes/breaking)
- 迁移指南
- 相关链接

#### 6.3 版本操作
- 创建新版本
- 编辑版本内容
- 发布版本
- 归档版本
- 设置最新版本

---

### 7. AI 监控 (AI Monitoring)

#### 7.1 使用统计
- Token 消耗统计 (按模型、按用户)
- API 调用次数
- 响应时间分布
- 错误率统计

#### 7.2 模型管理
- 可用模型列表
- 模型配置
- 使用限制设置

#### 7.3 成本分析
- 按时间段成本
- 按用户成本
- 成本预警设置

---

### 8. 系统设置 (System Settings)

#### 8.1 基础配置
- 站点名称、Logo
- 注册开关
- 默认用户配额

#### 8.2 AI 配置
- API Key 管理
- 默认模型设置
- Token 限制配置

#### 8.3 安全设置
- 密码策略
- 登录限制
- IP 白名单/黑名单

#### 8.4 通知设置
- 邮件通知配置
- 系统告警配置

---

### 9. 日志与审计 (Logs & Audit)

#### 9.1 操作日志
- 管理员操作记录
- 用户关键操作记录
- 日志搜索与筛选

#### 9.2 系统日志
- 错误日志
- 性能日志
- 安全日志

#### 9.3 审计报告
- 定期审计报告生成
- 数据导出

---

## 数据库扩展设计

为支持管理后台功能，需要扩展以下数据表：

### 新增表

```sql
-- 管理员角色
CREATE TABLE "AdminRole" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(32) NOT NULL UNIQUE,
  "permissions" json DEFAULT '[]',
  "description" text,
  "createdAt" timestamp NOT NULL,
  "updatedAt" timestamp NOT NULL
);

-- 用户角色关联
ALTER TABLE "User" ADD COLUMN "role" varchar(32) DEFAULT 'user';
ALTER TABLE "User" ADD COLUMN "status" varchar(32) DEFAULT 'active';
ALTER TABLE "User" ADD COLUMN "lastLoginAt" timestamp;

-- 操作日志
CREATE TABLE "AuditLog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid REFERENCES "User"("id"),
  "action" varchar(64) NOT NULL,
  "resource" varchar(64) NOT NULL,
  "resourceId" text,
  "details" json,
  "ip" varchar(64),
  "userAgent" text,
  "createdAt" timestamp NOT NULL
);

-- 系统配置
CREATE TABLE "SystemConfig" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" varchar(128) NOT NULL UNIQUE,
  "value" json NOT NULL,
  "description" text,
  "updatedBy" uuid REFERENCES "User"("id"),
  "updatedAt" timestamp NOT NULL
);

-- AI 使用统计
CREATE TABLE "AIUsageLog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid REFERENCES "User"("id"),
  "chatId" text REFERENCES "Chat"("id"),
  "model" varchar(64) NOT NULL,
  "promptTokens" integer NOT NULL,
  "completionTokens" integer NOT NULL,
  "totalTokens" integer NOT NULL,
  "cost" decimal(10, 6),
  "latency" integer,
  "status" varchar(32),
  "createdAt" timestamp NOT NULL
);

-- 通知
CREATE TABLE "Notification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid REFERENCES "User"("id"),
  "type" varchar(32) NOT NULL,
  "title" varchar(256) NOT NULL,
  "content" text,
  "isRead" boolean DEFAULT false,
  "metadata" json,
  "createdAt" timestamp NOT NULL
);
```

---

## 技术实现建议

### 路由结构

```
app/(admin)/
├── admin/
│   ├── layout.tsx          # 管理后台布局
│   ├── page.tsx            # 仪表盘
│   ├── users/
│   │   ├── page.tsx        # 用户列表
│   │   └── [id]/page.tsx   # 用户详情
│   ├── chats/
│   │   ├── page.tsx        # 对话列表
│   │   └── [id]/page.tsx   # 对话详情
│   ├── projects/
│   │   ├── page.tsx        # 项目列表
│   │   └── [id]/page.tsx   # 项目详情
│   ├── feedback/
│   │   ├── page.tsx        # 反馈列表
│   │   └── [id]/page.tsx   # 反馈详情
│   ├── versions/
│   │   ├── page.tsx        # 版本列表
│   │   ├── new/page.tsx    # 创建版本
│   │   └── [id]/page.tsx   # 版本详情
│   ├── ai/
│   │   └── page.tsx        # AI 监控
│   ├── logs/
│   │   └── page.tsx        # 日志查看
│   └── settings/
│       └── page.tsx        # 系统设置
```

### 组件结构

```
components/admin/
├── layout/
│   ├── admin-sidebar.tsx   # 侧边导航
│   ├── admin-header.tsx    # 顶部栏
│   └── admin-breadcrumb.tsx
├── dashboard/
│   ├── stat-card.tsx       # 统计卡片
│   ├── trend-chart.tsx     # 趋势图表
│   └── activity-feed.tsx   # 动态列表
├── data-table/
│   ├── data-table.tsx      # 通用数据表格
│   ├── pagination.tsx      # 分页组件
│   └── filters.tsx         # 筛选组件
├── users/
│   ├── user-table.tsx
│   ├── user-form.tsx
│   └── user-detail.tsx
├── chats/
│   ├── chat-table.tsx
│   └── chat-viewer.tsx
├── projects/
│   ├── project-table.tsx
│   └── project-detail.tsx
├── feedback/
│   ├── feedback-table.tsx
│   ├── feedback-detail.tsx
│   └── feedback-response.tsx
├── versions/
│   ├── version-table.tsx
│   ├── version-form.tsx
│   └── changelog-editor.tsx
└── settings/
    ├── config-form.tsx
    └── api-key-manager.tsx
```

### API 路由

```
app/(admin)/api/admin/
├── stats/route.ts          # 统计数据
├── users/
│   ├── route.ts            # GET: 列表, POST: 创建
│   └── [id]/route.ts       # GET/PUT/DELETE
├── chats/
│   ├── route.ts
│   └── [id]/route.ts
├── projects/
│   ├── route.ts
│   └── [id]/route.ts
├── feedback/
│   ├── route.ts
│   └── [id]/route.ts
├── versions/
│   ├── route.ts
│   └── [id]/route.ts
├── ai/
│   └── usage/route.ts
├── logs/route.ts
└── settings/route.ts
```

---

## 开发优先级建议

### Phase 1: 基础框架 (1-2周)
1. 管理后台布局与导航
2. 权限验证中间件
3. 仪表盘基础统计
4. 用户管理 CRUD

### Phase 2: 核心功能 (2-3周)
1. 对话管理
2. 项目管理
3. 反馈管理完善
4. 版本管理完善

### Phase 3: 高级功能 (2-3周)
1. AI 使用监控
2. 操作日志
3. 系统设置
4. 数据导出

### Phase 4: 优化与扩展 (持续)
1. 性能优化
2. 更多图表分析
3. 自动化报告
4. 通知系统

---

## 安全考虑

1. **认证**: 管理员独立登录入口，支持 2FA
2. **授权**: 基于角色的权限控制 (RBAC)
3. **审计**: 所有敏感操作记录日志
4. **数据**: 敏感数据脱敏显示
5. **API**: Rate limiting, CSRF 保护

---

## 下一步

1. 确认功能优先级
2. 设计 UI/UX 原型
3. 创建数据库迁移
4. 开始 Phase 1 开发

如需调整或补充任何模块，请告知。
