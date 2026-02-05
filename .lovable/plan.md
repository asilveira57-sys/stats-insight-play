

# Plano: Adicionar Botão "Rebuild Artilharia" no Admin Control Center

## Objetivo
Adicionar um botão no painel administrativo para executar manualmente a função `rebuild-artilharia`, que reprocessa todos os gols e atualiza a tabela `artilharia_agregada`.

## Localização
O botão será adicionado no card **"Geração Manual"** na aba **"Conteúdo"** (`/admin/control-center`), junto aos outros botões de ação manual existentes.

## Alterações

### 1. Atualizar `src/pages/AdminControlCenter.tsx`

**Adicionar handler para rebuild-artilharia:**
```typescript
const handleRebuildArtilharia = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('rebuild-artilharia');
    if (error) throw error;
    toast({ 
      title: "Artilharia reconstruída!", 
      description: `${data.goals_processed} gols processados, ${data.aggregations_created} agregações criadas.` 
    });
    refetchLogs();
  } catch (error) {
    toast({ 
      title: "Erro ao reconstruir artilharia", 
      description: String(error), 
      variant: "destructive" 
    });
  }
};
```

**Adicionar botão no card "Geração Manual":**
```tsx
<Button 
  variant="outline" 
  className="w-full justify-start" 
  onClick={handleRebuildArtilharia}
>
  <Trophy className="w-4 h-4 mr-2" /> 
  Reconstruir Artilharia
</Button>
```

## Comportamento
- Ao clicar, executa a edge function `rebuild-artilharia`
- Exibe toast de sucesso com quantidade de gols e agregações
- Exibe toast de erro em caso de falha
- Atualiza automaticamente os logs após execução

## Detalhes Técnicos

| Item | Detalhe |
|------|---------|
| Arquivo | `src/pages/AdminControlCenter.tsx` |
| Posição | Card "Geração Manual", após o botão "Gerar Pilares de Ligas" |
| Ícone | `Trophy` (já importado) |
| Edge Function | `rebuild-artilharia` (já existente) |

