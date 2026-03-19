'use client';

import { useEffect, useState } from 'react';
import { GitBranch, Plus, Play, Pause, Clock, Users, ChevronRight } from 'lucide-react';

export default function StepsPage() {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTrigger, setNewTrigger] = useState('follow');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/v1/steps/scenarios', { credentials: 'include' })
      .then((r) => r.json())
      .then(setScenarios)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('http://localhost:3001/api/v1/steps/scenarios', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDescription, triggerType: newTrigger }),
      });
      const data = await res.json();
      setScenarios((prev) => [...prev, data]);
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
    } catch {}
    setCreating(false);
  }

  async function toggleScenario(id: string, isActive: boolean) {
    const action = isActive ? 'deactivate' : 'activate';
    await fetch(`http://localhost:3001/api/v1/steps/scenarios/${id}/${action}`, {
      method: 'POST',
      credentials: 'include',
    });
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !isActive } : s)),
    );
  }

  const triggerLabels: Record<string, string> = {
    follow: '友だち追加時',
    tag_added: 'タグ付与時',
    form_submitted: 'フォーム回答時',
    manual: '手動',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ステップ配信</h1>
          <p className="text-gray-500 mt-1">シナリオベースの自動メッセージ配信</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          新規シナリオ
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">新しいシナリオを作成</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">シナリオ名</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="例: 新規歓迎シナリオ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
              rows={2}
              placeholder="シナリオの目的..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">トリガー</label>
            <select
              value={newTrigger}
              onChange={(e) => setNewTrigger(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="follow">友だち追加時</option>
              <option value="tag_added">タグ付与時</option>
              <option value="form_submitted">フォーム回答時</option>
              <option value="manual">手動</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={creating} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {creating ? '作成中...' : '作成'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg">
              キャンセル
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : scenarios.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <GitBranch className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-medium text-gray-600">シナリオがありません</h2>
          <p className="text-sm text-gray-400 mt-2">「新規シナリオ」ボタンから作成してください</p>
        </div>
      ) : (
        <div className="space-y-4">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${scenario.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <GitBranch className={`h-5 w-5 ${scenario.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{scenario.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {triggerLabels[scenario.triggerType] || scenario.triggerType}
                      </span>
                      {scenario.description && (
                        <span className="text-xs text-gray-400">{scenario.description}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleScenario(scenario.id, scenario.isActive)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      scenario.isActive
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {scenario.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    {scenario.isActive ? '停止' : '開始'}
                  </button>
                  <ChevronRight className="h-5 w-5 text-gray-300" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
