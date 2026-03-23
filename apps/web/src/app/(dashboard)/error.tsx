'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="flex flex-col items-center max-w-md text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          エラーが発生しました
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          ページの読み込み中にエラーが発生しました。再試行するか、ダッシュボードに戻ってください。
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#06C755] text-white text-sm font-medium hover:bg-[#05b34c] transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            再試行
          </button>
          <Link
            href="/overview"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Home className="h-4 w-4" />
            ダッシュボード
          </Link>
        </div>
        {error.digest && (
          <p className="mt-4 text-xs text-slate-400">
            エラーID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
