# 社交媒体自动化平台

一个功能完整的社交媒体账号运营数据监控和自动下单系统，支持X(Twitter)等平台的自动化管理。

## 🚀 核心功能

### 1. 客户授权管理
- 支持多平台账号绑定（X/Instagram/TikTok/YouTube）
- 安全的OAuth授权流程
- 账号状态实时监控

### 2. 运营数据监控
- 实时监控粉丝数、互动率、播放量等关键指标
- 自定义监控目标和阈值
- 数据可视化展示

### 3. 智能目标比对
- 自动比对当前数据与目标值的差距
- 智能分析需要采取的行动
- 可配置的容忍度设置

### 4. 加粉服务集成
- 集成FansGurus等服务商API
- 支持多种服务类型（粉丝、点赞、观看量、评论）
- 实时价格和服务时效信息

### 5. 自动下单系统
- 基于监控结果自动推荐合适的服务包
- 支持手动和自动两种下单模式
- 订单状态实时跟踪

## 🛠 技术栈

- **前端**: Next.js 16, React, TypeScript, Tailwind CSS
- **API**: RESTful API design
- **集成**: FansGurus API, X API v2
- **部署**: 支持Docker容器化部署

## 📁 项目结构

```
social-media-automation/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API路由
│   │   │   ├── accounts/   # 账号管理API
│   │   │   ├── monitoring/ # 监控API
│   │   │   ├── orders/     # 订单管理API
│   │   │   └── services/   # 服务包API
│   │   └── page.tsx        # 主页面
│   ├── lib/                # 工具函数
│   │   └── api.ts         # API集成
│   └── types/              # TypeScript类型定义
│       └── index.ts
├── .env.local              # 环境变量
└── README.md
```

## 🔧 环境配置

1. **复制环境变量模板**
   ```bash
   cp .env.local.example .env.local
   ```

2. **配置API密钥**
   ```env
   # FansGurus API
   FANSGURUS_API_KEY=your_api_key_here
   
   # X API
   X_API_KEY=your_x_api_key
   X_API_SECRET=your_x_api_secret
   X_ACCESS_TOKEN=your_access_token
   X_ACCESS_TOKEN_SECRET=your_access_token_secret
   ```

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 构建项目
```bash
npm run build
```

### 3. 启动服务
```bash
npm run start
```

或使用提供的部署脚本：
```bash
# 构建项目
bash /workspace/projects/.cozeproj/scripts/deploy_build.sh

# 启动服务
nohup bash /workspace/projects/.cozeproj/scripts/deploy_run.sh > output.log 2>&1 &
```

## 📊 API 接口

### 账号管理
- `GET /api/accounts` - 获取所有账号
- `POST /api/accounts` - 添加新账号
- `PUT /api/accounts` - 更新账号信息
- `DELETE /api/accounts` - 删除账号

### 监控管理
- `GET /api/monitoring` - 获取监控目标和结果
- `POST /api/monitoring` - 创建新的监控目标
- `PUT /api/monitoring` - 更新监控目标
- `PATCH /api/monitoring` - 同步监控数据

### 订单管理
- `GET /api/orders` - 获取所有订单
- `POST /api/orders` - 创建新订单
- `PATCH /api/orders` - 检查订单状态
- `PUT /api/orders` - 批量自动下单

### 服务管理
- `GET /api/services` - 获取可用服务包

## 🎯 使用场景

1. **社交媒体营销机构**: 批量管理客户账号，自动完成数据增长目标
2. **个人创作者**: 设定增长目标，系统自动跟进和维护账号表现
3. **企业品牌**: 监控品牌账号关键指标，确保营销效果达标

## 🔒 安全说明

- 所有API密钥存储在环境变量中，不会暴露在前端
- 支持OAuth 2.0授权流程，确保账号安全
- 数据传输使用HTTPS加密

## 📈 系统监控

系统提供实时监控仪表板，显示：
- 活跃账号数量
- 监控目标进度
- 订单处理状态
- 服务可用性

## 🤝 集成扩展

系统设计为模块化架构，可以轻松集成：
- 更多社交媒体平台
- 其他服务提供商
- 第三方分析工具
- 自定义监控规则

## 📝 更新日志

### v1.0.0
- 完整的账号授权管理
- X平台数据监控
- FansGurus服务集成
- 自动下单功能
- 响应式仪表板界面

## 📞 支持与反馈

如有问题或建议，请通过以下方式联系：
- 技术支持: tech@example.com
- 功能建议: feedback@example.com

---

**注意**: 本项目仅用于教育和研究目的，请确保遵守各平台的服务条款和法律法规。