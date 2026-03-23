'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { getApiUrl } from '@/lib/api-url';

const API_URL = getApiUrl();

interface FormField {
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

export default function PublicFormPage() {
  const { id } = useParams();
  const [form, setForm] = useState<{ name: string; description?: string; thankYouMessage?: string; fields: FormField[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Try to get LIFF userId if available
  const [friendId, setFriendId] = useState<string | null>(null);

  useEffect(() => {
    // Check if LIFF is available
    interface LiffApi {
      init: (config: { liffId: string }) => Promise<void>;
      isLoggedIn: () => boolean;
      getProfile: () => Promise<{ userId: string; displayName: string }>;
    }
    const win = window as unknown as { liff?: LiffApi };
    if (typeof window !== 'undefined' && win.liff) {
      const liff = win.liff;
      liff.init({ liffId: '' }).then(() => {
        if (liff.isLoggedIn()) {
          liff.getProfile().then((profile) => {
            setFriendId(profile.userId);
          });
        }
      }).catch(() => {});
    }

    // Check URL params for friendId
    const params = new URLSearchParams(window.location.search);
    const fid = params.get('friendId');
    if (fid) setFriendId(fid);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/public/forms/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Form not found');
        return r.json();
      })
      .then(setForm)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`${API_URL}/api/v1/public/forms/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId, answers }),
      });
      setSubmitted(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  function updateAnswer(label: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [label]: value }));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">フォームが見つかりません</p>
          <p className="text-sm text-gray-500 mt-1">URLを確認してください</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-lg p-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">送信完了</h1>
          <p className="text-gray-600 mt-2">{form.thankYouMessage || '回答ありがとうございます！'}</p>
        </div>
      </div>
    );
  }

  const fields: FormField[] = Array.isArray(form.fields) ? form.fields : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5">
            <h1 className="text-xl font-bold text-white">{form.name}</h1>
            {form.description && (
              <p className="text-blue-100 text-sm mt-1">{form.description}</p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {fields.map((field, i) => (
              <div key={i}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {field.type === 'text' && (
                  <input
                    type="text"
                    required={field.required}
                    value={answers[field.label] || ''}
                    onChange={(e) => updateAnswer(field.label, e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                )}

                {field.type === 'email' && (
                  <input
                    type="email"
                    required={field.required}
                    value={answers[field.label] || ''}
                    onChange={(e) => updateAnswer(field.label, e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                )}

                {field.type === 'phone' && (
                  <input
                    type="tel"
                    required={field.required}
                    value={answers[field.label] || ''}
                    onChange={(e) => updateAnswer(field.label, e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    required={field.required}
                    value={answers[field.label] || ''}
                    onChange={(e) => updateAnswer(field.label, e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                )}

                {field.type === 'textarea' && (
                  <textarea
                    required={field.required}
                    value={answers[field.label] || ''}
                    onChange={(e) => updateAnswer(field.label, e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  />
                )}

                {field.type === 'select' && (
                  <select
                    required={field.required}
                    value={answers[field.label] || ''}
                    onChange={(e) => updateAnswer(field.label, e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">選択してください</option>
                    {(field.options || []).map((opt, oi) => (
                      <option key={oi} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {field.type === 'radio' && (
                  <div className="space-y-2">
                    {(field.options || []).map((opt, oi) => (
                      <label key={oi} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`field-${i}`}
                          value={opt}
                          checked={answers[field.label] === opt}
                          onChange={() => updateAnswer(field.label, opt)}
                          required={field.required}
                          className="text-blue-600"
                        />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {field.type === 'checkbox' && (
                  <div className="space-y-2">
                    {(field.options || []).map((opt, oi) => (
                      <label key={oi} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Array.isArray(answers[field.label]) && (answers[field.label] as string[]).includes(opt)}
                          onChange={(e) => {
                            const current = Array.isArray(answers[field.label]) ? (answers[field.label] as string[]) : [];
                            updateAnswer(
                              field.label,
                              e.target.checked
                                ? [...current, opt]
                                : current.filter((v) => v !== opt),
                            );
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {submitting ? '送信中...' : '送信する'}
            </button>
          </form>

          <div className="px-6 pb-4">
            <p className="text-xs text-gray-400 text-center">Powered by LinQ</p>
          </div>
        </div>
      </div>
    </div>
  );
}
