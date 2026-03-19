'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Users, MessageSquare, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/v1/analytics/overview', { credentials: 'include' })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">分析</h1>
        <p className="text-gray-500 mt-1">過去30日間のパフォーマンス</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">友だち数</p>
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.friends?.total || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">配信数 (送信)</p>
            <ArrowUpRight className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.messages?.outbound || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">受信数</p>
            <ArrowDownRight className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.messages?.inbound || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Webhookイベント</p>
            <BarChart3 className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.events?.total || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">メッセージ内訳</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">送信メッセージ</span>
                <span className="font-medium">{stats?.messages?.outbound || 0}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${stats?.messages?.total ? ((stats.messages.outbound / stats.messages.total) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">受信メッセージ</span>
                <span className="font-medium">{stats?.messages?.inbound || 0}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{
                    width: `${stats?.messages?.total ? ((stats.messages.inbound / stats.messages.total) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI活用状況</h2>
          <div className="text-center py-6 text-gray-400">
            <p>AI自動応答を有効にすると、ここに利用統計が表示されます</p>
          </div>
        </div>
      </div>
    </div>
  );
}
