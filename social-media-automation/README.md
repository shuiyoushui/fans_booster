# 社交媒体自动化平台

一个功能完整的社交媒体账号运营数据监控和自动下单系统，支持X(Twitter)等平台的自动化管理。

## 🚀 核心功能

### 1. 用户系统
- **邮箱注册/登录**: 支持用户注册和登录
- **JWT认证**: 安全的token认证机制
- **用户权限管理**: 基于用户的数据隔离

### 2. 账号绑定管理
- **多平台支持**: 支持X(Twitter)、Instagram、TikTok、YouTube
- **账号验证**: 自动验证绑定账号的有效性
- **访问令牌管理**: 支持OAuth令牌的存储和刷新

### 3. 增长目标设置
- **灵活目标创建**: 可设置粉丝数、点赞数、观看量、评论数等目标
- **时间规划**: 支持设定目标完成截止时间
- **预算控制**: 可设置目标的最大预算限制
- **自动下单**: 可选择启用或禁用自动下单功能

### 4. USDT钱包系统
- **数字钱包**: 每个用户自动创建USDT钱包
- **充值功能**: 支持USDT充值，自动生成充值地址
- **交易记录**: 完整的交易历史记录
- **余额管理**: 实时余额查询和更新

### 5. 数据监控分析
- **实时监控**: 自动获取账号数据
- **目标比对**: 智能分析当前数据与目标的差距
- **进度追踪**: 可视化目标完成进度
- **状态管理**: 支持目标的暂停、恢复、取消

### 6. 服务集成
- **FansGurus API**: 集成专业的加粉服务
- **多服务类型**: 支持粉丝、点赞、观看量、评论等服务
- **自动下单**: 基于监控结果自动匹配并下单合适的服务
- **订单跟踪**: 实时跟踪订单执行状态

## 🛠 技术栈

- **前端**: Next.js 16, React, TypeScript, Tailwind CSS
- **后端**: Node.js, Next.js API Routes
- **认证**: JWT (JSON Web Tokens)
- **加密**: bcryptjs (密码加密)
- **集成**: FansGurus API, X API v2
- **部署**: 支持Docker容器化部署

## 📁 项目结构

```
social-media-automation/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API路由
│   │   │   ├── auth/          # 认证相关API
│   │   │   │   ├── login/     # 登录
│   │   │   │   └── register/  # 注册
│   │   │   ├── accounts/      # 账号管理API
│   │   │   ├── growth-targets/ # 增长目标API
│   │   │   ├── wallet/        # 钱包API
│   │   │   ├── orders/        # 订单管理API
│   │   │   ├── services/      # 服务包API
│   │   │   └── monitoring/    # 监控API
│   │   ├── auth/              # 认证页面
│   │   ├── dashboard/         # 仪表板页面
│   │   └── page.tsx           # 主页(重定向)
│   ├── components/            # React组件
│   │   └── Modals.tsx         # 模态框组件
│   ├── lib/                   # 工具函数
│   │   ├── api.ts            # API集成
│   │   └── database.ts       # 数据库模拟
│   ├── types/                 # TypeScript类型定义
│   │   └── index.ts
│   └── middleware.ts          # 认证中间件
├── .env.local                 # 环境变量
└── README.md
```

## 🔧 环境配置

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置环境变量**
   ```env
   # JWT密钥
   JWT_SECRET=your_jwt_secret_key_change_this_in_production
   
   # FansGurus API
   FANSGURUS_API_KEY=your_fansgurus_api_key_here
   
   # X API
   X_API_KEY=your_x_api_key_here
   X_API_SECRET=your_x_api_secret_here
   X_ACCESS_TOKEN=your_x_access_token_here
   X_ACCESS_TOKEN_SECRET=your_x_access_token_secret_here
   ```

## 🚀 快速开始

### 1. 启动开发服务器
```bash
npm run dev
```

### 2. 构建生产版本
```bash
npm run build
```

### 3. 启动生产服务器
```bash
npm run start
```

