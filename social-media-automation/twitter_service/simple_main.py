#!/usr/bin/env python3
"""
简化的Twitter数据采集服务
先用模拟数据进行测试，后续可集成真实数据采集
"""
import asyncio
import json
import sqlite3
import os
import random
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Twitter数据采集服务", version="1.0.0")

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据模型
class TwitterUser(BaseModel):
    username: str
    user_id: Optional[str] = None
    name: Optional[str] = None
    bio: Optional[str] = None
    followers_count: Optional[int] = 0
    following_count: Optional[int] = 0
    tweets_count: Optional[int] = 0
    likes_count: Optional[int] = 0
    profile_image_url: Optional[str] = None
    verified: Optional[bool] = False
    created_at: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None

class TweetData(BaseModel):
    id: str
    conversation_id: str
    created_at: str
    date: str
    time: str
    timezone: str
    user_id: str
    username: str
    name: str
    tweet: str
    replies_count: int
    likes_count: int
    retweets_count: int
    views_count: Optional[int] = 0
    hashtags: List[str] = []
    mentions: List[str] = []
    link: str

class AnalysisRequest(BaseModel):
    username: str
    include_tweets: bool = True
    tweets_limit: int = 100
    include_followers: bool = False
    include_following: bool = False

class AnalysisResponse(BaseModel):
    success: bool
    message: str
    user_data: Optional[TwitterUser] = None
    tweets_data: Optional[List[TweetData]] = []
    analysis_id: Optional[str] = None

# 模拟用户数据
MOCK_USERS = {
    "elonmusk": {
        "username": "elonmusk",
        "user_id": "44196397",
        "name": "Elon Musk",
        "bio": "Chief Twit @X",
        "followers_count": 196_000_000,
        "following_count": 500,
        "tweets_count": 30_000,
        "likes_count": 50_000,
        "profile_image_url": "https://pbs.twimg.com/profile_images/1683325380441128964/yWrRRqyS_400x400.jpg",
        "verified": True,
        "created_at": "2009-06-02T20:12:29.000Z",
        "location": "Austin, TX",
        "website": "http://tesla.com"
    },
    "nasa": {
        "username": "NASA",
        "user_id": "11348282",
        "name": "NASA",
        "bio": "Explore the universe and discover our home planet with @NASA.",
        "followers_count": 53_000_000,
        "following_count": 280,
        "tweets_count": 60_000,
        "likes_count": 2_500_000,
        "profile_image_url": "https://pbs.twimg.com/profile_images/1468070244680155141/P44wqM-E_400x400.jpg",
        "verified": True,
        "created_at": "2008-12-23T20:27:15.000Z",
        "location": "Washington, DC",
        "website": "http://nasa.gov"
    }
}

# 生成模拟推文
def generate_mock_tweets(username: str, limit: int) -> List[Dict[str, Any]]:
    """生成模拟推文数据"""
    tweets = []
    base_tweets = [
        "This is a test tweet from @" + username,
        "Exploring new technologies and innovations #tech #innovation",
        "Working on exciting projects that will change the world! 🚀",
        "The future is here and it's amazing! Check this out...",
        "Just had an incredible meeting about our next big thing",
        "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        "Innovation distinguishes between a leader and a follower.",
        "The only way to do great work is to love what you do.",
        "Your time is limited, don't waste it living someone else's life.",
        "Stay hungry, stay foolish. #motivation #inspiration"
    ]
    
    for i in range(min(limit, len(base_tweets))):
        tweet_id = str(random.randint(1000000000000000000, 9999999999999999999))
        created_time = datetime.now(timezone.utc) - timedelta(hours=i*2)
        
        tweets.append({
            "id": tweet_id,
            "conversation_id": tweet_id,
            "created_at": created_time.isoformat(),
            "date": created_time.strftime("%Y-%m-%d"),
            "time": created_time.strftime("%H:%M:%S"),
            "timezone": "UTC",
            "user_id": MOCK_USERS.get(username, {}).get("user_id", "123456"),
            "username": username,
            "name": MOCK_USERS.get(username, {}).get("name", username),
            "tweet": base_tweets[i],
            "replies_count": random.randint(0, 500),
            "likes_count": random.randint(100, 50000),
            "retweets_count": random.randint(10, 5000),
            "views_count": random.randint(1000, 500000),
            "hashtags": ["#tech", "#innovation"] if i == 1 else [],
            "mentions": [],
            "link": f"https://twitter.com/{username}/status/{tweet_id}"
        })
    
    return tweets

