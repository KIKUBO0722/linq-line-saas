import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LINE SaaS - AI-Powered LINE Marketing Platform',
  description:
    'AIがLINE公式アカウントの運用を自動化。ステップ配信、セグメント配信、顧客管理、AI自動応答を1つのプラットフォームで。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
