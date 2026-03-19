import { BarChart3 } from 'lucide-react';

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">分析</h1>
        <p className="text-gray-500 mt-1">配信実績・友だち推移の分析</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-lg font-medium text-gray-600">Coming Soon</h2>
        <p className="text-sm text-gray-400 mt-2">この機能は現在開発中です</p>
      </div>
    </div>
  );
}
