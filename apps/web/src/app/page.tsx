'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import './landing.css';

const features = [
  { icon: '🤖', title: 'AI自動応答', desc: '24時間AIが顧客対応。ナレッジベースを学習し、的確に回答。Reply API利用で応答コスト¥0。' },
  { icon: '📨', title: 'ステップ配信', desc: '友だち追加から自動でシナリオ配信。条件分岐で一人ひとりに最適なタイミングでメッセージを届けます。' },
  { icon: '👥', title: '顧客管理', desc: 'タグ・スコアリングで顧客を可視化。AIが会話履歴から興味・ニーズ・温度感を自動分析。' },
  { icon: '📊', title: '分析ダッシュボード', desc: '配信実績、友だち推移、流入経路をリアルタイムで把握。AIが次のアクションを提案します。' },
  { icon: '⚡', title: 'AIオンボーディング', desc: 'ビジネス情報を入力するだけ。AIがリッチメニュー、挨拶、シナリオを5分で自動構築。' },
  { icon: '🔗', title: 'お友だち紹介', desc: '友だちが友だちを紹介する仕組みを簡単構築。紹介者・被紹介者の両方にメリットを。' },
];

const plans = [
  { name: 'Free', price: '¥0', period: '', features: ['友だち100人', '1,000通/月', 'AI応答50回/月', 'ステップ配信1個'], cta: '無料で始める', popular: false },
  { name: 'Start', price: '¥5,000', period: '/月', features: ['友だち500人', '5,000通/月', 'AI応答500回/月', 'ステップ配信5個', 'LINEコスト可視化'], cta: '14日間無料トライアル', popular: false },
  { name: 'Standard', price: '¥15,000', period: '/月', features: ['友だち5,000人', '30,000通/月', 'AI応答5,000回/月', '無制限ステップ配信', 'AI顧客分析', '外部Webhook'], cta: '14日間無料トライアル', popular: true },
  { name: 'Pro', price: '¥30,000', period: '/月', features: ['友だち50,000人', '100,000通/月', 'AI応答無制限', 'AIオンボーディング', 'AI配信最適化', '全機能無制限'], cta: '14日間無料トライアル', popular: false },
];

const steps = [
  { num: '1', title: 'アカウント作成', desc: 'メールアドレスで簡単登録' },
  { num: '2', title: 'LINE接続', desc: 'チャネル情報を入力するだけ' },
  { num: '3', title: 'AIが自動構築', desc: '業種に合わせて全て自動設定' },
  { num: '4', title: '運用開始', desc: 'すぐにLINEマーケティング開始' },
];

