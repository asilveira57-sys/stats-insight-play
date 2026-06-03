import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserSearchHistory } from "@/hooks/useIntelligentSearch";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function UserSearchHistory() {
  const { data, isLoading } = useUserSearchHistory(30);
  const qc = useQueryClient();

  const clear = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("user_search_history").delete().eq("user_id", u.user.id);
    qc.invalidateQueries({ queryKey: ["user-search-history"] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Meu histórico
        </CardTitle>
        {data && data.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : !data || data.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma busca ainda.</p>
        ) : (
          data.map((h: any) => (
            <Link
              key={h.id}
              to={`/pesquisa?q=${encodeURIComponent(h.query_text)}`}
              className="block py-1 px-2 text-sm rounded hover:bg-muted/50 transition-colors truncate"
            >
              {h.query_text}
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
