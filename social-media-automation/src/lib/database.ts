import { GrowthTarget, SocialAccount, AutoOrder, CommentTemplate, User, Wallet } from '@/types';

// 共享的内存数据库
class MemoryDatabase {
  private growthTargets: GrowthTarget[] = [];
  private socialAccounts: { [userId: string]: SocialAccount[] } = {};
  private autoOrders: AutoOrder[] = [];
  private commentTemplates: CommentTemplate[] = [];
  private users: User[] = [];
  private wallets: Wallet[] = [];

  // Growth Targets
  getGrowthTargets(): GrowthTarget[] {
    return this.growthTargets;
  }

  addGrowthTarget(target: GrowthTarget): void {
    this.growthTargets.push(target);
  }

  updateGrowthTarget(id: string, updates: Partial<GrowthTarget>): boolean {
    const index = this.growthTargets.findIndex(t => t.id === id);
    if (index !== -1) {
      this.growthTargets[index] = { ...this.growthTargets[index], ...updates };
      return true;
    }
    return false;
  }

  deleteGrowthTarget(id: string): boolean {
    const index = this.growthTargets.findIndex(t => t.id === id);
    if (index !== -1) {
      this.growthTargets.splice(index, 1);
      return true;
    }
    return false;
  }

  // Social Accounts
  getSocialAccounts(userId?: string): SocialAccount[] {
    if (userId) {
      return this.socialAccounts[userId] || [];
    }
    return Object.values(this.socialAccounts).flat();
  }

  addSocialAccount(userId: string, account: SocialAccount): void {
    if (!this.socialAccounts[userId]) {
      this.socialAccounts[userId] = [];
    }
    this.socialAccounts[userId].push(account);
  }

  updateSocialAccount(userId: string, accountId: string, updates: Partial<SocialAccount>): boolean {
    const accounts = this.socialAccounts[userId];
    if (!accounts) return false;
    
    const index = accounts.findIndex(a => a.id === accountId);
    if (index !== -1) {
      accounts[index] = { ...accounts[index], ...updates };
      return true;
    }
    return false;
  }

  deleteSocialAccount(userId: string, accountId: string): boolean {
    const accounts = this.socialAccounts[userId];
    if (!accounts) return false;
    
    const index = accounts.findIndex(a => a.id === accountId);
    if (index !== -1) {
      accounts.splice(index, 1);
      return true;
    }
    return false;
  }

  // Auto Orders
  getAutoOrders(): AutoOrder[] {
    return this.autoOrders;
  }

  addAutoOrder(order: AutoOrder): void {
    this.autoOrders.push(order);
  }

  updateAutoOrder(id: string, updates: Partial<AutoOrder>): boolean {
    const index = this.autoOrders.findIndex(o => o.id === id);
    if (index !== -1) {
      this.autoOrders[index] = { ...this.autoOrders[index], ...updates };
      return true;
    }
    return false;
  }

  deleteAutoOrder(id: string): boolean {
    const index = this.autoOrders.findIndex(o => o.id === id);
    if (index !== -1) {
      this.autoOrders.splice(index, 1);
      return true;
    }
    return false;
  }

  // Comment Templates
  getCommentTemplates(userId?: string): CommentTemplate[] {
    if (userId) {
      return this.commentTemplates.filter(t => t.userId === userId);
    }
    return this.commentTemplates;
  }

  addCommentTemplate(template: CommentTemplate): void {
    this.commentTemplates.push(template);
  }

  updateCommentTemplate(id: string, updates: Partial<CommentTemplate>): boolean {
    const index = this.commentTemplates.findIndex(t => t.id === id);
    if (index !== -1) {
      this.commentTemplates[index] = { ...this.commentTemplates[index], ...updates };
      return true;
    }
    return false;
  }

  deleteCommentTemplate(id: string): boolean {
    const index = this.commentTemplates.findIndex(t => t.id === id);
    if (index !== -1) {
      this.commentTemplates.splice(index, 1);
      return true;
    }
    return false;
  }

  // Users
  getUsers(): User[] {
    return this.users;
  }

  addUser(user: User): void {
    this.users.push(user);
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find(u => u.email === email);
  }

  getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  updateUser(id: string, updates: Partial<User>): boolean {
    const index = this.users.findIndex(u => u.id === id);
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...updates };
      return true;
    }
    return false;
  }

  // Wallets
  getWallets(): Wallet[] {
    return this.wallets;
  }

  getWalletByUserId(userId: string): Wallet | undefined {
    return this.wallets.find(w => w.userId === userId);
  }

  addWallet(wallet: Wallet): void {
    this.wallets.push(wallet);
  }

  updateWallet(userId: string, updates: Partial<Wallet>): boolean {
    const index = this.wallets.findIndex(w => w.userId === userId);
    if (index !== -1) {
      this.wallets[index] = { ...this.wallets[index], ...updates };
      return true;
    }
    return false;
  }
}

// 创建单例实例并导出
const db = new MemoryDatabase();

// 为了向后兼容，导出users和wallets访问器
export const users = {
  find: (predicate: (user: User) => boolean) => db.getUsers().find(predicate),
  findIndex: (predicate: (user: User) => boolean) => db.getUsers().findIndex(predicate),
  filter: (predicate: (user: User) => boolean) => db.getUsers().filter(predicate),
  push: (user: User) => db.addUser(user),
  splice: (index: number, deleteCount: number, ...items: User[]) => {
    const users = db.getUsers();
    users.splice(index, deleteCount, ...items);
  },
  get: (index: number) => db.getUsers()[index]
};

export const wallets = {
  find: (predicate: (wallet: Wallet) => boolean) => db.getWallets().find(predicate),
  findIndex: (predicate: (wallet: Wallet) => boolean) => db.getWallets().findIndex(predicate),
  filter: (predicate: (wallet: Wallet) => boolean) => db.getWallets().filter(predicate),
  push: (wallet: Wallet) => db.addWallet(wallet),
  splice: (index: number, deleteCount: number, ...items: Wallet[]) => {
    const wallets = db.getWallets();
    wallets.splice(index, deleteCount, ...items);
  },
  get: (index: number) => db.getWallets()[index]
};

export default db;