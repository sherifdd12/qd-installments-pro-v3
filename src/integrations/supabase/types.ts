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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: number
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: number
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      customer_risk_scores: {
        Row: {
          created_at: string
          customer_id: string
          factors: Json
          id: string
          score: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          factors?: Json
          id?: string
          score: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          factors?: Json
          id?: string
          score?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          civil_id: string | null
          created_at: string
          full_name: string
          id: string
          mobile_number: string
          mobile_number2: string | null
          sequence_number: string | null
        }
        Insert: {
          civil_id?: string | null
          created_at?: string
          full_name: string
          id: string
          mobile_number: string
          mobile_number2?: string | null
          sequence_number?: string | null
        }
        Update: {
          civil_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          mobile_number?: string
          mobile_number2?: string | null
          sequence_number?: string | null
        }
        Relationships: []
      }
      payment_predictions: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          predicted_payment_date: string
          probability: number
          recommended_action: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          predicted_payment_date: string
          probability: number
          recommended_action: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          predicted_payment_date?: string
          probability?: number
          recommended_action?: string
          transaction_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          payment_date: string
          transaction_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          payment_date: string
          transaction_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          cost_price: number
          created_at: string
          customer_id: string
          has_legal_case: boolean
          id: string
          installment_amount: number
          legal_case_details: string | null
          notes: string | null
          number_of_installments: number
          profit: number | null
          remaining_balance: number
          start_date: string
          status: string
        }
        Insert: {
          amount: number
          cost_price: number
          created_at?: string
          customer_id: string
          has_legal_case?: boolean
          id?: string
          installment_amount: number
          legal_case_details?: string | null
          notes?: string | null
          number_of_installments: number
          profit?: number | null
          remaining_balance: number
          start_date: string
          status?: string
        }
        Update: {
          amount?: number
          cost_price?: number
          created_at?: string
          customer_id?: string
          has_legal_case?: boolean
          id?: string
          installment_amount?: number
          legal_case_details?: string | null
          notes?: string | null
          number_of_installments?: number
          profit?: number | null
          remaining_balance?: number
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      check_overdue_transactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_customer_sequence: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_transaction_sequence: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          overdue_transactions: number
          total_active_transactions: number
          total_cost: number
          total_customers: number
          total_outstanding: number
          total_overdue: number
          total_profit: number
          total_revenue: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authorized_user: {
        Args: { _user_id: string }
        Returns: boolean
      }
      predict_late_payment: {
        Args: { transaction_id_param: string }
        Returns: {
          created_at: string
          customer_id: string
          id: string
          predicted_payment_date: string
          probability: number
          recommended_action: string
          transaction_id: string
        }
      }
      record_payment: {
        Args:
          | {
              p_amount: number
              p_payment_date?: string
              p_transaction_id: string
            }
          | { p_amount: number; p_transaction_id: string }
        Returns: string
      }
      update_customer_risk_score: {
        Args: { customer_id_param: string }
        Returns: {
          created_at: string
          customer_id: string
          factors: Json
          id: string
          score: number
        }
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "user"
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
      app_role: ["admin", "staff", "user"],
    },
  },
} as const
