'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import './landing.css';

/* ── Image mapping ──
  1.png  = ユミ: 美容院入口で腕組み (ヒーロー)
  2.png  = ユミ: レセプションでリラックス (コスト比較)
  3.png  = ユミ: サムズアップ (CTA)
  4.png  = ユミ: 施術中 (導入事例)
  5.png  = マイ: カフェでスマホ (紹介)
  6.png  = マイ: コワーキングでPC (ステップ配信)
  7.png  = マイ: 自宅ソファでスマホ (ステップ1)
  8.png  = チーム: モニター前 (顧客管理)
  9.png  = チーム: スマホを一緒に見る (オンボーディング)
  10.png = タクヤ: カフェ店員スマホ (AI自動応答)
*/

const plans = [
  { name: 'Free', price: '¥0', period: '', features: ['友だち100人', '1,000通/月', 'AI応答50回/月', 'ステップ配信1個'], cta: '無料で始める', popular: false, saving: '' },
  { name: 'Start', price: '¥5,000', period: '/月', features: ['友だち500人', '5,000通/月', 'AI応答500回/月', 'ステップ配信5個', 'LINEコスト可視化'], cta: '14日間無料トライアル', popular: false, saving: 'スタッフ月10〜20h節約' },
  { name: 'Standard', price: '¥15,000', period: '/月', features: ['友だち5,000人', '30,000通/月', 'AI応答5,000回/月', '無制限ステップ配信', 'AI顧客分析', '外部Webhook'], cta: '14日間無料トライアル', popular: true, saving: 'コンサル代 月5〜20万円削減' },
  { name: 'Pro', price: '¥30,000', period: '/月', features: ['友だち50,000人', '100,000通/月', 'AI応答無制限', 'AIオンボーディング', 'AI配信最適化', '全機能無制限'], cta: '14日間無料トライアル', popular: false, saving: '外注+運用 月25〜55万円削減' },
];

