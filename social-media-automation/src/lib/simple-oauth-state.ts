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
    this.states.set(stateData.state, stateData);
    console.log('State saved:', {
      state: stateData.state.substring(0, 8) + '...',
      userId: stateData.userId,
      totalStates: this.states.size
    });
  }

  /**
   * 获取OAuth状态
   */
  getState(state: string): XOAuthState | null {
    const stateData = this.states.get(state);
    if (!stateData) {
      console.log('State not found:', state.substring(0, 8) + '...');
      return null;
    }

    const age = Date.now() - stateData.timestamp;
    if (age > 15 * 60 * 1000) {
      console.log('State expired:', {
        state: state.substring(0, 8) + '...',
        age: Math.round(age / 1000) + 's'
      });
      this.states.delete(state);
      return null;
    }

    console.log('State found:', {
      state: state.substring(0, 8) + '...',
      age: Math.round(age / 1000) + 's',
      userId: stateData.userId
    });

    return stateData;
  }

  /**
   * 删除OAuth状态
   */
  deleteState(state: string): void {
    const deleted = this.states.delete(state);
    console.log('State deleted:', {
      state: state.substring(0, 8) + '...',
      deleted,
      totalStates: this.states.size
    });
  }

  /**
   * 清理过期状态
   */
  cleanupExpiredStates(): void {
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    let deletedCount = 0;

    for (const [state, stateData] of this.states.entries()) {
      if (now - stateData.timestamp > fifteenMinutes) {
        this.states.delete(state);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} expired states. Remaining: ${this.states.size}`);
    }
  }

  /**
   * 获取当前状态统计信息
   */
  getStats(): { total: number; states: Array<{ state: string; userId?: string; age: number }> } {
    const now = Date.now();
    const states = Array.from(this.states.entries()).map(([state, data]) => ({
      state: state.substring(0, 8) + '...',
      userId: data.userId,
      age: Math.round((now - data.timestamp) / 1000)
    }));

    return {
      total: this.states.size,
      states
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