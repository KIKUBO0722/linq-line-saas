export interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: Array<{ name: string; color: string }>;
  greetings: {
    newFollow: string;
    reFollow: string;
  };
  stepScenario: {
    name: string;
    description: string;
    messages: Array<{ delayMinutes: number; text: string }>;
  };
  aiPrompt: string;
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'restaurant',
    name: '飲食店',
    description: 'レストラン・カフェ・居酒屋向け',
    icon: '🍽️',
    tags: [
      { name: '新規来店', color: '#06C755' },
      { name: 'リピーター', color: '#3B82F6' },
      { name: 'テイクアウト', color: '#F59E0B' },
      { name: 'ランチ利用', color: '#EF4444' },
      { name: 'ディナー利用', color: '#8B5CF6' },
      { name: '記念日', color: '#EC4899' },
    ],
    greetings: {
      newFollow: 'ご登録ありがとうございます！🎉\n\n当店の最新メニューやお得なクーポン情報をお届けします。\n\nまずは初回限定クーポンをプレゼント🎁',
      reFollow: 'おかえりなさい！😊\n\n再度のご登録ありがとうございます。\n最新のおすすめメニューをチェックしてみてください！',
    },
    stepScenario: {
      name: '新規来店フォロー',
      description: '初回来店後のフォローアップ配信',
      messages: [
        { delayMinutes: 60, text: 'ご来店ありがとうございました！\n本日のお食事はいかがでしたか？\n\nまたのご来店をお待ちしております😊' },
        { delayMinutes: 4320, text: '先日はありがとうございました！\n\n今週のおすすめメニューをご紹介します。\nぜひまたお立ち寄りください🍽️' },
        { delayMinutes: 10080, text: 'ご来店から1週間が経ちました。\n\nリピーター様限定の特別クーポンをお送りします🎁\n有効期限は2週間です。' },
      ],
    },
    aiPrompt: 'あなたは飲食店のLINE公式アカウント担当AIです。お客様からの予約・メニュー・営業時間に関する問い合わせに丁寧に対応してください。親しみやすい口調で、絵文字も適度に使いましょう。アレルギーに関する質問には「スタッフに確認しますので少々お待ちください」と回答してください。',
  },
  {
    id: 'beauty',
    name: '美容院・サロン',
    description: 'ヘアサロン・ネイル・エステ向け',
    icon: '💇',
    tags: [
      { name: '新規', color: '#06C755' },
      { name: 'リピーター', color: '#3B82F6' },
      { name: 'VIP', color: '#F59E0B' },
      { name: 'カット', color: '#EF4444' },
      { name: 'カラー', color: '#8B5CF6' },
      { name: 'パーマ', color: '#EC4899' },
      { name: 'トリートメント', color: '#14B8A6' },
    ],
    greetings: {
      newFollow: 'ご登録ありがとうございます！✨\n\nLINEからのご予約が一番スムーズです。\n\n🎁 初回限定20%OFFクーポンをプレゼント！\n次回のご予約時にお伝えください。',
      reFollow: 'おかえりなさい！💫\n\nまたお会いできて嬉しいです。\nご予約はこちらからどうぞ！',
    },
    stepScenario: {
      name: '施術後フォロー',
      description: '施術後のヘアケアアドバイスとリピート促進',
      messages: [
        { delayMinutes: 1440, text: '昨日はありがとうございました！✨\n\n新しいスタイルはいかがですか？\nお手入れ方法で分からないことがあればお気軽にどうぞ😊' },
        { delayMinutes: 20160, text: 'そろそろ次のメンテナンスの時期ですね💇\n\nLINEからの予約で次回10%OFF！\nご都合の良い日をお知らせください✨' },
      ],
    },
    aiPrompt: 'あなたは美容サロンのLINE公式アカウント担当AIです。予約受付・メニュー案内・ヘアケアのアドバイスを行います。お客様の髪の悩みに寄り添い、丁寧で親しみやすい対応を心がけてください。予約の空き状況を聞かれたら「確認しますので少々お待ちください」と回答してください。',
  },
  {
    id: 'realestate',
    name: '不動産',
    description: '不動産仲介・管理会社向け',
    icon: '🏠',
    tags: [
      { name: '物件問合せ', color: '#06C755' },
      { name: '内見済み', color: '#3B82F6' },
      { name: '契約済み', color: '#F59E0B' },
      { name: '賃貸', color: '#EF4444' },
      { name: '売買', color: '#8B5CF6' },
      { name: 'ファミリー', color: '#EC4899' },
    ],
    greetings: {
      newFollow: 'お友だち追加ありがとうございます！🏠\n\n物件のご相談・内見のご予約はLINEで簡単にできます。\n\nまずはご希望のエリアや条件をお聞かせください！',
      reFollow: 'おかえりなさい！\n\nお住まい探し、引き続きサポートいたします。\nお気軽にご相談ください🏡',
    },
    stepScenario: {
      name: '問合せ後フォロー',
      description: '物件問い合わせ後の自動フォロー',
      messages: [
        { delayMinutes: 120, text: 'お問い合わせありがとうございます！\n\nご希望に合う物件をお探ししています。\n内見のご希望日はございますか？📅' },
        { delayMinutes: 4320, text: 'その後、お住まい探しの進捗はいかがですか？\n\n新着物件のご案内もできますので、お気軽にメッセージください🏠' },
      ],
    },
    aiPrompt: 'あなたは不動産会社のLINE公式アカウント担当AIです。物件の問い合わせ対応、内見予約の調整、住まいに関する相談に対応します。専門知識を活かしつつ、分かりやすい説明を心がけてください。具体的な物件価格や契約条件を聞かれたら「担当者から詳しくご案内いたします」と回答してください。',
  },
  {
    id: 'ec',
    name: 'EC・通販',
    description: 'オンラインショップ・通販向け',
    icon: '🛒',
    tags: [
      { name: '初回購入', color: '#06C755' },
      { name: 'リピーター', color: '#3B82F6' },
      { name: 'カート放棄', color: '#EF4444' },
      { name: 'レビュー済み', color: '#F59E0B' },
      { name: '定期購入', color: '#8B5CF6' },
    ],
    greetings: {
      newFollow: 'お友だち追加ありがとうございます！🎉\n\n🎁 LINE限定クーポン 500円OFF\nクーポンコード: WELCOME500\n\n新商品やセール情報をいち早くお届けします！',
      reFollow: 'おかえりなさい！😊\n\nまたお会いできて嬉しいです。\n最新のおすすめ商品をチェックしてみてください！',
    },
    stepScenario: {
      name: '初回購入フォロー',
      description: '初回購入後のレビュー依頼とリピート促進',
      messages: [
        { delayMinutes: 4320, text: 'ご注文の商品は届きましたか？📦\n\n何かお困りのことがあればお気軽にメッセージください😊' },
        { delayMinutes: 10080, text: '商品はいかがでしたか？\n\nレビューを投稿いただけると嬉しいです⭐\n次回のお買い物で使える300円OFFクーポンをプレゼント！' },
      ],
    },
    aiPrompt: 'あなたはECショップのLINE公式アカウント担当AIです。商品の問い合わせ、注文状況の確認、返品・交換の案内を行います。迅速で丁寧な対応を心がけ、お客様の購買意欲を高めるような提案もしてください。',
  },
  {
    id: 'clinic',
    name: 'クリニック',
    description: '医院・歯科・整骨院向け',
    icon: '🏥',
    tags: [
      { name: '初診', color: '#06C755' },
      { name: '再診', color: '#3B82F6' },
      { name: '定期検診', color: '#F59E0B' },
      { name: '予約済み', color: '#8B5CF6' },
      { name: 'キャンセル待ち', color: '#EF4444' },
    ],
    greetings: {
      newFollow: 'ご登録ありがとうございます！\n\n当院ではLINEから簡単にご予約いただけます。\n\n📋 診療時間\n月〜金: 9:00-18:00\n土: 9:00-13:00\n\nご予約はメッセージでどうぞ！',
      reFollow: 'おかえりなさい！\n\nまたお会いできて嬉しいです。\nご予約やお問い合わせはこちらからどうぞ。',
    },
    stepScenario: {
      name: '初診後フォロー',
      description: '初診後の経過確認と次回予約促進',
      messages: [
        { delayMinutes: 1440, text: '昨日はご来院ありがとうございました。\n\nその後、体調はいかがですか？\n気になることがあればお気軽にご相談ください😊' },
        { delayMinutes: 20160, text: 'その後の経過はいかがでしょうか？\n\n次回のご予約がまだの場合は、LINEからお気軽にご連絡ください📅' },
      ],
    },
    aiPrompt: 'あなたはクリニックのLINE公式アカウント担当AIです。予約受付・診療時間の案内・一般的な健康相談に対応します。医療的な判断が必要な質問には「医師に確認いたしますので、ご来院時にご相談ください」と回答してください。患者様に安心感を与える丁寧な対応を心がけてください。',
  },
  {
    id: 'school',
    name: 'スクール・教室',
    description: '学習塾・習い事・オンラインスクール向け',
    icon: '📚',
    tags: [
      { name: '体験申込', color: '#06C755' },
      { name: '入会済み', color: '#3B82F6' },
      { name: '休会中', color: '#F59E0B' },
      { name: '保護者', color: '#8B5CF6' },
      { name: '紹介', color: '#EC4899' },
    ],
    greetings: {
      newFollow: 'お友だち追加ありがとうございます！📚\n\n体験レッスンのご予約を受付中です！\n\n🎁 今なら体験レッスン無料！\nお気軽にメッセージください。',
      reFollow: 'おかえりなさい！\n\nまたお会いできて嬉しいです。\n最新のレッスン情報をお届けします！',
    },
    stepScenario: {
      name: '体験後フォロー',
      description: '体験レッスン後の入会促進',
      messages: [
        { delayMinutes: 60, text: '体験レッスンにご参加いただきありがとうございました！📚\n\nいかがでしたか？\nご質問やご不明点がありましたらお気軽にどうぞ😊' },
        { delayMinutes: 4320, text: 'その後、入会についてご検討いただけましたでしょうか？\n\n🎁 今月中のご入会で入会金50%OFF！\nご不明点があればお気軽にメッセージください。' },
      ],
    },
    aiPrompt: 'あなたはスクール・教室のLINE公式アカウント担当AIです。体験レッスンの予約受付、コース案内、料金の説明を行います。保護者からの問い合わせにも丁寧に対応し、生徒の成長をサポートする姿勢を見せてください。',
  },
];
