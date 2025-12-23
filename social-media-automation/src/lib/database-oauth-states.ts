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
    
    stmt.run(
      stateData.state,
      stateData.codeVerifier,
      stateData.codeChallenge,
      stateData.userId || null,
      stateData.timestamp
    );
    
    console.log('OAuth state saved:', stateData.state);
  } catch (error) {
    console.error('Failed to save OAuth state:', error);
    throw error;
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
      return null;
    }
    
    return {
      state: row.state,
      codeVerifier: row.code_verifier,
      codeChallenge: row.code_challenge,
      userId: row.user_id,
      timestamp: row.timestamp
    };
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
    console.log('OAuth state deleted:', state, 'affected rows:', result.changes);
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
    console.log('Cleaned up expired OAuth states:', result.changes, 'rows deleted');
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

// 定期清理过期状态
setInterval(cleanupExpiredStates, 5 * 60 * 1000); // 每5分钟清理一次

export default db;