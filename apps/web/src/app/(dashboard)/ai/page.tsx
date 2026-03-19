'use client';

import { useEffect, useState } from 'react';
import { Bot, Save, Sparkles } from 'lucide-react';

export default function AiPage() {
  const [config, setConfig] = useState<any>({
    autoReplyEnabled: false,
    systemPrompt: '',
    knowledgeBase: [],
    handoffKeywords: [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [genPurpose, setGenPurpose] = useState('');
  const [genTone, setGenTone] = useState('フレンドリー');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [newKbTitle, setNewKbTitle] = useState('');
  const [newKbContent, setNewKbContent] = useState('');

  useEffect(() => {
    fetch('http://localhost:3001/api/v1/ai/config', { credentials: 'include' })
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('http://localhost:3001/api/v1/ai/config', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    setSuggestions([]);
    try {
      const res = await fetch('http://localhost:3001/api/v1/ai/generate-message', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: genPurpose, tone: genTone }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {}
    setGenerating(false);
  }

  function addKnowledgeItem() {
    if (!newKbTitle.trim() || !newKbContent.trim()) return;
    setConfig((prev: any) => ({
      ...prev,
      knowledgeBase: [...(prev.knowledgeBase || []), { title: newKbTitle, content: newKbContent }],
    }));
    setNewKbTitle('');
    setNewKbContent('');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI設定</h1>
          <p className="text-gray-500 mt-1">AI自動応答・コンテンツ生成の設定</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saved ? '保存しました' : saving ? '保存中...' : '設定を保存'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">AI自動応答</h2>
          </div>
          <button
            onClick={() => setConfig((p: any) => ({ ...p, autoReplyEnabled: !p.autoReplyEnabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.autoReplyEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.autoReplyEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AIの性格・口調</label>
            <textarea
              value={config.systemPrompt || ''}
              onChange={(e) => setConfig((p: any) => ({ ...p, systemPrompt: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="例: あなたは田中ビューティーサロンのAIアシスタントです。丁寧で親しみやすい口調で対応してください。"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">スタッフ引き継ぎキーワード</label>
            <input
              type="text"
              value={(config.handoffKeywords || []).join(', ')}
              onChange={(e) => setConfig((p: any) => ({ ...p, handoffKeywords: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="クレーム, 返金, 予約変更"
            />
            <p className="text-xs text-gray-400 mt-1">これらを含むメッセージはAIが応答せずスタッフに引き継ぎます</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">ナレッジベース</h2>
        <p className="text-sm text-gray-500 mb-4">AIが回答に使用するビジネス情報</p>
        {(config.knowledgeBase || []).map((item: any, index: number) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">{item.title}</span>
              <button onClick={() => setConfig((p: any) => ({ ...p, knowledgeBase: p.knowledgeBase.filter((_: any, i: number) => i !== index) }))} className="text-red-500 hover:text-red-700 text-sm">削除</button>
            </div>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.content}</p>
          </div>
        ))}
        <div className="border-t pt-4 mt-4 space-y-3">
          <input type="text" value={newKbTitle} onChange={(e) => setNewKbTitle(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="カテゴリ名 (例: メニュー・料金)" />
          <textarea value={newKbContent} onChange={(e) => setNewKbContent(e.target.value)} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none" placeholder="内容を入力..." />
          <button onClick={addKnowledgeItem} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm">+ 追加</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-6 w-6 text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">AIメッセージ生成</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目的</label>
            <input type="text" value={genPurpose} onChange={(e) => setGenPurpose(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="例: バレンタインキャンペーン告知" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">トーン</label>
            <select value={genTone} onChange={(e) => setGenTone(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
              <option>フレンドリー</option>
              <option>ビジネスライク</option>
              <option>カジュアル</option>
              <option>丁寧・フォーマル</option>
            </select>
          </div>
        </div>
        <button onClick={handleGenerate} disabled={!genPurpose || generating} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
          <Sparkles className="h-4 w-4" />
          {generating ? '生成中...' : 'メッセージを生成'}
        </button>
        {suggestions.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">提案メッセージ:</p>
            {suggestions.map((s, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">{s}</p>
                  <button onClick={() => navigator.clipboard.writeText(s)} className="ml-3 text-xs text-blue-600 hover:text-blue-800">コピー</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
