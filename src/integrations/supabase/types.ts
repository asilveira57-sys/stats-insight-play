export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assinaturas: {
        Row: {
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          status: Database["public"]["Enums"]["assinatura_status"] | null
          tipo_plano: Database["public"]["Enums"]["plano_tipo"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          status?: Database["public"]["Enums"]["assinatura_status"] | null
          tipo_plano?: Database["public"]["Enums"]["plano_tipo"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          status?: Database["public"]["Enums"]["assinatura_status"] | null
          tipo_plano?: Database["public"]["Enums"]["plano_tipo"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cartoes_partida: {
        Row: {
          created_at: string | null
          id: string
          jogador_api_id: number | null
          jogador_nome: string
          minuto: number
          partida_id: string
          time_id: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          jogador_api_id?: number | null
          jogador_nome: string
          minuto: number
          partida_id: string
          time_id?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          jogador_api_id?: number | null
          jogador_nome?: string
          minuto?: number
          partida_id?: string
          time_id?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cartoes_partida_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartoes_partida_time_id_fkey"
            columns: ["time_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      comparativo_resultados: {
        Row: {
          created_at: string | null
          id: string
          palpite_sistema_id: string | null
          partida_id: string
          placar_oficial_casa: number | null
          placar_oficial_fora: number | null
          resultado_oficial: string | null
          sistema_acertou_placar: boolean | null
          sistema_acertou_resultado: boolean | null
          sistema_placar_casa: number | null
          sistema_placar_fora: number | null
          sistema_prob_resultado: number | null
          sistema_resultado_previsto: string | null
          total_usuarios_palpitaram: number | null
          updated_at: string | null
          usuarios_acertaram_placar: number | null
          usuarios_acertaram_resultado: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          palpite_sistema_id?: string | null
          partida_id: string
          placar_oficial_casa?: number | null
          placar_oficial_fora?: number | null
          resultado_oficial?: string | null
          sistema_acertou_placar?: boolean | null
          sistema_acertou_resultado?: boolean | null
          sistema_placar_casa?: number | null
          sistema_placar_fora?: number | null
          sistema_prob_resultado?: number | null
          sistema_resultado_previsto?: string | null
          total_usuarios_palpitaram?: number | null
          updated_at?: string | null
          usuarios_acertaram_placar?: number | null
          usuarios_acertaram_resultado?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          palpite_sistema_id?: string | null
          partida_id?: string
          placar_oficial_casa?: number | null
          placar_oficial_fora?: number | null
          resultado_oficial?: string | null
          sistema_acertou_placar?: boolean | null
          sistema_acertou_resultado?: boolean | null
          sistema_placar_casa?: number | null
          sistema_placar_fora?: number | null
          sistema_prob_resultado?: number | null
          sistema_resultado_previsto?: string | null
          total_usuarios_palpitaram?: number | null
          updated_at?: string | null
          usuarios_acertaram_placar?: number | null
          usuarios_acertaram_resultado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comparativo_resultados_palpite_sistema_id_fkey"
            columns: ["palpite_sistema_id"]
            isOneToOne: false
            referencedRelation: "palpites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparativo_resultados_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: true
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          chave: string
          created_at: string | null
          descricao: string | null
          id: string
          updated_at: string | null
          valor: string | null
        }
        Insert: {
          chave: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          updated_at?: string | null
          valor?: string | null
        }
        Update: {
          chave?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          updated_at?: string | null
          valor?: string | null
        }
        Relationships: []
      }
      escalacoes: {
        Row: {
          created_at: string | null
          formacao: string | null
          id: string
          jogador_api_id: number | null
          jogador_nome: string
          numero_camisa: number | null
          partida_id: string
          posicao: string | null
          time_id: string | null
          titular: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          formacao?: string | null
          id?: string
          jogador_api_id?: number | null
          jogador_nome: string
          numero_camisa?: number | null
          partida_id: string
          posicao?: string | null
          time_id?: string | null
          titular?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          formacao?: string | null
          id?: string
          jogador_api_id?: number | null
          jogador_nome?: string
          numero_camisa?: number | null
          partida_id?: string
          posicao?: string | null
          time_id?: string | null
          titular?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalacoes_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalacoes_time_id_fkey"
            columns: ["time_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      estatisticas: {
        Row: {
          cartoes_amarelos: number | null
          cartoes_vermelhos: number | null
          created_at: string | null
          escanteios: number | null
          faltas: number | null
          finalizacoes: number | null
          finalizacoes_no_alvo: number | null
          id: string
          impedimentos: number | null
          partida_id: string
          passes: number | null
          passes_certos: number | null
          posse: number | null
          time_id: string | null
          updated_at: string | null
          xg: number | null
        }
        Insert: {
          cartoes_amarelos?: number | null
          cartoes_vermelhos?: number | null
          created_at?: string | null
          escanteios?: number | null
          faltas?: number | null
          finalizacoes?: number | null
          finalizacoes_no_alvo?: number | null
          id?: string
          impedimentos?: number | null
          partida_id: string
          passes?: number | null
          passes_certos?: number | null
          posse?: number | null
          time_id?: string | null
          updated_at?: string | null
          xg?: number | null
        }
        Update: {
          cartoes_amarelos?: number | null
          cartoes_vermelhos?: number | null
          created_at?: string | null
          escanteios?: number | null
          faltas?: number | null
          finalizacoes?: number | null
          finalizacoes_no_alvo?: number | null
          id?: string
          impedimentos?: number | null
          partida_id?: string
          passes?: number | null
          passes_certos?: number | null
          posse?: number | null
          time_id?: string | null
          updated_at?: string | null
          xg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estatisticas_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estatisticas_time_id_fkey"
            columns: ["time_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      gols_partida: {
        Row: {
          acrescimo: number | null
          assistente_api_id: number | null
          assistente_nome: string | null
          created_at: string | null
          id: string
          jogador_api_id: number | null
          jogador_nome: string
          minuto: number
          partida_id: string
          placar_casa: number | null
          placar_fora: number | null
          time_id: string | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          acrescimo?: number | null
          assistente_api_id?: number | null
          assistente_nome?: string | null
          created_at?: string | null
          id?: string
          jogador_api_id?: number | null
          jogador_nome: string
          minuto: number
          partida_id: string
          placar_casa?: number | null
          placar_fora?: number | null
          time_id?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          acrescimo?: number | null
          assistente_api_id?: number | null
          assistente_nome?: string | null
          created_at?: string | null
          id?: string
          jogador_api_id?: number | null
          jogador_nome?: string
          minuto?: number
          partida_id?: string
          placar_casa?: number | null
          placar_fora?: number | null
          time_id?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gols_partida_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gols_partida_time_id_fkey"
            columns: ["time_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      ligas: {
        Row: {
          api_id: number | null
          ativa: boolean | null
          codigo_api: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          nome: string
          pais: string | null
          updated_at: string | null
        }
        Insert: {
          api_id?: number | null
          ativa?: boolean | null
          codigo_api?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          pais?: string | null
          updated_at?: string | null
        }
        Update: {
          api_id?: number | null
          ativa?: boolean | null
          codigo_api?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          pais?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      noticias: {
        Row: {
          autor_id: string | null
          created_at: string | null
          data_publicacao: string | null
          id: string
          imagem_url: string | null
          publicada: boolean | null
          resumo: string | null
          texto: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          autor_id?: string | null
          created_at?: string | null
          data_publicacao?: string | null
          id?: string
          imagem_url?: string | null
          publicada?: boolean | null
          resumo?: string | null
          texto: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          autor_id?: string | null
          created_at?: string | null
          data_publicacao?: string | null
          id?: string
          imagem_url?: string | null
          publicada?: boolean | null
          resumo?: string | null
          texto?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      palpites: {
        Row: {
          analise: string | null
          confianca: number | null
          created_at: string | null
          forca_time_casa: number | null
          forca_time_fora: number | null
          id: string
          partida_id: string
          placar_casa_estimado: number | null
          placar_fora_estimado: number | null
          prob_casa: number | null
          prob_empate: number | null
          prob_fora: number | null
          updated_at: string | null
        }
        Insert: {
          analise?: string | null
          confianca?: number | null
          created_at?: string | null
          forca_time_casa?: number | null
          forca_time_fora?: number | null
          id?: string
          partida_id: string
          placar_casa_estimado?: number | null
          placar_fora_estimado?: number | null
          prob_casa?: number | null
          prob_empate?: number | null
          prob_fora?: number | null
          updated_at?: string | null
        }
        Update: {
          analise?: string | null
          confianca?: number | null
          created_at?: string | null
          forca_time_casa?: number | null
          forca_time_fora?: number | null
          id?: string
          partida_id?: string
          placar_casa_estimado?: number | null
          placar_fora_estimado?: number | null
          prob_casa?: number | null
          prob_empate?: number | null
          prob_fora?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "palpites_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: true
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
        ]
      }
      palpites_usuarios: {
        Row: {
          aceitou_sugestao: boolean | null
          created_at: string | null
          id: string
          palpite_sistema_id: string | null
          partida_id: string
          placar_casa: number
          placar_fora: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aceitou_sugestao?: boolean | null
          created_at?: string | null
          id?: string
          palpite_sistema_id?: string | null
          partida_id: string
          placar_casa: number
          placar_fora: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aceitou_sugestao?: boolean | null
          created_at?: string | null
          id?: string
          palpite_sistema_id?: string | null
          partida_id?: string
          placar_casa?: number
          placar_fora?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "palpites_usuarios_palpite_sistema_id_fkey"
            columns: ["palpite_sistema_id"]
            isOneToOne: false
            referencedRelation: "palpites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "palpites_usuarios_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
        ]
      }
      partidas: {
        Row: {
          api_id: number | null
          created_at: string | null
          data: string
          detalhes_sincronizados: boolean | null
          gols_casa: number | null
          gols_fora: number | null
          hora: string | null
          id: string
          liga_id: string | null
          rodada: number | null
          status: Database["public"]["Enums"]["partida_status"] | null
          time_casa_id: string | null
          time_fora_id: string | null
          updated_at: string | null
        }
        Insert: {
          api_id?: number | null
          created_at?: string | null
          data: string
          detalhes_sincronizados?: boolean | null
          gols_casa?: number | null
          gols_fora?: number | null
          hora?: string | null
          id?: string
          liga_id?: string | null
          rodada?: number | null
          status?: Database["public"]["Enums"]["partida_status"] | null
          time_casa_id?: string | null
          time_fora_id?: string | null
          updated_at?: string | null
        }
        Update: {
          api_id?: number | null
          created_at?: string | null
          data?: string
          detalhes_sincronizados?: boolean | null
          gols_casa?: number | null
          gols_fora?: number | null
          hora?: string | null
          id?: string
          liga_id?: string | null
          rodada?: number | null
          status?: Database["public"]["Enums"]["partida_status"] | null
          time_casa_id?: string | null
          time_fora_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partidas_liga_id_fkey"
            columns: ["liga_id"]
            isOneToOne: false
            referencedRelation: "ligas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidas_time_casa_id_fkey"
            columns: ["time_casa_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidas_time_fora_id_fkey"
            columns: ["time_fora_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string | null
          plano: Database["public"]["Enums"]["plano_tipo"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          plano?: Database["public"]["Enums"]["plano_tipo"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          plano?: Database["public"]["Enums"]["plano_tipo"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tecnico_partida: {
        Row: {
          created_at: string | null
          id: string
          partida_id: string
          tecnico_id: string | null
          time_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          partida_id: string
          tecnico_id?: string | null
          time_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          partida_id?: string
          tecnico_id?: string | null
          time_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tecnico_partida_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tecnico_partida_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "tecnicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tecnico_partida_time_id_fkey"
            columns: ["time_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      tecnicos: {
        Row: {
          api_id: number | null
          created_at: string | null
          id: string
          nacionalidade: string | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          api_id?: number | null
          created_at?: string | null
          id?: string
          nacionalidade?: string | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          api_id?: number | null
          created_at?: string | null
          id?: string
          nacionalidade?: string | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      times: {
        Row: {
          api_id: number | null
          created_at: string | null
          escudo_url: string | null
          id: string
          nome: string
          pais: string | null
          updated_at: string | null
        }
        Insert: {
          api_id?: number | null
          created_at?: string | null
          escudo_url?: string | null
          id?: string
          nome: string
          pais?: string | null
          updated_at?: string | null
        }
        Update: {
          api_id?: number | null
          created_at?: string | null
          escudo_url?: string | null
          id?: string
          nome?: string
          pais?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gerar_palpite_sistema: { Args: { p_partida_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      processar_resultado_partida: {
        Args: { p_partida_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      assinatura_status: "active" | "cancelled" | "expired"
      partida_status:
        | "scheduled"
        | "live"
        | "finished"
        | "postponed"
        | "cancelled"
      plano_tipo: "free" | "premium"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      assinatura_status: ["active", "cancelled", "expired"],
      partida_status: [
        "scheduled",
        "live",
        "finished",
        "postponed",
        "cancelled",
      ],
      plano_tipo: ["free", "premium"],
    },
  },
} as const
