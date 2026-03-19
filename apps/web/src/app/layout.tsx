import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LinQ｜LINE運用を、もっと速く、もっと簡単に',
  description:
    'LinQはAIがLINE公式アカウントの運用を自動化するSaaSプラットフォーム。AI自動応答、ステップ配信、顧客管理・分析を1つのツールで。構築も運用もAIにおまかせ。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
