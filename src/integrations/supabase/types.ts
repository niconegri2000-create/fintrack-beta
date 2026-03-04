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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          code: string
          created_at: string
          email_allowed: string
          expires_at: string | null
          id: string
          is_used: boolean
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          email_allowed: string
          expires_at?: string | null
          id?: string
          is_used?: boolean
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          email_allowed?: string
          expires_at?: string | null
          id?: string
          is_used?: boolean
          used_by?: string | null
        }
        Relationships: []
      }
      accounts: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          is_default: boolean
          min_balance_threshold: number | null
          name: string
          opening_balance: number
          sort_order: number
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          min_balance_threshold?: number | null
          name: string
          opening_balance?: number
          sort_order?: number
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          min_balance_threshold?: number | null
          name?: string
          opening_balance?: number
          sort_order?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_settings: {
        Row: {
          alert_threshold: number
          alerts_enabled: boolean
          created_at: string
          id: string
          period: string
          reset_anchor_date: string | null
          reset_mode: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          alert_threshold?: number
          alerts_enabled?: boolean
          created_at?: string
          id?: string
          period?: string
          reset_anchor_date?: string | null
          reset_mode?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          alert_threshold?: number
          alerts_enabled?: boolean
          created_at?: string
          id?: string
          period?: string
          reset_anchor_date?: string | null
          reset_mode?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          is_fixed_default: boolean | null
          name: string
          priority: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          is_fixed_default?: boolean | null
          name: string
          priority?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          is_fixed_default?: boolean | null
          name?: string
          priority?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      category_budgets: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          monthly_limit: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_limit?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          monthly_limit?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_budgets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_import_rows: {
        Row: {
          created_at: string
          id: string
          import_id: string
          normalized: Json | null
          raw: Json | null
          reason: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          import_id: string
          normalized?: Json | null
          raw?: Json | null
          reason?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          import_id?: string
          normalized?: Json | null
          raw?: Json | null
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "csv_import_rows_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "csv_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_imports: {
        Row: {
          account_id: string
          created_at: string
          file_hash: string | null
          file_name: string | null
          id: string
          mapping: Json | null
          period_end: string | null
          period_start: string | null
          stats: Json | null
          workspace_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          file_hash?: string | null
          file_name?: string | null
          id?: string
          mapping?: Json | null
          period_end?: string | null
          period_start?: string | null
          stats?: Json | null
          workspace_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          file_hash?: string | null
          file_name?: string | null
          id?: string
          mapping?: Json | null
          period_end?: string | null
          period_start?: string | null
          stats?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "csv_imports_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csv_imports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          goal_id: string
          id: string
          note: string | null
          workspace_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          date?: string
          goal_id: string
          id?: string
          note?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          goal_id?: string
          id?: string
          note?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          name: string
          note: string | null
          starting_amount: number | null
          status: string
          target_amount: number
          target_date: string
          workspace_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          name: string
          note?: string | null
          starting_amount?: number | null
          status?: string
          target_amount: number
          target_date: string
          workspace_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          name?: string
          note?: string | null
          starting_amount?: number | null
          status?: string
          target_amount?: number
          target_date?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invite_code: string
          used: boolean
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invite_code: string
          used?: boolean
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invite_code?: string
          used?: boolean
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_snapshots: {
        Row: {
          account_id: string | null
          created_at: string
          critical_categories: Json
          expense_total: number
          id: string
          income_total: number
          month: string
          net_total: number
          notes: Json
          savings_rate: number
          top_categories: Json
          workspace_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          critical_categories?: Json
          expense_total?: number
          id?: string
          income_total?: number
          month: string
          net_total?: number
          notes?: Json
          savings_rate?: number
          top_categories?: Json
          workspace_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          critical_categories?: Json
          expense_total?: number
          id?: string
          income_total?: number
          month?: string
          net_total?: number
          notes?: Json
          savings_rate?: number
          top_categories?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_rules: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string | null
          day_of_month: number | null
          end_date: string | null
          frequency: string | null
          id: string
          interval_months: number
          is_active: boolean | null
          is_fixed: boolean | null
          last_generated_for_month: string | null
          name: string | null
          start_date: string
          type: string | null
          workspace_id: string | null
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string | null
          day_of_month?: number | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          interval_months?: number
          is_active?: boolean | null
          is_fixed?: boolean | null
          last_generated_for_month?: string | null
          name?: string | null
          start_date: string
          type?: string | null
          workspace_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string | null
          day_of_month?: number | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          interval_months?: number
          is_active?: boolean | null
          is_fixed?: boolean | null
          last_generated_for_month?: string | null
          name?: string | null
          start_date?: string
          type?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_tags: {
        Row: {
          recurring_id: string
          tag_id: string
        }
        Insert: {
          recurring_id: string
          tag_id: string
        }
        Update: {
          recurring_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_tags_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          is_active: boolean
          plan: string
          price: number
          source: string
          started_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan?: string
          price?: number
          source?: string
          started_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan?: string
          price?: number
          source?: string
          started_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_tags: {
        Row: {
          tag_id: string
          transaction_id: string
        }
        Insert: {
          tag_id: string
          transaction_id: string
        }
        Update: {
          tag_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string | null
          date: string
          dedup_key: string | null
          description: string | null
          external_id: string | null
          id: string
          import_id: string | null
          is_fixed: boolean | null
          linked_account_id: string | null
          notes: string | null
          recurring_rule_id: string | null
          source: string | null
          transfer_direction: string | null
          transfer_id: string | null
          type: string | null
          workspace_id: string | null
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string | null
          date: string
          dedup_key?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          import_id?: string | null
          is_fixed?: boolean | null
          linked_account_id?: string | null
          notes?: string | null
          recurring_rule_id?: string | null
          source?: string | null
          transfer_direction?: string | null
          transfer_id?: string | null
          type?: string | null
          workspace_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string | null
          date?: string
          dedup_key?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          import_id?: string | null
          is_fixed?: boolean | null
          linked_account_id?: string | null
          notes?: string | null
          recurring_rule_id?: string | null
          source?: string | null
          transfer_direction?: string | null
          transfer_id?: string | null
          type?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "csv_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string | null
          from_account_id: string
          id: string
          notes: string | null
          to_account_id: string
          workspace_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          description?: string | null
          from_account_id: string
          id?: string
          notes?: string | null
          to_account_id: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          from_account_id?: string
          id?: string
          notes?: string | null
          to_account_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_workspaces: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workspaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          currency: string | null
          forecast_horizon_months: number
          id: string
          min_balance_threshold: number
          name: string
          opening_balance: number
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          forecast_horizon_months?: number
          id?: string
          min_balance_threshold?: number
          name: string
          opening_balance?: number
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          forecast_horizon_months?: number
          id?: string
          min_balance_threshold?: number
          name?: string
          opening_balance?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_user_bootstrap: { Args: { p_user_id: string }; Returns: string }
      get_user_workspace_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
