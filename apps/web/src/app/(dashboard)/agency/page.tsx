'use client';

import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import { Building2, Users, MessageSquare, ArrowUpRight, ArrowDownRight, CreditCard, Clock } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { PageSkeleton } from '@/components/ui/skeleton';

interface ClientInfo {
  tenantId: string;
  tenantName: string;
  industry: string | null;
  status: string;
  friendCount: number;
  messagesSent: number;
  messagesReceived: number;
  planName: string | null;
  createdAt: string;
}

interface AgencyData {
  totalClients: number;
  totalFriends: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  clients: ClientInfo[];
}

export default function AgencyPage() {
  const [loading, setLoading] = useState(true);
  const [isAgency, setIsAgency] = useState(false);
  const [data, setData] = useState<AgencyData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const status = await api.agency.status();
        setIsAgency(status.isAgency);
        if (status.isAgency) {
          const overview = await api.agency.overview();
          setData(overview);
        }
      } catch {
        toast.error('代理店情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageSkeleton />;

  if (!isAgency) {
    return (
      <div className="p-2 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">代理店ダッシュボード</h1>
          <p className="text-sm text-muted-foreground">クライアントアカウントの一括管理</p>
        </div>
        <Card>
          <CardContent>
            <EmptyState
              illustration="generic"
              title="代理店モードが有効ではありません"
              description="クライアントをLinQに招待すると、ここで全体を管理できるようになります。代理店プランの詳細はお問い合わせください。"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-2 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">代理店ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">全クライアントの運用状況を一覧で管理</p>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{data?.totalClients || 0}</p>
                <p className="text-xs text-muted-foreground">クライアント数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{(data?.totalFriends || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">総友だち数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <ArrowUpRight className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{(data?.totalMessagesSent || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">総配信数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <ArrowDownRight className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{(data?.totalMessagesReceived || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">総受信数</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">クライアント一覧</CardTitle>
          <CardDescription>{data?.totalClients || 0}件のクライアントを管理中</CardDescription>
        </CardHeader>
        {data?.clients && data.clients.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>クライアント名</TableHead>
                <TableHead>業種</TableHead>
                <TableHead>プラン</TableHead>
                <TableHead>友だち数</TableHead>
                <TableHead>配信/受信</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>登録日</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.clients.map((client) => (
                <TableRow key={client.tenantId}>
                  <TableCell className="font-medium">{client.tenantName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{client.industry || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] capitalize">{client.planName || 'free'}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{client.friendCount.toLocaleString()}</TableCell>
                  <TableCell className="text-sm">
                    <span className="text-green-600">{client.messagesSent.toLocaleString()}</span>
                    {' / '}
                    <span className="text-blue-600">{client.messagesReceived.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.status === 'active' ? 'default' : client.status === 'trial' ? 'secondary' : 'outline'} className="text-[10px]">
                      {client.status === 'active' ? '有効' : client.status === 'trial' ? 'トライアル' : client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(client.createdAt).toLocaleDateString('ja-JP')}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <CardContent>
            <EmptyState
              illustration="generic"
              title="クライアントがいません"
              description="クライアントを招待してLinQアカウントを作成してもらいましょう"
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
