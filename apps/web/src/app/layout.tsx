import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LinQ｜LINE運用を、もっと速く、もっと簡単に',
  description:
    'LinQはAIがLINE公式アカウントの運用を自動化するSaaSプラットフォーム。AI自動応答、ステップ配信、顧客管理・分析を1つのツールで。構築も運用もAIにおまかせ。',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    title: 'LinQ｜LINE運用を、もっと速く、もっと簡単に',
    description: 'AIがLINE公式アカウントの構築・運用・分析を一気通貫で自動化。エルメ・Lステップの全機能+AI。',
    siteName: 'LinQ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LinQ｜AI-Powered LINE Marketing',
    description: 'AIがLINE運用を自動化。構築も運用もAIにおまかせ。',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
