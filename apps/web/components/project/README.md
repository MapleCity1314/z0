# Project Components

项目面板相关组件。

## ProjectLoading

项目生成代码时的 Loading 动画组件，显示在项目面板右下角。

### 特性

- 🎨 精美的代码生成动画（滚动代码 + 拖拽构建）
- 📍 固定在右下角位置
- 🔄 自动循环播放
- ✨ 流畅的进入/退出动画

### 触发条件

当满足以下条件时自动显示：

1. 项目面板已打开（`isOpen = true`）
2. 检测到项目类工具调用，包括：
   - `createProjectFile` - 创建文件
   - `updateProjectFile` - 更新文件
   - `patchProjectFile` - 修补文件
   - `deleteProjectFile` - 删除文件
   - `createProject` - 创建项目
   - `addDependency` - 添加依赖
   - `removeDependency` - 移除依赖
   - `installDependencies` - 安装依赖
   - `runBuild` - 运行构建
   - `runLint` - 运行 Lint
   - `runFormat` - 格式化代码
   - `runScript` - 运行脚本

### 工作原理

1. **状态管理**：通过 `useProjectStore` 的 `isGenerating` 状态控制显示/隐藏
2. **工具检测**：在 `chat.tsx` 中监听消息流，检测项目工具调用
3. **自动显示**：当检测到工具调用且状态为 `input-available` 或 `input-streaming` 时显示
4. **自动隐藏**：当工具执行完成（状态变为 `output-available`）时隐藏

### 测试

访问 `/test-project-loading` 查看效果。

### 使用示例

```tsx
import { ProjectLoading } from "@/components/project/project-loading";
import { AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/project";

function ProjectPanel() {
  const isGenerating = useProjectStore((s) => s.isGenerating);

  return (
    <div className="relative">
      {/* 你的项目面板内容 */}
      
      {/* Loading 动画 - 右下角 */}
      <AnimatePresence>
        {isGenerating && <ProjectLoading />}
      </AnimatePresence>
    </div>
  );
}
```

### 自定义

如需修改动画样式或位置，编辑 `components/project/project-loading.tsx`：

- 位置：修改 `fixed bottom-6 right-6` 类名
- 尺寸：修改 `w-[260px] h-[200px]`
- 动画速度：调整 `duration` 参数
- 布局：修改 `MINI_LAYOUT` 数组
