import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Eye, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WebhookEvent {
  id: string;
  event_id: string;
  topic: string;
  action: string | null;
  resource_id: string | null;
  received_at: string;
  processed_at: string | null;
  processing_status: string;
  error_message: string | null;
  retry_count: number;
  payload: any;
}

export default function AdminWebhooks() {
  const { isAdmin, isLoading: loadingAdmin } = useAdminAccess();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-webhooks", statusFilter, topicFilter],
    queryFn: async () => {
      let query = supabase
        .from("webhook_events")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") {
        query = query.eq("processing_status", statusFilter as "pending" | "processing" | "processed" | "failed" | "skipped");
      }
      if (topicFilter !== "all") {
        query = query.eq("topic", topicFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WebhookEvent[];
    },
    enabled: isAdmin,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const filteredEvents = events?.filter(event => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      event.event_id.toLowerCase().includes(searchLower) ||
      event.topic.toLowerCase().includes(searchLower) ||
      event.resource_id?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "processing":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      processed: "default",
      processing: "secondary",
      failed: "destructive",
      pending: "outline",
      skipped: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  const uniqueTopics = [...new Set(events?.map(e => e.topic) || [])];

  if (loadingAdmin) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold">Logs de Webhooks</h1>
          <p className="text-muted-foreground">Auditoria de eventos recebidos do Mercado Pago</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{events?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-green-500">
                {events?.filter(e => e.processing_status === "processed").length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Processados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-yellow-500">
                {events?.filter(e => e.processing_status === "pending" || e.processing_status === "processing").length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-red-500">
                {events?.filter(e => e.processing_status === "failed").length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Falhas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-muted-foreground">
                {events?.filter(e => e.processing_status === "skipped").length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Ignorados</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por event_id, topic ou resource_id..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="processed">Processados</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="failed">Falhas</SelectItem>
                  <SelectItem value="skipped">Ignorados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={topicFilter} onValueChange={setTopicFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos topics</SelectItem>
                  {uniqueTopics.map(topic => (
                    <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos Recebidos</CardTitle>
            <CardDescription>
              Últimos 200 webhooks • Atualiza automaticamente a cada 30s
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recebido</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents?.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(event.received_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{event.topic}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {event.action || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {event.resource_id || "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(event.processing_status)}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {event.processed_at 
                            ? format(new Date(event.processed_at), "dd/MM HH:mm:ss", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setSelectedEvent(event)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Detalhes do Webhook</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Event ID</p>
                                    <p className="font-mono text-sm">{event.event_id}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Topic</p>
                                    <p>{event.topic}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Resource ID</p>
                                    <p className="font-mono text-sm">{event.resource_id || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    {getStatusBadge(event.processing_status)}
                                  </div>
                                </div>
                                
                                {event.error_message && (
                                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                                    <p className="text-sm font-medium text-destructive">Erro:</p>
                                    <p className="text-sm">{event.error_message}</p>
                                  </div>
                                )}

                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">Payload</p>
                                  <pre className="p-4 rounded-lg bg-muted text-xs overflow-x-auto">
                                    {JSON.stringify(event.payload, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
