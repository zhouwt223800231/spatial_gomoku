# Spatial Gomoku · 三维空间五子棋

基于 React + Three.js 的 3D 空间策略棋类游戏，支持 5³ / 7³ / 9³ 立体棋盘，AI 可在实战中学习并逐步变强。

## 特性

- **三维立体棋盘**：5×5×5 / 7×7×7 / 9×9×9 可选，13 个方向连五即胜
- **玻璃质感棋盘**：深空渐变 + 玻璃拟态 UI，黑珍珠 / 白宝石棋子
- **两段式落子**：点选格子进入预览 → `Enter`/`空格`/按钮确认落子，防误触
- **三维辅助**：XYZ 坐标刻度、三视图小地图、威胁雷达、切片高亮
- **AI 自适应学习**：开局库 + 威胁-胜率学习库 + 自对弈训练，随对局变强
- **三档难度**：简单 / 普通 / 困难，人机可执黑或执白
- **移动端适配**：单指旋转、双指缩放/平移、虚拟方向键预览、信息抽屉
- **胜利演出**：45° 环绕 + 连珠点亮 + 钟琴音效；支持回看终局
- **程序化音效**：Tone.js 生成落子与胜利音效（按坐标距离定音）

## 技术栈

- React 18 + TypeScript
- Vite
- React Three Fiber + Drei
- Zustand（状态管理）
- Tailwind CSS
- Tone.js（音效）
- Vitest（单元测试）

## 在线 Demo

<https://zhouwt223800231.github.io/spatial_gomoku/>

> 推送到 main 分支后由 GitHub Actions 自动构建并部署到 GitHub Pages（见 .github/workflows/deploy.yml）。

## 快速开始

```bash
npm install
npm run dev
```

## 操作说明

- **鼠标**：左键/右键点击 = 选中格子进入预览；`Enter`/`空格` = 确认落子；`Esc` = 取消；左键拖拽 = 旋转视角；滚轮 = 缩放；右键拖拽 = 平移
- **键盘微调**：`W/A/S/D`（或 `↑↓←→`）= 层内移动；`Q/E` = 沿 Z 轴切层；`0/F/R` = 全局总览取景；`O` = 透视/正交切换
- **移动端**：单指拖动 = 旋转；双指捏合 = 缩放；双指拖动 = 平移；点选格子后用屏幕方向键微调
- **预览格**：彩色 ghost 显示目标位置，红色表示该格已被占用

## AI 学习系统

- **威胁-胜率学习库**：每局结束后回放 AI 落子，记录「哪些威胁模式曾带我赢」，之后优先采用高胜率打法
- **开局库**：按落子序列 n-gram 记录胜负，镜像/旋转棋形共享学习数据
- **自对弈训练**：菜单空闲与每局实战后运行轻量自对弈，持续积累经验
- 难度选择与执子选择在菜单中配置

## 项目结构

```
src/
├── components/
│   ├── Board3D.tsx            # 3D 棋盘渲染与交互
│   ├── Stone.tsx              # 棋子组件
│   ├── GhostStone.tsx         # 预览棋子
│   ├── VictoryCelebration.tsx # 胜利演出
│   ├── CameraController.tsx   # 相机控制
│   ├── LiveLines.tsx          # 连子高亮
│   ├── ProjectionMinimap.tsx  # 三视图小地图
│   ├── Starfield.tsx          # 深空星尘
│   └── UI/
│       ├── Menu.tsx           # 主菜单
│       ├── panels.tsx         # 玩家/状态/控制/底部面板
│       ├── InfoDrawer.tsx     # 移动端信息抽屉
│       ├── MobilePreviewPad.tsx # 移动端预览方向键
│       ├── AIInsight.tsx      # AI 洞察面板
│       └── StrategyRadar.tsx  # 威胁雷达
├── game/
│   ├── rules.ts               # 胜负判定 + 候选位置
│   ├── evaluate.ts            # 评估函数（含双威胁检测）
│   ├── ai.ts                  # Minimax + Alpha-Beta + 迭代加深
│   ├── adaptiveAI.ts          # 难度/学习权重调整
│   ├── aiExperience.ts        # AI 对局经验库
│   ├── threatLearning.ts      # 威胁-胜率学习库
│   ├── openingBook.ts         # 开局库（棋形归一化）
│   ├── selfPlay.ts            # 自对弈训练
│   ├── playerProfile.ts       # 玩家画像管理
│   └── __tests__/             # 单元测试
├── hooks/
│   ├── useAudio.ts            # Tone.js 音效
│   └── usePlayerProfile.ts
├── store/
│   └── gameStore.ts           # Zustand 全局状态
└── types/
    └── index.ts
```

## 测试

```bash
npm test
```

## 许可证

MIT