# 数据库初始化
def init_database():
    """初始化SQLite数据库"""
    conn = sqlite3.connect('twitter_data.db')
    cursor = conn.cursor()
    
    # 用户数据表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS twitter_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            user_id TEXT,
            name TEXT,
            bio TEXT,
            followers_count INTEGER DEFAULT 0,
            following_count INTEGER DEFAULT 0,
            tweets_count INTEGER DEFAULT 0,
            likes_count INTEGER DEFAULT 0,
            profile_image_url TEXT,
            verified BOOLEAN DEFAULT FALSE,
            created_at TEXT,
            location TEXT,
            website TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 推文数据表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tweets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tweet_id TEXT UNIQUE NOT NULL,
            username TEXT NOT NULL,
            user_id TEXT,
            name TEXT,
            tweet TEXT,
            created_at TEXT,
            date TEXT,
            time TEXT,
            timezone TEXT,
            replies_count INTEGER DEFAULT 0,
            likes_count INTEGER DEFAULT 0,
            retweets_count INTEGER DEFAULT 0,
            views_count INTEGER DEFAULT 0,
            hashtags TEXT,
            mentions TEXT,
            link TEXT,
            collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (username) REFERENCES twitter_users (username)
        )
    ''')
    
    # 分析任务表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analysis_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id TEXT UNIQUE NOT NULL,
            username TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            error_message TEXT,
            FOREIGN KEY (username) REFERENCES twitter_users (username)
        )
    ''')
    
    conn.commit()
    conn.close()

# 保存数据到数据库
def save_user_data(user_data: Dict[str, Any]) -> bool:
    """保存用户数据到数据库"""
    try:
        conn = sqlite3.connect('twitter_data.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO twitter_users 
            (username, user_id, name, bio, followers_count, following_count, 
             tweets_count, likes_count, profile_image_url, verified, 
             created_at, location, website)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_data.get('username'),
            user_data.get('user_id'),
            user_data.get('name'),
            user_data.get('bio'),
            user_data.get('followers_count', 0),
            user_data.get('following_count', 0),
            user_data.get('tweets_count', 0),
            user_data.get('likes_count', 0),
            user_data.get('profile_image_url'),
            user_data.get('verified', False),
            user_data.get('created_at'),
            user_data.get('location'),
            user_data.get('website')
        ))
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        print(f"保存用户数据失败: {str(e)}")
        return False

