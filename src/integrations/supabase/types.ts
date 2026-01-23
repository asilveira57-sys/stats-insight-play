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
      analytics_config: {
        Row: {
          ga4_enabled: boolean | null
          ga4_measurement_id: string | null
          ga4_property_name: string | null
          ga4_test_measurement_id: string | null
          ga4_use_test_in_dev: boolean | null
          id: string
          pixel_account_name: string | null
          pixel_enabled: boolean | null
          pixel_id: string | null
          pixel_test_id: string | null
          pixel_use_test_in_dev: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          ga4_enabled?: boolean | null
          ga4_measurement_id?: string | null
          ga4_property_name?: string | null
          ga4_test_measurement_id?: string | null
          ga4_use_test_in_dev?: boolean | null
          id?: string
          pixel_account_name?: string | null
          pixel_enabled?: boolean | null
          pixel_id?: string | null
          pixel_test_id?: string | null
          pixel_use_test_in_dev?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          ga4_enabled?: boolean | null
          ga4_measurement_id?: string | null
          ga4_property_name?: string | null
          ga4_test_measurement_id?: string | null
          ga4_use_test_in_dev?: boolean | null
          id?: string
          pixel_account_name?: string | null
          pixel_enabled?: boolean | null
          pixel_id?: string | null
          pixel_test_id?: string | null
          pixel_use_test_in_dev?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      analytics_config_logs: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          environment: string | null
          field_changed: string | null
          id: string
          new_value_masked: string | null
          old_value_masked: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          environment?: string | null
          field_changed?: string | null
          id?: string
          new_value_masked?: string | null
          old_value_masked?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          environment?: string | null
          field_changed?: string | null
          id?: string
          new_value_masked?: string | null
          old_value_masked?: string | null
        }
        Relationships: []
      }
      api_request_cache: {
        Row: {
          created_at: string | null
          endpoint: string
          expires_at: string
          id: string
          params_hash: string
          response: Json | null
          source_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          expires_at: string
          id?: string
          params_hash: string
          response?: Json | null
          source_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          expires_at?: string
          id?: string
          params_hash?: string
          response?: Json | null
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_cache_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
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
      competition_aliases: {
        Row: {
          alias: string
          created_at: string | null
          id: string
          league_id: string | null
          normalized_alias: string
          source_id: string | null
        }
        Insert: {
          alias: string
          created_at?: string | null
          id?: string
          league_id?: string | null
          normalized_alias: string
          source_id?: string | null
        }
        Update: {
          alias?: string
          created_at?: string | null
          id?: string
          league_id?: string | null
          normalized_alias?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_aliases_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "ligas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_aliases_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
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
      data_conflicts: {
        Row: {
          created_at: string | null
          entity_type: string
          field_name: string
          id: string
          internal_id: string | null
          notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_value: string | null
          source_a_id: string | null
          source_b_id: string | null
          value_a: string | null
          value_b: string | null
        }
        Insert: {
          created_at?: string | null
          entity_type: string
          field_name: string
          id?: string
          internal_id?: string | null
          notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_value?: string | null
          source_a_id?: string | null
          source_b_id?: string | null
          value_a?: string | null
          value_b?: string | null
        }
        Update: {
          created_at?: string | null
          entity_type?: string
          field_name?: string
          id?: string
          internal_id?: string | null
          notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_value?: string | null
          source_a_id?: string | null
          source_b_id?: string | null
          value_a?: string | null
          value_b?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_conflicts_source_a_id_fkey"
            columns: ["source_a_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_conflicts_source_b_id_fkey"
            columns: ["source_b_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          api_key_secret_name: string | null
          base_url: string | null
          config: Json | null
          created_at: string | null
          description: string | null
          id: string
          last_reset_date: string | null
          name: string
          priority: number | null
          rate_limit_per_day: number | null
          rate_limit_per_minute: number | null
          requests_today: number | null
          status: Database["public"]["Enums"]["entity_status"]
          type: Database["public"]["Enums"]["source_type"]
          updated_at: string | null
        }
        Insert: {
          api_key_secret_name?: string | null
          base_url?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_reset_date?: string | null
          name: string
          priority?: number | null
          rate_limit_per_day?: number | null
          rate_limit_per_minute?: number | null
          requests_today?: number | null
          status?: Database["public"]["Enums"]["entity_status"]
          type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string | null
        }
        Update: {
          api_key_secret_name?: string | null
          base_url?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_reset_date?: string | null
          name?: string
          priority?: number | null
          rate_limit_per_day?: number | null
          rate_limit_per_minute?: number | null
          requests_today?: number | null
          status?: Database["public"]["Enums"]["entity_status"]
          type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string | null
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
      external_id_map: {
        Row: {
          confidence: Database["public"]["Enums"]["match_confidence"] | null
          created_at: string | null
          entity_type: string
          external_id: string
          id: string
          internal_id: string
          metadata: Json | null
          source_id: string | null
          updated_at: string | null
        }
        Insert: {
          confidence?: Database["public"]["Enums"]["match_confidence"] | null
          created_at?: string | null
          entity_type: string
          external_id: string
          id?: string
          internal_id: string
          metadata?: Json | null
          source_id?: string | null
          updated_at?: string | null
        }
        Update: {
          confidence?: Database["public"]["Enums"]["match_confidence"] | null
          created_at?: string | null
          entity_type?: string
          external_id?: string
          id?: string
          internal_id?: string
          metadata?: Json | null
          source_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_id_map_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
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
      highlights: {
        Row: {
          created_at: string | null
          description: string | null
          duration: number | null
          embed_url: string | null
          id: string
          match_id: string | null
          metadata: Json | null
          provider: string
          published_at: string | null
          source_id: string | null
          thumbnail_url: string | null
          title: string | null
          video_url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          embed_url?: string | null
          id?: string
          match_id?: string | null
          metadata?: Json | null
          provider: string
          published_at?: string | null
          source_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          video_url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          embed_url?: string | null
          id?: string
          match_id?: string | null
          metadata?: Json | null
          provider?: string
          published_at?: string | null
          source_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlights_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlights_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_config: {
        Row: {
          banner_enabled: boolean | null
          banner_text: string | null
          banner_title: string | null
          category_analytics_description: string | null
          category_essential_description: string | null
          category_marketing_description: string | null
          id: string
          policy_updated_at: string | null
          policy_version: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          banner_enabled?: boolean | null
          banner_text?: string | null
          banner_title?: string | null
          category_analytics_description?: string | null
          category_essential_description?: string | null
          category_marketing_description?: string | null
          id?: string
          policy_updated_at?: string | null
          policy_version?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          banner_enabled?: boolean | null
          banner_text?: string | null
          banner_title?: string | null
          category_analytics_description?: string | null
          category_essential_description?: string | null
          category_marketing_description?: string | null
          id?: string
          policy_updated_at?: string | null
          policy_version?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      lgpd_config_logs: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: []
      }
      lgpd_consent_records: {
        Row: {
          action: string
          analytics_accepted: boolean | null
          created_at: string | null
          essential_accepted: boolean | null
          id: string
          ip_anonymized: string | null
          marketing_accepted: boolean | null
          policy_version: string
          user_agent_hash: string | null
          visitor_hash: string
        }
        Insert: {
          action: string
          analytics_accepted?: boolean | null
          created_at?: string | null
          essential_accepted?: boolean | null
          id?: string
          ip_anonymized?: string | null
          marketing_accepted?: boolean | null
          policy_version: string
          user_agent_hash?: string | null
          visitor_hash: string
        }
        Update: {
          action?: string
          analytics_accepted?: boolean | null
          created_at?: string | null
          essential_accepted?: boolean | null
          id?: string
          ip_anonymized?: string | null
          marketing_accepted?: boolean | null
          policy_version?: string
          user_agent_hash?: string | null
          visitor_hash?: string
        }
        Relationships: []
      }
      ligas: {
        Row: {
          api_id: number | null
          api_source: string | null
          ativa: boolean | null
          codigo_api: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          nome: string
          pais: string | null
          pillar_content: Json | null
          pillar_updated_at: string | null
          priority_score: number | null
          score_factors: Json | null
          score_updated_at: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          api_id?: number | null
          api_source?: string | null
          ativa?: boolean | null
          codigo_api?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          pais?: string | null
          pillar_content?: Json | null
          pillar_updated_at?: string | null
          priority_score?: number | null
          score_factors?: Json | null
          score_updated_at?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          api_id?: number | null
          api_source?: string | null
          ativa?: boolean | null
          codigo_api?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          pais?: string | null
          pillar_content?: Json | null
          pillar_updated_at?: string | null
          priority_score?: number | null
          score_factors?: Json | null
          score_updated_at?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      match_events: {
        Row: {
          assist_player_id: string | null
          assist_player_name: string | null
          created_at: string | null
          detail: string | null
          event_type: string
          extra_time: number | null
          id: string
          match_id: string | null
          metadata: Json | null
          minute: number
          player_id: string | null
          player_name: string | null
          source_id: string | null
          team_id: string | null
        }
        Insert: {
          assist_player_id?: string | null
          assist_player_name?: string | null
          created_at?: string | null
          detail?: string | null
          event_type: string
          extra_time?: number | null
          id?: string
          match_id?: string | null
          metadata?: Json | null
          minute: number
          player_id?: string | null
          player_name?: string | null
          source_id?: string | null
          team_id?: string | null
        }
        Update: {
          assist_player_id?: string | null
          assist_player_name?: string | null
          created_at?: string | null
          detail?: string | null
          event_type?: string
          extra_time?: number | null
          id?: string
          match_id?: string | null
          metadata?: Json | null
          minute?: number
          player_id?: string | null
          player_name?: string | null
          source_id?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_events_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      noticias: {
        Row: {
          autor_id: string | null
          created_at: string | null
          data_publicacao: string | null
          id: string
          imagem_url: string | null
          partida_id: string | null
          publicada: boolean | null
          resumo: string | null
          slug: string | null
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
          partida_id?: string | null
          publicada?: boolean | null
          resumo?: string | null
          slug?: string | null
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
          partida_id?: string | null
          publicada?: boolean | null
          resumo?: string | null
          slug?: string | null
          texto?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "noticias_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
        ]
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
          slug: string | null
          slug_locked: boolean
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
          slug?: string | null
          slug_locked?: boolean
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
          slug?: string | null
          slug_locked?: boolean
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
      players: {
        Row: {
          created_at: string | null
          current_team_id: string | null
          date_of_birth: string | null
          id: string
          metadata: Json | null
          name: string
          nationality: string | null
          photo_url: string | null
          position: string | null
          shirt_number: number | null
          short_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_team_id?: string | null
          date_of_birth?: string | null
          id?: string
          metadata?: Json | null
          name: string
          nationality?: string | null
          photo_url?: string | null
          position?: string | null
          shirt_number?: number | null
          short_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_team_id?: string | null
          date_of_birth?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          nationality?: string | null
          photo_url?: string | null
          position?: string | null
          shirt_number?: number | null
          short_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_current_team_id_fkey"
            columns: ["current_team_id"]
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
      seasons: {
        Row: {
          created_at: string | null
          current_matchday: number | null
          end_date: string | null
          id: string
          league_id: string | null
          metadata: Json | null
          start_date: string | null
          status: Database["public"]["Enums"]["entity_status"] | null
          total_matchdays: number | null
          updated_at: string | null
          winner_team_id: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          current_matchday?: number | null
          end_date?: string | null
          id?: string
          league_id?: string | null
          metadata?: Json | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["entity_status"] | null
          total_matchdays?: number | null
          updated_at?: string | null
          winner_team_id?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          current_matchday?: number | null
          end_date?: string | null
          id?: string
          league_id?: string | null
          metadata?: Json | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["entity_status"] | null
          total_matchdays?: number | null
          updated_at?: string | null
          winner_team_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "seasons_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "ligas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      slug_audit_logs: {
        Row: {
          changed_at: string
          changed_by: string | null
          entity_id: string
          entity_type: string
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          entity_id: string
          entity_type: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          entity_id?: string
          entity_type?: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      standings: {
        Row: {
          drawn: number | null
          form: string | null
          goal_difference: number | null
          goals_against: number | null
          goals_for: number | null
          id: string
          lost: number | null
          matchday: number | null
          played: number | null
          points: number | null
          position: number
          season_id: string | null
          team_id: string | null
          updated_at: string | null
          won: number | null
        }
        Insert: {
          drawn?: number | null
          form?: string | null
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          lost?: number | null
          matchday?: number | null
          played?: number | null
          points?: number | null
          position: number
          season_id?: string | null
          team_id?: string | null
          updated_at?: string | null
          won?: number | null
        }
        Update: {
          drawn?: number | null
          form?: string | null
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          lost?: number | null
          matchday?: number | null
          played?: number | null
          points?: number | null
          position?: number
          season_id?: string | null
          team_id?: string | null
          updated_at?: string | null
          won?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "standings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          details: Json | null
          entity_type: string
          error_message: string | null
          id: string
          items_created: number | null
          items_failed: number | null
          items_processed: number | null
          items_updated: number | null
          requests_made: number | null
          source_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["sync_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          details?: Json | null
          entity_type: string
          error_message?: string | null
          id?: string
          items_created?: number | null
          items_failed?: number | null
          items_processed?: number | null
          items_updated?: number | null
          requests_made?: number | null
          source_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          details?: Json | null
          entity_type?: string
          error_message?: string | null
          id?: string
          items_created?: number | null
          items_failed?: number | null
          items_processed?: number | null
          items_updated?: number | null
          requests_made?: number | null
          source_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"]
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_schedules: {
        Row: {
          config: Json | null
          created_at: string | null
          cron_expression: string | null
          enabled: boolean | null
          entity_type: string
          frequency: string
          id: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
          source_id: string | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          cron_expression?: string | null
          enabled?: boolean | null
          entity_type: string
          frequency: string
          id?: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          source_id?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          cron_expression?: string | null
          enabled?: boolean | null
          entity_type?: string
          frequency?: string
          id?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          source_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_schedules_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      team_aliases: {
        Row: {
          alias: string
          created_at: string | null
          id: string
          normalized_alias: string
          source_id: string | null
          team_id: string | null
        }
        Insert: {
          alias: string
          created_at?: string | null
          id?: string
          normalized_alias: string
          source_id?: string | null
          team_id?: string | null
        }
        Update: {
          alias?: string
          created_at?: string | null
          id?: string
          normalized_alias?: string
          source_id?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_aliases_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_aliases_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
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
          cores: Json | null
          created_at: string | null
          escudo_url: string | null
          id: string
          name_normalized: string | null
          nome: string
          pais: string | null
          pillar_content: Json | null
          pillar_updated_at: string | null
          priority_score: number | null
          score_factors: Json | null
          score_updated_at: string | null
          slug: string | null
          slug_locked: boolean
          updated_at: string | null
        }
        Insert: {
          api_id?: number | null
          cores?: Json | null
          created_at?: string | null
          escudo_url?: string | null
          id?: string
          name_normalized?: string | null
          nome: string
          pais?: string | null
          pillar_content?: Json | null
          pillar_updated_at?: string | null
          priority_score?: number | null
          score_factors?: Json | null
          score_updated_at?: string | null
          slug?: string | null
          slug_locked?: boolean
          updated_at?: string | null
        }
        Update: {
          api_id?: number | null
          cores?: Json | null
          created_at?: string | null
          escudo_url?: string | null
          id?: string
          name_normalized?: string | null
          nome?: string
          pais?: string | null
          pillar_content?: Json | null
          pillar_updated_at?: string | null
          priority_score?: number | null
          score_factors?: Json | null
          score_updated_at?: string | null
          slug?: string | null
          slug_locked?: boolean
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
      consolidate_team_aliases: {
        Args: never
        Returns: {
          alias_created: boolean
          team_id: string
          team_name: string
        }[]
      }
      count_teams_with_aliases: {
        Args: { p_search?: string; p_status?: string }
        Returns: number
      }
      find_match_by_canonical_key: {
        Args: { p_data: string; p_time_casa_id: string; p_time_fora_id: string }
        Returns: string
      }
      generate_match_slug: {
        Args: { p_data: string; p_time_casa_id: string; p_time_fora_id: string }
        Returns: string
      }
      generate_unique_slug: {
        Args: { base_slug: string; exclude_id?: string; table_name: string }
        Returns: string
      }
      gerar_palpite_sistema: { Args: { p_partida_id: string }; Returns: string }
      get_suggested_duplicates: {
        Args: { p_limit?: number }
        Returns: {
          reason: string
          similarity_score: number
          team_a_id: string
          team_a_name: string
          team_a_slug: string
          team_b_id: string
          team_b_name: string
          team_b_slug: string
        }[]
      }
      get_teams_with_aliases: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
        }
        Returns: {
          alias_count: number
          escudo_url: string
          id: string
          match_count: number
          nome: string
          pais: string
          slug: string
          status: string
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      merge_teams: {
        Args: { p_merged_by?: string; p_source_id: string; p_target_id: string }
        Returns: Json
      }
      normalize_name: { Args: { input_text: string }; Returns: string }
      normalize_name_for_slug: { Args: { input_name: string }; Returns: string }
      processar_resultado_partida: {
        Args: { p_partida_id: string }
        Returns: undefined
      }
      resolve_or_create_league: {
        Args: {
          p_api_id?: number
          p_codigo_api?: string
          p_external_id?: string
          p_logo_url?: string
          p_nome: string
          p_pais?: string
          p_provider_id?: string
        }
        Returns: string
      }
      resolve_or_create_match: {
        Args: {
          p_api_id?: number
          p_data: string
          p_hora?: string
          p_liga_id?: string
          p_rodada?: number
          p_status?: string
          p_time_casa_id: string
          p_time_fora_id: string
        }
        Returns: string
      }
      resolve_or_create_team: {
        Args: {
          p_api_id?: number
          p_escudo_url?: string
          p_external_id?: string
          p_nome: string
          p_pais?: string
          p_provider_id?: string
        }
        Returns: string
      }
      slugify: { Args: { input_text: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      assinatura_status: "active" | "cancelled" | "expired"
      competition_type: "league" | "cup" | "tournament" | "friendly"
      entity_status: "active" | "inactive" | "pending" | "error"
      match_confidence: "low" | "medium" | "high" | "exact"
      partida_status:
        | "scheduled"
        | "live"
        | "finished"
        | "postponed"
        | "cancelled"
      plano_tipo: "free" | "premium"
      source_type: "api" | "github" | "manual"
      sync_status: "pending" | "running" | "completed" | "failed"
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
      competition_type: ["league", "cup", "tournament", "friendly"],
      entity_status: ["active", "inactive", "pending", "error"],
      match_confidence: ["low", "medium", "high", "exact"],
      partida_status: [
        "scheduled",
        "live",
        "finished",
        "postponed",
        "cancelled",
      ],
      plano_tipo: ["free", "premium"],
      source_type: ["api", "github", "manual"],
      sync_status: ["pending", "running", "completed", "failed"],
    },
  },
} as const
