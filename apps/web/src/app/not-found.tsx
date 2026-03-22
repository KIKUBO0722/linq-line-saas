import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center px-6">
        <div className="text-8xl font-bold text-slate-200 mb-2">404</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">ページが見つかりません</h1>
        <p className="text-slate-500 mb-8 max-w-md">
          お探しのページは移動または削除された可能性があります。
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/overview"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#06C755] text-white rounded-lg font-medium text-sm hover:bg-[#05b34c] transition-colors"
          >
            ダッシュボードに戻る
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            トップページ
          </Link>
        </div>
      </div>
    </div>
  );
}