def save_tweets_data(tweets: List[Dict[str, Any]]) -> bool:
    """保存推文数据到数据库"""
    try:
        conn = sqlite3.connect('twitter_data.db')
        cursor = conn.cursor()
        
        for tweet in tweets:
            cursor.execute('''
                INSERT OR REPLACE INTO tweets 
                (tweet_id, username, user_id, name, tweet, created_at, 
                 date, time, timezone, replies_count, likes_count, 
                 retweets_count, views_count, hashtags, mentions, link)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                tweet.get('id'),
                tweet.get('username'),
                tweet.get('user_id'),
                tweet.get('name'),
                tweet.get('tweet'),
                tweet.get('created_at'),
                tweet.get('date'),
                tweet.get('time'),
                tweet.get('timezone'),
                tweet.get('replies_count', 0),
                tweet.get('likes_count', 0),
                tweet.get('retweets_count', 0),
                tweet.get('views_count', 0),
                json.dumps(tweet.get('hashtags', [])),
                json.dumps(tweet.get('mentions', [])),
                tweet.get('link')
            ))
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        print(f"保存推文数据失败: {str(e)}")
        return False

# 数据分析任务
async def analyze_twitter_data(request: AnalysisRequest, task_id: str) -> Dict[str, Any]:
    """分析Twitter数据"""
    try:
        # 模拟处理时间
        await asyncio.sleep(2)
        
        username = request.username
        result = {
            'success': False,
            'message': '',
            'user_data': None,
            'tweets_data': [],
            'analysis_id': task_id
        }
        
        # 获取用户信息（使用模拟数据）
        user_info = MOCK_USERS.get(username.lower())
        if user_info:
            save_user_data(user_info)
            
            # 转换为前端期望的格式
            result['user_data'] = TwitterUser(
                username=user_info.get('username', ''),
                user_id=user_info.get('user_id'),
                name=user_info.get('name'),
                bio=user_info.get('bio'),
                followers_count=user_info.get('followers_count', 0),
                following_count=user_info.get('following_count', 0),
                tweets_count=user_info.get('tweets_count', 0),
                likes_count=user_info.get('likes_count', 0),
                profile_image_url=user_info.get('profile_image_url'),
                verified=user_info.get('verified', False),
                created_at=user_info.get('created_at'),
                location=user_info.get('location'),
                website=user_info.get('website')
            )
        else:
            # 生成模拟数据用于测试
            mock_user = {
                'username': username,
                'user_id': str(random.randint(10000000, 99999999)),
                'name': f'{username.title()} User',
                'bio': f'This is the bio for @{username}',
                'followers_count': random.randint(1000, 1000000),
                'following_count': random.randint(100, 5000),
                'tweets_count': random.randint(100, 10000),
                'likes_count': random.randint(500, 50000),
                'profile_image_url': f'https://picsum.photos/seed/{username}/200/200.jpg',
                'verified': random.choice([True, False]),
                'created_at': '2020-01-01T00:00:00.000Z',
                'location': 'Internet',
                'website': f'https://twitter.com/{username}'
            }
            
            save_user_data(mock_user)
            result['user_data'] = TwitterUser(**mock_user)
        
        # 获取推文数据（如果需要）
        if request.include_tweets:
            tweets = generate_mock_tweets(username, request.tweets_limit)
            if tweets:
                save_tweets_data(tweets)
                
                # 转换为前端期望的格式
                result['tweets_data'] = [
                    TweetData(
                        id=tweet.get('id', ''),
                        conversation_id=tweet.get('conversation_id', ''),
                        created_at=tweet.get('created_at', ''),
                        date=tweet.get('date', ''),
                        time=tweet.get('time', ''),
                        timezone=tweet.get('timezone', ''),
                        user_id=tweet.get('user_id', ''),
                        username=tweet.get('username', ''),
                        name=tweet.get('name', ''),
                        tweet=tweet.get('tweet', ''),
                        replies_count=tweet.get('replies_count', 0),
                        likes_count=tweet.get('likes_count', 0),
                        retweets_count=tweet.get('retweets_count', 0),
                        views_count=tweet.get('views_count', 0),
                        hashtags=tweet.get('hashtags', []),
                        mentions=tweet.get('mentions', []),
                        link=tweet.get('link', '')
                    )
                    for tweet in tweets
                ]
        
        result['success'] = True
        result['message'] = '数据分析完成'
        
        # 更新任务状态为完成
        update_task_status(task_id, 'completed')
        
        return result
        
    except Exception as e:
        update_task_status(task_id, 'failed', str(e))
        return {
            'success': False,
            'message': f'分析失败: {str(e)}',
            'analysis_id': task_id
        }

def create_task(username: str) -> str:
    """创建分析任务"""
    task_id = str(uuid.uuid4())
    
    conn = sqlite3.connect('twitter_data.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO analysis_tasks (task_id, username, status)
        VALUES (?, ?, ?)
    ''', (task_id, username, 'pending'))
    
    conn.commit()
    conn.close()
    
    return task_id

def update_task_status(task_id: str, status: str, error_message: str = None):
    """更新任务状态"""
    conn = sqlite3.connect('twitter_data.db')
    cursor = conn.cursor()
    
    if status == 'completed':
        cursor.execute('''
            UPDATE analysis_tasks 
            SET status = ?, completed_at = CURRENT_TIMESTAMP
            WHERE task_id = ?
        ''', (status, task_id))
    elif status == 'failed':
        cursor.execute('''
            UPDATE analysis_tasks 
            SET status = ?, completed_at = CURRENT_TIMESTAMP, error_message = ?
            WHERE task_id = ?
        ''', (status, error_message, task_id))
    else:
        cursor.execute('''
            UPDATE analysis_tasks SET status = ? WHERE task_id = ?
        ''', (status, task_id))
    
    conn.commit()
    conn.close()

