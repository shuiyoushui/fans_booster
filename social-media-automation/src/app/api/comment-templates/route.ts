import { NextRequest, NextResponse } from 'next/server';
import { CommentTemplate } from '@/types';

// 模拟数据库存储
let commentTemplates: CommentTemplate[] = [];

// 默认评论模板
const defaultTemplates: Omit<CommentTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: '通用评论',
    category: 'general',
    templates: [
      '很棒的内容！👍',
      '非常有用的信息',
      '感谢分享',
      '学到了很多',
      '期待更多内容'
    ],
    isActive: true
  },
  {
    name: '积极评论',
    category: 'positive',
    templates: [
      '太棒了！',
      '完美的内容',
      '这是我一直寻找的答案',
      '非常有见地',
      '改变了我对问题的看法'
    ],
    isActive: true
  },
  {
    name: '互动评论',
    category: 'engaging',
    templates: [
      '你怎么看这个问题？',
      '有其他人有类似经历吗？',
      '这个方法真的有效吗？',
      '能分享一下更多细节吗？',
      '我遇到了同样的情况'
    ],
    isActive: true
  }
];

// 初始化默认模板（仅在没有数据时）
function initializeDefaultTemplates(userId: string) {
  const existingUserTemplates = commentTemplates.filter(t => t.userId === userId);
  if (existingUserTemplates.length === 0) {
    defaultTemplates.forEach(template => {
      const newTemplate: CommentTemplate = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        userId,
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      commentTemplates.push(newTemplate);
    });
  }
}

// 获取用户的评论模板
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: '用户ID是必需的' },
        { status: 400 }
      );
    }

    // 初始化默认模板
    initializeDefaultTemplates(userId);

    const userTemplates = commentTemplates.filter(template => template.userId === userId);

    return NextResponse.json({ 
      templates: userTemplates.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    });

  } catch (error) {
    console.error('Get comment templates error:', error);
    return NextResponse.json(
      { error: '获取评论模板失败' },
      { status: 500 }
    );
  }
}

// 创建新的评论模板
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      name, 
      category = 'custom',
      templates, 
      isActive = true
    } = body;

    // 验证必填字段
    if (!userId || !name || !templates || !Array.isArray(templates)) {
      return NextResponse.json(
        { error: '用户ID、模板名称和模板内容都是必需的' },
        { status: 400 }
      );
    }

    // 验证模板内容
    if (templates.length === 0) {
      return NextResponse.json(
        { error: '至少需要提供一条评论模板' },
        { status: 400 }
      );
    }

    // 验证每条模板内容
    for (const template of templates) {
      if (!template || typeof template !== 'string' || template.trim().length === 0) {
        return NextResponse.json(
          { error: '评论模板内容不能为空' },
          { status: 400 }
        );
      }
    }

    // 检查同名模板
    const existingTemplate = commentTemplates.find(t => 
      t.userId === userId && t.name === name
    );
    if (existingTemplate) {
      return NextResponse.json(
        { error: '已存在同名模板' },
        { status: 409 }
      );
    }

    // 创建新的评论模板
    const newTemplate: CommentTemplate = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId,
      name,
      category,
      templates: templates.map(t => t.trim()),
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    commentTemplates.push(newTemplate);

    return NextResponse.json({ 
      template: newTemplate,
      message: '评论模板创建成功'
    }, { status: 201 });

  } catch (error) {
    console.error('Create comment template error:', error);
    return NextResponse.json(
      { error: '创建评论模板失败' },
      { status: 500 }
    );
  }
}

// 更新评论模板
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, userId, ...updates } = body;

    if (!id || !userId) {
      return NextResponse.json(
        { error: '模板ID和用户ID都是必需的' },
        { status: 400 }
      );
    }

    const templateIndex = commentTemplates.findIndex(t => t.id === id);
    if (templateIndex === -1) {
      return NextResponse.json(
        { error: '未找到评论模板' },
        { status: 404 }
      );
    }

    // 验证权限
    if (commentTemplates[templateIndex].userId !== userId) {
      return NextResponse.json(
        { error: '没有权限修改此模板' },
        { status: 403 }
      );
    }

    // 验证模板内容（如果提供）
    if (updates.templates) {
      if (!Array.isArray(updates.templates) || updates.templates.length === 0) {
        return NextResponse.json(
          { error: '至少需要提供一条评论模板' },
          { status: 400 }
        );
      }

      for (const template of updates.templates) {
        if (!template || typeof template !== 'string' || template.trim().length === 0) {
          return NextResponse.json(
            { error: '评论模板内容不能为空' },
            { status: 400 }
          );
        }
      }

      updates.templates = updates.templates.map((t: string) => t.trim());
    }

    // 更新模板
    commentTemplates[templateIndex] = {
      ...commentTemplates[templateIndex],
      ...updates,
      updatedAt: new Date(),
    };

    return NextResponse.json({ 
      template: commentTemplates[templateIndex],
      message: '评论模板更新成功'
    });

  } catch (error) {
    console.error('Update comment template error:', error);
    return NextResponse.json(
      { error: '更新评论模板失败' },
      { status: 500 }
    );
  }
}

// 删除评论模板
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json(
        { error: '模板ID和用户ID都是必需的' },
        { status: 400 }
      );
    }

    const templateIndex = commentTemplates.findIndex(t => t.id === id && t.userId === userId);
    if (templateIndex === -1) {
      return NextResponse.json(
        { error: '未找到评论模板或没有权限删除' },
        { status: 404 }
      );
    }

    // 防止删除默认模板
    const template = commentTemplates[templateIndex];
    if (template.category !== 'custom') {
      return NextResponse.json(
        { error: '不能删除默认模板' },
        { status: 403 }
      );
    }

    // 删除模板
    commentTemplates.splice(templateIndex, 1);

    return NextResponse.json({ 
      message: '评论模板删除成功'
    });

  } catch (error) {
    console.error('Delete comment template error:', error);
    return NextResponse.json(
      { error: '删除评论模板失败' },
      { status: 500 }
    );
  }
}