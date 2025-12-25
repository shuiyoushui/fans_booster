# 社交媒体自动化平台

专业的社交媒体账号管理和自动化增长平台，支持X(Twitter)平台账号绑定、数据监控、目标比对和自动增长服务。

## 🚀 功能特性

### 核心功能
- **多平台账号管理** - 支持X(Twitter)等主流社交媒体平台账号绑定
- **实时数据监控** - 监控粉丝数、互动率、发帖频率等关键指标
- **智能目标比对** - 对比实际数据与设定目标的差距分析
- **自动增长服务** - 自动匹配加粉、互动等服务并完成下单
- **预算管理** - 灵活的预算分配和消费管理

### 技术特性
- **OAuth 2.0认证** - 安全的平台授权机制，支持跨窗口token传递
- **实时数据同步** - 定期同步账号数据，确保信息准确性
- **智能错误处理** - 完善的错误处理和重试机制
- **系统监控** - 健康检查和性能监控
- **响应式设计** - 支持桌面和移动端访问

## 🛠 技术栈

### 前端
- **Next.js 16** - React全栈框架
- **TypeScript** - 类型安全的JavaScript
- **Tailwind CSS** - 实用优先的CSS框架
- **Framer Motion** - 流畅的动画效果
- **React Hot Toast** - 优雅的通知系统

### 后端
- **Next.js API Routes** - 服务端API
- **JWT** - 用户认证和授权
- **bcryptjs** - 密码加密
- **SQLite** - 轻量级数据库

### 集成服务
- **X (Twitter) API v2** - 平台数据接口
- **FansGurus API** - 增长服务提供商
- **Python FastAPI** - 数据采集服务

## 📦 安装和运行

### 环境要求
- Node.js 18+
- npm 或 yarn

### 快速开始
1. 克隆仓库
```bash
git clone https://github.com/yourusername/social-media-automation.git
cd social-media-automation
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env.local
# 编辑 .env.local 文件，填入必要的配置
```

4. 构建项目
```bash
npm run build
```

5. 启动服务
```bash
npm start
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 🔧 配置说明

### 环境变量
创建 `.env.local` 文件并配置以下变量：

```env
# X平台OAuth配置
X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_client_secret
X_REDIRECT_URI=https://yourdomain.com/auth/x/callback

# API密钥
X_API_KEY=your_x_api_key
FANSGURUS_API_KEY=your_fansgurus_api_key

# 应用配置
NEXT_PUBLIC_APP_URL=https://yourdomain.com
JWT_SECRET=your_jwt_secret

# 数据库
DATABASE_URL=your_database_url
```

## 📁 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API路由
│   │   ├── auth/          # 认证相关API
│   │   ├── x/             # X平台相关API
│   │   └── ...
│   ├── auth/              # 认证页面
│   ├── dashboard/         # 仪表盘
│   └── ...
├── components/            # React组件
├── lib/                  # 工具库
│   ├── database.ts       # 数据库配置
│   ├── x-oauth-flow.ts   # OAuth管理
│   └── ...
├── hooks/                # 自定义React Hooks
├── types/               # TypeScript类型定义
└── ...
```

## 🔐 OAuth认证流程

项目实现了完整的OAuth 2.0流程，支持跨窗口token传递：

1. **授权URL生成** - 创建包含token参数的授权URL
2. **用户授权** - 跳转到平台授权页面
3. **回调处理** - 多重fallback机制获取token
4. **账号绑定** - 完成账号绑定和数据同步

详细的技术实现请参考 [OAuth实现文档](./docs/oauth.md)。

## 🚀 部署

### Vercel部署（推荐）
1. 将代码推送到GitHub
2. 连接Vercel账号到GitHub
3. 导入项目并配置环境变量
4. 部署完成

### 自托管部署
1. 构建项目：`npm run build`
2. 启动服务：`npm start`
3. 使用PM2等进程管理器保持服务运行

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - 强大的React框架
- [Tailwind CSS](https://tailwindcss.com/) - 实用的CSS框架
- [X Developer Platform](https://developer.twitter.com/) - 平台API支持

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [Issue](https://github.com/yourusername/social-media-automation/issues)
- 发送邮件至：your-email@example.com

---

⭐ 如果这个项目对你有帮助，请给它一个星标！