def get_task_status(task_id: str) -> Dict[str, Any]:
    """获取任务状态"""
    conn = sqlite3.connect('twitter_data.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT status, created_at, completed_at, error_message
        FROM analysis_tasks WHERE task_id = ?
    ''', (task_id,))
    
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return {
            'task_id': task_id,
            'status': result[0],
            'created_at': result[1],
            'completed_at': result[2],
            'error_message': result[3]
        }
    
    return None

# API路由
@app.get("/")
async def root():
    """根路径"""
    return {"message": "Twitter数据采集服务运行中", "version": "1.0.0"}

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_twitter(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """分析Twitter用户数据"""
    try:
        # 创建任务ID
        task_id = create_task(request.username)
        
        # 在后台执行分析任务
        background_tasks.add_task(analyze_twitter_data, request, task_id)
        
        return AnalysisResponse(
            success=True,
            message=f"数据分析任务已创建，任务ID: {task_id}",
            analysis_id=task_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建分析任务失败: {str(e)}")

@app.get("/api/analyze/{task_id}")
async def get_analysis_result(task_id: str):
    """获取分析结果"""
    try:
        task_status = get_task_status(task_id)
        
        if not task_status:
            raise HTTPException(status_code=404, detail="任务不存在")
        
        if task_status['status'] == 'completed':
            # 从数据库获取结果
            conn = sqlite3.connect('twitter_data.db')
            cursor = conn.cursor()
            
            # 获取任务信息
            cursor.execute('SELECT username FROM analysis_tasks WHERE task_id = ?', (task_id,))
            task_info = cursor.fetchone()
            username = task_info[0] if task_info else None
            
            if username:
                # 获取用户数据
                cursor.execute('SELECT * FROM twitter_users WHERE username = ?', (username,))
                user_row = cursor.fetchone()
                
                if user_row:
                    columns = [description[0] for description in cursor.description]
                    user_data = dict(zip(columns, user_row))
                    
                    # 获取最近的推文
                    cursor.execute('''
                        SELECT * FROM tweets 
                        WHERE username = ? 
                        ORDER BY collected_at DESC 
                        LIMIT 50
                    ''', (username,))
                    tweets_rows = cursor.fetchall()
                    tweets_data = []
                    
                    if tweets_rows:
                        columns = [description[0] for description in cursor.description]
                        for tweet_row in tweets_rows:
                            tweet_dict = dict(zip(columns, tweet_row))
                            # 解析JSON字段
                            if tweet_dict.get('hashtags'):
                                try:
                                    tweet_dict['hashtags'] = json.loads(tweet_dict['hashtags'])
                                except:
                                    tweet_dict['hashtags'] = []
                            if tweet_dict.get('mentions'):
                                try:
                                    tweet_dict['mentions'] = json.loads(tweet_dict['mentions'])
                                except:
                                    tweet_dict['mentions'] = []
                            tweets_data.append(tweet_dict)
                    
                    conn.close()
                    
                    return {
                        'success': True,
                        'status': 'completed',
                        'user_data': user_data,
                        'tweets_data': tweets_data,
                        'task_status': task_status
                    }
            
            conn.close()
        
        return {
            'success': task_status['status'] != 'failed',
            'status': task_status['status'],
            'task_status': task_status
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取分析结果失败: {str(e)}")

@app.get("/api/user/{username}")
async def get_user_data(username: str):
    """获取用户数据"""
    try:
        conn = sqlite3.connect('twitter_data.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM twitter_users WHERE username = ?', (username,))
        user_row = cursor.fetchone()
        
        if user_row:
            columns = [description[0] for description in cursor.description]
            user_data = dict(zip(columns, user_row))
            conn.close()
            return {'success': True, 'data': user_data}
        
        conn.close()
        return {'success': False, 'message': '用户数据不存在'}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取用户数据失败: {str(e)}")

@app.get("/api/tasks")
async def list_tasks():
    """列出所有任务"""
    try:
        conn = sqlite3.connect('twitter_data.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT task_id, username, status, created_at, completed_at, error_message
            FROM analysis_tasks 
            ORDER BY created_at DESC 
            LIMIT 100
        ''')
        
        tasks = []
        columns = [description[0] for description in cursor.description]
        
        for row in cursor.fetchall():
            task_dict = dict(zip(columns, row))
            tasks.append(task_dict)
        
        conn.close()
        return {'success': True, 'tasks': tasks}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取任务列表失败: {str(e)}")

if __name__ == "__main__":
    # 初始化数据库
    init_database()
    
    # 启动服务
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")