# 🚀 快速开始指南

## 一键运行

```bash
# 1. 克隆项目
git clone https://github.com/shuiyoushui/fans_booster.git
cd social-media-automation

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的API密钥

# 4. 构建并启动
npm run build
npm start
```

访问 http://localhost:3000 开始使用！

## 环境变量配置

在 `.env.local` 文件中至少配置以下必需变量：

```env
# X平台OAuth（必需）
X_CLIENT_ID=your_twitter_client_id
X_CLIENT_SECRET=your_twitter_client_secret
X_REDIRECT_URI=http://localhost:3000/auth/x/callback

# JWT密钥（必需）
JWT_SECRET=your-super-secret-jwt-key

# 应用URL（必需）
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 测试账号

可以使用以下测试账号快速体验：

- 邮箱: `test@example.com`
- 密码: `test123456`

## 主要功能

1. **登录注册** - 创建账号或使用测试账号
2. **绑定X账号** - 在"X账号管理"页面进行OAuth绑定
3. **查看数据** - 在仪表盘查看账号统计和增长目标
4. **使用服务** - 在增长服务页面选择合适的套餐

## 常见问题

### Q: OAuth授权失败？
A: 检查X开发者应用的回调URL配置是否正确。

### Q: 获取不到账号数据？
A: 确保X API密钥配置正确，并且已成功完成OAuth绑定。

### Q: 如何部署到生产环境？
A: 建议使用Vercel一键部署，或参考README中的部署指南。

## 获取帮助

- 查看 [完整文档](./README.md)
- 提交 [Issue](https://github.com/shuiyoushui/fans_booster/issues)
- 参考 [演示文档](./docs/demo.md)