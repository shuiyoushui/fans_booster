// OAuth状态数据库操作
import Database from 'better-sqlite3';
import { join } from 'path';
import { XOAuthState } from './x-oauth-flow';

const dbPath = join(process.cwd(), 'data', 'oauth_states.db');
const db = new Database(dbPath);

// 初始化OAuth状态表
function initOAuthStatesTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      code_verifier TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      user_id TEXT,
      timestamp INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_oauth_states_timestamp ON oauth_states(timestamp);
  `);
}

// 初始化
initOAuthStatesTable();

/**
 * 保存OAuth状态
 */
export function saveOAuthState(stateData: XOAuthState): void {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO oauth_states 
      (state, code_verifier, code_challenge, user_id, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      stateData.state,
      stateData.codeVerifier,
      stateData.codeChallenge,
      stateData.userId || null,
      stateData.timestamp
    );
    
    console.log('OAuth state saved successfully:', {
      state: stateData.state.substring(0, 8) + '...',
      userId: stateData.userId,
      timestamp: stateData.timestamp,
      changes: result.changes
    });
  } catch (error) {
    console.error('Failed to save OAuth state:', error);
    throw new Error(`Failed to save OAuth state: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 获取OAuth状态
 */
export function getOAuthState(state: string): XOAuthState | null {
  try {
    const stmt = db.prepare(`
      SELECT * FROM oauth_states WHERE state = ?
    `);
    
    const row = stmt.get(state) as any;
    if (!row) {
      console.log('OAuth state not found:', state.substring(0, 8) + '...');
      return null;
    }
    
    const stateData = {
      state: row.state,
      codeVerifier: row.code_verifier,
      codeChallenge: row.code_challenge,
      userId: row.user_id,
      timestamp: row.timestamp
    };
    
    console.log('OAuth state retrieved successfully:', {
      state: stateData.state.substring(0, 8) + '...',
      userId: stateData.userId,
      age: Math.round((Date.now() - stateData.timestamp) / 1000) + 's'
    });
    
    return stateData;
  } catch (error) {
    console.error('Failed to get OAuth state:', error);
    return null;
  }
}

/**
 * 删除OAuth状态
 */
export function deleteOAuthState(state: string): void {
  try {
    const stmt = db.prepare(`DELETE FROM oauth_states WHERE state = ?`);
    const result = stmt.run(state);
    console.log('OAuth state deleted:', state.substring(0, 8) + '...', 'affected rows:', result.changes);
  } catch (error) {
    console.error('Failed to delete OAuth state:', error);
  }
}

/**
 * 清理过期的OAuth状态
 */
export function cleanupExpiredStates(): void {
  try {
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    const cutoffTime = now - fifteenMinutes;
    
    const stmt = db.prepare(`
      DELETE FROM oauth_states WHERE timestamp < ?
    `);
    
    const result = stmt.run(cutoffTime);
    if (result.changes > 0) {
      console.log('Cleaned up expired OAuth states:', result.changes, 'rows deleted');
    }
  } catch (error) {
    console.error('Failed to cleanup expired OAuth states:', error);
  }
}

/**
 * 获取当前存储的OAuth状态数量
 */
export function getOAuthStateCount(): number {
  try {
    const stmt = db.prepare(`SELECT COUNT(*) as count FROM oauth_states`);
    const result = stmt.get() as any;
    return result.count;
  } catch (error) {
    console.error('Failed to get OAuth state count:', error);
    return 0;
  }
}

/**
 * 获取所有当前存储的OAuth状态（用于调试）
 */
export function getAllOAuthStates(): Array<{ state: string; user_id: string; timestamp: number; age: number }> {
  try {
    const stmt = db.prepare(`
      SELECT state, user_id, timestamp FROM oauth_states ORDER BY timestamp DESC
    `);
    const rows = stmt.all() as any[];
    const now = Date.now();
    
    return rows.map(row => ({
      state: row.state,
      user_id: row.user_id,
      timestamp: row.timestamp,
      age: Math.round((now - row.timestamp) / 1000) // age in seconds
    }));
  } catch (error) {
    console.error('Failed to get all OAuth states:', error);
    return [];
  }
}

/**
 * 检查特定状态是否存在
 */
export function checkOAuthStateExists(state: string): boolean {
  try {
    const stmt = db.prepare(`SELECT 1 FROM oauth_states WHERE state = ?`);
    const result = stmt.get(state);
    return !!result;
  } catch (error) {
    console.error('Failed to check OAuth state existence:', error);
    return false;
  }
}

// 定期清理过期状态
setInterval(cleanupExpiredStates, 5 * 60 * 1000); // 每5分钟清理一次

export default db;