const faqs = [
  { q: 'LINE公式アカウントの費用は別途かかりますか？', a: 'はい、LINE公式アカウント自体の費用は別途必要です。ただし、AI自動応答はReply APIを使用するためLINEのメッセージ課金対象外です。AIを活用することでPush配信の無駄を削減し、LINE側のコストも最適化できます。' },
  { q: 'エルメやエルステップから乗り換えできますか？', a: '友だちデータはCSVインポートに対応予定です。LINE公式アカウント自体はそのまま使えるため、Webhook URLを切り替えるだけで移行が可能です。' },
  { q: 'AIの精度はどの程度ですか？', a: 'Anthropic社のClaude AIを搭載しており、日本語の理解力・応答品質は非常に高いです。テナントごとにナレッジベースを登録できるため、ビジネスに特化した正確な回答が可能です。' },
  { q: '無料プランでも十分使えますか？', a: 'はい。Freeプランでは友だち100人まで、月1,000通の配信、AI応答50回/月が含まれます。全ての基本機能を試してから有料プランにアップグレードできます。' },
];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('visible'); },
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
      <div className="lp-faq-answer"><p>{a}</p></div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="landing">
      {/* ════════ Header ════════ */}
      <header className="lp-header">
        <Link href="/" className="lp-header-logo">
          <span className="logo-lin">Lin</span><span className="logo-q">Q</span>
        </Link>
        <nav>
          <ul className="lp-header-nav">
            <li><a href="#pricing">料金</a></li>
            <li><a href="#features">機能</a></li>
            <li><a href="#use-cases">導入事例</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
        </nav>
        <div className="lp-header-actions">
          <Link href="/login" className="btn-ghost">ログイン</Link>
          <Link href="/signup" className="btn-primary">無料で始める</Link>
        </div>
      </header>

      {/* ════════ Hero ════════ */}
      <section className="lp-hero">
        <div className="aurora-bg">
          <div className="aurora-blob green" />
          <div className="aurora-blob coral" />
          <div className="aurora-blob amber" />
        </div>
        <div className="lp-hero-split">
          <div className="lp-hero-text">
            <div className="lp-hero-badge">AI-Powered LINE Marketing</div>
            <h1>
              LINE運用を、もっと<span className="gradient-text">速く</span>、<br />
              もっと<span className="gradient-text">簡単に</span>。
            </h1>
            <p className="lp-hero-sub">
              構築も運用もAIにおまかせ。<br />
              外注費・コンサル費・人件費を大幅カット。
            </p>
            <div className="lp-hero-actions">
              <Link href="/signup" className="btn-primary btn-large">無料で始める →</Link>
              <a href="#pricing" className="btn-secondary btn-large">料金を見る</a>
            </div>
            <p className="lp-hero-note">クレジットカード不要 / 14日間無料トライアル</p>
          </div>
          <div className="lp-hero-image">
            <img src="/images/lp/1.png" alt="美容院オーナーが自信を持って立っている" />
          </div>
        </div>
      </section>

      {/* ════════ Trial Banner (メルカリ式キャンペーンバナー) ════════ */}
      <section className="lp-trial-banner" ref={useReveal()}>
        <div className="lp-trial-inner reveal">
          <div className="lp-trial-content">
            <span className="lp-trial-badge">期間限定</span>
            <h3>全プラン <span className="gradient-text">14日間無料</span> トライアル</h3>
            <p>クレジットカード不要ですぐに始められます。AI自動応答を体験してください。</p>
          </div>
          <Link href="/signup" className="btn-primary btn-large">今すぐ試す →</Link>
        </div>
      </section>

      {/* ════════ Pricing (メルカリ式: 早い段階で料金を見せる) ════════ */}
      <section className="lp-pricing" id="pricing">
        <div className="lp-pricing-inner" ref={useReveal()}>
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
                {plan.saving && <div className="lp-plan-saving">{plan.saving}</div>}
                <ul className="lp-plan-features">
                  {plan.features.map((f) => (<li key={f}>{f}</li>))}
                </ul>
                <Link href="/signup" className="lp-plan-cta">{plan.cta}</Link>
              </div>
            ))}
          </div>

          {/* 実質コスト比較テーブル */}
          <div className="lp-cost-table reveal" ref={useReveal()}>
            <h3>従来型との総コスト比較</h3>
            <table>
              <thead>
                <tr>
                  <th />
                  <th>従来型運用</th>
                  <th>LinQ Pro</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>ツール代</td><td>¥10,000〜30,000</td><td>¥30,000</td></tr>
                <tr><td>LINE課金</td><td>¥5,000〜15,000</td><td>¥5,000〜15,000</td></tr>
                <tr><td>構築外注</td><td>¥300,000〜1,000,000 (初回)</td><td className="linq-free">¥0 (AIが構築)</td></tr>
                <tr><td>コンサル費</td><td>¥50,000〜200,000/月</td><td className="linq-free">¥0 (AIが提案)</td></tr>
                <tr><td>運用スタッフ</td><td>¥200,000〜300,000/月</td><td className="linq-free">¥0 (AIが運用)</td></tr>
                <tr className="total-row"><td>月額合計</td><td className="old-total">月25〜55万円</td><td className="new-total">月3.5〜4.5万円</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ════════ 3 Features (メルカリ式: 3つの魅力) ════════ */}
      <section className="lp-features" id="features">
        <div className="lp-features-inner">
          <div className="reveal" ref={useReveal()} style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span className="section-label">LinQの3つの強み</span>
            <h2 className="section-title"><span className="gradient-text">AI時代</span>のLINEマーケティング</h2>
          </div>

          {/* Feature 1: AI自動応答 */}
          <div className="lp-feature-row reveal" ref={useReveal()}>
            <div className="lp-feature-photo">
              <img src="/images/lp/10.png" alt="カフェ店員がスマホを確認して安心している" />
            </div>
            <div className="lp-feature-content">
              <div className="accent-line" />
              <h3>AI自動応答</h3>
              <p className="lp-feature-lead">24時間、AIがお客様対応。<br />あなたは本業に集中するだけ。</p>
              <p>ナレッジベースを学習したAIが的確に回答。予約受付、メニュー案内、よくある質問への対応を全自動化。Reply API利用で応答コスト¥0。対応できない質問はスタッフに自動引き継ぎ。</p>
            </div>
          </div>

          {/* Feature 2: ステップ配信 + シナリオ自動構築 */}
          <div className="lp-feature-row reverse reveal" ref={useReveal()}>
            <div className="lp-feature-photo">
              <img src="/images/lp/6.png" alt="コワーキングスペースでマーケティングを管理" />
            </div>
            <div className="lp-feature-content">
              <div className="accent-line" />
              <h3>AIが作るステップ配信</h3>
              <p className="lp-feature-lead">ビジネス情報を入力するだけ。<br />シナリオもAIが自動構築。</p>
              <p>友だち追加→フォローアップ→クーポン→リマインド。条件分岐も含めた最適なシナリオをAIが業種に合わせて自動提案。外注費¥0、構築時間5分。</p>
            </div>
          </div>

          {/* Feature 3: 顧客管理・分析 */}
          <div className="lp-feature-row reveal" ref={useReveal()}>
            <div className="lp-feature-photo">
              <img src="/images/lp/8.png" alt="チームでダッシュボードを見ながら分析" />
            </div>
            <div className="lp-feature-content">
              <div className="accent-line" />
              <h3>AI顧客分析</h3>
              <p className="lp-feature-lead">タグ・スコアリングで<br />顧客を完全に可視化。</p>
              <p>AIが会話履歴から興味・ニーズ・温度感を自動分析。配信実績、友だち推移、流入経路をリアルタイムで把握し、次のアクションを提案します。</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ Use Cases (導入事例) ════════ */}
      <section className="lp-use-cases" id="use-cases">
        <div className="lp-use-cases-inner" ref={useReveal()}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span className="section-label">Use Cases</span>
            <h2 className="section-title">あらゆる業種で<span className="gradient-text">成果</span>を</h2>
          </div>
          <div className="lp-case-grid reveal" ref={useReveal()}>
            <div className="lp-case-card">
              <div className="lp-case-photo">
                <img src="/images/lp/4.png" alt="美容院で施術中のオーナー" />
              </div>
              <div className="lp-case-body">
                <span className="lp-case-tag">美容院</span>
                <h4>リピート率が1.8倍に</h4>
                <p>AI自動応答で予約受付を24時間化。ステップ配信でフォローアップを自動化し、リピーターが大幅増加。</p>
              </div>
            </div>
            <div className="lp-case-card">
              <div className="lp-case-photo">
                <img src="/images/lp/10.png" alt="カフェオーナー" />
              </div>
              <div className="lp-case-body">
                <span className="lp-case-tag">飲食店・カフェ</span>
                <h4>予約キャンセルほぼゼロ</h4>
                <p>リマインド配信と当日メッセージの自動化で、無断キャンセルを大幅に削減。空席率の改善に成功。</p>
              </div>
            </div>
            <div className="lp-case-card">
              <div className="lp-case-photo">
                <img src="/images/lp/5.png" alt="スマホでLINE運用を管理" />
              </div>
              <div className="lp-case-body">
                <span className="lp-case-tag">ECサイト</span>
                <h4>友だち紹介で月50人増加</h4>
                <p>お友だち紹介プログラムでバイラル成長。クーポン自動配布で紹介者もハッピー。広告費¥0で集客。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ How it Works ════════ */}
      <section className="lp-steps">
        <div className="lp-steps-inner" ref={useReveal()}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span className="section-label">How it Works</span>
            <h2 className="section-title"><span className="gradient-text">5分</span>で始められる</h2>
          </div>
          <div className="lp-steps-flow reveal" ref={useReveal()}>
            <div className="lp-step-item">
              <div className="lp-step-number">1</div>
              <h4>アカウント作成</h4>
              <p>メールアドレスで簡単登録</p>
            </div>
            <div className="lp-step-item">
              <div className="lp-step-number">2</div>
              <h4>LINE接続</h4>
              <p>チャネル情報を入力するだけ</p>
            </div>
            <div className="lp-step-item">
              <div className="lp-step-number">3</div>
              <h4>AIが自動構築</h4>
              <p>業種に合わせて全て自動設定</p>
            </div>
            <div className="lp-step-item">
              <div className="lp-step-number">4</div>
              <h4>運用開始</h4>
              <p>すぐにLINEマーケティング開始</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ FAQ ════════ */}
      <section className="lp-faq" id="faq">
        <div className="lp-faq-inner" ref={useReveal()}>
          <div className="reveal" style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span className="section-label">FAQ</span>
            <h2 className="section-title">よくある質問</h2>
          </div>
          <div className="reveal" style={{ transitionDelay: '0.2s' }}>
            {faqs.map((faq) => (<FaqItem key={faq.q} q={faq.q} a={faq.a} />))}
          </div>
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section className="lp-cta">
        <div className="aurora-bg">
          <div className="aurora-blob green" />
          <div className="aurora-blob coral" />
        </div>
        <div className="lp-cta-inner reveal" ref={useReveal()}>
          <div className="lp-cta-text">
            <h2>LinQで、LINE運用を変えよう</h2>
            <p>5分でセットアップ完了。AIがあなたのビジネスを加速させます。</p>
            <Link href="/signup" className="btn-white">無料で始める →</Link>
          </div>
          <div className="lp-cta-photo">
            <img src="/images/lp/3.png" alt="笑顔でサムズアップするオーナー" />
          </div>
        </div>
      </section>

      {/* ════════ Footer ════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <span className="logo-lin">Lin</span><span className="logo-q">Q</span>
            <p>LINE運用を、もっと速く、もっと簡単に。</p>
          </div>
          <div className="lp-footer-links">
            <a href="#pricing">料金</a>
            <a href="#features">機能</a>
            <a href="#use-cases">導入事例</a>
            <a href="#faq">FAQ</a>
          </div>
        </div>
        <div className="lp-footer-bottom">
          © 2026 LinQ — AI-Powered LINE Marketing Platform
        </div>
      </footer>
    </div>
  );
}
