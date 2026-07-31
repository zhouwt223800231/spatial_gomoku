# Spatial Gomoku - 三维空间五子棋

基于 React + Three.js 的 3D 空间策略棋类游戏，支持 AI 自适应学习对战。

## 特性

- **三维立体棋盘**：5×5×5 / 7×7×7 / 9×9×9 可选
- **玻璃质感棋盘**：Apple Vision Pro 风格的极简空间美学
- **黑曜石 / 珍珠棋子**：真实材质渲染
- **AI 自适应学习**：
  - 实时分析你的下棋风格（空间偏好、进攻/防守倾向、模式一致性）
  - 动态调整评估函数权重
  - AI 洞察面板显示 AI 的"思考过程"
- **战略雷达**：实时显示 X/Y/Z 三轴威胁密度
- **焦点切片**：悬停高亮当前层
- **空间解构胜利动画**：克制优雅的胜利展示
- **程序化音效**：Tone.js 生成的落子与胜利音效

## 技术栈

- React 18 + TypeScript
- Vite
- React Three Fiber + Drei
- Zustand（状态管理）
- Tailwind CSS
- Tone.js（音效）

## 快速开始

```bash
npm install
npm run dev
```

## 操作说明

- **鼠标左键拖拽**：旋转棋盘
- **滚轮**：缩放
- **鼠标悬停**：预览落子位置 + 层高光
- **单击**：确认落子

## AI 自适应系统

AI 会在本地存储中记录你的：
- 空间偏好（中心控制 / 边缘 / 纵向 / 对角线）
- 战术风格（进攻性 / 防守性 / 模式一致性）
- 弱点档案（特定方向防守薄弱点）

每局游戏后 AI 会调整策略，并通过"AI 洞察"面板告诉你它的调整方向。

## 项目结构

```
src/
├── components/
│   ├── Board3D.tsx        # 3D 棋盘渲染
│   ├── Stone.tsx          # 棋子组件
│   ├── GhostStone.tsx     # 预览棋子
│   ├── WinLine.tsx        # 胜利连线
│   ├── CameraController.tsx
│   └── UI/
│       ├── Menu.tsx       # 主菜单
│       ├── GameHUD.tsx    # 游戏内 HUD
│       ├── AIInsight.tsx  # AI 洞察面板
│       └── StrategyRadar.tsx
├── game/
│   ├── rules.ts           # 胜负判断 + 候选位置
│   ├── evaluate.ts        # 评估函数
│   ├── ai.ts              # Minimax + Alpha-Beta
│   ├── adaptiveAI.ts      # 自适应权重调整
│   └── playerProfile.ts   # 玩家画像管理
├── hooks/
│   ├── useAudio.ts        # Tone.js 音效
│   └── usePlayerProfile.ts
├── store/
│   └── gameStore.ts       # Zustand 全局状态
└── types/
    └── index.ts
```

## 许可证

MIT
