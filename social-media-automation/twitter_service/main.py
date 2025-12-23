#!/usr/bin/env python3
"""
Twitter数据采集服务
使用Twint进行无API数据采集
"""
import asyncio
import json
import sqlite3
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import twint
import nest_asyncio

# 应用nest_asyncio解决事件循环问题
nest_asyncio.apply()

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

# Twint配置
async def configure_twint(username: str, limit: int = 100) -> twint.Config:
    """配置Twint参数"""
    c = twint.Config()
    c.Username = username
    c.Limit = limit
    c.Store_object = True
    c.Store_object_tweets_list = []
    c.Hide_output = True
    c.Pandas = True
    c.Pandas_clean = True
    
    return c

# 获取用户信息
async def get_user_info(username: str) -> Dict[str, Any]:
    """获取用户基本信息"""
    try:
        c = await configure_twint(username, 1)
        c.User_full = True
        
        # 使用run方法避免同步问题
        twint.run.Lookup(c)
        
        # 获取用户信息
        if hasattr(twint, 'run') and hasattr(twint.run, 'pandas'):
            user_df = twint.run.pandas.User_df
            if not user_df.empty:
                user_data = user_df.iloc[0].to_dict()
                return {
                    'success': True,
                    'data': user_data
                }
        
        return {'success': False, 'message': '无法获取用户信息'}
        
    except Exception as e:
        return {'success': False, 'message': f'获取用户信息失败: {str(e)}'}

# 获取推文数据
async def get_tweets(username: str, limit: int = 100) -> List[Dict[str, Any]]:
    """获取用户推文数据"""
    try:
        c = await configure_twint(username, limit)
        
        # 运行Twint
        twint.run.Search(c)
        
        # 获取推文数据
        if hasattr(twint, 'run') and hasattr(twint.run, 'pandas'):
            tweets_df = twint.run.pandas.Tweets_df
            if not tweets_df.empty:
                return tweets_df.to_dict('records')
        
        return []
        
    except Exception as e:
        print(f"获取推文失败: {str(e)}")
        return []

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
            user_data.get('id'),
            user_data.get('name'),
            user_data.get('bio'),
            user_data.get('followers', 0),
            user_data.get('following', 0),
            user_data.get('tweets', 0),
            user_data.get('likes', 0),
            user_data.get('profile_image_url'),
            user_data.get('verified', False),
            user_data.get('created_at'),
            user_data.get('location'),
            user_data.get('url')
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
        # 更新任务状态为进行中
        update_task_status(task_id, 'running')
        
        result = {
            'success': False,
            'message': '',
            'user_data': None,
            'tweets_data': [],
            'analysis_id': task_id
        }
        
        # 获取用户信息
        user_info = await get_user_info(request.username)
        if user_info['success']:
            user_data = user_info['data']
            save_user_data(user_data)
            
            # 转换为前端期望的格式
            result['user_data'] = TwitterUser(
                username=user_data.get('username', ''),
                user_id=user_data.get('id'),
                name=user_data.get('name'),
                bio=user_data.get('bio'),
                followers_count=user_data.get('followers', 0),
                following_count=user_data.get('following', 0),
                tweets_count=user_data.get('tweets', 0),
                likes_count=user_data.get('likes', 0),
                profile_image_url=user_data.get('profile_image_url'),
                verified=user_data.get('verified', False),
                created_at=user_data.get('created_at'),
                location=user_data.get('location'),
                website=user_data.get('url')
            )
        
        # 获取推文数据（如果需要）
        if request.include_tweets:
            tweets = await get_tweets(request.username, request.tweets_limit)
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
    import uuid
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