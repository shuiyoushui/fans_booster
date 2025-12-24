# X (Twitter) OAuth 2.0 完整配置指南

## 🚨 常见问题诊断

根据你的错误 "Invalid or expired state"，最可能的原因是：

1. **X开发者门户中的回调URI配置不正确**
2. **应用权限配置不完整**  
3. **客户端凭证问题**

## 🔧 X开发者门户配置检查清单

### 1. 登录X开发者门户
访问：https://developer.x.com/en/portal/dashboard

### 2. 应用基本设置检查

#### 应用类型 ⚠️ **关键**
- **必须选择**: `Web App, Automated App or Bot`
- **不能选择**: `Native App` (会导致OAuth流程失败)

#### 应用状态
- 状态必须是 `Active`
- 不能是 `Suspended` 或 `Inactive`

### 3. OAuth 2.0 设置

#### 回调URI (Callback URI) ⚠️ **最常见问题**
必须**精确匹配**你的环境变量 `X_REDIRECT_URI`：

```
当前配置: https://3m2nf7wdnr.coze.site/auth/x/callback
```

**在X开发者门户中必须添加的完整URI:**
```
https://3m2nf7wdnr.coze.site/auth/x/callback
```

**常见错误:**
- ❌ 使用 `http://` 而非 `https://`
- ❌ 缺少 `/auth/x/callback` 路径
- ❌ 额外的查询参数
- ❌ 尾部斜杠不匹配

#### 多环境支持
如果你需要支持本地开发，也添加：
```
http://localhost:3000/auth/x/callback
https://localhost:3000/auth/x/callback
```

### 4. 权限范围 (Scopes) ⚠️ **必需权限**

在应用的 `Permissions` 页面，确保以下权限已**添加并批准**：

```
users.read          # 读取用户基本信息
offline.access      # 获取refresh token  
tweet.read          # 读取推文
follows.read        # 读取关注关系
```

**注意：** 每个权限都需要等待X的审批，通常需要几分钟到几小时。

### 5. 客户端凭证

#### Client ID
- 确保从X开发者门户正确复制
- 格式应该是：`ZXJRRWtRYmNpSlNBSHEwb1NQN3Q6MTpjaQ`

#### Client Secret  
- 如果怀疑有问题，可以**重新生成**
- 重新生成后需要更新环境变量
- 格式应该包含：`tzC7T79kNT_zA_x5qOUvaTqZnZxEEVPjD-MSUUAHafL2f7qfm8`

## 🛠️ 环境变量验证

确保 `.env.local` 文件包含正确的配置：

```bash
# X (Twitter) OAuth 2.0 配置
X_CLIENT_ID=ZXJRRWtRYmNpSlNBSHEwb1NQN3Q6MTpjaQ
X_CLIENT_SECRET=tzC7T79kNT_zA_x5qOUvaTqZnZxEEVPjD-MSUUAHafL2f7qfm8
X_REDIRECT_URI=https://3m2nf7wdnr.coze.site/auth/x/callback

# 应用URL配置  
NEXT_PUBLIC_APP_URL=https://3m2nf7wdnr.coze.site
```

## 🔍 故障排除工具

### 使用内置配置检查工具
访问：`GET /api/x/config/check`

这个API会检查：
- ✅ 环境变量配置
- ✅ 格式验证
- ✅ API连接测试
- ✅ 配置问题诊断
- ✅ 详细修复建议

### 手动测试OAuth URL
访问：`POST /api/x/config/check` 请求体：
```json
{
  "testType": "oauth_url"
}
```

## 🚀 完整配置步骤

### 步骤1: X开发者门户设置
1. 登录 https://developer.x.com
2. 选择你的应用
3. 确认应用类型为 "Web App, Automated App or Bot"
4. 确认应用状态为 "Active"

### 步骤2: 配置回调URI
1. 进入应用的 "Keys and tokens" 页面
2. 找到 "OAuth 2.0 Settings"
3. 在 "Callback URI / Redirect URL" 中添加：
   ```
   https://3m2nf7wdnr.coze.site/auth/x/callback
   ```

### 步骤3: 配置权限
1. 进入应用的 "Permissions" 页面
2. 添加并申请以下权限：
   - `users.read`
   - `offline.access`
   - `tweet.read`
   - `follows.read`
3. 等待权限批准

### 步骤4: 验证客户端凭证
1. 在 "Keys and tokens" 页面找到 "OAuth 2.0 Client ID and Client Secret"
2. 如果需要，重新生成 Client Secret
3. 更新环境变量

## ⚡ 快速修复检查清单

运行以下命令检查配置：

```bash
curl "https://3m2nf7wdnr.coze.site/api/x/config/check"
```

检查返回结果中的：
- `environment.*.isValid` - 所有环境变量必须为true
- `issues` - 应该为空数组
- `apiTest.status` - 应该为 "api_accessible"

## 🆘 如果仍有问题

### 常见错误和解决方案

#### Error: "Invalid or expired state"
**原因**: 回调URI不匹配
**解决**: 仔细检查X开发者门户中的回调URI，必须与 `X_REDIRECT_URI` 完全相同

#### Error: "403 Forbidden"  
**原因**: 应用权限不足或被暂停
**解决**: 检查应用状态和权限配置

#### Error: "Client authentication failed"
**原因**: Client ID或Secret错误
**解决**: 重新生成Client Secret并更新环境变量

### 联系支持
如果以上步骤都正确仍有问题，可能需要：
1. 等待X平台权限审批（可能需要24小时）
2. 检查是否违反了X平台的使用条款
3. 联系X平台开发者支持

## 📝 测试验证

配置完成后，可以通过以下方式验证：

1. **配置检查**: `GET /api/x/config/check`
2. **OAuth URL生成**: `POST /api/x/auth/url`
3. **完整的OAuth流程测试**: 前端点击"连接X账号"按钮

---

**重要提醒**: X平台的OAuth配置要求非常严格，任何微小的配置差异都可能导致授权失败。请仔细检查每个步骤的配置。