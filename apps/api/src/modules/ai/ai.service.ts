import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import {
  aiConfigs, aiConversations, friends, messages, stepScenarios, stepMessages,
  aiKnowledge, coupons, segments, richMenus, tags, forms,
} from '@line-saas/db';
import { SEED_KNOWLEDGE } from './seed-knowledge';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService,
  ) {
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
    }
  }

  private getModel() {
    if (!this.genAI) throw new Error('AI is not configured. Set GEMINI_API_KEY.');
    return this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  private async generate(systemPrompt: string, userMessage: string): Promise<string> {
    const model = this.getModel();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
    });
    return result.response.text();
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
    if (!config?.autoReplyEnabled || !this.genAI) return null;

    const handoffKeywords = (config.handoffKeywords as string[]) || [];
    if (handoffKeywords.some((kw) => userMessage.includes(kw))) {
      this.logger.log(`Handoff triggered for friend ${friendId}: keyword match`);
      return null;
    }

    const [conversation] = await this.db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.tenantId, tenantId), eq(aiConversations.friendId, friendId)))
      .limit(1);

    const history = (conversation?.messages as any[]) || [];
    const recentHistory = history.slice(-20);

    const knowledgeBase = (config.knowledgeBase as any[]) || [];
    const knowledgeText = knowledgeBase
      .map((item: any) => `【${item.title || 'info'}】\n${item.content}`)
      .join('\n\n');

    const systemPrompt = [
      config.systemPrompt || 'あなたは親切なカスタマーサポートアシスタントです。',
      knowledgeText ? `\n\n以下はビジネスに関する情報です:\n${knowledgeText}` : '',
      '\n\n回答は簡潔に、日本語で回答してください。LINEメッセージなので長すぎないようにしてください。',
    ].join('');

    const historyText = recentHistory
      .map((m: any) => `${m.role === 'user' ? '顧客' : 'アシスタント'}: ${m.content}`)
      .join('\n');

    try {
      const reply = await this.generate(
        systemPrompt,
        `${historyText ? `会話履歴:\n${historyText}\n\n` : ''}顧客: ${userMessage}`,
      );

      const updatedHistory = [
        ...recentHistory,
        { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
        { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
      ];

      if (conversation) {
        await this.db
          .update(aiConversations)
          .set({ messages: updatedHistory, updatedAt: new Date() })
          .where(eq(aiConversations.id, conversation.id));
      } else {
        await this.db.insert(aiConversations).values({
          tenantId,
          friendId,
          messages: updatedHistory,
          totalTokensUsed: 0,
        });
      }

      return { reply, tokensUsed: 0 };
    } catch (error) {
      this.logger.error(`AI reply failed: ${error}`);
      return null;
    }
  }

  async generateMessage(
    tenantId: string,
    prompt: { purpose: string; tone: string; target?: string; context?: string },
  ): Promise<{ suggestions: string[] }> {
    const text = await this.generate(
      'あなたはLINE公式アカウントのマーケティングメッセージを作成するプロです。日本語で、LINEメッセージに最適な長さ(200文字以内)で3パターン提案してください。JSON配列で返してください。',
      `目的: ${prompt.purpose}\nトーン: ${prompt.tone}${prompt.target ? `\nターゲット: ${prompt.target}` : ''}${prompt.context ? `\n補足: ${prompt.context}` : ''}\n\n3パターンのメッセージを提案してください。JSON配列["メッセージ1","メッセージ2","メッセージ3"]で返してください。`,
    );

    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      return { suggestions: jsonMatch ? JSON.parse(jsonMatch[0]) : [text] };
    } catch {
      return { suggestions: [text] };
    }
  }

  async analyzeFriend(tenantId: string, friendId: string) {
    const [conversation] = await this.db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.tenantId, tenantId), eq(aiConversations.friendId, friendId)))
      .limit(1);

    const conversationText = (conversation?.messages as any[] || [])
      .map((m: any) => `${m.role === 'user' ? '顧客' : 'AI'}: ${m.content}`)
      .join('\n');

    if (!conversationText) {
      return { analysis: '会話履歴がないため、分析できません。', tags: [], score: 0 };
    }

    const text = await this.generate(
      'あなたは顧客分析の専門家です。会話履歴から顧客の興味・ニーズ・温度感を分析してください。JSON形式で返してください: {"analysis":"分析テキスト","tags":["タグ1","タグ2"],"score":0-100,"nextAction":"推奨アクション"}',
      `以下の会話履歴を分析してください:\n\n${conversationText}`,
    );

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { analysis: text, tags: [], score: 0 };
    } catch {
      return { analysis: text, tags: [], score: 0 };
    }
  }

  async suggestScenario(tenantId: string, businessInfo: { industry: string; goal: string; target?: string }) {
    const systemPrompt = `あなたはLINEステップ配信の構築を専門とするマーケティングコンサルタントです。
累計200件以上のLINE公式アカウント構築実績があり、業種別の成功パターンを熟知しています。

## あなたの役割
クライアントの業種・目的・ターゲットに基づいて、成約率を最大化するステップ配信シナリオを設計してください。

## 設計原則
1. **初日（Day 0）**: 友だち追加直後。自己紹介＋価値提供＋次のアクションへの誘導
2. **Day 1-3**: 信頼構築フェーズ。役立つ情報、実績紹介、お客様の声
3. **Day 4-6**: 教育フェーズ。問題提起→解決策の提示。なぜ今行動すべきかの理由付け
4. **Day 7-10**: セールスフェーズ。限定オファー、予約/申込の促進、緊急性の演出

## メッセージ作成ルール
- 各メッセージは150〜300文字（LINEで読みやすい長さ）
- 絵文字を適度に使用（🎉✨💡🔥など）
- パーソナルな語りかけ（「あなた」「○○さん」）
- 各メッセージに明確なCTA（行動喚起）を含める
- 配信間隔は読者の離脱を防ぐため1日〜2日おき

## 業種別テクニック
- 美容サロン: ビフォーアフター訴求、初回限定クーポン、メンテナンス周期の教育
- 飲食店: 季節メニュー、リピート特典、予約枠の希少性
- 整体/治療院: 症状別アプローチ、施術実績、健康コラム
- 不動産: 物件情報の段階開示、内見予約、ローン相談誘導
- EC/通販: 商品ストーリー、使い方提案、レビュー紹介、限定セール
- コンサル/講座: 成功事例、無料コンテンツ→有料への導線、期間限定募集
- スクール: 体験レッスン誘導、生徒の声、カリキュラム紹介

## 出力形式（厳密に従うこと）
JSON形式で出力してください。JSON以外のテキストは含めないでください。
{
  "name": "シナリオ名（業種+目的を含む簡潔な名前）",
  "description": "シナリオの概要説明（1〜2文）",
  "triggerType": "follow",
  "steps": [
    {
      "day": 0,
      "delayMinutes": 0,
      "title": "ステップのタイトル",
      "message": "LINEメッセージ本文（150〜300文字、絵文字含む）"
    }
  ]
}`;

    const userPrompt = `以下のビジネス情報に基づいて、最適なステップ配信シナリオを設計してください。

業種: ${businessInfo.industry}
目的: ${businessInfo.goal}
${businessInfo.target ? `ターゲット: ${businessInfo.target}` : ''}

7〜10ステップのシナリオを作成してください。各ステップは適切な配信間隔（delayMinutes）を設定してください。
- Day 0: delayMinutes = 0（即時）
- Day 1: delayMinutes = 1440（1日後）
- Day 2: delayMinutes = 2880（2日後）
- 以降同様に1440分 = 1日として計算

JSON形式のみで出力してください。`;

    const text = await this.generate(systemPrompt, userPrompt);

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { name: 'エラー', steps: [] };
    } catch {
      return { name: 'エラー', description: text, steps: [] };
    }
  }

  async contextAssistant(
    tenantId: string,
    input: { message: string; page: string; pageData?: any; history?: { role: string; content: string }[] },
  ): Promise<{ reply: string; action?: { type: string; data: any } }> {
    const pageContextMap: Record<string, string> = {
      '/overview': 'ダッシュボード概要ページ。KPI確認、全体状況の把握。actionは不要。',
      '/messages': 'メッセージページ。個別チャット、一斉配信の作成・送信。→ action type: generate_message',
      '/steps': 'ステップ配信ページ。自動配信シナリオの作成・管理。→ action type: create_scenario',
      '/segments': 'セグメント配信ページ。属性・行動ベースでターゲットを絞った配信。→ action type: create_segment',
      '/templates': 'テンプレートページ。メッセージテンプレート管理。→ action type: generate_message',
      '/friends': '友だち一覧ページ。友だちの検索・詳細確認・タグ付け。→ action type: create_tags',
      '/tags': 'タグ管理ページ。→ action type: create_tags',
      '/rich-menus': 'リッチメニューページ。LINEトーク下部のメニュー作成。→ action type: create_rich_menu',
      '/forms': 'フォームページ。アンケート・予約・申込フォームの作成。→ action type: create_form',
      '/coupons': 'クーポンページ。クーポンの作成・配布・管理。→ action type: create_coupon',
      '/ai': 'AI設定ページ。自動応答設定・ナレッジベース管理。→ action type: update_ai_config',
      '/auto-reply': '自動応答ルールページ。→ action type: update_ai_config',
      '/reservations': '予約管理ページ。予約枠の作成・管理。→ action type: create_reservation_slot',
      '/analytics': '分析ページ。KPIダッシュボード。actionは不要。',
      '/referral': '紹介プログラムページ。actionは不要。',
      '/tutorial': 'チュートリアルページ。初期設定ウィザード。actionは不要。',
      '/settings': '設定ページ。LINE接続・プラン管理。actionは不要。',
    };

    const pageContext = pageContextMap[input.page] || 'ダッシュボード';
    const pageDataStr = input.pageData ? `\n現在のページデータ: ${JSON.stringify(input.pageData)}` : '';

    // Build conversation history for context
    const historyText = (input.history || [])
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
      .join('\n');

    // Search knowledge base for relevant context
    const knowledgeContext = await this.searchKnowledge(input.message);
    const knowledgeSection = knowledgeContext
      ? `\n\n## 参考ナレッジ（参照用。そのまま返すのではなく、考えの材料として活用）\n${knowledgeContext}`
      : '';

    const text = await this.generate(
      `あなたはLinQ（LINE公式アカウント運用SaaS）のAIアシスタントであり、LINEマーケティングのプロフェッショナルです。
DRM（ダイレクトレスポンスマーケティング）、顧客心理、業種別の成功パターンに精通しています。
ユーザーは現在「${pageContext}」を見ています。${pageDataStr}${knowledgeSection}

## LinQの主な機能
- ステップ配信: 友だち追加をトリガーに自動メッセージを配信。日数指定でスケジュール化。
- メッセージ: 個別チャット、一斉配信。テキスト・画像・リッチメッセージ対応。
- フォーム: アンケート・予約・申込フォームを作成。回答は自動で友だち情報に紐付け。
- リッチメニュー: LINEのトーク下部に表示するメニュー。ボタンにURL・テキスト・クーポン等を設定。
- AI自動応答: 顧客からのメッセージにAIが自動返信。ナレッジベースで学習。
- 友だち管理: タグ・スコアリングでセグメント分け。顧客属性の管理。
- 分析: KPIダッシュボード。友だち数推移・メッセージ開封率・AI利用状況。

## 会話の進め方（最重要）
1. ユーザーの指示が曖昧な場合（「挨拶作って」「セールのテンプレ作って」など）：
   不足情報を**1回のメッセージで全てまとめて**選択肢として提示する。
   以下のフォーマットで、カテゴリ見出し（**太字**）の下に選択肢を並べること：

   **トーン**
   ① 親しみやすい（カジュアル・絵文字あり）
   ② 丁寧・真面目（標準的なビジネス）
   ③ フォーマル（かしこまった表現）

   **業種**
   ① 飲食店・カフェ
   ② 美容室・エステ
   ③ アパレル・ファッション
   ④ その他（具体的に教えてください）

   各カテゴリから1つずつ選んでください。

   ※ 質問は必ず1回で済ませること。2回以上に分けて聞くのは絶対にNG。

2. ユーザーの指示が具体的な場合（「飲食店向けの夏セール告知を親しみやすいトーンで」など）：
   質問せずにすぐメッセージを生成する。ステップ1をスキップ。

3. 内容を生成したら、全文をreplyに含め、最後に「この内容でフォームに入力しますか？」と確認する（まだactionは返さない）。

4. ユーザーが「はい」「OK」「それでいい」「お願い」など明確に承認したら、初めてactionを返す。

5. 一般的な質問（使い方、機能説明など）にはactionなしで回答する。

actionは「ユーザーが内容を確認し、フォーム入力を明確に承認した場合のみ」返してください。
選択肢は①②③の番号付きで提示してください。

## 回答フォーマット（JSON）
{
  "reply": "ユーザーへの回答テキスト",
  "action": null または {
    "type": "アクションタイプ",
    "data": { アクション固有のデータ }
  }
}

## 利用可能なアクションタイプとデータ形式
1. create_scenario: ステップ配信シナリオ作成
   { "name": "シナリオ名", "description": "説明", "triggerType": "follow", "steps": [{ "delay": 0, "unit": "day", "message": "メッセージ内容" }] }

2. generate_message: 配信メッセージ下書き（テンプレート作成含む）
   { "name": "テンプレート名（例: 初回あいさつ、セール告知など）", "category": "あいさつ|販促|フォローアップ|お知らせ", "text": "メッセージ本文" }
   ※ name: メッセージの内容に合った簡潔なテンプレート名を必ず生成すること
   ※ category: 内容に最も合うカテゴリを選択すること

3. create_form: フォーム作成
   { "name": "フォーム名", "description": "説明", "fields": [{ "label": "項目名", "type": "text|select|radio|textarea", "options": ["選択肢1"] }], "thankYouMessage": "送信ありがとうございます" }

4. create_tags: タグ一括作成
   { "tags": [{ "name": "タグ名", "color": "#3B82F6" }] }

5. create_coupon: クーポン作成
   { "name": "クーポン名", "code": "COUPON2024", "discountType": "percent|fixed", "discountValue": 10, "description": "説明", "maxUses": 100 }

6. create_segment: セグメント作成
   { "name": "セグメント名", "description": "説明", "tagNames": ["対象タグ名1", "対象タグ名2"] }

7. update_ai_config: AI自動応答の設定更新
   { "systemPrompt": "プロンプト", "welcomeMessage": "あいさつ", "autoReplyEnabled": true, "knowledgeBase": [{"title":"カテゴリ","content":"内容"}], "handoffKeywords": ["クレーム"], "keywordRules": [{"keyword":"営業時間","response":"10時〜20時です","matchType":"contains"}] }

8. create_rich_menu: リッチメニュー作成（エリア設計のみ、画像は別途アップロード）
   { "name": "メニュー名", "chatBarText": "メニュー", "size": "full|half", "areas": [{ "label": "ボタン名", "actionType": "message|uri", "text": "送信テキスト", "uri": "https://..." }] }

9. create_reservation_slot: 予約枠の作成
   { "name": "メニュー名", "duration": 60, "description": "説明文" }`,
      historyText
        ? `会話履歴:\n${historyText}\n\nユーザー: ${input.message}`
        : input.message,
    );

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { reply: parsed.reply || text, action: parsed.action || null };
      }
      return { reply: text };
    } catch {
      return { reply: text };
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
    const text = await this.generate(
      'あなたはLINE公式アカウントのセットアップ専門家です。ビジネス情報に基づいて、最適な初期設定を一括で提案してください。全て日本語で。',
      `以下のビジネスに最適なLINE公式アカウントの初期設定を提案してください。

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
    );

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      return { error: 'Failed to parse AI response', raw: text };
    }
  }

  // Search knowledge base for relevant entries
  async searchKnowledge(query: string, industry?: string): Promise<string> {
    // Extract keywords from query
    const keywords = query.split(/[\s、。？！]+/).filter(w => w.length >= 2);
    if (keywords.length === 0) return '';

    // Build search conditions: match title, content, or tags
    const conditions = keywords.map(kw =>
      or(
        ilike(aiKnowledge.title, `%${kw}%`),
        ilike(aiKnowledge.content, `%${kw}%`),
        sql`${aiKnowledge.tags}::text ILIKE ${'%' + kw + '%'}`,
      ),
    );

    const results = await this.db
      .select({ title: aiKnowledge.title, content: aiKnowledge.content, category: aiKnowledge.category })
      .from(aiKnowledge)
      .where(and(eq(aiKnowledge.isActive, true), or(...conditions)))
      .limit(5);

    if (results.length === 0) return '';

    // Increment use count
    // (fire-and-forget, don't block)
    this.db.execute(sql`UPDATE ai_knowledge SET use_count = use_count + 1 WHERE title IN (${sql.join(results.map(r => sql`${r.title}`), sql`, `)})`).catch(() => {});

    return results
      .map(r => `【${r.category}/${r.title}】\n${r.content}`)
      .join('\n\n---\n\n');
  }

  // Seed knowledge base with initial marketing data
  async seedKnowledge(): Promise<{ inserted: number }> {
    // Check if already seeded
    const existing = await this.db.select({ id: aiKnowledge.id }).from(aiKnowledge).limit(1);
    if (existing.length > 0) {
      return { inserted: 0 };
    }

    for (const item of SEED_KNOWLEDGE) {
      await this.db.insert(aiKnowledge).values({
        category: item.category,
        subcategory: item.subcategory,
        title: item.title,
        content: item.content,
        tags: item.tags,
        industries: item.industries,
      });
    }
    return { inserted: SEED_KNOWLEDGE.length };
  }

  // Execute AI-proposed action: actually create resources in DB
  async executeAction(tenantId: string, type: string, data: any): Promise<{ success: boolean; type: string; id: string; details?: any }> {
    switch (type) {
      case 'create_scenario': {
        // Create scenario
        const [scenario] = await this.db
          .insert(stepScenarios)
          .values({
            tenantId,
            name: `🤖 ${data.name || 'AI作成シナリオ'}`,
            description: data.description || '',
            triggerType: data.triggerType || 'friend_added',
          })
          .returning();

        // Create step messages - handle various AI output formats
        const steps = data.steps || [];
        const createdSteps = [];
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          // Calculate delayMinutes from various AI formats
          let delayMinutes = 0;
          if (step.delayMinutes != null) {
            delayMinutes = step.delayMinutes;
          } else if (step.delay != null && step.unit) {
            const multipliers: Record<string, number> = { minute: 1, hour: 60, day: 1440, week: 10080 };
            delayMinutes = step.delay * (multipliers[step.unit] || 1440);
          } else if (step.day != null) {
            delayMinutes = step.day * 1440;
          }
          // Get message text from various AI formats
          const text = step.message || step.text || step.content || '';
          const [created] = await this.db
            .insert(stepMessages)
            .values({
              scenarioId: scenario.id,
              delayMinutes,
              messageContent: { text },
              sortOrder: i,
            })
            .returning();
          createdSteps.push(created);
        }

        return {
          success: true,
          type: 'scenario',
          id: scenario.id,
          details: { scenario, steps: createdSteps },
        };
      }

      case 'generate_message': {
        return {
          success: true,
          type: 'message',
          id: 'draft',
          details: { text: data.text || data.message || '' },
        };
      }

      case 'create_form': {
        const formFields = (data.fields || []).map((f: any) => ({
          label: f.label || '',
          type: f.type || 'text',
          required: f.required ?? true,
          options: f.options || [],
        }));

        const [form] = await this.db
          .insert(forms)
          .values({
            tenantId,
            name: `🤖 ${data.name || data.title || 'AI作成フォーム'}`,
            description: data.description || '',
            fields: formFields,
            thankYouMessage: data.thankYouMessage || '送信ありがとうございます！',
          })
          .returning();

        return {
          success: true,
          type: 'form',
          id: form.id,
          details: { form, fields: formFields },
        };
      }

      case 'create_tags':
      case 'suggest_tags': {
        const tagList = data.tags || [];
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
        const created = [];
        for (let i = 0; i < tagList.length; i++) {
          const tagData = typeof tagList[i] === 'string' ? { name: tagList[i] } : tagList[i];
          try {
            const [tag] = await this.db
              .insert(tags)
              .values({
                tenantId,
                name: tagData.name,
                color: tagData.color || colors[i % colors.length],
              })
              .returning();
            created.push(tag);
          } catch {
            // Duplicate tag name - skip
          }
        }
        return {
          success: true,
          type: 'tags',
          id: created.map((t) => t.id).join(','),
          details: { tags: created },
        };
      }

      case 'create_coupon': {
        const [coupon] = await this.db
          .insert(coupons)
          .values({
            tenantId,
            name: `🤖 ${data.name || 'AI作成クーポン'}`,
            code: data.code || `AI${Date.now().toString(36).toUpperCase()}`,
            discountType: data.discountType || 'percent',
            discountValue: data.discountValue || 10,
            description: data.description || '',
            maxUses: data.maxUses || null,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          })
          .returning();

        return {
          success: true,
          type: 'coupon',
          id: coupon.id,
          details: { coupon },
        };
      }

      case 'create_segment': {
        // Resolve tag names to IDs
        const tagNames: string[] = data.tagNames || [];
        let tagIds: string[] = data.tagIds || [];

        if (tagNames.length > 0 && tagIds.length === 0) {
          const allTags = await this.db
            .select()
            .from(tags)
            .where(eq(tags.tenantId, tenantId));
          tagIds = allTags
            .filter((t) => tagNames.some((name) => t.name.includes(name) || name.includes(t.name)))
            .map((t) => t.id);
        }

        const [segment] = await this.db
          .insert(segments)
          .values({
            tenantId,
            name: `🤖 ${data.name || 'AI作成セグメント'}`,
            description: data.description || '',
            tagIds,
          })
          .returning();

        return {
          success: true,
          type: 'segment',
          id: segment.id,
          details: { segment, tagIds },
        };
      }

      case 'update_ai_config': {
        const configData: any = {};
        if (data.systemPrompt !== undefined) configData.systemPrompt = data.systemPrompt;
        if (data.welcomeMessage !== undefined) configData.welcomeMessage = data.welcomeMessage;
        if (data.autoReplyEnabled !== undefined) configData.autoReplyEnabled = data.autoReplyEnabled;
        if (data.knowledgeBase !== undefined) configData.knowledgeBase = data.knowledgeBase;
        if (data.handoffKeywords !== undefined) configData.handoffKeywords = data.handoffKeywords;
        if (data.keywordRules !== undefined) configData.keywordRules = data.keywordRules;

        const updated = await this.upsertConfig(tenantId, configData);
        return {
          success: true,
          type: 'ai_config',
          id: (updated as any).id || 'config',
          details: { config: updated, updatedFields: Object.keys(configData) },
        };
      }

      case 'create_rich_menu': {
        const menuSize = data.size === 'half'
          ? { width: 2500, height: 843 }
          : { width: 2500, height: 1686 };

        const areaConfigs = data.areas || [];
        const cols = Math.min(areaConfigs.length, 3);
        const rows = Math.ceil(areaConfigs.length / cols);

        const mappedAreas = areaConfigs.map((a: any, i: number) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const areaWidth = Math.round(menuSize.width / cols);
          const areaHeight = Math.round(menuSize.height / rows);

          return {
            bounds: {
              x: col * areaWidth,
              y: row * areaHeight,
              width: areaWidth,
              height: areaHeight,
            },
            action: a.actionType === 'uri'
              ? { type: 'uri' as const, uri: a.uri || 'https://example.com', label: a.label || a.text || '' }
              : { type: 'message' as const, text: a.text || a.label || `メニュー${i + 1}` },
          };
        });

        // Save to DB only (no LINE API call without account context)
        const [menu] = await this.db
          .insert(richMenus)
          .values({
            tenantId,
            lineAccountId: data.lineAccountId || '00000000-0000-0000-0000-000000000000',
            name: `🤖 ${data.name || 'AI作成メニュー'}`,
            chatBarText: data.chatBarText || 'メニュー',
            size: menuSize,
            areas: mappedAreas,
            isActive: false,
          })
          .returning();

        return {
          success: true,
          type: 'rich_menu',
          id: menu.id,
          details: {
            menu,
            areas: areaConfigs.map((a: any) => ({ label: a.label, actionType: a.actionType || 'message' })),
            note: 'LINE公式アカウントと同期するにはリッチメニューページから画像をアップロードしてください',
          },
        };
      }

      default:
        return { success: false, type, id: '', details: { error: 'Unknown action type' } };
    }
  }

  // Rollback: delete AI-created resource
  async rollbackAction(tenantId: string, type: string, id: string): Promise<{ success: boolean }> {
    switch (type) {
      case 'scenario': {
        await this.db.delete(stepMessages).where(eq(stepMessages.scenarioId, id));
        await this.db.delete(stepScenarios).where(
          and(eq(stepScenarios.id, id), eq(stepScenarios.tenantId, tenantId)),
        );
        return { success: true };
      }

      case 'form': {
        await this.db.delete(forms).where(
          and(eq(forms.id, id), eq(forms.tenantId, tenantId)),
        );
        return { success: true };
      }

      case 'tags': {
        const tagIds = id.split(',').filter(Boolean);
        for (const tagId of tagIds) {
          await this.db.delete(tags).where(
            and(eq(tags.id, tagId), eq(tags.tenantId, tenantId)),
          );
        }
        return { success: true };
      }

      case 'coupon': {
        await this.db.delete(coupons).where(
          and(eq(coupons.id, id), eq(coupons.tenantId, tenantId)),
        );
        return { success: true };
      }

      case 'segment': {
        await this.db.delete(segments).where(
          and(eq(segments.id, id), eq(segments.tenantId, tenantId)),
        );
        return { success: true };
      }

      case 'rich_menu': {
        await this.db.delete(richMenus).where(
          and(eq(richMenus.id, id), eq(richMenus.tenantId, tenantId)),
        );
        return { success: true };
      }

      case 'ai_config': {
        // AI config rollback is complex - just return success
        // User can manually revert settings
        return { success: true };
      }

      default:
        return { success: true };
    }
  }
}
