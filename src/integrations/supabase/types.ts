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
      ai_answers_log: {
        Row: {
          answer: string
          confidence_score: number
          created_at: string
          data_sources_used: Json
          has_enough_data: boolean
          id: string
          normalized_question: string
          question: string
          user_id: string | null
        }
        Insert: {
          answer: string
          confidence_score?: number
          created_at?: string
          data_sources_used?: Json
          has_enough_data?: boolean
          id?: string
          normalized_question: string
          question: string
          user_id?: string | null
        }
        Update: {
          answer?: string
          confidence_score?: number
          created_at?: string
          data_sources_used?: Json
          has_enough_data?: boolean
          id?: string
          normalized_question?: string
          question?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analysis_audit: {
        Row: {
          analysis_id: string
          analysis_source: string
          audit_grade: string
          audit_score: number
          badge: string
          claims_detail: Json
          created_at: string
          data_source_count: number
          id: string
          inconsistent_claims: number
          match_id: string | null
          model_version: string
          unverified_claims: number
          verified_claims: number
        }
        Insert: {
          analysis_id: string
          analysis_source: string
          audit_grade?: string
          audit_score?: number
          badge?: string
          claims_detail?: Json
          created_at?: string
          data_source_count?: number
          id?: string
          inconsistent_claims?: number
          match_id?: string | null
          model_version?: string
          unverified_claims?: number
          verified_claims?: number
        }
        Update: {
          analysis_id?: string
          analysis_source?: string
          audit_grade?: string
          audit_score?: number
          badge?: string
          claims_detail?: Json
          created_at?: string
          data_source_count?: number
          id?: string
          inconsistent_claims?: number
          match_id?: string | null
          model_version?: string
          unverified_claims?: number
          verified_claims?: number
        }
        Relationships: []
      }
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
      api_football_import_jobs: {
        Row: {
          created_at: string
          depth: string
          error: string | null
          finished_at: string | null
          fixtures_processed: number | null
          fixtures_total: number | null
          id: string
          league_id: number
          league_name: string | null
          priority: number
          requests_estimated: number | null
          requests_used: number | null
          season: number
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          depth: string
          error?: string | null
          finished_at?: string | null
          fixtures_processed?: number | null
          fixtures_total?: number | null
          id?: string
          league_id: number
          league_name?: string | null
          priority?: number
          requests_estimated?: number | null
          requests_used?: number | null
          season: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          depth?: string
          error?: string | null
          finished_at?: string | null
          fixtures_processed?: number | null
          fixtures_total?: number | null
          id?: string
          league_id?: number
          league_name?: string | null
          priority?: number
          requests_estimated?: number | null
          requests_used?: number | null
          season?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_football_inventory: {
        Row: {
          country: string | null
          country_code: string | null
          created_at: string
          flag_url: string | null
          id: string
          is_priority: boolean
          last_refresh: string
          league_id: number
          league_name: string
          league_type: string | null
          logo_url: string | null
          seasons: Json
          updated_at: string
        }
        Insert: {
          country?: string | null
          country_code?: string | null
          created_at?: string
          flag_url?: string | null
          id?: string
          is_priority?: boolean
          last_refresh?: string
          league_id: number
          league_name: string
          league_type?: string | null
          logo_url?: string | null
          seasons?: Json
          updated_at?: string
        }
        Update: {
          country?: string | null
          country_code?: string | null
          created_at?: string
          flag_url?: string | null
          id?: string
          is_priority?: boolean
          last_refresh?: string
          league_id?: number
          league_name?: string
          league_type?: string | null
          logo_url?: string | null
          seasons?: Json
          updated_at?: string
        }
        Relationships: []
      }
      api_football_quota_log: {
        Row: {
          created_at: string
          daily_limit: number
          day: string
          id: string
          last_check: string
          requests_used: number
        }
        Insert: {
          created_at?: string
          daily_limit?: number
          day: string
          id?: string
          last_check?: string
          requests_used?: number
        }
        Update: {
          created_at?: string
          daily_limit?: number
          day?: string
          id?: string
          last_check?: string
          requests_used?: number
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
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      artilharia_agregada: {
        Row: {
          atualizado_em: string
          competicao_id: string | null
          created_at: string | null
          gols: number
          id: string
          jogador_nome: string
          jogador_slug: string
          partidas_com_gol: number | null
          temporada: string | null
          time_id: string | null
        }
        Insert: {
          atualizado_em?: string
          competicao_id?: string | null
          created_at?: string | null
          gols?: number
          id?: string
          jogador_nome: string
          jogador_slug: string
          partidas_com_gol?: number | null
          temporada?: string | null
          time_id?: string | null
        }
        Update: {
          atualizado_em?: string
          competicao_id?: string | null
          created_at?: string | null
          gols?: number
          id?: string
          jogador_nome?: string
          jogador_slug?: string
          partidas_com_gol?: number | null
          temporada?: string | null
          time_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artilharia_agregada_competicao_id_fkey"
            columns: ["competicao_id"]
            isOneToOne: false
            referencedRelation: "ligas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artilharia_agregada_time_id_fkey"
            columns: ["time_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          data_fim: string | null
          data_inicio: string | null
          grace_until: string | null
          id: string
          last_payment_at: string | null
          mp_payer_id: string | null
          mp_preapproval_id: string | null
          next_payment_due: string | null
          origem: string | null
          plan_id: string | null
          status: Database["public"]["Enums"]["assinatura_status"] | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          tipo_plano: Database["public"]["Enums"]["plano_tipo"] | null
          total_days_credited: number | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          grace_until?: string | null
          id?: string
          last_payment_at?: string | null
          mp_payer_id?: string | null
          mp_preapproval_id?: string | null
          next_payment_due?: string | null
          origem?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["assinatura_status"] | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          tipo_plano?: Database["public"]["Enums"]["plano_tipo"] | null
          total_days_credited?: number | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          grace_until?: string | null
          id?: string
          last_payment_at?: string | null
          mp_payer_id?: string | null
          mp_preapproval_id?: string | null
          next_payment_due?: string | null
          origem?: string | null
          plan_id?: string | null
          status?: Database["public"]["Enums"]["assinatura_status"] | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          tipo_plano?: Database["public"]["Enums"]["plano_tipo"] | null
          total_days_credited?: number | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      background_jobs: {
        Row: {
          created_at: string | null
          id: string
          job_type: string
          progress: Json
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_type: string
          progress?: Json
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_type?: string
          progress?: Json
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_key: string
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          rarity: string
        }
        Insert: {
          badge_key: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name: string
          rarity?: string
        }
        Update: {
          badge_key?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          rarity?: string
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
      cartola_atletas: {
        Row: {
          apelido: string
          cartola_atleta_id: number
          clube_id: number | null
          created_at: string
          nome: string | null
          posicao_id: number | null
          status_id: number | null
          updated_at: string
        }
        Insert: {
          apelido: string
          cartola_atleta_id: number
          clube_id?: number | null
          created_at?: string
          nome?: string | null
          posicao_id?: number | null
          status_id?: number | null
          updated_at?: string
        }
        Update: {
          apelido?: string
          cartola_atleta_id?: number
          clube_id?: number | null
          created_at?: string
          nome?: string | null
          posicao_id?: number | null
          status_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartola_atletas_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "cartola_clubes"
            referencedColumns: ["cartola_clube_id"]
          },
        ]
      }
      cartola_clubes: {
        Row: {
          abreviacao: string | null
          cartola_clube_id: number
          created_at: string
          escudo_url: string | null
          nome: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          abreviacao?: string | null
          cartola_clube_id: number
          created_at?: string
          escudo_url?: string | null
          nome: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          abreviacao?: string | null
          cartola_clube_id?: number
          created_at?: string
          escudo_url?: string | null
          nome?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cartola_partidas: {
        Row: {
          cartola_partida_id: number | null
          casa_clube_id: number | null
          created_at: string
          data_partida: string | null
          id: string
          partida_statball_id: string | null
          placar_casa: number | null
          placar_visitante: number | null
          rodada: number
          season: number
          status_partida: string | null
          updated_at: string
          visitante_clube_id: number | null
        }
        Insert: {
          cartola_partida_id?: number | null
          casa_clube_id?: number | null
          created_at?: string
          data_partida?: string | null
          id?: string
          partida_statball_id?: string | null
          placar_casa?: number | null
          placar_visitante?: number | null
          rodada: number
          season: number
          status_partida?: string | null
          updated_at?: string
          visitante_clube_id?: number | null
        }
        Update: {
          cartola_partida_id?: number | null
          casa_clube_id?: number | null
          created_at?: string
          data_partida?: string | null
          id?: string
          partida_statball_id?: string | null
          placar_casa?: number | null
          placar_visitante?: number | null
          rodada?: number
          season?: number
          status_partida?: string | null
          updated_at?: string
          visitante_clube_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cartola_partidas_casa_clube_id_fkey"
            columns: ["casa_clube_id"]
            isOneToOne: false
            referencedRelation: "cartola_clubes"
            referencedColumns: ["cartola_clube_id"]
          },
          {
            foreignKeyName: "cartola_partidas_partida_statball_id_fkey"
            columns: ["partida_statball_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartola_partidas_season_fkey"
            columns: ["season"]
            isOneToOne: false
            referencedRelation: "cartola_temporadas"
            referencedColumns: ["season"]
          },
          {
            foreignKeyName: "cartola_partidas_visitante_clube_id_fkey"
            columns: ["visitante_clube_id"]
            isOneToOne: false
            referencedRelation: "cartola_clubes"
            referencedColumns: ["cartola_clube_id"]
          },
        ]
      }
      cartola_scouts_rodada: {
        Row: {
          campos_scout: Json | null
          cartola_atleta_id: number
          clube_id: number | null
          created_at: string
          participou: boolean | null
          pontos: number | null
          preco: number | null
          rodada: number
          season: number
          updated_at: string
          variacao_preco: number | null
        }
        Insert: {
          campos_scout?: Json | null
          cartola_atleta_id: number
          clube_id?: number | null
          created_at?: string
          participou?: boolean | null
          pontos?: number | null
          preco?: number | null
          rodada: number
          season: number
          updated_at?: string
          variacao_preco?: number | null
        }
        Update: {
          campos_scout?: Json | null
          cartola_atleta_id?: number
          clube_id?: number | null
          created_at?: string
          participou?: boolean | null
          pontos?: number | null
          preco?: number | null
          rodada?: number
          season?: number
          updated_at?: string
          variacao_preco?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cartola_scouts_rodada_cartola_atleta_id_fkey"
            columns: ["cartola_atleta_id"]
            isOneToOne: false
            referencedRelation: "cartola_atletas"
            referencedColumns: ["cartola_atleta_id"]
          },
          {
            foreignKeyName: "cartola_scouts_rodada_clube_id_fkey"
            columns: ["clube_id"]
            isOneToOne: false
            referencedRelation: "cartola_clubes"
            referencedColumns: ["cartola_clube_id"]
          },
        ]
      }
      cartola_temporadas: {
        Row: {
          created_at: string
          fonte_historico: string | null
          season: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fonte_historico?: string | null
          season: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fonte_historico?: string | null
          season?: number
          updated_at?: string
        }
        Relationships: []
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
      confidence_accuracy: {
        Row: {
          accuracy_diff: number
          accuracy_exact: number
          accuracy_trend: number
          accuracy_winner: number
          avg_score: number
          competition_code: string
          confidence_band: string
          id: string
          level1_hits: number
          level2_hits: number
          level3_hits: number
          level4_hits: number
          model_version: string
          score_sum: number
          total_matches: number
          updated_at: string
        }
        Insert: {
          accuracy_diff?: number
          accuracy_exact?: number
          accuracy_trend?: number
          accuracy_winner?: number
          avg_score?: number
          competition_code?: string
          confidence_band: string
          id?: string
          level1_hits?: number
          level2_hits?: number
          level3_hits?: number
          level4_hits?: number
          model_version?: string
          score_sum?: number
          total_matches?: number
          updated_at?: string
        }
        Update: {
          accuracy_diff?: number
          accuracy_exact?: number
          accuracy_trend?: number
          accuracy_winner?: number
          avg_score?: number
          competition_code?: string
          confidence_band?: string
          id?: string
          level1_hits?: number
          level2_hits?: number
          level3_hits?: number
          level4_hits?: number
          model_version?: string
          score_sum?: number
          total_matches?: number
          updated_at?: string
        }
        Relationships: []
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
      csv_imports: {
        Row: {
          created_at: string
          details: Json | null
          error_report: Json | null
          file_name: string
          file_type: string
          id: string
          liga_id: string | null
          mapping_template_id: string | null
          progress_detail: Json | null
          provider: string | null
          reverted_at: string | null
          rows_failed: number | null
          rows_inserted: number | null
          rows_skipped: number | null
          rows_updated: number | null
          status: string
          temporada: number | null
          total_rows: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          error_report?: Json | null
          file_name: string
          file_type: string
          id?: string
          liga_id?: string | null
          mapping_template_id?: string | null
          progress_detail?: Json | null
          provider?: string | null
          reverted_at?: string | null
          rows_failed?: number | null
          rows_inserted?: number | null
          rows_skipped?: number | null
          rows_updated?: number | null
          status?: string
          temporada?: number | null
          total_rows?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          error_report?: Json | null
          file_name?: string
          file_type?: string
          id?: string
          liga_id?: string | null
          mapping_template_id?: string | null
          progress_detail?: Json | null
          provider?: string | null
          reverted_at?: string | null
          rows_failed?: number | null
          rows_inserted?: number | null
          rows_skipped?: number | null
          rows_updated?: number | null
          status?: string
          temporada?: number | null
          total_rows?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "csv_imports_liga_id_fkey"
            columns: ["liga_id"]
            isOneToOne: false
            referencedRelation: "ligas"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_mapping_templates: {
        Row: {
          column_mappings: Json
          created_at: string
          created_by: string | null
          delimiter: string
          file_type: string
          id: string
          name: string
          provider: string
          updated_at: string
        }
        Insert: {
          column_mappings?: Json
          created_at?: string
          created_by?: string | null
          delimiter?: string
          file_type: string
          id?: string
          name: string
          provider: string
          updated_at?: string
        }
        Update: {
          column_mappings?: Json
          created_at?: string
          created_by?: string | null
          delimiter?: string
          file_type?: string
          id?: string
          name?: string
          provider?: string
          updated_at?: string
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
      dismissed_duplicates: {
        Row: {
          created_at: string
          dismissed_by: string | null
          id: string
          reason: string | null
          team_a_id: string
          team_b_id: string
        }
        Insert: {
          created_at?: string
          dismissed_by?: string | null
          id?: string
          reason?: string | null
          team_a_id: string
          team_b_id: string
        }
        Update: {
          created_at?: string
          dismissed_by?: string | null
          id?: string
          reason?: string | null
          team_a_id?: string
          team_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissed_duplicates_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dismissed_duplicates_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlement_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          days_delta: number
          description: string | null
          id: string
          origin: Database["public"]["Enums"]["ledger_origin"]
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days_delta: number
          description?: string | null
          id?: string
          origin: Database["public"]["Enums"]["ledger_origin"]
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days_delta?: number
          description?: string | null
          id?: string
          origin?: Database["public"]["Enums"]["ledger_origin"]
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
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
      gamification_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          rule_key: string
          updated_at: string
          xp_value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          rule_key: string
          updated_at?: string
          xp_value?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          rule_key?: string
          updated_at?: string
          xp_value?: number
        }
        Relationships: []
      }
      gols_partida: {
        Row: {
          acrescimo: number | null
          assistente_api_id: number | null
          assistente_nome: string | null
          created_at: string | null
          id: string
          import_batch_id: string | null
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
          import_batch_id?: string | null
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
          import_batch_id?: string | null
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
            foreignKeyName: "gols_partida_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "csv_imports"
            referencedColumns: ["id"]
          },
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
      historical_import_jobs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_summary: string | null
          finished_at: string | null
          id: string
          job_type: string
          parser_version_id: string | null
          provider_name: string
          requested_by: string | null
          source_id: string | null
          source_url_id: string | null
          started_at: string | null
          status: string
          total_blocks_detected: number | null
          total_conflicts: number | null
          total_ignored: number | null
          total_matches_detected: number | null
          total_promoted: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_summary?: string | null
          finished_at?: string | null
          id?: string
          job_type?: string
          parser_version_id?: string | null
          provider_name?: string
          requested_by?: string | null
          source_id?: string | null
          source_url_id?: string | null
          started_at?: string | null
          status?: string
          total_blocks_detected?: number | null
          total_conflicts?: number | null
          total_ignored?: number | null
          total_matches_detected?: number | null
          total_promoted?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_summary?: string | null
          finished_at?: string | null
          id?: string
          job_type?: string
          parser_version_id?: string | null
          provider_name?: string
          requested_by?: string | null
          source_id?: string | null
          source_url_id?: string | null
          started_at?: string | null
          status?: string
          total_blocks_detected?: number | null
          total_conflicts?: number | null
          total_ignored?: number | null
          total_matches_detected?: number | null
          total_promoted?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "historical_import_jobs_parser_version_id_fkey"
            columns: ["parser_version_id"]
            isOneToOne: false
            referencedRelation: "historical_parser_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_import_jobs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "historical_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_import_jobs_source_url_id_fkey"
            columns: ["source_url_id"]
            isOneToOne: false
            referencedRelation: "historical_source_urls"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_import_logs: {
        Row: {
          created_at: string
          id: string
          job_id: string | null
          level: string
          message: string
          payload: Json | null
          stage: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id?: string | null
          level?: string
          message: string
          payload?: Json | null
          stage: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string | null
          level?: string
          message?: string
          payload?: Json | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "historical_import_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "historical_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_parser_versions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          parser_name: string
          parser_version: string
          provider_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          parser_name: string
          parser_version: string
          provider_name?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          parser_name?: string
          parser_version?: string
          provider_name?: string
        }
        Relationships: []
      }
      historical_raw_documents: {
        Row: {
          cleaned_text: string | null
          collected_at: string
          content_type: string | null
          created_at: string
          document_hash: string | null
          http_status: number | null
          id: string
          job_id: string | null
          normalized_text: string | null
          raw_html: string | null
          source_url: string
          source_url_id: string | null
        }
        Insert: {
          cleaned_text?: string | null
          collected_at?: string
          content_type?: string | null
          created_at?: string
          document_hash?: string | null
          http_status?: number | null
          id?: string
          job_id?: string | null
          normalized_text?: string | null
          raw_html?: string | null
          source_url: string
          source_url_id?: string | null
        }
        Update: {
          cleaned_text?: string | null
          collected_at?: string
          content_type?: string | null
          created_at?: string
          document_hash?: string | null
          http_status?: number | null
          id?: string
          job_id?: string | null
          normalized_text?: string | null
          raw_html?: string | null
          source_url?: string
          source_url_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historical_raw_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "historical_import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_raw_documents_source_url_id_fkey"
            columns: ["source_url_id"]
            isOneToOne: false
            referencedRelation: "historical_source_urls"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_source_urls: {
        Row: {
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          language: string | null
          last_error: string | null
          last_fetched_at: string | null
          last_hash: string | null
          last_parsed_at: string | null
          last_promoted_at: string | null
          last_resolved_at: string | null
          last_status: string | null
          pipeline_status: string | null
          season_label: string | null
          source_id: string
          staging_promoted: number | null
          staging_resolved: number | null
          staging_total: number | null
          updated_at: string
          url: string
          url_type: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string | null
          last_error?: string | null
          last_fetched_at?: string | null
          last_hash?: string | null
          last_parsed_at?: string | null
          last_promoted_at?: string | null
          last_resolved_at?: string | null
          last_status?: string | null
          pipeline_status?: string | null
          season_label?: string | null
          source_id: string
          staging_promoted?: number | null
          staging_resolved?: number | null
          staging_total?: number | null
          updated_at?: string
          url: string
          url_type?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string | null
          last_error?: string | null
          last_fetched_at?: string | null
          last_hash?: string | null
          last_parsed_at?: string | null
          last_promoted_at?: string | null
          last_resolved_at?: string | null
          last_status?: string | null
          pipeline_status?: string | null
          season_label?: string | null
          source_id?: string
          staging_promoted?: number | null
          staging_resolved?: number | null
          staging_total?: number | null
          updated_at?: string
          url?: string
          url_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "historical_source_urls_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "historical_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_sources: {
        Row: {
          confederation: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          priority: number
          provider_name: string
          scope: string | null
          source_type: string
          updated_at: string
        }
        Insert: {
          confederation?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          priority?: number
          provider_name?: string
          scope?: string | null
          source_type?: string
          updated_at?: string
        }
        Update: {
          confederation?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          priority?: number
          provider_name?: string
          scope?: string | null
          source_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      historical_staging_matches: {
        Row: {
          away_team_confidence: string | null
          away_team_id: string | null
          away_team_raw: string
          competition_raw: string | null
          created_at: string
          document_id: string | null
          extra_data: Json | null
          home_team_confidence: string | null
          home_team_id: string | null
          home_team_raw: string
          id: string
          job_id: string | null
          liga_confidence: string | null
          liga_id: string | null
          match_date: string | null
          match_date_raw: string | null
          promoted_match_id: string | null
          resolution_notes: string | null
          round_raw: string | null
          score_away: number | null
          score_home: number | null
          season_raw: string | null
          source_url_id: string | null
          status: string
          updated_at: string
          venue_raw: string | null
        }
        Insert: {
          away_team_confidence?: string | null
          away_team_id?: string | null
          away_team_raw: string
          competition_raw?: string | null
          created_at?: string
          document_id?: string | null
          extra_data?: Json | null
          home_team_confidence?: string | null
          home_team_id?: string | null
          home_team_raw: string
          id?: string
          job_id?: string | null
          liga_confidence?: string | null
          liga_id?: string | null
          match_date?: string | null
          match_date_raw?: string | null
          promoted_match_id?: string | null
          resolution_notes?: string | null
          round_raw?: string | null
          score_away?: number | null
          score_home?: number | null
          season_raw?: string | null
          source_url_id?: string | null
          status?: string
          updated_at?: string
          venue_raw?: string | null
        }
        Update: {
          away_team_confidence?: string | null
          away_team_id?: string | null
          away_team_raw?: string
          competition_raw?: string | null
          created_at?: string
          document_id?: string | null
          extra_data?: Json | null
          home_team_confidence?: string | null
          home_team_id?: string | null
          home_team_raw?: string
          id?: string
          job_id?: string | null
          liga_confidence?: string | null
          liga_id?: string | null
          match_date?: string | null
          match_date_raw?: string | null
          promoted_match_id?: string | null
          resolution_notes?: string | null
          round_raw?: string | null
          score_away?: number | null
          score_home?: number | null
          season_raw?: string | null
          source_url_id?: string | null
          status?: string
          updated_at?: string
          venue_raw?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historical_staging_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_staging_matches_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "historical_raw_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_staging_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_staging_matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "historical_import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_staging_matches_liga_id_fkey"
            columns: ["liga_id"]
            isOneToOne: false
            referencedRelation: "ligas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_staging_matches_promoted_match_id_fkey"
            columns: ["promoted_match_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_staging_matches_source_url_id_fkey"
            columns: ["source_url_id"]
            isOneToOne: false
            referencedRelation: "historical_source_urls"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_column_mappings: {
        Row: {
          created_at: string
          dataset_file_id: string
          id: string
          is_active: boolean
          mapping_confidence: number | null
          normalized_column_name: string | null
          source_column_name: string
          target_entity: string | null
          target_field: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dataset_file_id: string
          id?: string
          is_active?: boolean
          mapping_confidence?: number | null
          normalized_column_name?: string | null
          source_column_name: string
          target_entity?: string | null
          target_field?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dataset_file_id?: string
          id?: string
          is_active?: boolean
          mapping_confidence?: number | null
          normalized_column_name?: string | null
          source_column_name?: string
          target_entity?: string | null
          target_field?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_column_mappings_dataset_file_id_fkey"
            columns: ["dataset_file_id"]
            isOneToOne: false
            referencedRelation: "kaggle_dataset_files"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_competition_links: {
        Row: {
          competition_id: string
          confidence_score: number | null
          external_key: string | null
          id: string
          linked_at: string
          provider_name: string
          staging_competition_id: string
        }
        Insert: {
          competition_id: string
          confidence_score?: number | null
          external_key?: string | null
          id?: string
          linked_at?: string
          provider_name?: string
          staging_competition_id: string
        }
        Update: {
          competition_id?: string
          confidence_score?: number | null
          external_key?: string | null
          id?: string
          linked_at?: string
          provider_name?: string
          staging_competition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_competition_links_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "ligas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_competition_links_staging_competition_id_fkey"
            columns: ["staging_competition_id"]
            isOneToOne: false
            referencedRelation: "kaggle_staging_competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_dataset_files: {
        Row: {
          content_format: string | null
          created_at: string
          dataset_id: string
          file_hash: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string
          id: string
          inferred_entity_type: string | null
          is_active: boolean
          last_processed_at: string | null
          last_status: string | null
          updated_at: string
        }
        Insert: {
          content_format?: string | null
          created_at?: string
          dataset_id: string
          file_hash?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type?: string
          id?: string
          inferred_entity_type?: string | null
          is_active?: boolean
          last_processed_at?: string | null
          last_status?: string | null
          updated_at?: string
        }
        Update: {
          content_format?: string | null
          created_at?: string
          dataset_id?: string
          file_hash?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string
          id?: string
          inferred_entity_type?: string | null
          is_active?: boolean
          last_processed_at?: string | null
          last_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_dataset_files_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "kaggle_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_datasets: {
        Row: {
          competition_scope: string | null
          country_scope: string | null
          created_at: string
          data_scope: string | null
          dataset_category: string | null
          dataset_description: string | null
          dataset_owner: string | null
          dataset_slug: string
          dataset_title: string
          dataset_url: string | null
          id: string
          is_active: boolean
          last_hash: string | null
          last_synced_at: string | null
          priority: number
          provider_slug: string
          source_status: string
          updated_at: string
        }
        Insert: {
          competition_scope?: string | null
          country_scope?: string | null
          created_at?: string
          data_scope?: string | null
          dataset_category?: string | null
          dataset_description?: string | null
          dataset_owner?: string | null
          dataset_slug: string
          dataset_title: string
          dataset_url?: string | null
          id?: string
          is_active?: boolean
          last_hash?: string | null
          last_synced_at?: string | null
          priority?: number
          provider_slug?: string
          source_status?: string
          updated_at?: string
        }
        Update: {
          competition_scope?: string | null
          country_scope?: string | null
          created_at?: string
          data_scope?: string | null
          dataset_category?: string | null
          dataset_description?: string | null
          dataset_owner?: string | null
          dataset_slug?: string
          dataset_title?: string
          dataset_url?: string | null
          id?: string
          is_active?: boolean
          last_hash?: string | null
          last_synced_at?: string | null
          priority?: number
          provider_slug?: string
          source_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      kaggle_file_profiles: {
        Row: {
          created_at: string
          dataset_file_id: string | null
          delimiter: string | null
          detected_columns: Json | null
          detected_row_count: number | null
          encoding: string | null
          id: string
          inferred_schema: Json | null
          job_id: string | null
          sample_rows: Json | null
        }
        Insert: {
          created_at?: string
          dataset_file_id?: string | null
          delimiter?: string | null
          detected_columns?: Json | null
          detected_row_count?: number | null
          encoding?: string | null
          id?: string
          inferred_schema?: Json | null
          job_id?: string | null
          sample_rows?: Json | null
        }
        Update: {
          created_at?: string
          dataset_file_id?: string | null
          delimiter?: string | null
          detected_columns?: Json | null
          detected_row_count?: number | null
          encoding?: string | null
          id?: string
          inferred_schema?: Json | null
          job_id?: string | null
          sample_rows?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_file_profiles_dataset_file_id_fkey"
            columns: ["dataset_file_id"]
            isOneToOne: false
            referencedRelation: "kaggle_dataset_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_file_profiles_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "kaggle_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_import_job_items: {
        Row: {
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          item_reference: string | null
          item_status: string
          item_type: string
          job_id: string
          sequence_order: number | null
          started_at: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          item_reference?: string | null
          item_status?: string
          item_type: string
          job_id: string
          sequence_order?: number | null
          started_at?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          item_reference?: string | null
          item_status?: string
          item_type?: string
          job_id?: string
          sequence_order?: number | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_import_job_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "kaggle_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_import_jobs: {
        Row: {
          batch_id: string | null
          created_at: string
          dataset_file_id: string | null
          dataset_id: string
          duration_ms: number | null
          error_summary: string | null
          finished_at: string | null
          id: string
          job_type: string
          lock_token: string | null
          max_retries: number
          parser_version_id: string | null
          priority: number
          requested_by: string | null
          retry_count: number
          started_at: string | null
          status: string
          total_conflicts: number | null
          total_errors: number | null
          total_ignored: number | null
          total_matches_detected: number | null
          total_promoted: number | null
          total_rows_read: number | null
          total_rows_staged: number | null
          total_updated: number | null
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          dataset_file_id?: string | null
          dataset_id: string
          duration_ms?: number | null
          error_summary?: string | null
          finished_at?: string | null
          id?: string
          job_type?: string
          lock_token?: string | null
          max_retries?: number
          parser_version_id?: string | null
          priority?: number
          requested_by?: string | null
          retry_count?: number
          started_at?: string | null
          status?: string
          total_conflicts?: number | null
          total_errors?: number | null
          total_ignored?: number | null
          total_matches_detected?: number | null
          total_promoted?: number | null
          total_rows_read?: number | null
          total_rows_staged?: number | null
          total_updated?: number | null
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          dataset_file_id?: string | null
          dataset_id?: string
          duration_ms?: number | null
          error_summary?: string | null
          finished_at?: string | null
          id?: string
          job_type?: string
          lock_token?: string | null
          max_retries?: number
          parser_version_id?: string | null
          priority?: number
          requested_by?: string | null
          retry_count?: number
          started_at?: string | null
          status?: string
          total_conflicts?: number | null
          total_errors?: number | null
          total_ignored?: number | null
          total_matches_detected?: number | null
          total_promoted?: number | null
          total_rows_read?: number | null
          total_rows_staged?: number | null
          total_updated?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_import_jobs_dataset_file_id_fkey"
            columns: ["dataset_file_id"]
            isOneToOne: false
            referencedRelation: "kaggle_dataset_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_import_jobs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "kaggle_datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_import_jobs_parser_version_id_fkey"
            columns: ["parser_version_id"]
            isOneToOne: false
            referencedRelation: "kaggle_parser_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_import_logs: {
        Row: {
          created_at: string
          dataset_file_id: string | null
          id: string
          job_id: string | null
          level: string
          message: string
          payload: Json | null
          stage: string
        }
        Insert: {
          created_at?: string
          dataset_file_id?: string | null
          id?: string
          job_id?: string | null
          level?: string
          message: string
          payload?: Json | null
          stage: string
        }
        Update: {
          created_at?: string
          dataset_file_id?: string | null
          id?: string
          job_id?: string | null
          level?: string
          message?: string
          payload?: Json | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_import_logs_dataset_file_id_fkey"
            columns: ["dataset_file_id"]
            isOneToOne: false
            referencedRelation: "kaggle_dataset_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_import_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "kaggle_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_import_snapshots: {
        Row: {
          created_at: string
          id: string
          job_id: string
          summary_json: Json
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          summary_json?: Json
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          summary_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_import_snapshots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "kaggle_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_job_batches: {
        Row: {
          batch_name: string
          batch_type: string
          created_at: string
          id: string
          requested_by: string | null
          status: string
          total_completed: number | null
          total_failed: number | null
          total_jobs: number | null
          updated_at: string
        }
        Insert: {
          batch_name: string
          batch_type?: string
          created_at?: string
          id?: string
          requested_by?: string | null
          status?: string
          total_completed?: number | null
          total_failed?: number | null
          total_jobs?: number | null
          updated_at?: string
        }
        Update: {
          batch_name?: string
          batch_type?: string
          created_at?: string
          id?: string
          requested_by?: string | null
          status?: string
          total_completed?: number | null
          total_failed?: number | null
          total_jobs?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      kaggle_job_metrics: {
        Row: {
          created_at: string
          id: string
          job_id: string
          metric_key: string
          metric_value: number
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          metric_key: string
          metric_value?: number
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          metric_key?: string
          metric_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_job_metrics_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "kaggle_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_manual_reviews: {
        Row: {
          created_at: string
          entity_reference: string | null
          entity_type: string
          id: string
          job_id: string | null
          notes: string | null
          review_action: string | null
          reviewed_by: string | null
        }
        Insert: {
          created_at?: string
          entity_reference?: string | null
          entity_type: string
          id?: string
          job_id?: string | null
          notes?: string | null
          review_action?: string | null
          reviewed_by?: string | null
        }
        Update: {
          created_at?: string
          entity_reference?: string | null
          entity_type?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          review_action?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_manual_reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "kaggle_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_match_links: {
        Row: {
          confidence_score: number | null
          dataset_file_id: string | null
          external_key: string | null
          id: string
          linked_at: string
          partida_id: string
          provider_name: string
          staging_match_id: string
        }
        Insert: {
          confidence_score?: number | null
          dataset_file_id?: string | null
          external_key?: string | null
          id?: string
          linked_at?: string
          partida_id: string
          provider_name?: string
          staging_match_id: string
        }
        Update: {
          confidence_score?: number | null
          dataset_file_id?: string | null
          external_key?: string | null
          id?: string
          linked_at?: string
          partida_id?: string
          provider_name?: string
          staging_match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_match_links_dataset_file_id_fkey"
            columns: ["dataset_file_id"]
            isOneToOne: false
            referencedRelation: "kaggle_dataset_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_match_links_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_match_links_staging_match_id_fkey"
            columns: ["staging_match_id"]
            isOneToOne: false
            referencedRelation: "kaggle_staging_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_parser_versions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          parser_name: string
          parser_version: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          parser_name: string
          parser_version: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          parser_name?: string
          parser_version?: string
        }
        Relationships: []
      }
      kaggle_player_links: {
        Row: {
          confidence_score: number | null
          external_key: string | null
          id: string
          linked_at: string
          player_id: string
          provider_name: string
          staging_player_id: string
        }
        Insert: {
          confidence_score?: number | null
          external_key?: string | null
          id?: string
          linked_at?: string
          player_id: string
          provider_name?: string
          staging_player_id: string
        }
        Update: {
          confidence_score?: number | null
          external_key?: string | null
          id?: string
          linked_at?: string
          player_id?: string
          provider_name?: string
          staging_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_player_links_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_player_links_staging_player_id_fkey"
            columns: ["staging_player_id"]
            isOneToOne: false
            referencedRelation: "kaggle_staging_players"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_provider_configs: {
        Row: {
          config_key: string
          config_value: string | null
          created_at: string
          id: string
          is_secret: boolean
          provider_slug: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value?: string | null
          created_at?: string
          id?: string
          is_secret?: boolean
          provider_slug?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: string | null
          created_at?: string
          id?: string
          is_secret?: boolean
          provider_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      kaggle_rate_limit_controls: {
        Row: {
          cooldown_seconds: number
          created_at: string
          host_name: string
          id: string
          is_active: boolean
          max_concurrent_jobs: number
          provider_slug: string
          requests_per_minute: number
          updated_at: string
        }
        Insert: {
          cooldown_seconds?: number
          created_at?: string
          host_name?: string
          id?: string
          is_active?: boolean
          max_concurrent_jobs?: number
          provider_slug?: string
          requests_per_minute?: number
          updated_at?: string
        }
        Update: {
          cooldown_seconds?: number
          created_at?: string
          host_name?: string
          id?: string
          is_active?: boolean
          max_concurrent_jobs?: number
          provider_slug?: string
          requests_per_minute?: number
          updated_at?: string
        }
        Relationships: []
      }
      kaggle_raw_assets: {
        Row: {
          asset_type: string
          collected_at: string
          content_hash: string | null
          created_at: string
          dataset_file_id: string | null
          id: string
          job_id: string | null
          raw_json: Json | null
          raw_text: string | null
          storage_path: string | null
        }
        Insert: {
          asset_type?: string
          collected_at?: string
          content_hash?: string | null
          created_at?: string
          dataset_file_id?: string | null
          id?: string
          job_id?: string | null
          raw_json?: Json | null
          raw_text?: string | null
          storage_path?: string | null
        }
        Update: {
          asset_type?: string
          collected_at?: string
          content_hash?: string | null
          created_at?: string
          dataset_file_id?: string | null
          id?: string
          job_id?: string | null
          raw_json?: Json | null
          raw_text?: string | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_raw_assets_dataset_file_id_fkey"
            columns: ["dataset_file_id"]
            isOneToOne: false
            referencedRelation: "kaggle_dataset_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_raw_assets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "kaggle_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_reprocess_requests: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          requested_by: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          requested_by?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          requested_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      kaggle_resolution_queue: {
        Row: {
          assigned_to: string | null
          created_at: string
          entity_type: string
          id: string
          issue_type: string
          job_id: string | null
          notes: string | null
          resolved_at: string | null
          staging_entity_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          entity_type: string
          id?: string
          issue_type: string
          job_id?: string | null
          notes?: string | null
          resolved_at?: string | null
          staging_entity_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          entity_type?: string
          id?: string
          issue_type?: string
          job_id?: string | null
          notes?: string | null
          resolved_at?: string | null
          staging_entity_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_resolution_queue_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "kaggle_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_retry_queue: {
        Row: {
          created_at: string
          id: string
          job_id: string
          next_retry_at: string
          reason: string | null
          retry_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          next_retry_at: string
          reason?: string | null
          retry_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          next_retry_at?: string
          reason?: string | null
          retry_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_retry_queue_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "kaggle_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_season_links: {
        Row: {
          confidence_score: number | null
          external_key: string | null
          id: string
          linked_at: string
          provider_name: string
          season_id: string | null
          staging_season_id: string
        }
        Insert: {
          confidence_score?: number | null
          external_key?: string | null
          id?: string
          linked_at?: string
          provider_name?: string
          season_id?: string | null
          staging_season_id: string
        }
        Update: {
          confidence_score?: number | null
          external_key?: string | null
          id?: string
          linked_at?: string
          provider_name?: string
          season_id?: string | null
          staging_season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_season_links_staging_season_id_fkey"
            columns: ["staging_season_id"]
            isOneToOne: false
            referencedRelation: "kaggle_staging_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_staging_competitions: {
        Row: {
          confederation: string | null
          confidence_score: number | null
          country: string | null
          created_at: string
          id: string
          job_id: string
          matched_competition_id: string | null
          normalized_name: string | null
          raw_name: string
          resolution_status: string
        }
        Insert: {
          confederation?: string | null
          confidence_score?: number | null
          country?: string | null
          created_at?: string
          id?: string
          job_id: string
          matched_competition_id?: string | null
          normalized_name?: string | null
          raw_name: string
          resolution_status?: string
        }
        Update: {
          confederation?: string | null
          confidence_score?: number | null
          country?: string | null
          created_at?: string
          id?: string
          job_id?: string
          matched_competition_id?: string | null
          normalized_name?: string | null
          raw_name?: string
          resolution_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_staging_competitions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "kaggle_import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_staging_competitions_matched_competition_id_fkey"
            columns: ["matched_competition_id"]
            isOneToOne: false
            referencedRelation: "ligas"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_staging_conflicts: {
        Row: {
          confidence_score: number | null
          conflict_type: string
          created_at: string
          entity_type: string
          id: string
          job_id: string
          notes: string | null
          raw_value: string | null
          status: string
          suggested_value: string | null
        }
        Insert: {
          confidence_score?: number | null
          conflict_type: string
          created_at?: string
          entity_type: string
          id?: string
          job_id: string
          notes?: string | null
          raw_value?: string | null
          status?: string
          suggested_value?: string | null
        }
        Update: {
          confidence_score?: number | null
          conflict_type?: string
          created_at?: string
          entity_type?: string
          id?: string
          job_id?: string
          notes?: string | null
          raw_value?: string | null
          status?: string
          suggested_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_staging_conflicts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "kaggle_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_staging_match_events: {
        Row: {
          confidence_score: number | null
          created_at: string
          event_type: string
          id: string
          matched_team_id: string | null
          minute: number | null
          notes: string | null
          player_name: string | null
          raw_team_name: string | null
          staging_match_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          event_type: string
          id?: string
          matched_team_id?: string | null
          minute?: number | null
          notes?: string | null
          player_name?: string | null
          raw_team_name?: string | null
          staging_match_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          event_type?: string
          id?: string
          matched_team_id?: string | null
          minute?: number | null
          notes?: string | null
          player_name?: string | null
          raw_team_name?: string | null
          staging_match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_staging_match_events_matched_team_id_fkey"
            columns: ["matched_team_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_staging_match_events_staging_match_id_fkey"
            columns: ["staging_match_id"]
            isOneToOne: false
            referencedRelation: "kaggle_staging_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_staging_matches: {
        Row: {
          confidence_score: number | null
          created_at: string
          dedupe_status: string | null
          id: string
          job_id: string
          matched_away_team_id: string | null
          matched_competition_id: string | null
          matched_home_team_id: string | null
          matched_match_id: string | null
          matched_season_id: string | null
          notes_text: string | null
          odds_json: Json | null
          parsed_away_score: number | null
          parsed_date: string | null
          parsed_home_score: number | null
          raw_away_team: string | null
          raw_competition_name: string | null
          raw_date_text: string | null
          raw_home_team: string | null
          raw_round_label: string | null
          raw_score_text: string | null
          raw_season_label: string | null
          referee_text: string | null
          resolution_status: string
          source_row_reference: string | null
          venue_text: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          dedupe_status?: string | null
          id?: string
          job_id: string
          matched_away_team_id?: string | null
          matched_competition_id?: string | null
          matched_home_team_id?: string | null
          matched_match_id?: string | null
          matched_season_id?: string | null
          notes_text?: string | null
          odds_json?: Json | null
          parsed_away_score?: number | null
          parsed_date?: string | null
          parsed_home_score?: number | null
          raw_away_team?: string | null
          raw_competition_name?: string | null
          raw_date_text?: string | null
          raw_home_team?: string | null
          raw_round_label?: string | null
          raw_score_text?: string | null
          raw_season_label?: string | null
          referee_text?: string | null
          resolution_status?: string
          source_row_reference?: string | null
          venue_text?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          dedupe_status?: string | null
          id?: string
          job_id?: string
          matched_away_team_id?: string | null
          matched_competition_id?: string | null
          matched_home_team_id?: string | null
          matched_match_id?: string | null
          matched_season_id?: string | null
          notes_text?: string | null
          odds_json?: Json | null
          parsed_away_score?: number | null
          parsed_date?: string | null
          parsed_home_score?: number | null
          raw_away_team?: string | null
          raw_competition_name?: string | null
          raw_date_text?: string | null
          raw_home_team?: string | null
          raw_round_label?: string | null
          raw_score_text?: string | null
          raw_season_label?: string | null
          referee_text?: string | null
          resolution_status?: string
          source_row_reference?: string | null
          venue_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_staging_matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "kaggle_import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_staging_matches_matched_away_team_id_fkey"
            columns: ["matched_away_team_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_staging_matches_matched_competition_id_fkey"
            columns: ["matched_competition_id"]
            isOneToOne: false
            referencedRelation: "ligas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_staging_matches_matched_home_team_id_fkey"
            columns: ["matched_home_team_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_staging_matches_matched_match_id_fkey"
            columns: ["matched_match_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_staging_players: {
        Row: {
          birth_date: string | null
          confidence_score: number | null
          created_at: string
          current_team_raw: string | null
          id: string
          job_id: string
          matched_player_id: string | null
          nationality: string | null
          normalized_name: string | null
          position: string | null
          raw_name: string
          resolution_status: string
        }
        Insert: {
          birth_date?: string | null
          confidence_score?: number | null
          created_at?: string
          current_team_raw?: string | null
          id?: string
          job_id: string
          matched_player_id?: string | null
          nationality?: string | null
          normalized_name?: string | null
          position?: string | null
          raw_name: string
          resolution_status?: string
        }
        Update: {
          birth_date?: string | null
          confidence_score?: number | null
          created_at?: string
          current_team_raw?: string | null
          id?: string
          job_id?: string
          matched_player_id?: string | null
          nationality?: string | null
          normalized_name?: string | null
          position?: string | null
          raw_name?: string
          resolution_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_staging_players_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "kaggle_import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_staging_players_matched_player_id_fkey"
            columns: ["matched_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_staging_rows: {
        Row: {
          created_at: string
          id: string
          normalized_row_json: Json | null
          processing_status: string
          raw_row_json: Json
          row_hash: string | null
          row_number: number | null
          staging_table_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          normalized_row_json?: Json | null
          processing_status?: string
          raw_row_json: Json
          row_hash?: string | null
          row_number?: number | null
          staging_table_id: string
        }
        Update: {
          created_at?: string
          id?: string
          normalized_row_json?: Json | null
          processing_status?: string
          raw_row_json?: Json
          row_hash?: string | null
          row_number?: number | null
          staging_table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_staging_rows_staging_table_id_fkey"
            columns: ["staging_table_id"]
            isOneToOne: false
            referencedRelation: "kaggle_staging_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_staging_seasons: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          inferred_year_end: number | null
          inferred_year_start: number | null
          job_id: string
          matched_season_id: string | null
          normalized_label: string | null
          raw_label: string
          resolution_status: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          inferred_year_end?: number | null
          inferred_year_start?: number | null
          job_id: string
          matched_season_id?: string | null
          normalized_label?: string | null
          raw_label: string
          resolution_status?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          inferred_year_end?: number | null
          inferred_year_start?: number | null
          job_id?: string
          matched_season_id?: string | null
          normalized_label?: string | null
          raw_label?: string
          resolution_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_staging_seasons_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "kaggle_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_staging_tables: {
        Row: {
          created_at: string
          id: string
          inferred_entity_type: string | null
          job_id: string
          row_count: number | null
          schema_json: Json | null
          table_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          inferred_entity_type?: string | null
          job_id: string
          row_count?: number | null
          schema_json?: Json | null
          table_name: string
        }
        Update: {
          created_at?: string
          id?: string
          inferred_entity_type?: string | null
          job_id?: string
          row_count?: number | null
          schema_json?: Json | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_staging_tables_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "kaggle_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_staging_teams: {
        Row: {
          confidence_score: number | null
          country: string | null
          created_at: string
          id: string
          inferred_slug: string | null
          job_id: string
          matched_team_id: string | null
          normalized_name: string | null
          raw_name: string
          resolution_status: string
        }
        Insert: {
          confidence_score?: number | null
          country?: string | null
          created_at?: string
          id?: string
          inferred_slug?: string | null
          job_id: string
          matched_team_id?: string | null
          normalized_name?: string | null
          raw_name: string
          resolution_status?: string
        }
        Update: {
          confidence_score?: number | null
          country?: string | null
          created_at?: string
          id?: string
          inferred_slug?: string | null
          job_id?: string
          matched_team_id?: string | null
          normalized_name?: string | null
          raw_name?: string
          resolution_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_staging_teams_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "kaggle_import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_staging_teams_matched_team_id_fkey"
            columns: ["matched_team_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      kaggle_team_links: {
        Row: {
          confidence_score: number | null
          external_key: string | null
          id: string
          linked_at: string
          provider_name: string
          staging_team_id: string
          team_id: string
        }
        Insert: {
          confidence_score?: number | null
          external_key?: string | null
          id?: string
          linked_at?: string
          provider_name?: string
          staging_team_id: string
          team_id: string
        }
        Update: {
          confidence_score?: number | null
          external_key?: string | null
          id?: string
          linked_at?: string
          provider_name?: string
          staging_team_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kaggle_team_links_staging_team_id_fkey"
            columns: ["staging_team_id"]
            isOneToOne: false
            referencedRelation: "kaggle_staging_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kaggle_team_links_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "times"
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
          continente: string | null
          created_at: string | null
          estado: string | null
          id: string
          logo_url: string | null
          nome: string
          ordem_exibicao: number | null
          organizador: string | null
          pais: string | null
          pillar_content: Json | null
          pillar_updated_at: string | null
          priority_score: number | null
          score_factors: Json | null
          score_updated_at: string | null
          slug: string | null
          tipo_principal: string | null
          updated_at: string | null
        }
        Insert: {
          api_id?: number | null
          api_source?: string | null
          ativa?: boolean | null
          codigo_api?: string | null
          continente?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          ordem_exibicao?: number | null
          organizador?: string | null
          pais?: string | null
          pillar_content?: Json | null
          pillar_updated_at?: string | null
          priority_score?: number | null
          score_factors?: Json | null
          score_updated_at?: string | null
          slug?: string | null
          tipo_principal?: string | null
          updated_at?: string | null
        }
        Update: {
          api_id?: number | null
          api_source?: string | null
          ativa?: boolean | null
          codigo_api?: string | null
          continente?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          ordem_exibicao?: number | null
          organizador?: string | null
          pais?: string | null
          pillar_content?: Json | null
          pillar_updated_at?: string | null
          priority_score?: number | null
          score_factors?: Json | null
          score_updated_at?: string | null
          slug?: string | null
          tipo_principal?: string | null
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
      model_versions: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          released_at: string
          version: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          released_at?: string
          version: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          released_at?: string
          version?: string
        }
        Relationships: []
      }
      mp_payments: {
        Row: {
          amount_cents: number
          approved_at: string | null
          created_at: string
          currency: string | null
          days_granted: number | null
          external_reference: string | null
          id: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          payer_document: string | null
          payer_email: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          plan_id: string | null
          raw_data: Json | null
          refundable_until: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          status_detail: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          approved_at?: string | null
          created_at?: string
          currency?: string | null
          days_granted?: number | null
          external_reference?: string | null
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          payer_document?: string | null
          payer_email?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          plan_id?: string | null
          raw_data?: Json | null
          refundable_until?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          status_detail?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          approved_at?: string | null
          created_at?: string
          currency?: string | null
          days_granted?: number | null
          external_reference?: string | null
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          payer_document?: string | null
          payer_email?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          plan_id?: string | null
          raw_data?: Json | null
          refundable_until?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          status_detail?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_subscriptions: {
        Row: {
          auto_recurring: Json | null
          cancelled_at: string | null
          created_at: string
          end_date: string | null
          id: string
          last_payment_date: string | null
          mp_preapproval_id: string | null
          mp_preapproval_plan_id: string | null
          next_payment_date: string | null
          payer_email: string | null
          payer_id: string | null
          plan_id: string | null
          raw_data: Json | null
          reason: string | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_recurring?: Json | null
          cancelled_at?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          last_payment_date?: string | null
          mp_preapproval_id?: string | null
          mp_preapproval_plan_id?: string | null
          next_payment_date?: string | null
          payer_email?: string | null
          payer_id?: string | null
          plan_id?: string | null
          raw_data?: Json | null
          reason?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_recurring?: Json | null
          cancelled_at?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          last_payment_date?: string | null
          mp_preapproval_id?: string | null
          mp_preapproval_plan_id?: string | null
          next_payment_date?: string | null
          payer_email?: string | null
          payer_id?: string | null
          plan_id?: string | null
          raw_data?: Json | null
          reason?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mp_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      nickname_blocklist: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          word: string
          word_normalized: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          word: string
          word_normalized: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          word?: string
          word_normalized?: string
        }
        Relationships: []
      }
      noticias: {
        Row: {
          autor_id: string | null
          content_updated: boolean | null
          content_updated_at: string | null
          created_at: string | null
          data_publicacao: string | null
          id: string
          image_regenerated_at: string | null
          image_source: string | null
          imagem_alt: string | null
          imagem_url: string | null
          partida_id: string | null
          publicada: boolean | null
          resumo: string | null
          slug: string | null
          texto: string
          tipo: string | null
          titulo: string
          updated_at: string | null
          world_cup_2026_match_id: string | null
        }
        Insert: {
          autor_id?: string | null
          content_updated?: boolean | null
          content_updated_at?: string | null
          created_at?: string | null
          data_publicacao?: string | null
          id?: string
          image_regenerated_at?: string | null
          image_source?: string | null
          imagem_alt?: string | null
          imagem_url?: string | null
          partida_id?: string | null
          publicada?: boolean | null
          resumo?: string | null
          slug?: string | null
          texto: string
          tipo?: string | null
          titulo: string
          updated_at?: string | null
          world_cup_2026_match_id?: string | null
        }
        Update: {
          autor_id?: string | null
          content_updated?: boolean | null
          content_updated_at?: string | null
          created_at?: string | null
          data_publicacao?: string | null
          id?: string
          image_regenerated_at?: string | null
          image_source?: string | null
          imagem_alt?: string | null
          imagem_url?: string | null
          partida_id?: string | null
          publicada?: boolean | null
          resumo?: string | null
          slug?: string | null
          texto?: string
          tipo?: string | null
          titulo?: string
          updated_at?: string | null
          world_cup_2026_match_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "noticias_partida_id_fkey"
            columns: ["partida_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noticias_world_cup_2026_match_id_fkey"
            columns: ["world_cup_2026_match_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_matches"
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
          partida_id: string | null
          placar_casa: number
          placar_fora: number
          updated_at: string | null
          user_id: string
          wc2026_match_id: string | null
        }
        Insert: {
          aceitou_sugestao?: boolean | null
          created_at?: string | null
          id?: string
          palpite_sistema_id?: string | null
          partida_id?: string | null
          placar_casa: number
          placar_fora: number
          updated_at?: string | null
          user_id: string
          wc2026_match_id?: string | null
        }
        Update: {
          aceitou_sugestao?: boolean | null
          created_at?: string | null
          id?: string
          palpite_sistema_id?: string | null
          partida_id?: string | null
          placar_casa?: number
          placar_fora?: number
          updated_at?: string | null
          user_id?: string
          wc2026_match_id?: string | null
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
          {
            foreignKeyName: "palpites_usuarios_wc2026_match_id_fkey"
            columns: ["wc2026_match_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      partidas: {
        Row: {
          api_events: Json | null
          api_id: number | null
          api_lineups: Json | null
          api_source: string | null
          api_statistics: Json | null
          created_at: string | null
          data: string
          detalhes_sincronizados: boolean | null
          gols_casa: number | null
          gols_fora: number | null
          hora: string | null
          id: string
          import_batch_id: string | null
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
          api_events?: Json | null
          api_id?: number | null
          api_lineups?: Json | null
          api_source?: string | null
          api_statistics?: Json | null
          created_at?: string | null
          data: string
          detalhes_sincronizados?: boolean | null
          gols_casa?: number | null
          gols_fora?: number | null
          hora?: string | null
          id?: string
          import_batch_id?: string | null
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
          api_events?: Json | null
          api_id?: number | null
          api_lineups?: Json | null
          api_source?: string | null
          api_statistics?: Json | null
          created_at?: string | null
          data?: string
          detalhes_sincronizados?: boolean | null
          gols_casa?: number | null
          gols_fora?: number | null
          hora?: string | null
          id?: string
          import_batch_id?: string | null
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
            foreignKeyName: "partidas_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "csv_imports"
            referencedColumns: ["id"]
          },
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
      plans: {
        Row: {
          active: boolean
          created_at: string
          days: number | null
          description: string | null
          display_order: number
          features: Json | null
          highlight_label: string | null
          id: string
          mp_preapproval_plan_id: string | null
          name: string
          period_months: number | null
          price_cents: number
          type: Database["public"]["Enums"]["plan_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          days?: number | null
          description?: string | null
          display_order?: number
          features?: Json | null
          highlight_label?: string | null
          id?: string
          mp_preapproval_plan_id?: string | null
          name: string
          period_months?: number | null
          price_cents: number
          type: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          days?: number | null
          description?: string | null
          display_order?: number
          features?: Json | null
          highlight_label?: string | null
          id?: string
          mp_preapproval_plan_id?: string | null
          name?: string
          period_months?: number | null
          price_cents?: number
          type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
        }
        Relationships: []
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
      popular_entities: {
        Row: {
          created_at: string
          entity_id: string
          entity_name: string
          entity_type: string
          id: string
          period: string
          search_count: number
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_name: string
          entity_type: string
          id?: string
          period?: string
          search_count?: number
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_name?: string
          entity_type?: string
          id?: string
          period?: string
          search_count?: number
        }
        Relationships: []
      }
      prediction_explanations: {
        Row: {
          created_at: string
          id: string
          match_id: string | null
          model_version: string
          prediction_id: string
          prediction_source: string
          rationale: string | null
          top_factors: Json
          weights: Json
        }
        Insert: {
          created_at?: string
          id?: string
          match_id?: string | null
          model_version?: string
          prediction_id: string
          prediction_source: string
          rationale?: string | null
          top_factors?: Json
          weights?: Json
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string | null
          model_version?: string
          prediction_id?: string
          prediction_source?: string
          rationale?: string | null
          top_factors?: Json
          weights?: Json
        }
        Relationships: []
      }
      prediction_performance: {
        Row: {
          competition_code: string | null
          competition_id: string | null
          confidence_band: string | null
          confidence_value: number | null
          created_at: string
          frozen_at: string
          goal_difference_error: number
          id: string
          level1_winner_correct: boolean
          level2_trend_correct: boolean
          level3_diff_correct: boolean
          level4_exact_correct: boolean
          match_id: string
          match_source: string
          model_version: string
          predicted_away_goals: number
          predicted_diff: number | null
          predicted_home_goals: number
          predicted_result: string
          prediction_score: number
          real_away_goals: number
          real_diff: number | null
          real_home_goals: number
          real_result: string
          stage: string | null
          total_goals_error: number
        }
        Insert: {
          competition_code?: string | null
          competition_id?: string | null
          confidence_band?: string | null
          confidence_value?: number | null
          created_at?: string
          frozen_at?: string
          goal_difference_error: number
          id?: string
          level1_winner_correct: boolean
          level2_trend_correct: boolean
          level3_diff_correct: boolean
          level4_exact_correct: boolean
          match_id: string
          match_source: string
          model_version?: string
          predicted_away_goals: number
          predicted_diff?: number | null
          predicted_home_goals: number
          predicted_result: string
          prediction_score: number
          real_away_goals: number
          real_diff?: number | null
          real_home_goals: number
          real_result: string
          stage?: string | null
          total_goals_error: number
        }
        Update: {
          competition_code?: string | null
          competition_id?: string | null
          confidence_band?: string | null
          confidence_value?: number | null
          created_at?: string
          frozen_at?: string
          goal_difference_error?: number
          id?: string
          level1_winner_correct?: boolean
          level2_trend_correct?: boolean
          level3_diff_correct?: boolean
          level4_exact_correct?: boolean
          match_id?: string
          match_source?: string
          model_version?: string
          predicted_away_goals?: number
          predicted_diff?: number | null
          predicted_home_goals?: number
          predicted_result?: string
          prediction_score?: number
          real_away_goals?: number
          real_diff?: number | null
          real_home_goals?: number
          real_result?: string
          stage?: string | null
          total_goals_error?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string | null
          phone: string | null
          plano: Database["public"]["Enums"]["plano_tipo"] | null
          state: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          phone?: string | null
          plano?: Database["public"]["Enums"]["plano_tipo"] | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          phone?: string | null
          plano?: Database["public"]["Enums"]["plano_tipo"] | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      public_rankings_cache: {
        Row: {
          id: string
          period: string
          period_end: string
          period_start: string
          rank_position: number
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          period: string
          period_end: string
          period_start: string
          rank_position?: number
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          period?: string
          period_end?: string
          period_start?: string
          rank_position?: number
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount_cents: number
          days_revoked: number | null
          id: string
          mp_refund_id: string | null
          payment_id: string
          processed_at: string | null
          raw_data: Json | null
          reason: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          days_revoked?: number | null
          id?: string
          mp_refund_id?: string | null
          payment_id: string
          processed_at?: string | null
          raw_data?: Json | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          days_revoked?: number | null
          id?: string
          mp_refund_id?: string | null
          payment_id?: string
          processed_at?: string | null
          raw_data?: Json | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "mp_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      regional_config: {
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
      rss_feed_stats: {
        Row: {
          feed: string
          last_error: string | null
          last_generated_at: string | null
          last_item_count: number | null
          last_status: number | null
          total_errors: number
          total_requests: number
          updated_at: string
        }
        Insert: {
          feed: string
          last_error?: string | null
          last_generated_at?: string | null
          last_item_count?: number | null
          last_status?: number | null
          total_errors?: number
          total_requests?: number
          updated_at?: string
        }
        Update: {
          feed?: string
          last_error?: string | null
          last_generated_at?: string | null
          last_item_count?: number | null
          last_status?: number | null
          total_errors?: number
          total_requests?: number
          updated_at?: string
        }
        Relationships: []
      }
      rss_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          event: string
          feed: string
          id: string
          item_count: number | null
          origin: string | null
          status: number | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event: string
          feed: string
          id?: string
          item_count?: number | null
          origin?: string | null
          status?: number | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event?: string
          feed?: string
          id?: string
          item_count?: number | null
          origin?: string | null
          status?: number | null
          user_agent?: string | null
        }
        Relationships: []
      }
      search_posts: {
        Row: {
          answer_payload: Json
          answer_summary: string
          confidence: number | null
          created_at: string
          entities: Json
          id: string
          intent: string | null
          meta_description: string
          meta_title: string
          normalized_question: string
          question: string
          slug: string
          updated_at: string
          views: number
        }
        Insert: {
          answer_payload?: Json
          answer_summary: string
          confidence?: number | null
          created_at?: string
          entities?: Json
          id?: string
          intent?: string | null
          meta_description: string
          meta_title: string
          normalized_question: string
          question: string
          slug: string
          updated_at?: string
          views?: number
        }
        Update: {
          answer_payload?: Json
          answer_summary?: string
          confidence?: number | null
          created_at?: string
          entities?: Json
          id?: string
          intent?: string | null
          meta_description?: string
          meta_title?: string
          normalized_question?: string
          question?: string
          slug?: string
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      search_queries: {
        Row: {
          created_at: string
          detected_entities: Json
          id: string
          normalized_query: string
          query_text: string
          query_type: string
          response_status: string
          result_count: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detected_entities?: Json
          id?: string
          normalized_query: string
          query_text: string
          query_type?: string
          response_status?: string
          result_count?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detected_entities?: Json
          id?: string
          normalized_query?: string
          query_text?: string
          query_type?: string
          response_status?: string
          result_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      search_trends: {
        Row: {
          created_at: string
          daily_searches: number
          entity_id: string | null
          entity_type: string
          id: string
          last_searched_at: string
          monthly_searches: number
          term: string
          total_searches: number
          updated_at: string
          weekly_searches: number
        }
        Insert: {
          created_at?: string
          daily_searches?: number
          entity_id?: string | null
          entity_type?: string
          id?: string
          last_searched_at?: string
          monthly_searches?: number
          term: string
          total_searches?: number
          updated_at?: string
          weekly_searches?: number
        }
        Update: {
          created_at?: string
          daily_searches?: number
          entity_id?: string | null
          entity_type?: string
          id?: string
          last_searched_at?: string
          monthly_searches?: number
          term?: string
          total_searches?: number
          updated_at?: string
          weekly_searches?: number
        }
        Relationships: []
      }
      season_aliases: {
        Row: {
          canonical_year: number | null
          created_at: string
          id: string
          normalized_label: string
          raw_label: string
          source: string | null
        }
        Insert: {
          canonical_year?: number | null
          created_at?: string
          id?: string
          normalized_label: string
          raw_label: string
          source?: string | null
        }
        Update: {
          canonical_year?: number | null
          created_at?: string
          id?: string
          normalized_label?: string
          raw_label?: string
          source?: string | null
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
      system_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          module: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          module?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          module?: string
          user_id?: string | null
        }
        Relationships: []
      }
      team_aliases: {
        Row: {
          alias: string
          confidence: number | null
          created_at: string | null
          external_id: string | null
          id: string
          normalized_alias: string
          source: string | null
          source_id: string | null
          team_id: string | null
        }
        Insert: {
          alias: string
          confidence?: number | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          normalized_alias: string
          source?: string | null
          source_id?: string | null
          team_id?: string | null
        }
        Update: {
          alias?: string
          confidence?: number | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          normalized_alias?: string
          source?: string | null
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
      team_curriculum_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          current_team_id: string | null
          current_team_nome: string | null
          error_log: Json
          failed: number
          finished_at: string | null
          id: string
          liga_id: string | null
          liga_nome: string | null
          only_empty: boolean
          processed: number
          skipped_existing: number
          skipped_low_conf: number
          started_at: string | null
          status: string
          succeeded: number
          team_ids: string[]
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_team_id?: string | null
          current_team_nome?: string | null
          error_log?: Json
          failed?: number
          finished_at?: string | null
          id?: string
          liga_id?: string | null
          liga_nome?: string | null
          only_empty?: boolean
          processed?: number
          skipped_existing?: number
          skipped_low_conf?: number
          started_at?: string | null
          status?: string
          succeeded?: number
          team_ids?: string[]
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_team_id?: string | null
          current_team_nome?: string | null
          error_log?: Json
          failed?: number
          finished_at?: string | null
          id?: string
          liga_id?: string | null
          liga_nome?: string | null
          only_empty?: boolean
          processed?: number
          skipped_existing?: number
          skipped_low_conf?: number
          started_at?: string | null
          status?: string
          succeeded?: number
          team_ids?: string[]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_curriculum_jobs_liga_id_fkey"
            columns: ["liga_id"]
            isOneToOne: false
            referencedRelation: "ligas"
            referencedColumns: ["id"]
          },
        ]
      }
      team_merge_analysis_cache: {
        Row: {
          created_by_user_id: string | null
          data_version_hash: string
          generated_at: string
          id: string
          payload_json: Json
          team_a_id: string
          team_b_id: string
        }
        Insert: {
          created_by_user_id?: string | null
          data_version_hash: string
          generated_at?: string
          id?: string
          payload_json: Json
          team_a_id: string
          team_b_id: string
        }
        Update: {
          created_by_user_id?: string | null
          data_version_hash?: string
          generated_at?: string
          id?: string
          payload_json?: Json
          team_a_id?: string
          team_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_merge_analysis_cache_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_merge_analysis_cache_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      team_merge_decisions: {
        Row: {
          created_at: string
          decided_at: string
          decided_by_user_id: string | null
          decision_reason: string
          decision_reason_detail: string | null
          decision_source: string | null
          id: string
          kept_team_id: string
          removed_team_id: string
          report_snapshot_json: Json | null
          risk_level: string | null
          similarity_score: number | null
          validation_run_id: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string
          decided_by_user_id?: string | null
          decision_reason: string
          decision_reason_detail?: string | null
          decision_source?: string | null
          id?: string
          kept_team_id: string
          removed_team_id: string
          report_snapshot_json?: Json | null
          risk_level?: string | null
          similarity_score?: number | null
          validation_run_id?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string
          decided_by_user_id?: string | null
          decision_reason?: string
          decision_reason_detail?: string | null
          decision_source?: string | null
          id?: string
          kept_team_id?: string
          removed_team_id?: string
          report_snapshot_json?: Json | null
          risk_level?: string | null
          similarity_score?: number | null
          validation_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_merge_decisions_kept_team_id_fkey"
            columns: ["kept_team_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_merge_decisions_validation_run_id_fkey"
            columns: ["validation_run_id"]
            isOneToOne: false
            referencedRelation: "team_merge_validation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      team_merge_logs: {
        Row: {
          created_at: string
          id: string
          merged_by: string | null
          source_canonical_name: string
          source_canonical_slug: string | null
          summary: Json
          team_source_id: string
          team_target_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          merged_by?: string | null
          source_canonical_name: string
          source_canonical_slug?: string | null
          summary?: Json
          team_source_id: string
          team_target_id: string
        }
        Update: {
          created_at?: string
          id?: string
          merged_by?: string | null
          source_canonical_name?: string
          source_canonical_slug?: string | null
          summary?: Json
          team_source_id?: string
          team_target_id?: string
        }
        Relationships: []
      }
      team_merge_validation_runs: {
        Row: {
          ai_model_used: string | null
          confidence_score: number | null
          created_at: string
          created_by_user_id: string | null
          decision: string | null
          evidence_json: Json | null
          finished_at: string | null
          id: string
          kept_team_id: string
          reasons_json: Json | null
          removed_team_id: string
          risk_level: string | null
          sample_games_json: Json | null
          search_provider_used: string | null
          slug_suggestion: Json | null
          started_at: string
        }
        Insert: {
          ai_model_used?: string | null
          confidence_score?: number | null
          created_at?: string
          created_by_user_id?: string | null
          decision?: string | null
          evidence_json?: Json | null
          finished_at?: string | null
          id?: string
          kept_team_id: string
          reasons_json?: Json | null
          removed_team_id: string
          risk_level?: string | null
          sample_games_json?: Json | null
          search_provider_used?: string | null
          slug_suggestion?: Json | null
          started_at?: string
        }
        Update: {
          ai_model_used?: string | null
          confidence_score?: number | null
          created_at?: string
          created_by_user_id?: string | null
          decision?: string | null
          evidence_json?: Json | null
          finished_at?: string | null
          id?: string
          kept_team_id?: string
          reasons_json?: Json | null
          removed_team_id?: string
          risk_level?: string | null
          sample_games_json?: Json | null
          search_provider_used?: string | null
          slug_suggestion?: Json | null
          started_at?: string
        }
        Relationships: []
      }
      team_participations: {
        Row: {
          competition_name: string
          competition_tier: string
          created_at: string
          id: string
          notes: string | null
          team_id: string
          total_editions: number | null
          updated_at: string
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          competition_name: string
          competition_tier: string
          created_at?: string
          id?: string
          notes?: string | null
          team_id: string
          total_editions?: number | null
          updated_at?: string
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          competition_name?: string
          competition_tier?: string
          created_at?: string
          id?: string
          notes?: string | null
          team_id?: string
          total_editions?: number | null
          updated_at?: string
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_participations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      team_profiles: {
        Row: {
          anthem_url: string | null
          created_at: string
          culture_text: string | null
          founded_year: number | null
          history_text: string | null
          id: string
          legacy_text: string | null
          mascot: string | null
          nickname: string | null
          rivalries_text: string | null
          stadium_capacity: number | null
          stadium_name: string | null
          stadium_text: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          anthem_url?: string | null
          created_at?: string
          culture_text?: string | null
          founded_year?: number | null
          history_text?: string | null
          id?: string
          legacy_text?: string | null
          mascot?: string | null
          nickname?: string | null
          rivalries_text?: string | null
          stadium_capacity?: number | null
          stadium_name?: string | null
          stadium_text?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          anthem_url?: string | null
          created_at?: string
          culture_text?: string | null
          founded_year?: number | null
          history_text?: string | null
          id?: string
          legacy_text?: string | null
          mascot?: string | null
          nickname?: string | null
          rivalries_text?: string | null
          stadium_capacity?: number | null
          stadium_name?: string | null
          stadium_text?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      team_seo_content: {
        Row: {
          content: Json
          generated_at: string
          id: string
          league_id: string | null
          meta_description: string | null
          meta_title: string | null
          season: number
          team_id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          generated_at?: string
          id?: string
          league_id?: string | null
          meta_description?: string | null
          meta_title?: string | null
          season: number
          team_id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          generated_at?: string
          id?: string
          league_id?: string | null
          meta_description?: string | null
          meta_title?: string | null
          season?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_seo_content_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "ligas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_seo_content_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      team_stats_cache: {
        Row: {
          away_matches: number
          away_wins: number
          draws: number
          goals_conceded: number
          goals_scored: number
          home_matches: number
          home_wins: number
          losses: number
          team_id: string
          total_matches: number
          updated_at: string
          wins: number
        }
        Insert: {
          away_matches?: number
          away_wins?: number
          draws?: number
          goals_conceded?: number
          goals_scored?: number
          home_matches?: number
          home_wins?: number
          losses?: number
          team_id: string
          total_matches?: number
          updated_at?: string
          wins?: number
        }
        Update: {
          away_matches?: number
          away_wins?: number
          draws?: number
          goals_conceded?: number
          goals_scored?: number
          home_matches?: number
          home_wins?: number
          losses?: number
          team_id?: string
          total_matches?: number
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_stats_cache_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      team_titles: {
        Row: {
          competition_name: string
          competition_tier: string
          confederation: string | null
          created_at: string
          edition_year: number | null
          id: string
          notes: string | null
          position: string
          source_url: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          competition_name: string
          competition_tier: string
          confederation?: string | null
          created_at?: string
          edition_year?: number | null
          id?: string
          notes?: string | null
          position?: string
          source_url?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          competition_name?: string
          competition_tier?: string
          confederation?: string | null
          created_at?: string
          edition_year?: number | null
          id?: string
          notes?: string | null
          position?: string
          source_url?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_titles_team_id_fkey"
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
          estado: string | null
          id: string
          import_batch_id: string | null
          name_normalized: string | null
          nome: string
          pais: string | null
          pillar_content: Json | null
          pillar_updated_at: string | null
          priority_score: number | null
          score_factors: Json | null
          score_updated_at: string | null
          short_code: string | null
          slug: string | null
          slug_locked: boolean
          status: string
          total_matches: number
          updated_at: string | null
        }
        Insert: {
          api_id?: number | null
          cores?: Json | null
          created_at?: string | null
          escudo_url?: string | null
          estado?: string | null
          id?: string
          import_batch_id?: string | null
          name_normalized?: string | null
          nome: string
          pais?: string | null
          pillar_content?: Json | null
          pillar_updated_at?: string | null
          priority_score?: number | null
          score_factors?: Json | null
          score_updated_at?: string | null
          short_code?: string | null
          slug?: string | null
          slug_locked?: boolean
          status?: string
          total_matches?: number
          updated_at?: string | null
        }
        Update: {
          api_id?: number | null
          cores?: Json | null
          created_at?: string | null
          escudo_url?: string | null
          estado?: string | null
          id?: string
          import_batch_id?: string | null
          name_normalized?: string | null
          nome?: string
          pais?: string | null
          pillar_content?: Json | null
          pillar_updated_at?: string | null
          priority_score?: number | null
          score_factors?: Json | null
          score_updated_at?: string | null
          short_code?: string | null
          slug?: string | null
          slug_locked?: boolean
          status?: string
          total_matches?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "times_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "csv_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          action_category: string
          action_type: string
          created_at: string | null
          details: Json | null
          id: string
          ip_anonymized: string | null
          session_id: string | null
          user_agent_hash: string | null
          user_id: string
        }
        Insert: {
          action_category: string
          action_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_anonymized?: string | null
          session_id?: string | null
          user_agent_hash?: string | null
          user_id: string
        }
        Update: {
          action_category?: string
          action_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_anonymized?: string | null
          session_id?: string | null
          user_agent_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          source_id: string | null
          source_type: string | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          source_id?: string | null
          source_type?: string | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          source_id?: string | null
          source_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_fiscal_data: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          cpf_validated: boolean | null
          created_at: string | null
          estado: string | null
          id: string
          ie: string | null
          ie_isento: boolean | null
          logradouro: string | null
          nome_fiscal: string | null
          numero: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          cpf_validated?: boolean | null
          created_at?: string | null
          estado?: string | null
          id?: string
          ie?: string | null
          ie_isento?: boolean | null
          logradouro?: string | null
          nome_fiscal?: string | null
          numero?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          cpf_validated?: boolean | null
          created_at?: string | null
          estado?: string | null
          id?: string
          ie?: string | null
          ie_isento?: boolean | null
          logradouro?: string | null
          nome_fiscal?: string | null
          numero?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_gamification_stats: {
        Row: {
          acertos_placar_exato: number | null
          created_at: string | null
          id: string
          last_palpite_at: string | null
          maior_sequencia: number | null
          pontuacao_total: number | null
          sequencia_atual: number | null
          total_acertos: number | null
          total_erros: number | null
          total_palpites: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          acertos_placar_exato?: number | null
          created_at?: string | null
          id?: string
          last_palpite_at?: string | null
          maior_sequencia?: number | null
          pontuacao_total?: number | null
          sequencia_atual?: number | null
          total_acertos?: number | null
          total_erros?: number | null
          total_palpites?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          acertos_placar_exato?: number | null
          created_at?: string | null
          id?: string
          last_palpite_at?: string | null
          maior_sequencia?: number | null
          pontuacao_total?: number | null
          sequencia_atual?: number | null
          total_acertos?: number | null
          total_erros?: number | null
          total_palpites?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          favorite_league_ids: Json | null
          favorite_team_id: string | null
          favorite_team_ids: Json | null
          focus_region: string
          id: string
          notifications_email: boolean
          notifications_push: boolean
          public_profile: boolean
          theme_mode: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          favorite_league_ids?: Json | null
          favorite_team_id?: string | null
          favorite_team_ids?: Json | null
          focus_region?: string
          id?: string
          notifications_email?: boolean
          notifications_push?: boolean
          public_profile?: boolean
          theme_mode?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          favorite_league_ids?: Json | null
          favorite_team_id?: string | null
          favorite_team_ids?: Json | null
          focus_region?: string
          id?: string
          notifications_email?: boolean
          notifications_push?: boolean
          public_profile?: boolean
          theme_mode?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_favorite_team_id_fkey"
            columns: ["favorite_team_id"]
            isOneToOne: false
            referencedRelation: "times"
            referencedColumns: ["id"]
          },
        ]
      }
      user_public_profiles: {
        Row: {
          avatar_status: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string
          nickname: string | null
          nickname_normalized: string | null
          updated_at: string | null
          user_id: string
          username_changes_count: number
        }
        Insert: {
          avatar_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          nickname?: string | null
          nickname_normalized?: string | null
          updated_at?: string | null
          user_id: string
          username_changes_count?: number
        }
        Update: {
          avatar_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          nickname?: string | null
          nickname_normalized?: string | null
          updated_at?: string | null
          user_id?: string
          username_changes_count?: number
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
      user_search_history: {
        Row: {
          clicked_result_id: string | null
          clicked_result_type: string | null
          created_at: string
          id: string
          query_text: string
          query_type: string
          user_id: string
        }
        Insert: {
          clicked_result_id?: string | null
          clicked_result_type?: string | null
          created_at?: string
          id?: string
          query_text: string
          query_type?: string
          user_id: string
        }
        Update: {
          clicked_result_id?: string | null
          clicked_result_type?: string | null
          created_at?: string
          id?: string
          query_text?: string
          query_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_xp: {
        Row: {
          best_streak_days: number
          current_streak_days: number
          last_activity_date: string | null
          level: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak_days?: number
          current_streak_days?: number
          last_activity_date?: string | null
          level?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak_days?: number
          current_streak_days?: number
          last_activity_date?: string | null
          level?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wc2026_bracket_projections: {
        Row: {
          away_pens: number | null
          away_score: number | null
          away_team_id: string | null
          basis: Json
          confidence: string
          created_at: string
          frozen_at: string | null
          generated_at: string
          group_letter: string | null
          home_pens: number | null
          home_score: number | null
          home_team_id: string | null
          id: string
          is_official_version: boolean
          match_id: string | null
          phase: string
          prob_away: number | null
          prob_draw: number | null
          prob_home: number | null
          projection_version: string
          slot_code: string
          updated_at: string
          went_to_penalties: boolean
          winner_team_id: string | null
        }
        Insert: {
          away_pens?: number | null
          away_score?: number | null
          away_team_id?: string | null
          basis?: Json
          confidence?: string
          created_at?: string
          frozen_at?: string | null
          generated_at?: string
          group_letter?: string | null
          home_pens?: number | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          is_official_version?: boolean
          match_id?: string | null
          phase: string
          prob_away?: number | null
          prob_draw?: number | null
          prob_home?: number | null
          projection_version?: string
          slot_code: string
          updated_at?: string
          went_to_penalties?: boolean
          winner_team_id?: string | null
        }
        Update: {
          away_pens?: number | null
          away_score?: number | null
          away_team_id?: string | null
          basis?: Json
          confidence?: string
          created_at?: string
          frozen_at?: string | null
          generated_at?: string
          group_letter?: string | null
          home_pens?: number | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          is_official_version?: boolean
          match_id?: string | null
          phase?: string
          prob_away?: number | null
          prob_draw?: number | null
          prob_home?: number | null
          projection_version?: string
          slot_code?: string
          updated_at?: string
          went_to_penalties?: boolean
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wc2026_bracket_projections_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc2026_bracket_projections_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc2026_bracket_projections_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wc2026_bracket_projections_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      wc2026_match_odds: {
        Row: {
          away_win: number | null
          bookmaker: string
          btts_no: number | null
          btts_yes: number | null
          draw: number | null
          exact_scores: Json | null
          external_fixture_id: number | null
          fetched_at: string
          home_win: number | null
          id: string
          implied_prob_away: number | null
          implied_prob_draw: number | null
          implied_prob_home: number | null
          match_id: string
          over_2_5: number | null
          raw: Json | null
          source: string
          under_2_5: number | null
          updated_at: string
        }
        Insert: {
          away_win?: number | null
          bookmaker?: string
          btts_no?: number | null
          btts_yes?: number | null
          draw?: number | null
          exact_scores?: Json | null
          external_fixture_id?: number | null
          fetched_at?: string
          home_win?: number | null
          id?: string
          implied_prob_away?: number | null
          implied_prob_draw?: number | null
          implied_prob_home?: number | null
          match_id: string
          over_2_5?: number | null
          raw?: Json | null
          source?: string
          under_2_5?: number | null
          updated_at?: string
        }
        Update: {
          away_win?: number | null
          bookmaker?: string
          btts_no?: number | null
          btts_yes?: number | null
          draw?: number | null
          exact_scores?: Json | null
          external_fixture_id?: number | null
          fetched_at?: string
          home_win?: number | null
          id?: string
          implied_prob_away?: number | null
          implied_prob_draw?: number | null
          implied_prob_home?: number | null
          match_id?: string
          over_2_5?: number | null
          raw?: Json | null
          source?: string
          under_2_5?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wc2026_match_odds_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      wc2026_monte_carlo_results: {
        Row: {
          created_at: string
          expected_goals_against: number | null
          expected_goals_for: number | null
          generated_at: string
          id: string
          is_official_version: boolean
          p_champion: number
          p_final: number
          p_qf: number
          p_r16: number
          p_semi: number
          projection_version: string
          simulations: number
          team_id: string
        }
        Insert: {
          created_at?: string
          expected_goals_against?: number | null
          expected_goals_for?: number | null
          generated_at?: string
          id?: string
          is_official_version?: boolean
          p_champion?: number
          p_final?: number
          p_qf?: number
          p_r16?: number
          p_semi?: number
          projection_version?: string
          simulations?: number
          team_id: string
        }
        Update: {
          created_at?: string
          expected_goals_against?: number | null
          expected_goals_for?: number | null
          generated_at?: string
          id?: string
          is_official_version?: boolean
          p_champion?: number
          p_final?: number
          p_qf?: number
          p_r16?: number
          p_semi?: number
          projection_version?: string
          simulations?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wc2026_monte_carlo_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          action: string | null
          error_message: string | null
          event_id: string
          id: string
          payload: Json | null
          processed_at: string | null
          processing_status: Database["public"]["Enums"]["webhook_status"]
          received_at: string
          resource_id: string | null
          retry_count: number | null
          topic: string
        }
        Insert: {
          action?: string | null
          error_message?: string | null
          event_id: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          processing_status?: Database["public"]["Enums"]["webhook_status"]
          received_at?: string
          resource_id?: string | null
          retry_count?: number | null
          topic: string
        }
        Update: {
          action?: string | null
          error_message?: string | null
          event_id?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          processing_status?: Database["public"]["Enums"]["webhook_status"]
          received_at?: string
          resource_id?: string | null
          retry_count?: number | null
          topic?: string
        }
        Relationships: []
      }
      world_cup_2026_ai_analyses: {
        Row: {
          analysis_type: string
          confidence_score: number | null
          content: string | null
          generated_at: string
          has_enough_data: boolean | null
          id: string
          match_id: string | null
          model_used: string | null
          predicted_away_score: number | null
          predicted_home_score: number | null
          team_id: string | null
          title: string | null
        }
        Insert: {
          analysis_type: string
          confidence_score?: number | null
          content?: string | null
          generated_at?: string
          has_enough_data?: boolean | null
          id?: string
          match_id?: string | null
          model_used?: string | null
          predicted_away_score?: number | null
          predicted_home_score?: number | null
          team_id?: string | null
          title?: string | null
        }
        Update: {
          analysis_type?: string
          confidence_score?: number | null
          content?: string | null
          generated_at?: string
          has_enough_data?: boolean | null
          id?: string
          match_id?: string | null
          model_used?: string | null
          predicted_away_score?: number | null
          predicted_home_score?: number | null
          team_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "world_cup_2026_ai_analyses_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_cup_2026_ai_analyses_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      world_cup_2026_lineups: {
        Row: {
          created_at: string
          formation: string | null
          id: string
          is_official: boolean | null
          is_starter: boolean | null
          match_id: string
          player_id: string | null
          position: string | null
          source: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          formation?: string | null
          id?: string
          is_official?: boolean | null
          is_starter?: boolean | null
          match_id: string
          player_id?: string | null
          position?: string | null
          source?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          formation?: string | null
          id?: string
          is_official?: boolean | null
          is_starter?: boolean | null
          match_id?: string
          player_id?: string | null
          position?: string | null
          source?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_cup_2026_lineups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_cup_2026_lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_cup_2026_lineups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      world_cup_2026_match_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          extra_minute: number | null
          id: string
          match_id: string
          minute: number | null
          player_id: string | null
          team_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          extra_minute?: number | null
          id?: string
          match_id: string
          minute?: number | null
          player_id?: string | null
          team_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          extra_minute?: number | null
          id?: string
          match_id?: string
          minute?: number | null
          player_id?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "world_cup_2026_match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_cup_2026_match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_cup_2026_match_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      world_cup_2026_matches: {
        Row: {
          attendance: number | null
          away_score: number | null
          away_team_id: string | null
          bracket_position: string | null
          city: string | null
          created_at: string
          external_fixture_id: number | null
          group_letter: string | null
          home_score: number | null
          home_team_id: string | null
          id: string
          match_date: string | null
          match_round: number | null
          next_match_id: string | null
          next_match_slot: string | null
          round: string | null
          stadium: string | null
          stage: string
          status: string
          updated_at: string
          winner_team_id: string | null
        }
        Insert: {
          attendance?: number | null
          away_score?: number | null
          away_team_id?: string | null
          bracket_position?: string | null
          city?: string | null
          created_at?: string
          external_fixture_id?: number | null
          group_letter?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          match_date?: string | null
          match_round?: number | null
          next_match_id?: string | null
          next_match_slot?: string | null
          round?: string | null
          stadium?: string | null
          stage?: string
          status?: string
          updated_at?: string
          winner_team_id?: string | null
        }
        Update: {
          attendance?: number | null
          away_score?: number | null
          away_team_id?: string | null
          bracket_position?: string | null
          city?: string | null
          created_at?: string
          external_fixture_id?: number | null
          group_letter?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          match_date?: string | null
          match_round?: number | null
          next_match_id?: string | null
          next_match_slot?: string | null
          round?: string | null
          stadium?: string | null
          stage?: string
          status?: string
          updated_at?: string
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "world_cup_2026_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_cup_2026_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_cup_2026_matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_cup_2026_matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      world_cup_2026_players: {
        Row: {
          birth_date: string | null
          club: string | null
          created_at: string
          external_player_id: number | null
          id: string
          is_called_up: boolean | null
          is_probable_starter: boolean | null
          name: string
          photo_url: string | null
          position: string | null
          shirt_number: number | null
          slug: string
          source: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          club?: string | null
          created_at?: string
          external_player_id?: number | null
          id?: string
          is_called_up?: boolean | null
          is_probable_starter?: boolean | null
          name: string
          photo_url?: string | null
          position?: string | null
          shirt_number?: number | null
          slug: string
          source?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          club?: string | null
          created_at?: string
          external_player_id?: number | null
          id?: string
          is_called_up?: boolean | null
          is_probable_starter?: boolean | null
          name?: string
          photo_url?: string | null
          position?: string | null
          shirt_number?: number | null
          slug?: string
          source?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_cup_2026_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      world_cup_2026_posts: {
        Row: {
          content: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          post_type: string
          published_at: string | null
          related_match_id: string | null
          related_team_id: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          post_type: string
          published_at?: string | null
          related_match_id?: string | null
          related_team_id?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          post_type?: string
          published_at?: string | null
          related_match_id?: string | null
          related_team_id?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_cup_2026_posts_related_match_id_fkey"
            columns: ["related_match_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_cup_2026_posts_related_team_id_fkey"
            columns: ["related_team_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      world_cup_2026_standings: {
        Row: {
          draws: number | null
          goal_difference: number | null
          goals_against: number | null
          goals_for: number | null
          group_letter: string
          id: string
          losses: number | null
          played: number | null
          points: number | null
          position: number | null
          status: string | null
          team_id: string
          updated_at: string
          wins: number | null
        }
        Insert: {
          draws?: number | null
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          group_letter: string
          id?: string
          losses?: number | null
          played?: number | null
          points?: number | null
          position?: number | null
          status?: string | null
          team_id: string
          updated_at?: string
          wins?: number | null
        }
        Update: {
          draws?: number | null
          goal_difference?: number | null
          goals_against?: number | null
          goals_for?: number | null
          group_letter?: string
          id?: string
          losses?: number | null
          played?: number | null
          points?: number | null
          position?: number | null
          status?: string | null
          team_id?: string
          updated_at?: string
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "world_cup_2026_standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      world_cup_2026_sync_logs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          payload_snapshot: Json | null
          provider: string | null
          records_processed: number | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          payload_snapshot?: Json | null
          provider?: string | null
          records_processed?: number | null
          started_at?: string
          status?: string
          sync_type: string
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          payload_snapshot?: Json | null
          provider?: string | null
          records_processed?: number | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      world_cup_2026_team_history: {
        Row: {
          coach_name: string | null
          created_at: string
          draws: number | null
          final_position: string | null
          goals_against: number | null
          goals_for: number | null
          host_country: string | null
          id: string
          losses: number | null
          notes: string | null
          source: string | null
          stage_reached: string | null
          team_id: string
          wins: number | null
          year: number
        }
        Insert: {
          coach_name?: string | null
          created_at?: string
          draws?: number | null
          final_position?: string | null
          goals_against?: number | null
          goals_for?: number | null
          host_country?: string | null
          id?: string
          losses?: number | null
          notes?: string | null
          source?: string | null
          stage_reached?: string | null
          team_id: string
          wins?: number | null
          year: number
        }
        Update: {
          coach_name?: string | null
          created_at?: string
          draws?: number | null
          final_position?: string | null
          goals_against?: number | null
          goals_for?: number | null
          host_country?: string | null
          id?: string
          losses?: number | null
          notes?: string | null
          source?: string | null
          stage_reached?: string | null
          team_id?: string
          wins?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "world_cup_2026_team_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "world_cup_2026_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      world_cup_2026_teams: {
        Row: {
          best_campaign: string | null
          coach_name: string | null
          coach_nationality: string | null
          confederation: string | null
          confederation_full: string | null
          country_code: string | null
          created_at: string
          external_team_id: number | null
          fifa_ranking: number | null
          first_participation_year: number | null
          flag_url: string | null
          group_letter: string | null
          historical_summary: string | null
          historical_summary_status: string | null
          id: string
          is_active: boolean
          meta_description: string | null
          name: string
          nickname: string | null
          participations_count: number | null
          seo_keywords: string[] | null
          slug: string
          status: string
          titles_count: number | null
          updated_at: string
        }
        Insert: {
          best_campaign?: string | null
          coach_name?: string | null
          coach_nationality?: string | null
          confederation?: string | null
          confederation_full?: string | null
          country_code?: string | null
          created_at?: string
          external_team_id?: number | null
          fifa_ranking?: number | null
          first_participation_year?: number | null
          flag_url?: string | null
          group_letter?: string | null
          historical_summary?: string | null
          historical_summary_status?: string | null
          id?: string
          is_active?: boolean
          meta_description?: string | null
          name: string
          nickname?: string | null
          participations_count?: number | null
          seo_keywords?: string[] | null
          slug: string
          status?: string
          titles_count?: number | null
          updated_at?: string
        }
        Update: {
          best_campaign?: string | null
          coach_name?: string | null
          coach_nationality?: string | null
          confederation?: string | null
          confederation_full?: string | null
          country_code?: string | null
          created_at?: string
          external_team_id?: number | null
          fifa_ranking?: number | null
          first_participation_year?: number | null
          flag_url?: string | null
          group_letter?: string | null
          historical_summary?: string | null
          historical_summary_status?: string | null
          id?: string
          is_active?: boolean
          meta_description?: string | null
          name?: string
          nickname?: string | null
          participations_count?: number | null
          seo_keywords?: string[] | null
          slug?: string
          status?: string
          titles_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          competition_id: string | null
          created_at: string
          description: string | null
          id: string
          match_id: string | null
          rule_key: string
          source_id: string | null
          source_type: string
          user_id: string
          xp_delta: number
        }
        Insert: {
          competition_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          match_id?: string | null
          rule_key: string
          source_id?: string | null
          source_type?: string
          user_id: string
          xp_delta?: number
        }
        Update: {
          competition_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          match_id?: string | null
          rule_key?: string
          source_id?: string | null
          source_type?: string
          user_id?: string
          xp_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_events_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "ligas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "partidas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_public_user_summary: {
        Row: {
          accuracy_pct: number | null
          acertos_placar_exato: number | null
          avatar_url: string | null
          badge_count: number | null
          best_streak_days: number | null
          city: string | null
          country: string | null
          current_streak_days: number | null
          level: number | null
          nickname: string | null
          nome: string | null
          pontuacao_total: number | null
          state: string | null
          total_acertos: number | null
          total_palpites: number | null
          total_xp: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_level: { Args: { p_total_xp: number }; Returns: number }
      compute_prediction_levels: {
        Args: { p_away: number; p_home: number; r_away: number; r_home: number }
        Returns: {
          l1: boolean
          l2: boolean
          l3: boolean
          l4: boolean
          score: number
        }[]
      }
      consolidate_team_aliases: {
        Args: never
        Returns: {
          alias_created: boolean
          team_id: string
          team_name: string
        }[]
      }
      count_duplicate_matches: {
        Args: never
        Returns: {
          dup_groups: number
          dup_records: number
        }[]
      }
      count_teams_with_aliases: {
        Args: { p_search?: string; p_status?: string }
        Returns: number
      }
      estimated_count: { Args: { table_name: string }; Returns: number }
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
      gerar_palpites_sistema_lote: {
        Args: {
          p_limit?: number
          p_process_results?: boolean
          p_status?: string
        }
        Returns: Json
      }
      get_brasileirao_retrospectiva: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_rodada?: number
          p_season?: string
        }
        Returns: Json
      }
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
      get_team_season_rankings: {
        Args: {
          p_league_id?: string
          p_limit?: number
          p_metric?: string
          p_season: number
        }
        Returns: {
          aproveitamento: number
          derrotas: number
          empates: number
          gols_marcados: number
          gols_sofridos: number
          jogos: number
          league_id: string
          league_nome: string
          league_slug: string
          media_gols_marcados: number
          media_gols_sofridos: number
          pontos: number
          saldo: number
          team_cores: Json
          team_id: string
          team_nome: string
          team_slug: string
          vitorias: number
        }[]
      }
      get_team_stats_bulk: {
        Args: { p_team_ids: string[] }
        Returns: {
          away_matches: number
          away_wins: number
          draws: number
          goals_conceded: number
          goals_scored: number
          home_matches: number
          home_wins: number
          losses: number
          team_id: string
          total_matches: number
          wins: number
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
      get_teams_without_matches: {
        Args: never
        Returns: {
          created_at: string
          has_aliases: boolean
          has_external_ids: boolean
          id: string
          nome: string
          slug: string
        }[]
      }
      get_user_palpites_history:
        | {
            Args: { p_limit?: number; p_offset?: number }
            Returns: {
              aceitou_sugestao: boolean
              created_at: string
              id: string
              palpite_sistema: Json
              palpite_sistema_id: string
              partida: Json
              partida_id: string
              placar_casa: number
              placar_fora: number
              updated_at: string
              user_id: string
            }[]
          }
        | {
            Args: {
              p_confidence?: string
              p_end_date?: string
              p_limit?: number
              p_offset?: number
              p_start_date?: string
            }
            Returns: {
              aceitou_sugestao: boolean
              created_at: string
              id: string
              palpite_sistema: Json
              palpite_sistema_id: string
              partida: Json
              partida_id: string
              placar_casa: number
              placar_fora: number
              updated_at: string
              user_id: string
            }[]
          }
      get_user_palpites_history_count: {
        Args: {
          p_confidence?: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: number
      }
      grant_days_to_user: {
        Args: {
          p_days: number
          p_description?: string
          p_origin: Database["public"]["Enums"]["ledger_origin"]
          p_reference_id?: string
          p_reference_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      grant_xp: {
        Args: {
          p_competition_id?: string
          p_description?: string
          p_match_id?: string
          p_rule_key: string
          p_source_id?: string
          p_source_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_search_post_views: {
        Args: { p_slug: string }
        Returns: undefined
      }
      log_user_activity: {
        Args: {
          p_action_category: string
          p_action_type: string
          p_details?: Json
          p_ip_anonymized?: string
          p_session_id?: string
          p_user_agent_hash?: string
          p_user_id: string
        }
        Returns: string
      }
      merge_teams: {
        Args: { p_merged_by?: string; p_source_id: string; p_target_id: string }
        Returns: Json
      }
      normalize_name: { Args: { input_text: string }; Returns: string }
      normalize_name_for_slug: { Args: { input_name: string }; Returns: string }
      normalize_nickname: { Args: { input_text: string }; Returns: string }
      processar_resultado_partida: {
        Args: { p_partida_id: string }
        Returns: undefined
      }
      recalculate_user_access: { Args: { p_user_id: string }; Returns: Json }
      record_ai_answer: {
        Args: {
          p_answer: string
          p_confidence: number
          p_has_enough: boolean
          p_normalized: string
          p_question: string
          p_sources: Json
          p_user_id?: string
        }
        Returns: string
      }
      refresh_confidence_accuracy: {
        Args: {
          p_band: string
          p_competition_code: string
          p_model_version: string
        }
        Returns: undefined
      }
      refresh_team_stats_cache: { Args: never; Returns: Json }
      register_search: {
        Args: {
          p_entities?: Json
          p_normalized: string
          p_query: string
          p_result_count?: number
          p_status?: string
          p_type: string
          p_user_id?: string
        }
        Returns: string
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
      search_global: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          entity_id: string
          entity_type: string
          extra: Json
          name: string
          score: number
        }[]
      }
      slugify: { Args: { input_text: string }; Returns: string }
      slugify_player_name: { Args: { name: string }; Returns: string }
      start_grace_period: { Args: { p_user_id: string }; Returns: Json }
      unaccent: { Args: { "": string }; Returns: string }
      update_user_streak: { Args: { p_user_id: string }; Returns: Json }
      validate_nickname: {
        Args: { p_nickname: string; p_user_id?: string }
        Returns: {
          error_message: string
          is_valid: boolean
        }[]
      }
      xp_for_level: { Args: { p_level: number }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      assinatura_status: "active" | "cancelled" | "expired"
      competition_type: "league" | "cup" | "tournament" | "friendly"
      entity_status: "active" | "inactive" | "pending" | "error"
      ledger_origin:
        | "payment"
        | "subscription"
        | "admin"
        | "refund"
        | "chargeback"
        | "trial"
        | "bonus"
      match_confidence: "low" | "medium" | "high" | "exact"
      partida_status:
        | "scheduled"
        | "live"
        | "finished"
        | "postponed"
        | "cancelled"
      payment_method: "credit_card" | "debit_card" | "pix" | "boleto" | "other"
      payment_status:
        | "pending"
        | "approved"
        | "authorized"
        | "in_process"
        | "in_mediation"
        | "rejected"
        | "cancelled"
        | "refunded"
        | "charged_back"
      plan_type: "one_time_days" | "subscription_monthly"
      plano_tipo: "free" | "premium"
      source_type: "api" | "github" | "manual"
      subscription_status:
        | "trial_active"
        | "active"
        | "past_due"
        | "canceled"
        | "blocked"
        | "expired"
      sync_status: "pending" | "running" | "completed" | "failed"
      webhook_status:
        | "pending"
        | "processing"
        | "processed"
        | "failed"
        | "skipped"
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
      ledger_origin: [
        "payment",
        "subscription",
        "admin",
        "refund",
        "chargeback",
        "trial",
        "bonus",
      ],
      match_confidence: ["low", "medium", "high", "exact"],
      partida_status: [
        "scheduled",
        "live",
        "finished",
        "postponed",
        "cancelled",
      ],
      payment_method: ["credit_card", "debit_card", "pix", "boleto", "other"],
      payment_status: [
        "pending",
        "approved",
        "authorized",
        "in_process",
        "in_mediation",
        "rejected",
        "cancelled",
        "refunded",
        "charged_back",
      ],
      plan_type: ["one_time_days", "subscription_monthly"],
      plano_tipo: ["free", "premium"],
      source_type: ["api", "github", "manual"],
      subscription_status: [
        "trial_active",
        "active",
        "past_due",
        "canceled",
        "blocked",
        "expired",
      ],
      sync_status: ["pending", "running", "completed", "failed"],
      webhook_status: [
        "pending",
        "processing",
        "processed",
        "failed",
        "skipped",
      ],
    },
  },
} as const
