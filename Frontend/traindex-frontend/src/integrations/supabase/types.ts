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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      captures: {
        Row: {
          created_at: string
          id: string
          match_score: number | null
          quality_flags: Json
          rollsign_id: string | null
          station: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_score?: number | null
          quality_flags?: Json
          rollsign_id?: string | null
          station?: string | null
          storage_path: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_score?: number | null
          quality_flags?: Json
          rollsign_id?: string | null
          station?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "captures_rollsign_id_fkey"
            columns: ["rollsign_id"]
            isOneToOne: false
            referencedRelation: "rollsigns"
            referencedColumns: ["id"]
          },
        ]
      }
      collection: {
        Row: {
          best_capture_id: string | null
          first_caught_at: string
          rollsign_id: string
          user_id: string
        }
        Insert: {
          best_capture_id?: string | null
          first_caught_at?: string
          rollsign_id: string
          user_id?: string
        }
        Update: {
          best_capture_id?: string | null
          first_caught_at?: string
          rollsign_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_best_capture_id_fkey"
            columns: ["best_capture_id"]
            isOneToOne: false
            referencedRelation: "captures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_rollsign_id_fkey"
            columns: ["rollsign_id"]
            isOneToOne: false
            referencedRelation: "rollsigns"
            referencedColumns: ["id"]
          },
        ]
      }
      lines: {
        Row: {
          color: string
          id: string
          letter: string
        }
        Insert: {
          color: string
          id?: string
          letter: string
        }
        Update: {
          color?: string
          id?: string
          letter?: string
        }
        Relationships: []
      }
      reference_images: {
        Row: {
          id: string
          rollsign_id: string
          source: string | null
          storage_path: string
        }
        Insert: {
          id?: string
          rollsign_id: string
          source?: string | null
          storage_path: string
        }
        Update: {
          id?: string
          rollsign_id?: string
          source?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_images_rollsign_id_fkey"
            columns: ["rollsign_id"]
            isOneToOne: false
            referencedRelation: "rollsigns"
            referencedColumns: ["id"]
          },
        ]
      }
      rollsigns: {
        Row: {
          car_models: string[]
          description: string
          destination: string
          dex_number: number
          id: string
          line_id: string | null
          rarity: Database["public"]["Enums"]["rarity"]
          subtitle: string | null
        }
        Insert: {
          car_models?: string[]
          description?: string
          destination: string
          dex_number: number
          id?: string
          line_id?: string | null
          rarity?: Database["public"]["Enums"]["rarity"]
          subtitle?: string | null
        }
        Update: {
          car_models?: string[]
          description?: string
          destination?: string
          dex_number?: number
          id?: string
          line_id?: string | null
          rarity?: Database["public"]["Enums"]["rarity"]
          subtitle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rollsigns_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      rarity: "common" | "uncommon" | "rare" | "legendary"
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
      app_role: ["admin", "user"],
      rarity: ["common", "uncommon", "rare", "legendary"],
    },
  },
} as const
