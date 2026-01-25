import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminUserDetails } from '@/hooks/useAdminUserProfiles';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { ArrowLeft, User, CreditCard, FileText, Trophy, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();

  const { data, isLoading } = useAdminUserDetails(userId || '');

  if (adminLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-destructive">Acesso não autorizado</p>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-destructive">Usuário não encontrado</p>
        </div>
      </Layout>
    );
  }

  const { profile, publicProfile, fiscalData, subscription, gamification, activities, roles } =
    data;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/usuarios')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile?.nome || 'Usuário'}</h1>
            <p className="text-muted-foreground">{profile?.email}</p>
          </div>
          <div className="flex gap-2">
            {roles?.map((role) => (
              <Badge key={role} variant="outline">
                {role}
              </Badge>
            ))}
            <Badge variant={profile?.status === 'active' ? 'default' : 'destructive'}>
              {profile?.status || 'active'}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Plano
            </TabsTrigger>
            <TabsTrigger value="fiscal" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Fiscal
            </TabsTrigger>
            <TabsTrigger value="gamification" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Gamificação
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Atividades
            </TabsTrigger>
          </TabsList>

          {/* Tab: Perfil */}
          <TabsContent value="profile" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Dados Básicos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">ID</p>
                    <p className="font-mono text-sm">{profile?.user_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p>{profile?.nome || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p>{profile?.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Criado em</p>
                    <p>
                      {profile?.created_at
                        ? format(new Date(profile.created_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })
                        : '-'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Perfil Público</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Nickname</p>
                    <p className="font-mono">
                      {publicProfile?.nickname ? `@${publicProfile.nickname}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status do Avatar</p>
                    <Badge variant="outline">{publicProfile?.avatar_status || 'default'}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bio</p>
                    <p className="text-sm">{publicProfile?.bio || '-'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Plano */}
          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle>Assinatura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Plano</p>
                    <Badge
                      variant={subscription?.tipo_plano === 'premium' ? 'default' : 'secondary'}
                      className={subscription?.tipo_plano === 'premium' ? 'bg-yellow-500' : ''}
                    >
                      {subscription?.tipo_plano || 'free'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      variant={subscription?.status === 'active' ? 'default' : 'destructive'}
                    >
                      {subscription?.status || 'active'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Origem</p>
                    <p>{subscription?.origem || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Início</p>
                    <p>
                      {subscription?.data_inicio
                        ? format(new Date(subscription.data_inicio), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })
                        : '-'}
                    </p>
                  </div>
                </div>
                {subscription?.cancelled_at && (
                  <div className="mt-4 p-4 bg-destructive/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Cancelado em</p>
                    <p>
                      {format(new Date(subscription.cancelled_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                    {subscription.cancellation_reason && (
                      <>
                        <p className="text-sm text-muted-foreground mt-2">Motivo</p>
                        <p>{subscription.cancellation_reason}</p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Fiscal */}
          <TabsContent value="fiscal">
            <Card>
              <CardHeader>
                <CardTitle>Dados Fiscais (NF)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">CPF</p>
                    <p className="font-mono">
                      {fiscalData?.cpf || '-'}
                      {fiscalData?.cpf_validated && (
                        <Badge variant="outline" className="ml-2">
                          Validado
                        </Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nome Fiscal</p>
                    <p>{fiscalData?.nome_fiscal || '-'}</p>
                  </div>
                </div>
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm font-medium mb-3">Endereço</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">CEP</p>
                      <p className="font-mono">{fiscalData?.cep || '-'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Logradouro</p>
                      <p>
                        {fiscalData?.logradouro || '-'}
                        {fiscalData?.numero && `, ${fiscalData.numero}`}
                        {fiscalData?.complemento && ` - ${fiscalData.complemento}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bairro</p>
                      <p>{fiscalData?.bairro || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cidade</p>
                      <p>{fiscalData?.cidade || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estado</p>
                      <p>{fiscalData?.estado || '-'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Gamificação */}
          <TabsContent value="gamification">
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Gamificação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-3xl font-bold">{gamification?.total_palpites || 0}</p>
                    <p className="text-sm text-muted-foreground">Total de Palpites</p>
                  </div>
                  <div className="text-center p-4 bg-green-500/10 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">
                      {gamification?.total_acertos || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Acertos</p>
                  </div>
                  <div className="text-center p-4 bg-red-500/10 rounded-lg">
                    <p className="text-3xl font-bold text-red-600">
                      {gamification?.total_erros || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Erros</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                    <p className="text-3xl font-bold text-yellow-600">
                      {gamification?.acertos_placar_exato || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Placares Exatos</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-6">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{gamification?.pontuacao_total || 0}</p>
                    <p className="text-sm text-muted-foreground">Pontuação Total</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{gamification?.sequencia_atual || 0}</p>
                    <p className="text-sm text-muted-foreground">Sequência Atual</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{gamification?.maior_sequencia || 0}</p>
                    <p className="text-sm text-muted-foreground">Maior Sequência</p>
                  </div>
                </div>
                {gamification?.last_palpite_at && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Último palpite:{' '}
                    {format(new Date(gamification.last_palpite_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Atividades */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Atividades</CardTitle>
              </CardHeader>
              <CardContent>
                {activities?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma atividade registrada
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities?.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell>
                            {format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{activity.action_category}</Badge>
                          </TableCell>
                          <TableCell>{activity.action_type}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {JSON.stringify(activity.details)}
                            </code>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
