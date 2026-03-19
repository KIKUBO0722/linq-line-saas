'use client';

import { useEffect, useState } from 'react';
import { Settings, Plus, Check, Copy } from 'lucide-react';
import { api } from '@/lib/api-client';

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [channelId, setChannelId] = useState('');
  const [channelSecret, setChannelSecret] = useState('');
  const [channelAccessToken, setChannelAccessToken] = useState('');
  const [botName, setBotName] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    api.accounts.list().then(setAccounts).catch(() => {});
  }, []);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const account = await api.accounts.create({
        channelId,
        channelSecret,
        channelAccessToken,
        botName: botName || undefined,
      });
      setAccounts((prev) => [...prev, account]);
      setShowForm(false);
      setChannelId('');
      setChannelSecret('');
      setChannelAccessToken('');
      setBotName('');
    } catch (err) {
      alert('Failed to create account');
    } finally {
      setSaving(false);
    }
  }

  function copyWebhookUrl(account: any) {
    const url = `${window.location.origin.replace(':3000', ':3001')}/webhook/${account.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(account.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="text-gray-500 mt-1">LINE公式アカウントの接続と管理</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">LINE公式アカウント</h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            アカウント追加
          </button>
        </div>

        {accounts.length === 0 && !showForm ? (
          <div className="text-center py-8 text-gray-500">
            <Settings className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>LINE公式アカウントが接続されていません</p>
            <p className="text-sm mt-1">「アカウント追加」から接続してください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account: any) => (
              <div key={account.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{account.botName || 'LINE Bot'}</p>
                    <p className="text-sm text-gray-500">Channel ID: {account.channelId}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    接続済み
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <code className="flex-1 text-xs bg-gray-100 px-3 py-2 rounded font-mono truncate">
                    {`${typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':3001') : ''}/webhook/${account.id}`}
                  </code>
                  <button
                    onClick={() => copyWebhookUrl(account)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Webhook URLをコピー"
                  >
                    {copiedId === account.id ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  このURLをLINE DevelopersのWebhook URLに設定してください
                </p>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleCreateAccount} className="mt-6 border-t pt-6 space-y-4">
            <h3 className="font-medium text-gray-900">新しいLINE公式アカウントを接続</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700">Bot名 (任意)</label>
              <input
                type="text"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: マイショップBot"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Channel ID</label>
              <input
                type="text"
                required
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Channel Secret</label>
              <input
                type="password"
                required
                value={channelSecret}
                onChange={(e) => setChannelSecret(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Channel Access Token</label>
              <input
                type="password"
                required
                value={channelAccessToken}
                onChange={(e) => setChannelAccessToken(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? '保存中...' : '接続する'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
