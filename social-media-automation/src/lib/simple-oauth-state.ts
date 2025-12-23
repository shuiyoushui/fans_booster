// 简化的OAuth状态管理器
// 使用内存存储作为主要存储，确保状态一致性

import { XOAuthState } from './x-oauth-flow';

class SimpleOAuthStateManager {
  private states = new Map<string, XOAuthState>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 每5分钟清理一次过期状态
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredStates();
    }, 5 * 60 * 1000);

    console.log('SimpleOAuthStateManager initialized');
  }

  /**
   * 保存OAuth状态
   */
  saveState(stateData: XOAuthState): void {
    try {
      // 验证状态数据
      if (!stateData.state || !stateData.codeVerifier || !stateData.timestamp) {
        throw new Error('Invalid state data: missing required fields');
      }

      this.states.set(stateData.state, stateData);
      
      console.log('State saved successfully:', {
        state: stateData.state.substring(0, 8) + '...',
        userId: stateData.userId,
        timestamp: stateData.timestamp,
        totalStates: this.states.size,
        hasCodeChallenge: !!stateData.codeChallenge
      });
    } catch (error) {
      console.error('Failed to save OAuth state:', error);
      throw new Error(`Failed to save OAuth state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取OAuth状态
   */
  getState(state: string): XOAuthState | null {
    try {
      if (!state) {
        console.log('State parameter is empty or null');
        return null;
      }

      const stateData = this.states.get(state);
      if (!stateData) {
        console.log('State not found in memory:', state.substring(0, 8) + '...');
        console.log('Available states:', Array.from(this.states.keys()).map(k => k.substring(0, 8) + '...'));
        return null;
      }

      // 检查状态是否过期（15分钟）
      const age = Date.now() - stateData.timestamp;
      if (age > 15 * 60 * 1000) {
        console.log('State expired, removing:', {
          state: state.substring(0, 8) + '...',
          age: Math.round(age / 1000) + 's',
          userId: stateData.userId
        });
        this.states.delete(state);
        return null;
      }

      // 验证状态数据完整性
      if (!stateData.codeVerifier || !stateData.codeChallenge) {
        console.error('State data corrupted:', {
          state: state.substring(0, 8) + '...',
          hasCodeVerifier: !!stateData.codeVerifier,
          hasCodeChallenge: !!stateData.codeChallenge
        });
        this.states.delete(state);
        return null;
      }

      console.log('State retrieved successfully:', {
        state: state.substring(0, 8) + '...',
        age: Math.round(age / 1000) + 's',
        userId: stateData.userId,
        hasCodeVerifier: !!stateData.codeVerifier
      });

      return stateData;
    } catch (error) {
      console.error('Error retrieving OAuth state:', error);
      return null;
    }
  }

  /**
   * 删除OAuth状态
   */
  deleteState(state: string): void {
    try {
      if (!state) {
        console.log('Cannot delete empty state');
        return;
      }

      const deleted = this.states.delete(state);
      console.log('State deletion result:', {
        state: state.substring(0, 8) + '...',
        deleted,
        totalStates: this.states.size
      });
    } catch (error) {
      console.error('Failed to delete OAuth state:', error);
    }
  }

  /**
   * 清理过期状态
   */
  cleanupExpiredStates(): void {
    try {
      const now = Date.now();
      const fifteenMinutes = 15 * 60 * 1000;
      let deletedCount = 0;
      const statesToDelete: string[] = [];

      for (const [state, stateData] of this.states.entries()) {
        if (now - stateData.timestamp > fifteenMinutes || !stateData.codeVerifier) {
          statesToDelete.push(state);
        }
      }

      // 批量删除过期状态
      statesToDelete.forEach(state => {
        this.states.delete(state);
        deletedCount++;
      });

      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} expired/invalid states. Remaining: ${this.states.size}`);
      }
    } catch (error) {
      console.error('Failed to cleanup expired states:', error);
    }
  }

  /**
   * 获取当前状态统计信息
   */
  getStats(): { total: number; states: Array<{ state: string; userId?: string; age: number; valid: boolean }> } {
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    
    const states = Array.from(this.states.entries()).map(([state, data]) => {
      const age = Math.round((now - data.timestamp) / 1000);
      return {
        state: state.substring(0, 8) + '...',
        userId: data.userId,
        age,
        valid: age < 900 && !!data.codeVerifier && !!data.codeChallenge // 15 minutes
      };
    });

    return {
      total: this.states.size,
      states
    };
  }

  /**
   * 手动触发状态清理
   */
  forceCleanup(): void {
    this.cleanupExpiredStates();
  }

  /**
   * 获取状态详细信息（用于调试）
   */
  getDetailedStats(): any {
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    
    return {
      total: this.states.size,
      valid: Array.from(this.states.values()).filter(data => 
        now - data.timestamp < fifteenMinutes && 
        !!data.codeVerifier && 
        !!data.codeChallenge
      ).length,
      expired: Array.from(this.states.values()).filter(data => 
        now - data.timestamp >= fifteenMinutes
      ).length,
      corrupted: Array.from(this.states.values()).filter(data => 
        !data.codeVerifier || !data.codeChallenge
      ).length,
      details: Array.from(this.states.entries()).map(([state, data]) => ({
        state: state.substring(0, 8) + '...',
        userId: data.userId,
        age: Math.round((now - data.timestamp) / 1000),
        valid: now - data.timestamp < fifteenMinutes && !!data.codeVerifier && !!data.codeChallenge,
        hasCodeVerifier: !!data.codeVerifier,
        hasCodeChallenge: !!data.codeChallenge
      }))
    };
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.states.clear();
    console.log('SimpleOAuthStateManager destroyed');
  }
}

// 全局单例
let oauthStateManager: SimpleOAuthStateManager | null = null;

export function getOAuthStateManager(): SimpleOAuthStateManager {
  if (!oauthStateManager) {
    oauthStateManager = new SimpleOAuthStateManager();
  }
  return oauthStateManager;
}

// 导出便捷方法
export function saveOAuthState(stateData: XOAuthState): void {
  getOAuthStateManager().saveState(stateData);
}

export function getOAuthState(state: string): XOAuthState | null {
  return getOAuthStateManager().getState(state);
}

export function deleteOAuthState(state: string): void {
  getOAuthStateManager().deleteState(state);
}

export function getOAuthStateStats() {
  return getOAuthStateManager().getStats();
}

export function getDetailedOAuthStateStats() {
  return getOAuthStateManager().getDetailedStats();
}

export function forceCleanupOAuthStates(): void {
  getOAuthStateManager().forceCleanup();
}