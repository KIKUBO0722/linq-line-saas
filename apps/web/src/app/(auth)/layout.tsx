'use client';

import { Bot, GitBranch, BarChart3, Shield, Zap, Users } from 'lucide-react';

const stats = [
  { value: '¥0', label: 'AI応答コスト' },
  { value: '5分', label: 'セットアップ' },
  { value: '90%', label: 'コスト削減' },
  { value: '24h', label: 'AI自動対応' },
];

const features = [
  { icon: Bot, title: 'AI自動応答', desc: '24時間AIが顧客対応' },
  { icon: GitBranch, title: 'ステップ配信', desc: 'シナリオを自動構築' },
  { icon: BarChart3, title: 'AI顧客分析', desc: '顧客を完全可視化' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel: LP-style visual (desktop only) */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-[#1A1A2E] text-white">
        {/* Animated aurora blobs — matching LP's 3-color scheme */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-90"
          style={{
            background: 'radial-gradient(circle, rgba(6,199,85,.55), transparent 70%)',
            top: '-140px', right: '-100px', filter: 'blur(100px)',
            animation: 'blobDrift1 14s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[460px] h-[460px] rounded-full opacity-80"
          style={{
            background: 'radial-gradient(circle, rgba(255,107,107,.3), transparent 70%)',
            bottom: '-80px', left: '-80px', filter: 'blur(90px)',
            animation: 'blobDrift2 18s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-85"
          style={{
            background: 'radial-gradient(circle, rgba(255,179,71,.3), transparent 70%)',
            top: '40%', left: '35%', filter: 'blur(90px)',
            animation: 'blobDrift3 20s ease-in-out infinite',
          }}
        />

        {/* Blob animation keyframes */}
        <style>{`
          @keyframes blobDrift1 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(40px,-50px) scale(1.1); } 66% { transform: translate(-30px,30px) scale(.95); } }
          @keyframes blobDrift2 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(-50px,40px) scale(1.05); } 66% { transform: translate(30px,-30px) scale(1.1); } }
          @keyframes blobDrift3 { 0%,100% { transform: translate(0,0) scale(1.05); } 50% { transform: translate(25px,35px) scale(.95); } }
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        `}</style>

        <div className="relative z-10 flex flex-col justify-center items-start p-12 xl:p-16 w-full max-w-[560px] mx-auto">
          {/* Top: Logo + tagline */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <h1 className="text-5xl font-extrabold tracking-tight">
                <span className="text-[#06C755]">Lin</span>
                <span className="text-white">Q</span>
              </h1>
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, rgba(6,199,85,.15), rgba(255,179,71,.15))',
                  color: '#06C755',
                  border: '1px solid rgba(6,199,85,.2)',
                }}>
                AI-Powered
              </span>
            </div>
            <p className="text-xl font-bold mt-2">
              LINE運用を、もっと
              <span
                className="inline-block"
                style={{
                  background: 'linear-gradient(135deg, #06C755, #FFB347 60%, #FF6B6B)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'shimmer 5s linear infinite',
                }}
              >速く</span>
              、もっと
              <span
                className="inline-block"
                style={{
                  background: 'linear-gradient(135deg, #FFB347, #06C755 60%, #FF6B6B)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'shimmer 5s linear infinite',
                }}
              >簡単に</span>
              。
            </p>
            <p className="text-sm text-slate-400 mt-3 max-w-md leading-relaxed">
              AIがLINE公式アカウントの構築から運用まで、すべてを自動化。
              コンサル不要・外注不要で、プロ品質のLINEマーケティングを。
            </p>
          </div>

          {/* Middle: Stats — orange accent unified */}
          <div className="my-8">
            <div className="grid grid-cols-4 gap-2">
              {stats.map((s) => (
                <div key={s.label} className="text-center backdrop-blur-sm rounded-xl py-4 px-5 border border-white/[0.06] bg-white/[0.03]">
                  <div className="text-2xl xl:text-3xl font-extrabold text-[#FFB347]">{s.value}</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-medium whitespace-nowrap">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Features — green accent unified */}
          <div className="space-y-3">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3 backdrop-blur-sm rounded-xl p-4 border border-white/[0.06] bg-white/[0.03] transition-colors hover:border-white/10">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-[#06C755]/10">
                  <f.icon className="w-5 h-5 text-[#06C755]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{f.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom: Trust elements */}
          <div className="mt-8 flex flex-wrap items-center gap-5 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span>クレジットカード不要</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-slate-500" />
              <span>14日間無料トライアル</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>30秒で登録完了</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white min-h-screen lg:min-h-0">
        <div className="w-full max-w-[400px]">
          {/* Mobile-only branding */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-extrabold">
              <span className="text-[#06C755]">Lin</span>
              <span className="text-slate-900">Q</span>
            </h1>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