### 4. 使用部署脚本
```bash
# 构建项目
bash /workspace/projects/.cozeproj/scripts/deploy_build.sh

# 启动服务
nohup bash /workspace/projects/.cozeproj/scripts/deploy_run.sh > output.log 2>&1 &
```

## 📊 API 接口

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/login` - 验证token

### 账号管理
- `GET /api/accounts?userId={id}` - 获取用户账号
- `POST /api/accounts` - 绑定新账号
- `PUT /api/accounts` - 更新账号信息
- `DELETE /api/accounts?id={id}&userId={id}` - 解绑账号

### 增长目标
- `GET /api/growth-targets?userId={id}` - 获取用户目标
- `POST /api/growth-targets` - 创建新目标
- `PUT /api/growth-targets` - 更新目标
- `DELETE /api/growth-targets?id={id}&userId={id}` - 删除目标

### 钱包管理
- `GET /api/wallet?userId={id}` - 获取钱包信息
- `POST /api/wallet` - 创建充值记录
- `PATCH /api/wallet` - 确认充值

### 订单管理
- `GET /api/orders` - 获取订单列表
- `POST /api/orders` - 创建新订单
- `PATCH /api/orders` - 检查订单状态
- `PUT /api/orders` - 批量自动下单

## 🎯 使用场景

1. **社交媒体营销机构**: 
   - 管理多个客户账号
   - 设置个性化增长目标
   - 自动完成数据增长服务

2. **个人创作者**: 
   - 设定粉丝增长目标
   - 自动维护账号表现
   - 预算控制和成本优化

3. **企业品牌**: 
   - 监控品牌账号指标
   - 确保营销效果达标
   - 批量管理多平台账号

## 🔒 安全特性

- **密码加密**: 使用bcryptjs进行密码哈希
- **JWT认证**: 安全的token认证机制
- **用户隔离**: 每个用户只能访问自己的数据
- **API权限**: 所有API都需要有效的认证令牌
- **数据验证**: 完整的输入验证和错误处理

## 📈 主要优化

### v2.0.0 新增功能
- ✅ 完整的用户注册/登录系统
- ✅ 邮箱密码认证机制
- ✅ 多平台账号绑定和管理
- ✅ 灵活的增长目标创建
- ✅ USDT数字钱包系统
- ✅ 充值功能集成
- ✅ 用户权限和数据隔离
- ✅ 响应式管理界面

### v1.0.0 基础功能
- ✅ 账号授权管理
- ✅ 运营数据监控
- ✅ 目标值比对分析
- ✅ FansGurus API集成
- ✅ 自动下单功能

## 📱 用户界面

### 认证页面
- 简洁的注册/登录界面
- 表单验证和错误提示
- 自动跳转和认证状态管理

### 仪表板
- 实时数据统计卡片
- 账号管理界面
- 增长目标进度展示
- 钱包信息和交易记录

### 交互组件
- 账号绑定模态框
- 目标创建模态框
- 充值地址生成
- 状态操作按钮

## 🚀 部署说明

### 系统要求
- Node.js 18+ 
- 内存: 512MB+
- 存储: 1GB+

### 部署步骤
1. 克隆项目代码
2. 安装依赖包
3. 配置环境变量
4. 构建项目
5. 启动服务

### 监控和日志
- 服务状态监控
- 错误日志记录
- API调用统计
- 用户行为追踪

## 🤝 集成扩展

- **新平台支持**: 可轻松添加新的社交平台
- **服务提供商**: 支持集成更多服务提供商
- **支付方式**: 可扩展支持更多数字货币
- **数据分析**: 可集成第三方分析工具

## 📞 技术支持

- API文档: 详细的接口文档和使用说明
- 错误处理: 完整的错误码和解决方案
- 性能优化: 数据库查询优化和缓存策略
- 安全更新: 定期安全补丁和依赖更新

---

**注意**: 本项目为演示版本，生产环境部署请确保：
1. 使用真实的数据库替换内存存储
2. 配置安全的JWT密钥
3. 启用HTTPS加密传输
4. 实施完整的备份和恢复策略