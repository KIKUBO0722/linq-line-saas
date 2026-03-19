import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { aiConfigs, aiConversations, friends, messages } from '@line-saas/db';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private anthropic: Anthropic;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  async getConfig(tenantId: string) {
    const [config] = await this.db
      .select()
      .from(aiConfigs)
      .where(eq(aiConfigs.tenantId, tenantId))
      .limit(1);
    return config;
  }

  async upsertConfig(tenantId: string, data: Partial<typeof aiConfigs.$inferInsert>) {
    const existing = await this.getConfig(tenantId);
    if (existing) {
      await this.db
        .update(aiConfigs)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(aiConfigs.id, existing.id));
      return { ...existing, ...data };
    }
    const [created] = await this.db
      .insert(aiConfigs)
      .values({ tenantId, ...data })
      .returning();
    return created;
  }

  async generateAutoReply(
    tenantId: string,
    friendId: string,
    userMessage: string,
  ): Promise<{ reply: string; tokensUsed: number } | null> {
    const config = await this.getConfig(tenantId);
    if (!config?.autoReplyEnabled || !this.anthropic) return null;

    // Check handoff keywords
    const handoffKeywords = (config.handoffKeywords as string[]) || [];
    if (handoffKeywords.some((kw) => userMessage.includes(kw))) {
      this.logger.log(`Handoff triggered for friend ${friendId}: keyword match`);
      return null;
    }

    // Get conversation history
    const [conversation] = await this.db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.tenantId, tenantId), eq(aiConversations.friendId, friendId)))
      .limit(1);

    const history = (conversation?.messages as any[]) || [];
    const recentHistory = history.slice(-20); // Last 20 messages

    // Build knowledge base context
    const knowledgeBase = (config.knowledgeBase as any[]) || [];
    const knowledgeText = knowledgeBase
      .map((item: any) => `【${item.title || 'info'}】\n${item.content}`)
      .join('\n\n');

    const systemPrompt = [
      config.systemPrompt || 'あなたは親切なカスタマーサポートアシスタントです。',
      knowledgeText ? `\n\n以下はビジネスに関する情報です:\n${knowledgeText}` : '',
      '\n\n回答は簡潔に、日本語で回答してください。LINEメッセージなので長すぎないようにしてください。',
    ].join('');

    const anthropicMessages = [
      ...recentHistory.map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];

    try {
      const response = await this.anthropic.messages.create({
        model: config.model || 'claude-haiku-4-5-20251001',
        max_tokens: config.maxTokens || 1024,
        system: systemPrompt,
        messages: anthropicMessages,
      });

      const reply =
        response.content[0].type === 'text' ? response.content[0].text : '';
      const tokensUsed =
        (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

      // Save conversation history
      const updatedHistory = [
        ...recentHistory,
        { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
        { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
      ];

      if (conversation) {
        await this.db
          .update(aiConversations)
          .set({
            messages: updatedHistory,
            totalTokensUsed: (conversation.totalTokensUsed || 0) + tokensUsed,
            updatedAt: new Date(),
          })
          .where(eq(aiConversations.id, conversation.id));
      } else {
        await this.db.insert(aiConversations).values({
          tenantId,
          friendId,
          messages: updatedHistory,
          totalTokensUsed: tokensUsed,
        });
      }

      return { reply, tokensUsed };
    } catch (error) {
      this.logger.error(`AI reply failed: ${error}`);
      return null;
    }
  }

  async generateMessage(
    tenantId: string,
    prompt: { purpose: string; tone: string; target?: string; context?: string },
  ): Promise<{ suggestions: string[] }> {
    if (!this.anthropic) throw new Error('AI is not configured');

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system:
        'あなたはLINE公式アカウントのマーケティングメッセージを作成するプロです。日本語で、LINEメッセージに最適な長さ(200文字以内)で3パターン提案してください。JSON配列で返してください。',
      messages: [
        {
          role: 'user',
          content: `目的: ${prompt.purpose}\nトーン: ${prompt.tone}${prompt.target ? `\nターゲット: ${prompt.target}` : ''}${prompt.context ? `\n補足: ${prompt.context}` : ''}\n\n3パターンのメッセージを提案してください。JSON配列["メッセージ1","メッセージ2","メッセージ3"]で返してください。`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [text];
      return { suggestions };
    } catch {
      return { suggestions: [text] };
    }
  }

  async analyzeFriend(tenantId: string, friendId: string) {
    if (!this.anthropic) throw new Error('AI is not configured');

    // Get friend's conversation history
    const [conversation] = await this.db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.tenantId, tenantId), eq(aiConversations.friendId, friendId)))
      .limit(1);

    // Get recent messages
    const recentMessages = await this.db
      .select()
      .from(messages)
      .where(and(eq(messages.tenantId, tenantId), eq(messages.friendId, friendId)))
      .limit(50);

    const conversationText = [
      ...(conversation?.messages as any[] || []).map(
        (m: any) => `${m.role === 'user' ? '顧客' : 'AI'}: ${m.content}`,
      ),
    ].join('\n');

    if (!conversationText) {
      return { analysis: '会話履歴がないため、分析できません。', tags: [], score: 0 };
    }

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:
        'あなたは顧客分析の専門家です。会話履歴から顧客の興味・ニーズ・温度感を分析してください。JSON形式で返してください: {"analysis":"分析テキスト","tags":["タグ1","タグ2"],"score":0-100,"nextAction":"推奨アクション"}',
      messages: [
        { role: 'user', content: `以下の会話履歴を分析してください:\n\n${conversationText}` },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { analysis: text, tags: [], score: 0 };
    } catch {
      return { analysis: text, tags: [], score: 0 };
    }
  }

  async suggestScenario(tenantId: string, businessInfo: { industry: string; goal: string; target?: string }) {
    if (!this.anthropic) throw new Error('AI is not configured');

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system:
        'あなたはLINEマーケティングの専門家です。ビジネス情報に基づいて最適なステップ配信シナリオを提案してください。JSON形式で返してください。',
      messages: [
        {
          role: 'user',
          content: `業種: ${businessInfo.industry}\n目的: ${businessInfo.goal}${businessInfo.target ? `\nターゲット: ${businessInfo.target}` : ''}\n\n7日間のステップ配信シナリオを提案してください。\nJSON形式: {"name":"シナリオ名","description":"説明","steps":[{"day":0,"delayMinutes":0,"title":"ステップ名","message":"メッセージ内容"}]}`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { name: 'エラー', steps: [] };
    } catch {
      return { name: 'エラー', description: text, steps: [] };
    }
  }

  async onboardingSetup(tenantId: string, businessInfo: {
    industry: string;
    location?: string;
    target?: string;
    challenge?: string;
    hours?: string;
    menu?: string;
  }) {
    if (!this.anthropic) throw new Error('AI is not configured');

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system:
        'あなたはLINE公式アカウントのセットアップ専門家です。ビジネス情報に基づいて、最適な初期設定を一括で提案してください。全て日本語で。',
      messages: [
        {
          role: 'user',
          content: `以下のビジネスに最適なLINE公式アカウントの初期設定を提案してください。

業種: ${businessInfo.industry}
${businessInfo.location ? `所在地: ${businessInfo.location}` : ''}
${businessInfo.target ? `ターゲット: ${businessInfo.target}` : ''}
${businessInfo.challenge ? `課題: ${businessInfo.challenge}` : ''}
${businessInfo.hours ? `営業時間: ${businessInfo.hours}` : ''}
${businessInfo.menu ? `メニュー: ${businessInfo.menu}` : ''}

以下のJSON形式で返してください:
{
  "welcomeMessage": "友だち追加時の挨拶メッセージ",
  "richMenuItems": [{"label":"ボタン名","action":"アクション説明"}],
  "scenario": {"name":"シナリオ名","steps":[{"day":0,"message":"メッセージ"}]},
  "aiPrompt": "AI自動応答用のシステムプロンプト",
  "knowledgeBase": [{"title":"カテゴリ","content":"内容"}],
  "suggestedTags": ["タグ1","タグ2"]
}`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      return { error: 'Failed to parse AI response', raw: text };
    }
  }
}
