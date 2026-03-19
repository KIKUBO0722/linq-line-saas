import Link from 'next/link';
import { Bot, Users, MessageSquare, BarChart3, Zap, Shield, ArrowRight, Check } from 'lucide-react';

const features = [
  { icon: Bot, title: 'AI自動応答', description: '24時間AIが顧客対応。ナレッジベースを学習し、的確に回答。スタッフの負担を大幅削減。' },
  { icon: MessageSquare, title: 'ステップ配信', description: '友だち追加から自動でシナリオ配信。条件分岐で一人ひとりに最適なメッセージを。' },
  { icon: Users, title: '顧客管理', description: 'タグ・スコアリングで顧客を可視化。AIが会話から興味・ニーズを自動分析。' },
  { icon: BarChart3, title: '分析ダッシュボード', description: '配信実績、友だち推移、流入経路をリアルタイムで把握。AIが最適化を提案。' },
  { icon: Zap, title: 'AIオンボーディング', description: 'ビジネス情報を入力するだけ。AIがリッチメニュー、挨拶、シナリオを5分で自動構築。' },
  { icon: Shield, title: 'お友だち紹介', description: '友だちが友だちを紹介する仕組みを簡単に構築。バイラル成長を実現。' },
];

const plans = [
  { name: 'Free', price: '¥0', period: '', features: ['友だち100人', '1,000通/月', 'AI応答50回/月', 'ステップ配信1個', 'リッチメニュー1個'], cta: '無料で始める', highlight: false },
  { name: 'Start', price: '¥5,000', period: '/月', features: ['友だち500人', '5,000通/月', 'AI応答500回/月', 'ステップ配信5個', 'LINEコスト可視化', 'チーム3人'], cta: '14日間無料トライアル', highlight: false },
  { name: 'Standard', price: '¥15,000', period: '/月', features: ['友だち5,000人', '30,000通/月', 'AI応答5,000回/月', 'ステップ配信無制限', 'AI顧客分析', '外部Webhook連携', 'チーム10人'], cta: '14日間無料トライアル', highlight: true },
  { name: 'Pro', price: '¥30,000', period: '/月', features: ['友だち50,000人', '100,000通/月', 'AI応答無制限', 'AIオンボーディング', 'AI配信最適化', '全機能無制限'], cta: '14日間無料トライアル', highlight: false },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">LINE SaaS</h1>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">ログイン</Link>
            <Link href="/signup" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">無料で始める</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl font-bold text-gray-900 leading-tight">
          LINE公式アカウントを<br />
          <span className="text-blue-600">AIが自動で運用</span>します
        </h2>
        <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
          構築も運用もAIにおまかせ。従来の外注費・コンサル費・人件費を大幅に削減しながら、エルメ・エルステップ以上の機能を実現。
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/signup" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-lg transition-colors flex items-center gap-2">
            無料で始める <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="#pricing" className="px-8 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg text-lg hover:bg-gray-50 transition-colors">
            料金を見る
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-400">クレジットカード不要 / 14日間無料トライアル</p>
      </section>

      {/* Cost comparison */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold text-gray-900">総コストを大幅に削減</h3>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-8 border border-red-200">
              <p className="text-sm font-medium text-red-600 mb-2">従来型の運用</p>
              <p className="text-4xl font-bold text-gray-900">月25〜55万円</p>
              <p className="text-sm text-gray-500 mt-2">ツール代 + LINE課金 + 構築外注 + コンサル + 運用スタッフ</p>
            </div>
            <div className="bg-white rounded-xl p-8 border border-green-200">
              <p className="text-sm font-medium text-green-600 mb-2">LINE SaaS (Proプラン)</p>
              <p className="text-4xl font-bold text-gray-900">月5〜8万円</p>
              <p className="text-sm text-gray-500 mt-2">ツール代 + LINE課金のみ。AIが構築・運用・最適化を担当</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h3 className="text-3xl font-bold text-gray-900 text-center">AI時代のLINEマーケティング</h3>
        <p className="text-gray-600 text-center mt-3 max-w-xl mx-auto">エルメの手軽さ + エルステップの高機能 + AIによる自動化</p>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <f.icon className="h-10 w-10 text-blue-600 mb-4" />
              <h4 className="text-lg font-semibold text-gray-900">{f.title}</h4>
              <p className="text-gray-600 text-sm mt-2">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-3xl font-bold text-gray-900 text-center">料金プラン</h3>
          <p className="text-gray-600 text-center mt-3">プランが上がるほどAI活用度UP、人件費DOWN</p>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div key={plan.name} className={`bg-white rounded-xl p-6 ${plan.highlight ? 'border-2 border-blue-600 shadow-lg relative' : 'border border-gray-200'}`}>
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">人気</span>
                )}
                <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-6 block text-center py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    plan.highlight
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h3 className="text-3xl font-bold text-gray-900">今すぐ始めましょう</h3>
        <p className="text-gray-600 mt-3">5分でセットアップ完了。AIがあなたのLINE運用を変えます。</p>
        <Link href="/signup" className="inline-flex items-center gap-2 mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-lg transition-colors">
          無料で始める <ArrowRight className="h-5 w-5" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-400">
          LINE SaaS - AI-Powered LINE Marketing Platform
        </div>
      </footer>
    </div>
  );
}
