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
      agent_logs: {
        Row: {
          action: string
          agent_name: string | null
          api_key_id: string | null
          company_id: string
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          request_summary: Json | null
          resource: string | null
          resource_id: string | null
          response_status: string | null
        }
        Insert: {
          action: string
          agent_name?: string | null
          api_key_id?: string | null
          company_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          request_summary?: Json | null
          resource?: string | null
          resource_id?: string | null
          response_status?: string | null
        }
        Update: {
          action?: string
          agent_name?: string | null
          api_key_id?: string | null
          company_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          request_summary?: Json | null
          resource?: string | null
          resource_id?: string | null
          response_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          allowed_doc_types: Database["public"]["Enums"]["doc_type"][] | null
          api_key_hash: string
          company_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_name: string
          last_used_at: string | null
          permissions: string[] | null
        }
        Insert: {
          allowed_doc_types?: Database["public"]["Enums"]["doc_type"][] | null
          api_key_hash: string
          company_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name: string
          last_used_at?: string | null
          permissions?: string[] | null
        }
        Update: {
          allowed_doc_types?: Database["public"]["Enums"]["doc_type"][] | null
          api_key_hash?: string
          company_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_name?: string
          last_used_at?: string | null
          permissions?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      company: {
        Row: {
          address: string | null
          created_at: string | null
          default_currency: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          tax_id: string | null
          tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          default_currency?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          tax_id?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          default_currency?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          tax_id?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string | null
          bind_code: string | null
          code: string
          collect_cash: boolean
          company_id: string
          contact_person: string | null
          created_at: string | null
          credit_limit: number | null
          delivery_days: number[] | null
          delivery_note: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          payment_terms: number | null
          phone: string | null
          price_includes_tax: boolean
          price_level: number | null
          region: string | null
          route_seq: number | null
          shipping_address: string | null
          short_name: string | null
          tax_id: string | null
          type: Database["public"]["Enums"]["contact_type"]
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          bind_code?: string | null
          code: string
          collect_cash?: boolean
          company_id: string
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          delivery_days?: number[] | null
          delivery_note?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          price_includes_tax?: boolean
          price_level?: number | null
          region?: string | null
          route_seq?: number | null
          shipping_address?: string | null
          short_name?: string | null
          tax_id?: string | null
          type?: Database["public"]["Enums"]["contact_type"]
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          bind_code?: string | null
          code?: string
          collect_cash?: boolean
          company_id?: string
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          delivery_days?: number[] | null
          delivery_note?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          price_includes_tax?: boolean
          price_level?: number | null
          region?: string | null
          route_seq?: number | null
          shipping_address?: string | null
          short_name?: string | null
          tax_id?: string | null
          type?: Database["public"]["Enums"]["contact_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_product_prices: {
        Row: {
          company_id: string
          contact_id: string
          id: string
          note: string | null
          product_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          company_id: string
          contact_id: string
          id?: string
          note?: string | null
          product_id: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          contact_id?: string
          id?: string
          note?: string | null
          product_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_product_prices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_prices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_rules: {
        Row: {
          city: string | null
          company_id: string | null
          district: string
          id: string
          truck: string
          vehicle_id: string | null
          weekday: number
        }
        Insert: {
          city?: string | null
          company_id?: string | null
          district: string
          id?: string
          truck: string
          vehicle_id?: string | null
          weekday: number
        }
        Update: {
          city?: string | null
          company_id?: string | null
          district?: string
          id?: string
          truck?: string
          vehicle_id?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_rules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_sheet_runs: {
        Row: {
          company_id: string
          created_at: string | null
          delivery_date: string
          file_url: string | null
          generated_at: string
          id: string
          order_ids: string[]
          truck_type: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          delivery_date: string
          file_url?: string | null
          generated_at?: string
          id?: string
          order_ids?: string[]
          truck_type: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          delivery_date?: string
          file_url?: string | null
          generated_at?: string
          id?: string
          order_ids?: string[]
          truck_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_sheet_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_headers: {
        Row: {
          company_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          created_by: string | null
          delivery_date: string | null
          delivery_note: string | null
          doc_date: string
          doc_no: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          due_date: string | null
          id: string
          is_opening: boolean | null
          notes: string | null
          paid_amount: number | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          price_includes_tax: boolean | null
          sales_person_id: string | null
          source_doc_id: string | null
          source_doc_no: string | null
          status: Database["public"]["Enums"]["doc_status"]
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          truck_type: string | null
          updated_at: string | null
          vehicle_id: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          warehouse_id: string | null
        }
        Insert: {
          company_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          delivery_note?: string | null
          doc_date?: string
          doc_no: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          due_date?: string | null
          id?: string
          is_opening?: boolean | null
          notes?: string | null
          paid_amount?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          price_includes_tax?: boolean | null
          sales_person_id?: string | null
          source_doc_id?: string | null
          source_doc_no?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          truck_type?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          delivery_note?: string | null
          doc_date?: string
          doc_no?: string
          doc_type?: Database["public"]["Enums"]["doc_type"]
          due_date?: string | null
          id?: string
          is_opening?: boolean | null
          notes?: string | null
          paid_amount?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          price_includes_tax?: boolean | null
          sales_person_id?: string | null
          source_doc_id?: string | null
          source_doc_no?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          truck_type?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_headers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_sales_person_id_fkey"
            columns: ["sales_person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_source_doc_id_fkey"
            columns: ["source_doc_id"]
            isOneToOne: false
            referencedRelation: "doc_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_source_doc_id_fkey"
            columns: ["source_doc_id"]
            isOneToOne: false
            referencedRelation: "v_dispatch_manifest"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "doc_headers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_lines: {
        Row: {
          amount: number
          cost_amount: number | null
          delivered_qty: number | null
          discount_pct: number | null
          gross_profit: number | null
          header_id: string
          id: string
          line_no: number
          margin_pct: number | null
          notes: string | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          quantity: number
          source_line_id: string | null
          unit: string | null
          unit_cost: number | null
          unit_price: number
        }
        Insert: {
          amount?: number
          cost_amount?: number | null
          delivered_qty?: number | null
          discount_pct?: number | null
          gross_profit?: number | null
          header_id: string
          id?: string
          line_no: number
          margin_pct?: number | null
          notes?: string | null
          product_code?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          source_line_id?: string | null
          unit?: string | null
          unit_cost?: number | null
          unit_price?: number
        }
        Update: {
          amount?: number
          cost_amount?: number | null
          delivered_qty?: number | null
          discount_pct?: number | null
          gross_profit?: number | null
          header_id?: string
          id?: string
          line_no?: number
          margin_pct?: number | null
          notes?: string | null
          product_code?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          source_line_id?: string | null
          unit?: string | null
          unit_cost?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "doc_lines_header_id_fkey"
            columns: ["header_id"]
            isOneToOne: false
            referencedRelation: "doc_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_lines_header_id_fkey"
            columns: ["header_id"]
            isOneToOne: false
            referencedRelation: "v_dispatch_manifest"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "doc_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_lines_source_line_id_fkey"
            columns: ["source_line_id"]
            isOneToOne: false
            referencedRelation: "doc_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          code: string
          company_id: string
          id: string
          is_fixed: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          code: string
          company_id: string
          id?: string
          is_fixed?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          company_id?: string
          id?: string
          is_fixed?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          receipt_url: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          category_id: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          receipt_url?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          receipt_url?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          avg_cost: number | null
          company_id: string
          id: string
          last_updated: string | null
          product_id: string
          quantity: number
          warehouse_id: string
        }
        Insert: {
          avg_cost?: number | null
          company_id: string
          id?: string
          last_updated?: string | null
          product_id: string
          quantity?: number
          warehouse_id: string
        }
        Update: {
          avg_cost?: number | null
          company_id?: string
          id?: string
          last_updated?: string | null
          product_id?: string
          quantity?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          balance_after: number
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          movement_date: string | null
          movement_type: string
          notes: string | null
          product_id: string
          quantity_change: number
          source_doc_id: string | null
          source_doc_no: string | null
          source_doc_type: Database["public"]["Enums"]["doc_type"] | null
          unit_cost: number | null
          warehouse_id: string
        }
        Insert: {
          balance_after: number
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_date?: string | null
          movement_type: string
          notes?: string | null
          product_id: string
          quantity_change: number
          source_doc_id?: string | null
          source_doc_no?: string | null
          source_doc_type?: Database["public"]["Enums"]["doc_type"] | null
          unit_cost?: number | null
          warehouse_id: string
        }
        Update: {
          balance_after?: number
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_date?: string | null
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity_change?: number
          source_doc_id?: string | null
          source_doc_no?: string | null
          source_doc_type?: Database["public"]["Enums"]["doc_type"] | null
          unit_cost?: number | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_source_doc_id_fkey"
            columns: ["source_doc_id"]
            isOneToOne: false
            referencedRelation: "doc_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_source_doc_id_fkey"
            columns: ["source_doc_id"]
            isOneToOne: false
            referencedRelation: "v_dispatch_manifest"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_config: {
        Row: {
          channel: string
          company_id: string
          config: Json | null
          id: string
          is_enabled: boolean | null
        }
        Insert: {
          channel: string
          company_id: string
          config?: Json | null
          id?: string
          is_enabled?: boolean | null
        }
        Update: {
          channel?: string
          company_id?: string
          config?: Json | null
          id?: string
          is_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channels: string[] | null
          company_id: string
          created_at: string | null
          event_type: string
          id: string
          is_read: boolean | null
          is_sent: boolean | null
          message: string | null
          payload: Json | null
          sent_at: string | null
          target_user_id: string | null
          title: string
        }
        Insert: {
          channels?: string[] | null
          company_id: string
          created_at?: string | null
          event_type: string
          id?: string
          is_read?: boolean | null
          is_sent?: boolean | null
          message?: string | null
          payload?: Json | null
          sent_at?: string | null
          target_user_id?: string | null
          title: string
        }
        Update: {
          channels?: string[] | null
          company_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          is_read?: boolean | null
          is_sent?: boolean | null
          message?: string | null
          payload?: Json | null
          sent_at?: string | null
          target_user_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          created_by: string | null
          doc_header_id: string
          id: string
          method: string | null
          notes: string | null
          payment_date: string
          reference: string | null
          settlement_no: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          created_by?: string | null
          doc_header_id: string
          id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          reference?: string | null
          settlement_no?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          doc_header_id?: string
          id?: string
          method?: string | null
          notes?: string | null
          payment_date?: string
          reference?: string | null
          settlement_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_doc_header_id_fkey"
            columns: ["doc_header_id"]
            isOneToOne: false
            referencedRelation: "doc_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_doc_header_id_fkey"
            columns: ["doc_header_id"]
            isOneToOne: false
            referencedRelation: "v_dispatch_manifest"
            referencedColumns: ["order_id"]
          },
        ]
      }
      price_revision_items: {
        Row: {
          contact_id: string | null
          field: string
          id: number
          new_value: number | null
          old_value: number | null
          product_id: string
          revision_id: string
        }
        Insert: {
          contact_id?: string | null
          field: string
          id?: never
          new_value?: number | null
          old_value?: number | null
          product_id: string
          revision_id: string
        }
        Update: {
          contact_id?: string | null
          field?: string
          id?: never
          new_value?: number | null
          old_value?: number | null
          product_id?: string
          revision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_revision_items_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "price_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      price_revisions: {
        Row: {
          adjust_customer_prices: boolean
          applied_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          note: string | null
          percent: number
          scope: string
          scope_value: Json | null
          sell_mode: string
          status: string
          target: string
          version_no: number
        }
        Insert: {
          adjust_customer_prices?: boolean
          applied_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          note?: string | null
          percent: number
          scope: string
          scope_value?: Json | null
          sell_mode?: string
          status?: string
          target?: string
          version_no: number
        }
        Update: {
          adjust_customer_prices?: boolean
          applied_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          note?: string | null
          percent?: number
          scope?: string
          scope_value?: Json | null
          sell_mode?: string
          status?: string
          target?: string
          version_no?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          code: string
          company_id: string
          cost_price: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          pack_per_box: number | null
          price1: number | null
          price2: number | null
          price3: number | null
          safety_stock: number | null
          spec: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          code: string
          company_id: string
          cost_price?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          pack_per_box?: number | null
          price1?: number | null
          price2?: number | null
          price3?: number | null
          safety_stock?: number | null
          spec?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          code?: string
          company_id?: string
          cost_price?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          pack_per_box?: number | null
          price1?: number | null
          price2?: number | null
          price3?: number | null
          safety_stock?: number | null
          spec?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          display_name: string
          id: string
          is_active?: boolean | null
          last_login_at?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_confirm: boolean | null
          can_read: boolean | null
          can_void: boolean | null
          can_write: boolean | null
          company_id: string
          id: string
          module: string
          role: string
        }
        Insert: {
          can_confirm?: boolean | null
          can_read?: boolean | null
          can_void?: boolean | null
          can_write?: boolean | null
          company_id: string
          id?: string
          module: string
          role: string
        }
        Update: {
          can_confirm?: boolean | null
          can_read?: boolean | null
          can_void?: boolean | null
          can_write?: boolean | null
          company_id?: string
          id?: string
          module?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          capacity: string | null
          company_id: string
          created_at: string
          delivery_days: number[] | null
          driver_name: string | null
          id: string
          is_active: boolean
          name: string
          note: string | null
          plate_no: string | null
          truck_type: string | null
          updated_at: string
        }
        Insert: {
          capacity?: string | null
          company_id: string
          created_at?: string
          delivery_days?: number[] | null
          driver_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          plate_no?: string | null
          truck_type?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: string | null
          company_id?: string
          created_at?: string
          delivery_days?: number[] | null
          driver_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          plate_no?: string | null
          truck_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          code: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_ap_aging: {
        Row: {
          aging_bucket: string | null
          balance: number | null
          company_id: string | null
          contact_id: string | null
          doc_date: string | null
          doc_no: string | null
          due_date: string | null
          overdue_days: number | null
          vendor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_headers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ar_aging: {
        Row: {
          aging_bucket: string | null
          balance: number | null
          company_id: string | null
          contact_id: string | null
          customer_name: string | null
          doc_date: string | null
          doc_no: string | null
          due_date: string | null
          overdue_days: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_headers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bind_codes: {
        Row: {
          bind_code: string | null
          code: string | null
          name: string | null
          phone: string | null
        }
        Insert: {
          bind_code?: string | null
          code?: string | null
          name?: string | null
          phone?: string | null
        }
        Update: {
          bind_code?: string | null
          code?: string | null
          name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      v_customer_profitability: {
        Row: {
          avg_margin_pct: number | null
          company_id: string | null
          contact_id: string | null
          customer_name: string | null
          order_count: number | null
          outstanding: number | null
          price_level: number | null
          total_cost: number | null
          total_profit: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_headers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_customer_statement: {
        Row: {
          company_id: string | null
          contact_id: string | null
          credit: number | null
          customer_name: string | null
          debit: number | null
          doc_no: string | null
          txn_date: string | null
          txn_type: string | null
        }
        Relationships: []
      }
      v_dispatch_manifest: {
        Row: {
          collect_cash: boolean | null
          company_id: string | null
          confirmed_at: string | null
          contact_delivery_note: string | null
          contact_id: string | null
          contact_name: string | null
          delivery_date: string | null
          district: string | null
          doc_delivery_note: string | null
          doc_type: Database["public"]["Enums"]["doc_type"] | null
          driver_name: string | null
          line_no: number | null
          order_id: string | null
          order_no: string | null
          pack_per_box: number | null
          plate_no: string | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          route_seq: number | null
          truck_type: string | null
          unit: string | null
          vehicle_id: string | null
          vehicle_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_headers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      v_expense_summary: {
        Row: {
          category_code: string | null
          category_name: string | null
          company_id: string | null
          entry_count: number | null
          is_fixed: boolean | null
          month: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      v_inventory_ledger: {
        Row: {
          balance_after: number | null
          company_id: string | null
          movement_date: string | null
          movement_type: string | null
          movement_value: number | null
          notes: string | null
          product_code: string | null
          product_name: string | null
          quantity_change: number | null
          source_doc_no: string | null
          source_doc_type: Database["public"]["Enums"]["doc_type"] | null
          unit_cost: number | null
          warehouse_code: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      v_monthly_pnl: {
        Row: {
          cogs: number | null
          company_id: string | null
          fixed_expenses: number | null
          gross_margin_pct: number | null
          gross_profit: number | null
          month: string | null
          net_margin_pct: number | null
          net_profit: number | null
          revenue: number | null
          total_expenses: number | null
          variable_expenses: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_headers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      v_monthly_revenue: {
        Row: {
          cogs: number | null
          collected: number | null
          company_id: string | null
          gross_margin_pct: number | null
          gross_profit: number | null
          invoice_count: number | null
          month: string | null
          outstanding: number | null
          revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_headers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      v_payables: {
        Row: {
          balance: number | null
          company_id: string | null
          contact_id: string | null
          doc_date: string | null
          doc_no: string | null
          due_date: string | null
          overdue_days: number | null
          paid_amount: number | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          total_amount: number | null
          vendor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_headers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pending_orders: {
        Row: {
          company_id: string | null
          customer_name: string | null
          delivered: number | null
          doc_date: string | null
          doc_no: string | null
          ordered: number | null
          pending: number | null
          pending_amount: number | null
          product_code: string | null
          product_name: string | null
          unit_price: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_headers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      v_product_profitability: {
        Row: {
          avg_margin_pct: number | null
          avg_selling_price: number | null
          avg_unit_cost: number | null
          company_id: string | null
          current_cost: number | null
          order_count: number | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          total_cost: number | null
          total_profit: number | null
          total_qty_sold: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_headers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      v_purchase_detail: {
        Row: {
          amount: number | null
          company_id: string | null
          contact_id: string | null
          doc_date: string | null
          doc_no: string | null
          product_code: string | null
          product_name: string | null
          quantity: number | null
          unit: string | null
          unit_price: number | null
          vendor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_headers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_receivables: {
        Row: {
          balance: number | null
          company_id: string | null
          contact_id: string | null
          customer_name: string | null
          doc_date: string | null
          doc_no: string | null
          due_date: string | null
          overdue_days: number | null
          paid_amount: number | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_headers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_sales_detail: {
        Row: {
          amount: number | null
          company_id: string | null
          contact_id: string | null
          cost_amount: number | null
          customer_name: string | null
          doc_date: string | null
          doc_no: string | null
          gross_profit: number | null
          margin_pct: number | null
          product_code: string | null
          product_name: string | null
          quantity: number | null
          sales_person_id: string | null
          sales_person_name: string | null
          unit: string | null
          unit_cost: number | null
          unit_price: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_headers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_sales_person_id_fkey"
            columns: ["sales_person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_salesperson_performance: {
        Row: {
          company_id: string | null
          gross_profit: number | null
          invoice_count: number | null
          margin_pct: number | null
          month: string | null
          sales_person_id: string | null
          sales_person_name: string | null
          total_cost: number | null
          total_sales: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_headers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_headers_sales_person_id_fkey"
            columns: ["sales_person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stock: {
        Row: {
          avg_cost: number | null
          category: string | null
          company_id: string | null
          cost_price: number | null
          expected_margin_pct: number | null
          is_low: boolean | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          safety_stock: number | null
          selling_price: number | null
          stock_value: number | null
          unit: string | null
          warehouse_code: string | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      v_vendor_statement: {
        Row: {
          company_id: string | null
          contact_id: string | null
          credit: number | null
          debit: number | null
          doc_no: string | null
          txn_date: string | null
          txn_type: string | null
          vendor_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _price_revision_write: { Args: { p_rev: string }; Returns: undefined }
      agent_create_sales_order: {
        Args: {
          p_contact_id: string
          p_doc_date?: string
          p_lines: Json
          p_notes?: string
        }
        Returns: string
      }
      agent_ship_order: { Args: { p_order_id: string }; Returns: string }
      approve_request: {
        Args: { p_decision_note?: string; p_request_id: string }
        Returns: Json
      }
      assign_order_dispatch: {
        Args: { p_order_id: string }
        Returns: {
          delivery_date: string
          truck_type: string
          vehicle_id: string
        }[]
      }
      assign_order_vehicle: {
        Args: { p_order_id: string; p_vehicle_id?: string }
        Returns: {
          delivery_date: string
          vehicle_id: string
        }[]
      }
      check_permission: {
        Args: { p_action?: string; p_module: string }
        Returns: boolean
      }
      confirm_document: { Args: { p_doc_id: string }; Returns: undefined }
      create_purchase_draft: {
        Args: { p_contact_id: string; p_doc_date: string; p_lines: Json }
        Returns: string
      }
      create_sales_draft: {
        Args: { p_contact_id: string; p_doc_date: string; p_lines: Json }
        Returns: string
      }
      current_user_has_any_role: {
        Args: { _roles: string[] }
        Returns: boolean
      }
      dispatch_cutoff_ok: {
        Args: { p_delivery_date: string; p_now?: string }
        Returns: boolean
      }
      dispatch_daily_digest: { Args: never; Returns: undefined }
      dispatch_inactive_reminder: { Args: never; Returns: undefined }
      dispatch_tomorrow_reminder: { Args: never; Returns: undefined }
      generate_doc_no: {
        Args: {
          p_company_id: string
          p_doc_type: Database["public"]["Enums"]["doc_type"]
        }
        Returns: string
      }
      get_agent_for_dispatch: {
        Args: { p_agent_name: string; p_company_id?: string }
        Returns: Json
      }
      get_customer_price: {
        Args: { p_contact_id: string; p_product_id: string }
        Returns: number
      }
      get_vault_secret: { Args: { secret_name: string }; Returns: string }
      has_gateway_role: { Args: { _role: string }; Returns: boolean }
      is_gateway_admin: { Args: never; Returns: boolean }
      is_gateway_admin_or_approver: { Args: never; Returns: boolean }
      is_gateway_approver: { Args: never; Returns: boolean }
      is_gateway_employee: { Args: never; Returns: boolean }
      list_audit_log: {
        Args: {
          p_action?: string
          p_agent_id?: string
          p_from?: string
          p_limit?: number
          p_skill_name?: string
          p_status?: string
          p_to?: string
        }
        Returns: Json
      }
      list_pending_approvals: { Args: never; Returns: Json }
      load_opening_ap: {
        Args: {
          p_amount: number
          p_contact_id: string
          p_doc_date: string
          p_due_date?: string
          p_notes?: string
        }
        Returns: string
      }
      load_opening_ar: {
        Args: {
          p_amount: number
          p_contact_id: string
          p_doc_date: string
          p_due_date?: string
          p_notes?: string
        }
        Returns: string
      }
      load_opening_inventory: { Args: { p_items: Json }; Returns: undefined }
      my_company_id: { Args: never; Returns: string }
      my_role: { Args: never; Returns: string }
      next_delivery: {
        Args: { p_contact_id: string }
        Returns: {
          delivery_date: string
          truck: string
          weekday: number
        }[]
      }
      next_delivery_date_for_days: {
        Args: { p_days: number[] }
        Returns: string
      }
      next_dispatch: {
        Args: { p_contact_id: string }
        Returns: {
          delivery_date: string
          truck: string
          vehicle_id: string
          vehicle_name: string
          weekday: number
        }[]
      }
      price_revision_apply: {
        Args: {
          p_adjust_customer?: boolean
          p_effective_date?: string
          p_note?: string
          p_percent: number
          p_scope: string
          p_scope_value: Json
          p_sell_mode?: string
          p_target?: string
        }
        Returns: string
      }
      price_revision_apply_pending: {
        Args: { p_rev: string }
        Returns: undefined
      }
      price_revision_compute: {
        Args: {
          p_adjust_customer: boolean
          p_percent: number
          p_scope: string
          p_scope_value: Json
          p_sell_mode: string
          p_target: string
        }
        Returns: {
          code: string
          contact_id: string
          field: string
          name: string
          new_value: number
          old_value: number
          product_id: string
        }[]
      }
      price_revision_preview: {
        Args: {
          p_adjust_customer?: boolean
          p_percent: number
          p_scope: string
          p_scope_value: Json
          p_sell_mode?: string
          p_target?: string
        }
        Returns: {
          code: string
          contact_id: string
          field: string
          name: string
          new_value: number
          old_value: number
          product_id: string
        }[]
      }
      price_revision_reverse: { Args: { p_rev: string }; Returns: undefined }
      price_revision_run_due: { Args: never; Returns: number }
      reassign_dispatch: {
        Args: { p_delivery_date?: string; p_only_unassigned?: boolean }
        Returns: number
      }
      reconcile_check: { Args: never; Returns: Json }
      record_payment: {
        Args: {
          p_amount: number
          p_doc_id: string
          p_method?: string
          p_notes?: string
          p_reference?: string
        }
        Returns: string
      }
      reject_request: {
        Args: { p_decision_note?: string; p_request_id: string }
        Returns: Json
      }
      reverse_payment: { Args: { p_payment_id: string }; Returns: undefined }
      save_doc_lines: {
        Args: { p_header_id: string; p_lines: Json }
        Returns: undefined
      }
      seed_role_permissions: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      settle_documents: {
        Args: {
          p_allocations: Json
          p_method?: string
          p_notes?: string
          p_reference?: string
        }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      transfer_document: {
        Args: {
          p_lines: Json
          p_source_doc_id: string
          p_target_doc_type: Database["public"]["Enums"]["doc_type"]
        }
        Returns: string
      }
      void_document: {
        Args: { p_doc_id: string; p_reason?: string }
        Returns: undefined
      }
    }
    Enums: {
      contact_type: "customer" | "vendor" | "both"
      doc_status: "draft" | "confirmed" | "completed" | "voided"
      doc_type:
        | "quotation"
        | "sales_order"
        | "sales_invoice"
        | "sales_return"
        | "purchase_order"
        | "purchase_receipt"
        | "inventory_adjust"
      payment_status: "unpaid" | "partial" | "paid"
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
      contact_type: ["customer", "vendor", "both"],
      doc_status: ["draft", "confirmed", "completed", "voided"],
      doc_type: [
        "quotation",
        "sales_order",
        "sales_invoice",
        "sales_return",
        "purchase_order",
        "purchase_receipt",
        "inventory_adjust",
      ],
      payment_status: ["unpaid", "partial", "paid"],
    },
  },
} as const
