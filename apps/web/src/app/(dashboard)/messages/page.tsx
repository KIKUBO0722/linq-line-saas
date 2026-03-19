'use client';

import { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  const [messageType, setMessageType] = useState<'text' | 'broadcast'>('text');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">メッセージ配信</h1>
        <p className="text-gray-500 mt-1">友だちにメッセージを送信</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setMessageType('text')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              messageType === 'text'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            個別送信
          </button>
          <button
            onClick={() => setMessageType('broadcast')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              messageType === 'broadcast'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            一斉配信
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メッセージ内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="メッセージを入力..."
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {content.length} 文字
            </p>
            <button
              disabled={!content.trim() || sending}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? '送信中...' : '送信'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">配信履歴</h2>
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>まだ配信履歴がありません</p>
        </div>
      </div>
    </div>
  );
}
