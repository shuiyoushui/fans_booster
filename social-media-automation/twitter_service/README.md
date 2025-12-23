# Twitter数据采集服务

基于Twint的Twitter数据采集服务，无需API密钥即可获取用户信息和推文数据。

## 功能特性

- 🔍 **用户信息采集**: 获取用户基本信息、粉丝数、关注数等
- 📝 **推文数据采集**: 获取用户推文内容、互动数据
- 🔄 **异步处理**: 支持后台任务处理
- 💾 **数据存储**: SQLite数据库存储
- 📊 **任务管理**: 实时查看采集进度和状态
- 🌐 **RESTful API**: 完整的API接口

## 安装依赖

```bash
pip install -r requirements.txt
```

## 启动服务

```bash
cd twitter_service
python main.py
```

服务将在 `http://localhost:8000` 启动

## API接口

### 1. 分析用户数据
```http
POST /api/analyze
Content-Type: application/json

{
    "username": "elonmusk",
    "include_tweets": true,
    "tweets_limit": 100,
    "include_followers": false,
    "include_following": false
}
```

### 2. 查询分析结果
```http
GET /api/analyze/{task_id}
```

### 3. 获取用户数据
```http
GET /api/user/{username}
```

### 4. 查看任务列表
```http
GET /api/tasks
```

## 数据模型

### TwitterUser
- username: 用户名
- user_id: 用户ID
- name: 显示名称
- bio: 个人简介
- followers_count: 粉丝数
- following_count: 关注数
- tweets_count: 推文数
- likes_count: 点赞数
- profile_image_url: 头像URL
- verified: 是否认证
- created_at: 注册时间
- location: 位置
- website: 网站

### TweetData
- id: 推文ID
- conversation_id: 对话ID
- created_at: 创建时间
- username: 用户名
- tweet: 推文内容
- replies_count: 回复数
- likes_count: 点赞数
- retweets_count: 转发数
- views_count: 浏览数
- hashtags: 话题标签
- mentions: 提及用户
- link: 推文链接

## 使用示例

### 1. 采集用户数据
```bash
curl -X POST "http://localhost:8000/api/analyze" \
     -H "Content-Type: application/json" \
     -d '{
         "username": "elonmusk",
         "include_tweets": true,
         "tweets_limit": 50
     }'
```

### 2. 查询结果
```bash
curl "http://localhost:8000/api/analyze/{task_id}"
```

## 注意事项

- 采集频率不宜过高，避免被限制
- 大量数据采集可能需要较长时间
- 仅采集公开数据，遵守Twitter使用条款
- 建议定期清理历史数据