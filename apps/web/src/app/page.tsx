'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import './landing.css';

/* ── Data ── */
const stats = [
  { num: '¥0', label: 'AI応答コスト', sub: 'Reply API活用' },
  { num: '5分', label: 'セットアップ', sub: 'AIが全自動構築' },
  { num: '90%', label: 'コスト削減', sub: '人件費・外注費' },
  { num: '24h', label: 'AI自動対応', sub: '年中無休' },
];

const features = [
  { icon: '💬', color: '#06C755', title: 'AI自動応答', desc: '24時間AIが顧客対応。ナレッジベースを学習し的確に回答。Reply API利用で応答コスト¥0。' },
  { icon: '📨', color: '#FFB347', title: 'ステップ配信', desc: 'AIが業種に最適なシナリオを自動構築。条件分岐・遅延配信も5分で完成。' },
  { icon: '📊', color: '#FF6B6B', title: 'AI顧客分析', desc: '会話履歴からニーズを自動分析。スコアリング・タグ付けで顧客を完全可視化。' },
  { icon: '🎨', color: '#06C755', title: 'リッチメニュー', desc: '業種に合わせたリッチメニューをAIが提案。ユーザー属性による動的切替も。' },
  { icon: '🔗', color: '#FFB347', title: 'お友だち紹介', desc: '紹介プログラムを簡単構築。紹介者・被紹介者に自動で特典配布。バイラル成長。' },
  { icon: '📋', color: '#FF6B6B', title: 'フォーム・予約', desc: 'LINE内で完結するフォーム作成。回答データは自動で顧客情報に反映・タグ付け。' },
];

const steps = [
  { num: '01', title: 'アカウント作成', desc: 'メールアドレスで30秒で登録完了', icon: '✉️' },
  { num: '02', title: 'LINE接続', desc: 'チャネル情報をコピペするだけ', icon: '🔌' },
  { num: '03', title: 'AIが自動構築', desc: '業種を入力→全設定をAIが生成', icon: '🤖' },
  { num: '04', title: '運用開始', desc: 'すぐにLINEマーケティング開始', icon: '🚀' },
];

const cases = [
  { tag: '美容院', title: 'リピート率 1.8倍', desc: 'AI自動応答で予約受付を24時間化。ステップ配信でフォローアップを自動化し、リピーターが大幅増加。', metric: '+80%', metricLabel: 'リピート率' },
  { tag: '飲食店', title: 'キャンセル率 ほぼ0%', desc: 'リマインド配信と当日メッセージの自動化で無断キャンセルを大幅削減。空席率の改善に成功。', metric: '-95%', metricLabel: 'キャンセル率' },
  { tag: 'EC', title: '友だち紹介で月50人増', desc: 'お友だち紹介プログラムでバイラル成長。クーポン自動配布で紹介者もハッピー。広告費¥0。', metric: '¥0', metricLabel: '広告費' },
];

const plans = [
  { name: 'Free', price: '¥0', period: '', features: ['友だち100人', '1,000通/月', 'AI応答50回/月', 'ステップ配信1個'], cta: '無料で始める', popular: false, saving: '' },
  { name: 'Start', price: '¥5,000', period: '/月', features: ['友だち500人', '5,000通/月', 'AI応答500回/月', 'ステップ配信5個', 'LINEコスト可視化'], cta: '14日間無料', popular: false, saving: 'スタッフ月10〜20h節約' },
  { name: 'Standard', price: '¥15,000', period: '/月', features: ['友だち5,000人', '30,000通/月', 'AI応答5,000回/月', '無制限ステップ', 'AI顧客分析', '外部Webhook'], cta: '14日間無料', popular: true, saving: 'コンサル代 月5〜20万円削減' },
  { name: 'Pro', price: '¥30,000', period: '/月', features: ['友だち50,000人', '100,000通/月', 'AI応答無制限', 'AIオンボーディング', 'AI配信最適化', '全機能無制限'], cta: '14日間無料', popular: false, saving: '外注+運用 月25〜55万円削減' },
];

