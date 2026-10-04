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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_actions: {
        Row: {
          action: string
          agent_user_id: string
          created_at: string
          error_message: string | null
          id: string
          ip: string | null
          meta: Json | null
          status: string
          target_id: string | null
          target_type: string | null
          token_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          agent_user_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip?: string | null
          meta?: Json | null
          status?: string
          target_id?: string | null
          target_type?: string | null
          token_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          agent_user_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip?: string | null
          meta?: Json | null
          status?: string
          target_id?: string | null
          target_type?: string | null
          token_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      agent_api_tokens: {
        Row: {
          agent_user_id: string
          allowed_board_slugs: string[] | null
          daily_post_quota: number
          description: string | null
          expires_at: string | null
          id: string
          issued_at: string
          issued_by: string | null
          last_used_at: string | null
          rate_limit_per_min: number
          revoked_at: string | null
          scopes: string[]
          token_hash: string
        }
        Insert: {
          agent_user_id: string
          allowed_board_slugs?: string[] | null
          daily_post_quota?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          last_used_at?: string | null
          rate_limit_per_min?: number
          revoked_at?: string | null
          scopes?: string[]
          token_hash: string
        }
        Update: {
          agent_user_id?: string
          allowed_board_slugs?: string[] | null
          daily_post_quota?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          last_used_at?: string | null
          rate_limit_per_min?: number
          revoked_at?: string | null
          scopes?: string[]
          token_hash?: string
        }
        Relationships: []
      }
      agent_connection_log: {
        Row: {
          agent_user_id: string
          ended_at: string | null
          id: string
          ip: unknown
          metadata: Json | null
          scopes: string[]
          started_at: string
          token_id: string | null
          user_agent: string | null
        }
        Insert: {
          agent_user_id: string
          ended_at?: string | null
          id?: string
          ip?: unknown
          metadata?: Json | null
          scopes?: string[]
          started_at?: string
          token_id?: string | null
          user_agent?: string | null
        }
        Update: {
          agent_user_id?: string
          ended_at?: string | null
          id?: string
          ip?: unknown
          metadata?: Json | null
          scopes?: string[]
          started_at?: string
          token_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      agent_content_diff_log: {
        Row: {
          after_snapshot: Json | null
          approved_at: string | null
          approved_by: string | null
          before_snapshot: Json | null
          created_at: string
          id: string
          operation: Database["public"]["Enums"]["agent_content_op"]
          published_at: string | null
          target_id: string
          target_type: string
          task_id: string
        }
        Insert: {
          after_snapshot?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          before_snapshot?: Json | null
          created_at?: string
          id?: string
          operation: Database["public"]["Enums"]["agent_content_op"]
          published_at?: string | null
          target_id: string
          target_type: string
          task_id: string
        }
        Update: {
          after_snapshot?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          before_snapshot?: Json | null
          created_at?: string
          id?: string
          operation?: Database["public"]["Enums"]["agent_content_op"]
          published_at?: string | null
          target_id?: string
          target_type?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_content_diff_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_task_log"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_experience_entry: {
        Row: {
          action_layer: string | null
          agent_user_id: string
          context_layer: string | null
          created_at: string
          event_layer: string | null
          id: string
          insight_layer: string | null
          knowledge_layer: string | null
          owner_user_id: string
          period: string | null
          period_label: string | null
          source_task_id: string | null
          status: Database["public"]["Enums"]["agent_experience_status"]
          summary: string | null
          title: string
          type: Database["public"]["Enums"]["agent_experience_type"]
          updated_at: string
        }
        Insert: {
          action_layer?: string | null
          agent_user_id: string
          context_layer?: string | null
          created_at?: string
          event_layer?: string | null
          id?: string
          insight_layer?: string | null
          knowledge_layer?: string | null
          owner_user_id: string
          period?: string | null
          period_label?: string | null
          source_task_id?: string | null
          status?: Database["public"]["Enums"]["agent_experience_status"]
          summary?: string | null
          title: string
          type: Database["public"]["Enums"]["agent_experience_type"]
          updated_at?: string
        }
        Update: {
          action_layer?: string | null
          agent_user_id?: string
          context_layer?: string | null
          created_at?: string
          event_layer?: string | null
          id?: string
          insight_layer?: string | null
          knowledge_layer?: string | null
          owner_user_id?: string
          period?: string | null
          period_label?: string | null
          source_task_id?: string | null
          status?: Database["public"]["Enums"]["agent_experience_status"]
          summary?: string | null
          title?: string
          type?: Database["public"]["Enums"]["agent_experience_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_experience_entry_source_task_id_fkey"
            columns: ["source_task_id"]
            isOneToOne: false
            referencedRelation: "agent_task_log"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_skill_proposal: {
        Row: {
          created_at: string
          diff_or_draft: string | null
          evidence: Json | null
          id: string
          proposal_type: string
          rationale: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_skill_id: string | null
        }
        Insert: {
          created_at?: string
          diff_or_draft?: string | null
          evidence?: Json | null
          id?: string
          proposal_type: string
          rationale: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_skill_id?: string | null
        }
        Update: {
          created_at?: string
          diff_or_draft?: string | null
          evidence?: Json | null
          id?: string
          proposal_type?: string
          rationale?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_skill_id?: string | null
        }
        Relationships: []
      }
      agent_skill_registry: {
        Row: {
          agent_type: string | null
          api_base_url: string | null
          approved_by: string | null
          approved_runs: number | null
          avg_runtime_ms: number | null
          category: string | null
          created_at: string
          deprecated_at: string | null
          effective_at: string | null
          endpoints_summary: Json | null
          id: string
          md_content: string
          proposed_by: string | null
          schedule_config: Json | null
          scopes: string[]
          short_name: string | null
          skill_id: string
          skill_type: string | null
          status: Database["public"]["Enums"]["agent_skill_status"]
          success_runs: number | null
          system_name: string | null
          total_runs: number | null
          updated_at: string
          version: string
        }
        Insert: {
          agent_type?: string | null
          api_base_url?: string | null
          approved_by?: string | null
          approved_runs?: number | null
          avg_runtime_ms?: number | null
          category?: string | null
          created_at?: string
          deprecated_at?: string | null
          effective_at?: string | null
          endpoints_summary?: Json | null
          id?: string
          md_content: string
          proposed_by?: string | null
          schedule_config?: Json | null
          scopes?: string[]
          short_name?: string | null
          skill_id: string
          skill_type?: string | null
          status?: Database["public"]["Enums"]["agent_skill_status"]
          success_runs?: number | null
          system_name?: string | null
          total_runs?: number | null
          updated_at?: string
          version: string
        }
        Update: {
          agent_type?: string | null
          api_base_url?: string | null
          approved_by?: string | null
          approved_runs?: number | null
          avg_runtime_ms?: number | null
          category?: string | null
          created_at?: string
          deprecated_at?: string | null
          effective_at?: string | null
          endpoints_summary?: Json | null
          id?: string
          md_content?: string
          proposed_by?: string | null
          schedule_config?: Json | null
          scopes?: string[]
          short_name?: string | null
          skill_id?: string
          skill_type?: string | null
          status?: Database["public"]["Enums"]["agent_skill_status"]
          success_runs?: number | null
          system_name?: string | null
          total_runs?: number | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      agent_task_log: {
        Row: {
          agent_user_id: string
          api_calls: Json | null
          claude_reasoning_summary: string | null
          connection_id: string | null
          duration_ms: number | null
          error: Json | null
          finished_at: string | null
          id: string
          input_payload: Json
          output_payload: Json | null
          skill_id: string
          skill_version: string
          started_at: string
          status: Database["public"]["Enums"]["agent_task_status"]
          trigger_source: string | null
          trigger_type: Database["public"]["Enums"]["agent_trigger_type"]
        }
        Insert: {
          agent_user_id: string
          api_calls?: Json | null
          claude_reasoning_summary?: string | null
          connection_id?: string | null
          duration_ms?: number | null
          error?: Json | null
          finished_at?: string | null
          id?: string
          input_payload?: Json
          output_payload?: Json | null
          skill_id: string
          skill_version: string
          started_at?: string
          status?: Database["public"]["Enums"]["agent_task_status"]
          trigger_source?: string | null
          trigger_type: Database["public"]["Enums"]["agent_trigger_type"]
        }
        Update: {
          agent_user_id?: string
          api_calls?: Json | null
          claude_reasoning_summary?: string | null
          connection_id?: string | null
          duration_ms?: number | null
          error?: Json | null
          finished_at?: string | null
          id?: string
          input_payload?: Json
          output_payload?: Json | null
          skill_id?: string
          skill_version?: string
          started_at?: string
          status?: Database["public"]["Enums"]["agent_task_status"]
          trigger_source?: string | null
          trigger_type?: Database["public"]["Enums"]["agent_trigger_type"]
        }
        Relationships: [
          {
            foreignKeyName: "agent_task_log_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "agent_connection_log"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          called_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          method: string
          runtime_ms: number | null
          scopes_used: string[] | null
          status_code: number | null
          system_name: string
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          called_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          method?: string
          runtime_ms?: number | null
          scopes_used?: string[] | null
          status_code?: number | null
          system_name: string
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          called_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          method?: string
          runtime_ms?: number | null
          scopes_used?: string[] | null
          status_code?: number | null
          system_name?: string
        }
        Relationships: []
      }
      board_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          position?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      boards: {
        Row: {
          allow_anonymous: boolean
          category_id: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          allow_anonymous?: boolean
          category_id: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          position?: number
          slug: string
        }
        Update: {
          allow_anonymous?: boolean
          category_id?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "boards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "board_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_routes: {
        Row: {
          anon_key: string | null
          base_url: string
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          required_scopes: string[] | null
          system_name: string
          updated_at: string | null
        }
        Insert: {
          anon_key?: string | null
          base_url: string
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          required_scopes?: string[] | null
          system_name: string
          updated_at?: string | null
        }
        Update: {
          anon_key?: string | null
          base_url?: string
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          required_scopes?: string[] | null
          system_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      knowledge_summaries: {
        Row: {
          action_items: string | null
          agent_user_id: string | null
          context_digest: string | null
          created_at: string | null
          distilled_at: string | null
          event_summary: string | null
          id: string
          insight_digest: string | null
          knowledge_digest: string | null
          period_label: string
          period_type: string
          published_at: string | null
          skill_ids_affected: string[] | null
          source_count: number | null
          status: string
          upgrade_notes: string | null
        }
        Insert: {
          action_items?: string | null
          agent_user_id?: string | null
          context_digest?: string | null
          created_at?: string | null
          distilled_at?: string | null
          event_summary?: string | null
          id?: string
          insight_digest?: string | null
          knowledge_digest?: string | null
          period_label: string
          period_type: string
          published_at?: string | null
          skill_ids_affected?: string[] | null
          source_count?: number | null
          status?: string
          upgrade_notes?: string | null
        }
        Update: {
          action_items?: string | null
          agent_user_id?: string | null
          context_digest?: string | null
          created_at?: string | null
          distilled_at?: string | null
          event_summary?: string | null
          id?: string
          insight_digest?: string | null
          knowledge_digest?: string | null
          period_label?: string
          period_type?: string
          published_at?: string | null
          skill_ids_affected?: string[] | null
          source_count?: number | null
          status?: string
          upgrade_notes?: string | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          board_id: string
          body_md: string
          created_at: string
          id: string
          is_pinned: boolean
          last_reply_at: string | null
          like_count: number
          reply_count: number
          review_note: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          board_id: string
          body_md: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          last_reply_at?: string | null
          like_count?: number
          reply_count?: number
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          board_id?: string
          body_md?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          last_reply_at?: string | null
          like_count?: number
          reply_count?: number
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agent_homepage: string | null
          agent_model: string | null
          agent_owner_id: string | null
          agent_purpose: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          is_agent: boolean
          last_active_at: string | null
          last_seen_at: string | null
          points: number
          role: string
          updated_at: string
        }
        Insert: {
          agent_homepage?: string | null
          agent_model?: string | null
          agent_owner_id?: string | null
          agent_purpose?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id: string
          is_active?: boolean
          is_agent?: boolean
          last_active_at?: string | null
          last_seen_at?: string | null
          points?: number
          role?: string
          updated_at?: string
        }
        Update: {
          agent_homepage?: string | null
          agent_model?: string | null
          agent_owner_id?: string | null
          agent_purpose?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          is_agent?: boolean
          last_active_at?: string | null
          last_seen_at?: string | null
          points?: number
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      replies: {
        Row: {
          author_id: string
          body_md: string
          created_at: string
          id: string
          like_count: number
          post_id: string
          reply_to: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body_md: string
          created_at?: string
          id?: string
          like_count?: number
          post_id: string
          reply_to?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body_md?: string
          created_at?: string
          id?: string
          like_count?: number
          post_id?: string
          reply_to?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_update_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          message: string
          period_label: string | null
          skill_id: string
          summary_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message: string
          period_label?: string | null
          skill_id: string
          summary_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message?: string
          period_label?: string | null
          skill_id?: string
          summary_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_update_notifications_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "agent_skill_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_update_notifications_summary_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "knowledge_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_skill_performance: {
        Row: {
          avg_duration_ms: number | null
          last_run_at: string | null
          skill_id: string | null
          success_rate: number | null
          success_runs: number | null
          total_runs: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _assert_admin: { Args: never; Returns: undefined }
      admin_approve_post: {
        Args: { p_note?: string; p_post_id: string }
        Returns: undefined
      }
      admin_approve_reply: {
        Args: { p_note?: string; p_reply_id: string }
        Returns: undefined
      }
      admin_create_agent: {
        Args: {
          p_agent_model?: string
          p_agent_purpose?: string
          p_bio?: string
          p_display_name: string
        }
        Returns: string
      }
      admin_delete_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_edit_and_approve_post: {
        Args: {
          p_body_md: string
          p_note?: string
          p_post_id: string
          p_title: string
        }
        Returns: undefined
      }
      admin_edit_and_approve_reply: {
        Args: { p_body_md: string; p_note?: string; p_reply_id: string }
        Returns: undefined
      }
      admin_issue_agent_token: {
        Args: {
          p_agent_user_id: string
          p_description?: string
          p_scopes: string[]
          p_valid_days?: number
        }
        Returns: Json
      }
      admin_list_drafts: {
        Args: never
        Returns: {
          author_id: string
          author_name: string
          board_id: string
          board_name: string
          body_md: string
          created_at: string
          id: string
          is_agent: boolean
          parent_post_id: string
          parent_post_title: string
          title: string
          type: string
        }[]
      }
      admin_list_tokens: {
        Args: never
        Returns: {
          agent_name: string
          agent_user_id: string
          description: string
          expires_at: string
          id: string
          issued_at: string
          issued_by: string
          issued_by_name: string
          last_used_at: string
          revoked_at: string
          scopes: string[]
          status: string
        }[]
      }
      admin_reject_post: {
        Args: { p_post_id: string; p_reason: string }
        Returns: undefined
      }
      admin_reject_reply: {
        Args: { p_reason: string; p_reply_id: string }
        Returns: undefined
      }
      admin_revoke_agent_token: {
        Args: { p_token_id: string }
        Returns: undefined
      }
      admin_revoke_all_tokens: { Args: never; Returns: number }
      admin_set_user_active: {
        Args: { p_is_active: boolean; p_user_id: string }
        Returns: undefined
      }
      admin_update_user: {
        Args: {
          p_bio: string
          p_display_name: string
          p_role: string
          p_user_id: string
        }
        Returns: undefined
      }
      agent_recent_action_count: {
        Args: { _agent_id: string; _seconds: number }
        Returns: number
      }
      agent_today_post_count: { Args: { _agent_id: string }; Returns: number }
      distill_monthly_knowledge: {
        Args: { target_period?: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_post_view: { Args: { p_post_id: string }; Returns: undefined }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_owner: { Args: never; Returns: boolean }
      verify_agent_token: {
        Args: { _raw: string }
        Returns: {
          agent_user_id: string
          allowed_board_slugs: string[]
          daily_post_quota: number
          expires_at: string
          rate_limit_per_min: number
          revoked_at: string
          scopes: string[]
          token_id: string
        }[]
      }
    }
    Enums: {
      agent_content_op: "create" | "update" | "delete" | "publish" | "unpublish"
      agent_experience_status: "draft" | "recorded" | "reviewed"
      agent_experience_type: "weekly" | "monthly" | "quarterly"
      agent_skill_status: "proposed" | "active" | "deprecated" | "inactive"
      agent_task_status:
        | "queued"
        | "running"
        | "succeeded"
        | "failed"
        | "cancelled"
      agent_trigger_type: "schedule" | "event" | "manual"
      app_role: "owner" | "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      agent_content_op: ["create", "update", "delete", "publish", "unpublish"],
      agent_experience_status: ["draft", "recorded", "reviewed"],
      agent_experience_type: ["weekly", "monthly", "quarterly"],
      agent_skill_status: ["proposed", "active", "deprecated", "inactive"],
      agent_task_status: [
        "queued",
        "running",
        "succeeded",
        "failed",
        "cancelled",
      ],
      agent_trigger_type: ["schedule", "event", "manual"],
      app_role: ["owner", "admin", "moderator", "user"],
    },
  },
} as const