const faqs = [
  { q: 'LINE公式アカウントの費用は別途かかりますか？', a: 'はい、LINE公式アカウント自体の費用（メッセージ通数に応じた料金）は別途LINEにお支払いいただく必要があります。ただし、AI自動応答はReply APIを使用するためLINEのメッセージ課金対象外です。AIを活用することで、Push配信の無駄を削減しLINE側のコストも最適化できます。' },
  { q: 'エルメやエルステップから乗り換えできますか？', a: '友だちデータはCSVインポートに対応予定です。LINE公式アカウント自体はそのまま使えるため、Webhook URLを切り替えるだけで移行が可能です。既存の友だちとの会話履歴もLINE側に残ります。' },
  { q: 'AIの精度はどの程度ですか？', a: 'Anthropic社のClaude AIを搭載しており、日本語の理解力・応答品質は非常に高いです。さらに、テナントごとにナレッジベース（FAQ、メニュー、営業時間など）を登録できるため、ビジネスに特化した正確な回答が可能です。対応できない質問はスタッフに自動引き継ぎします。' },
  { q: '無料プランでも十分使えますか？', a: 'はい。Freeプランでは友だち100人まで、月1,000通の配信、AI応答50回/月が含まれます。小規模な運用やテスト利用には十分な内容です。全ての基本機能を試してから有料プランにアップグレードできます。' },
];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`lp-faq-item ${open ? 'open' : ''}`}>
      <button className="lp-faq-question" onClick={() => setOpen(!open)}>
        {q}
        <span className="lp-faq-icon">+</span>
      </button>
      <div className="lp-faq-answer">
        <p>{a}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const compRef = useReveal();
  const featRef = useReveal();
  const stepsRef = useReveal();
  const pricingRef = useReveal();
  const faqRef = useReveal();

  return (
    <div className="landing">
      {/* Header */}
      <header className="lp-header">
        <Link href="/" className="lp-header-logo">LINE SaaS</Link>
        <nav>
          <ul className="lp-header-nav">
            <li><a href="#features">機能</a></li>
            <li><a href="#pricing">料金</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
        </nav>
        <div className="lp-header-actions">
          <Link href="/login" className="btn-ghost">ログイン</Link>
          <Link href="/signup" className="btn-primary">無料で始める</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <div className="aurora-bg">
          <div className="aurora-blob green" />
          <div className="aurora-blob coral" />
          <div className="aurora-blob amber" />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="lp-hero-badge">AI-Powered LINE Marketing</div>
          <h1>
            LINE公式アカウントを<br />
            <span className="gradient-text">AIが自動で運用</span>します
          </h1>
          <p className="lp-hero-sub">
            構築も運用もAIにおまかせ。外注費・コンサル費・人件費を大幅カットしながら、エルメ・エルステップ以上の成果を。
          </p>
          <div className="lp-hero-actions">
            <Link href="/signup" className="btn-primary btn-large">
              無料で始める →
            </Link>
            <a href="#pricing" className="btn-secondary btn-large">料金を見る</a>
          </div>
          <p className="lp-hero-note">クレジットカード不要 / 14日間無料トライアル</p>
        </div>
        <div className="lp-hero-visual">
          <img
            src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=600&fit=crop&q=80"
            alt="Team working on marketing dashboard"
          />
        </div>
      </section>

      {/* Cost Comparison */}
      <section className="lp-comparison">
        <div className="lp-comparison-inner" ref={compRef}>
          <div className="reveal">
            <div className="accent-dots" style={{ justifyContent: 'center' }}>
              <span /><span /><span />
            </div>
            <h2>総コストを<span className="gradient-text">大幅に削減</span></h2>
          </div>
          <div className="lp-comparison-cards reveal" style={{ transitionDelay: '0.2s' }}>
            <div className="lp-comparison-card before">
              <div className="lp-comparison-label">従来型の運用</div>
              <div className="lp-comparison-price">月25〜55万円</div>
              <div className="lp-comparison-desc">
                ツール代 + LINE課金 + 構築外注<br />+ コンサル + 運用スタッフ
              </div>
            </div>
            <div className="lp-comparison-arrow">→</div>
            <div className="lp-comparison-card after">
              <div className="lp-comparison-label">LINE SaaS Pro</div>
              <div className="lp-comparison-price">月5〜8万円</div>
              <div className="lp-comparison-desc">
                ツール代 + LINE課金のみ<br />AIが構築・運用・最適化を担当
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="lp-features" id="features">
        <div className="lp-features-inner" ref={featRef}>
          <div className="reveal">
            <span className="section-label">Features</span>
            <h2 className="section-title"><span className="gradient-text">AI時代</span>のLINEマーケティング</h2>
            <p className="section-sub">エルメの手軽さ + エルステップの高機能 + AIによる革新</p>
          </div>
          <div className="lp-features-grid stagger-children" ref={useReveal()}>
            {features.map((f) => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="lp-steps">
        <div className="lp-steps-inner" ref={stepsRef}>
          <div className="reveal">
            <span className="section-label">How it Works</span>
            <h2 className="section-title">5分で始められる</h2>
            <p className="section-sub">メルカリアプリで完結するように、全てブラウザで完結</p>
          </div>
          <div className="lp-steps-flow stagger-children" ref={useReveal()}>
            {steps.map((s) => (
              <div key={s.num} className="lp-step-item">
                <div className="lp-step-number">{s.num}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="lp-pricing" id="pricing">
        <div className="lp-pricing-inner" ref={pricingRef}>
          <div className="reveal">
            <span className="section-label">Pricing</span>
            <h2 className="section-title">プランが上がるほど、<span className="gradient-text">人件費が下がる</span></h2>
            <p className="section-sub">AI活用度に応じた4つのプラン</p>
          </div>
          <div className="lp-pricing-grid stagger-children" ref={useReveal()}>
            {plans.map((plan) => (
              <div key={plan.name} className={`lp-plan-card ${plan.popular ? 'popular' : ''}`}>
                {plan.popular && <div className="lp-plan-badge">人気No.1</div>}
                <div className="lp-plan-name">{plan.name}</div>
                <div className="lp-plan-price">{plan.price}</div>
                <div className="lp-plan-period">{plan.period || '永久無料'}</div>
                <ul className="lp-plan-features">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link href="/signup" className="lp-plan-cta">{plan.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-faq" id="faq">
        <div className="lp-faq-inner" ref={faqRef}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span className="section-label">FAQ</span>
            <h2 className="section-title">よくある質問</h2>
          </div>
          <div className="reveal" style={{ transitionDelay: '0.2s' }}>
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta">
        <div className="reveal" ref={useReveal()}>
          <h2>今すぐ始めましょう</h2>
          <p>5分でセットアップ完了。AIがあなたのLINE運用を変えます。</p>
          <Link href="/signup" className="btn-white">無料で始める →</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        © 2026 LINE SaaS — AI-Powered LINE Marketing Platform
      </footer>
    </div>
  );
}