const faqs = [
  { q: 'LINE公式アカウントの費用は別途かかりますか？', a: 'はい、LINE公式アカウント自体の費用は別途必要です。ただし、AI自動応答はReply APIを使用するためLINEのメッセージ課金対象外です。' },
  { q: 'エルメやエルステップから乗り換えできますか？', a: 'LINE公式アカウント自体はそのまま使えるため、Webhook URLを切り替えるだけで移行が可能です。友だちデータはCSVインポートに対応予定です。' },
  { q: 'AIの精度はどの程度ですか？', a: 'Anthropic社のClaude AIを搭載。テナントごとにナレッジベースを登録できるため、ビジネスに特化した正確な回答が可能です。' },
  { q: '無料プランでも十分使えますか？', a: 'はい。Freeプランで友だち100人まで、月1,000通、AI応答50回/月が使えます。全基本機能を試してからアップグレードできます。' },
];

/* ── Hooks ── */
function useReveal(cls = 'reveal') {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) el.classList.add('visible'); },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function useCountUp(end: number, duration = 2000) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          setVal(Math.round(end * p));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration]);
  return { ref, val };
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button className="faq-q" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <span className="faq-icon">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="faq-a"><p>{a}</p></div>}
    </div>
  );
}

/* ── Page ── */
export default function LandingPage() {
  return (
    <div className="lp">
      {/* ═══ Header ═══ */}
      <header className="hd">
        <Link href="/" className="hd-logo">
          <span className="logo-lin">Lin</span><span className="logo-q">Q</span>
        </Link>
        <nav className="hd-nav">
          <a href="#features">機能</a>
          <a href="#pricing">料金</a>
          <a href="#cases">事例</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="hd-actions">
          <Link href="/login" className="btn-ghost">ログイン</Link>
          <Link href="/signup" className="btn-primary">無料で始める</Link>
        </div>
      </header>

      {/* ═══ Hero ═══ */}
      <section className="hero">
        <div className="hero-aurora">
          <div className="blob b1" />
          <div className="blob b2" />
          <div className="blob b3" />
        </div>
        <div className="hero-inner">
          <span className="hero-chip">AI-Powered LINE Marketing</span>
          <h1 className="hero-h1">
            LINE運用を、<br />
            もっと<span className="grad">速く</span>、もっと<span className="grad">簡単に</span>。
          </h1>
          <p className="hero-sub">
            構築も運用もAIにおまかせ。外注費・コンサル費・人件費を大幅カット。<br />
            エルメ・エルステップの全機能 + AI自動化を、ひとつのプラットフォームで。
          </p>
          <div className="hero-ctas">
            <Link href="/signup" className="btn-primary btn-lg">無料で始める →</Link>
            <a href="#features" className="btn-outline btn-lg">機能を見る</a>
          </div>
          <p className="hero-note">クレジットカード不要 ・ 14日間無料トライアル</p>
        </div>
      </section>

      {/* ═══ Stats Bar (数字で信頼) ═══ */}
      <section className="stats">
        <div className="stats-inner">
          {stats.map((s) => (
            <div key={s.label} className="stat-item">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Features (6つのカード) ═══ */}
      <section className="sec features" id="features">
        <div className="sec-inner" ref={useReveal()}>
          <span className="sec-chip reveal">Features</span>
          <h2 className="sec-h2 reveal">
            <span className="grad">AI</span>が、LINE運用の全てを変える
          </h2>
          <p className="sec-sub reveal">エルメの手軽さ × エルステップの高機能 × AIの自動化</p>
          <div className="feat-grid">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="feat-card reveal"
                ref={useReveal()}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="feat-icon" style={{ background: `${f.color}18` }}>
                  <span>{f.icon}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <div className="feat-line" style={{ background: f.color }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ How it Works ═══ */}
      <section className="sec steps-sec">
        <div className="sec-inner" ref={useReveal()}>
          <span className="sec-chip reveal">How it Works</span>
          <h2 className="sec-h2 reveal"><span className="grad">5分</span>で始められる</h2>
          <div className="steps-grid">
            {steps.map((s, i) => (
              <div key={s.num} className="step-card reveal" ref={useReveal()} style={{ transitionDelay: `${i * 0.15}s` }}>
                <div className="step-num">{s.num}</div>
                <div className="step-icon">{s.icon}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Cost Comparison ═══ */}
      <section className="sec cost-sec">
        <div className="sec-inner" ref={useReveal()}>
          <span className="sec-chip reveal">Cost</span>
          <h2 className="sec-h2 reveal">従来型 vs <span className="grad">LinQ</span></h2>
          <p className="sec-sub reveal">人件費を含めた総コストで比較してください</p>
          <div className="cost-compare reveal" ref={useReveal()}>
            <div className="cost-card cost-old">
              <h3>従来型の運用</h3>
              <div className="cost-price old">月25〜55万円</div>
              <ul>
                <li>ツール代 ¥10,000〜30,000</li>
                <li>LINE課金 ¥5,000〜15,000</li>
                <li className="cost-pain">構築外注 ¥30〜100万 (初回)</li>
                <li className="cost-pain">コンサル ¥5〜20万/月</li>
                <li className="cost-pain">運用スタッフ ¥20〜30万/月</li>
              </ul>
            </div>
            <div className="cost-arrow">→</div>
            <div className="cost-card cost-new">
              <div className="cost-badge">LinQ Pro</div>
              <h3>AIが全て担当</h3>
              <div className="cost-price new">月3.5〜4.5万円</div>
              <ul>
                <li>ツール代 ¥30,000</li>
                <li>LINE課金 ¥5,000〜15,000</li>
                <li className="cost-free">構築 → AIが自動 ¥0</li>
                <li className="cost-free">コンサル → AIが提案 ¥0</li>
                <li className="cost-free">運用 → AIが自動化 ¥0</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Use Cases ═══ */}
      <section className="sec cases-sec" id="cases">
        <div className="sec-inner" ref={useReveal()}>
          <span className="sec-chip reveal">Use Cases</span>
          <h2 className="sec-h2 reveal">あらゆる業種で<span className="grad">成果</span>を</h2>
          <div className="case-grid">
            {cases.map((c, i) => (
              <div key={c.tag} className="case-card reveal" ref={useReveal()} style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="case-metric">
                  <span className="case-num">{c.metric}</span>
                  <span className="case-metric-label">{c.metricLabel}</span>
                </div>
                <span className="case-tag">{c.tag}</span>
                <h4>{c.title}</h4>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Pricing ═══ */}
      <section className="sec pricing-sec" id="pricing">
        <div className="sec-inner" ref={useReveal()}>
          <span className="sec-chip reveal">Pricing</span>
          <h2 className="sec-h2 reveal">プランが上がるほど、<span className="grad">人件費が下がる</span></h2>
          <p className="sec-sub reveal">全プラン14日間無料トライアル付き</p>
          <div className="plan-grid">
            {plans.map((p, i) => (
              <div key={p.name} className={`plan-card reveal ${p.popular ? 'popular' : ''}`} ref={useReveal()} style={{ transitionDelay: `${i * 0.1}s` }}>
                {p.popular && <div className="plan-pop">人気No.1</div>}
                <div className="plan-name">{p.name}</div>
                <div className="plan-price">{p.price}<span className="plan-period">{p.period || ' 永久無料'}</span></div>
                {p.saving && <div className="plan-saving">{p.saving}</div>}
                <ul className="plan-feat">
                  {p.features.map((f) => <li key={f}>✓ {f}</li>)}
                </ul>
                <Link href="/signup" className={`plan-cta ${p.popular ? 'primary' : ''}`}>{p.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="sec faq-sec" id="faq">
        <div className="sec-inner narrow" ref={useReveal()}>
          <span className="sec-chip reveal">FAQ</span>
          <h2 className="sec-h2 reveal">よくある質問</h2>
          <div className="faq-list reveal" ref={useReveal()}>
            {faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="cta-sec">
        <div className="cta-aurora">
          <div className="blob b1" />
          <div className="blob b2" />
        </div>
        <div className="cta-inner reveal" ref={useReveal()}>
          <h2>LinQで、LINE運用を変えよう</h2>
          <p>5分でセットアップ完了。AIがあなたのビジネスを加速させます。</p>
          <div className="cta-btns">
            <Link href="/signup" className="btn-white btn-lg">無料で始める →</Link>
            <a href="#pricing" className="btn-white-outline btn-lg">料金を見る</a>
          </div>
          <p className="cta-note">クレジットカード不要 ・ 14日間無料トライアル</p>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="ft">
        <div className="ft-inner">
          <div className="ft-brand">
            <span className="logo-lin">Lin</span><span className="logo-q">Q</span>
            <p>LINE運用を、もっと速く、もっと簡単に。</p>
          </div>
          <div className="ft-links">
            <a href="#features">機能</a>
            <a href="#pricing">料金</a>
            <a href="#cases">事例</a>
            <a href="#faq">FAQ</a>
          </div>
        </div>
        <div className="ft-bottom">© 2026 LinQ — AI-Powered LINE Marketing Platform</div>
      </footer>
    </div>
  );
}
