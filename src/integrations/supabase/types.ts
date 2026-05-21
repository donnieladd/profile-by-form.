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
      audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          id: string
          payload: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      candidates: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          created_by: string
          current_org: string | null
          current_title: string | null
          email: string | null
          fit_role: string | null
          full_name: string
          id: string
          owner_id: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["candidate_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          created_by?: string
          current_org?: string | null
          current_title?: string | null
          email?: string | null
          fit_role?: string | null
          full_name: string
          id?: string
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          created_by?: string
          current_org?: string | null
          current_title?: string | null
          email?: string | null
          fit_role?: string | null
          full_name?: string
          id?: string
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          updated_at?: string
        }
        Relationships: []
      }
      presentation_sections: {
        Row: {
          content: Json
          created_at: string
          id: string
          order_index: number
          presentation_id: string
          section_key: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          order_index?: number
          presentation_id: string
          section_key: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          order_index?: number
          presentation_id?: string
          section_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presentation_sections_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "presentations"
            referencedColumns: ["id"]
          },
        ]
      }
      presentations: {
        Row: {
          access_code: string | null
          candidate_id: string
          created_at: string
          created_by: string
          hero_image_url: string | null
          id: string
          search_id: string | null
          share_slug: string | null
          status: Database["public"]["Enums"]["presentation_status"]
          subtitle: string | null
          template_version: string
          title: string
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          candidate_id: string
          created_at?: string
          created_by?: string
          hero_image_url?: string | null
          id?: string
          search_id?: string | null
          share_slug?: string | null
          status?: Database["public"]["Enums"]["presentation_status"]
          subtitle?: string | null
          template_version?: string
          title: string
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          candidate_id?: string
          created_at?: string
          created_by?: string
          hero_image_url?: string | null
          id?: string
          search_id?: string | null
          share_slug?: string | null
          status?: Database["public"]["Enums"]["presentation_status"]
          subtitle?: string | null
          template_version?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presentations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presentations_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_sections: {
        Row: {
          body_md: string | null
          candidate_id: string
          created_at: string
          edited_by: string | null
          id: string
          order_index: number
          section_key: string
          status: Database["public"]["Enums"]["profile_section_status"]
          title: string
          updated_at: string
        }
        Insert: {
          body_md?: string | null
          candidate_id: string
          created_at?: string
          edited_by?: string | null
          id?: string
          order_index?: number
          section_key: string
          status?: Database["public"]["Enums"]["profile_section_status"]
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string | null
          candidate_id?: string
          created_at?: string
          edited_by?: string | null
          id?: string
          order_index?: number
          section_key?: string
          status?: Database["public"]["Enums"]["profile_section_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_sections_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      search_candidates: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          notes: string | null
          presentation_status:
            | Database["public"]["Enums"]["presentation_status"]
            | null
          search_id: string
          stage: Database["public"]["Enums"]["search_stage"]
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          notes?: string | null
          presentation_status?:
            | Database["public"]["Enums"]["presentation_status"]
            | null
          search_id: string
          stage?: Database["public"]["Enums"]["search_stage"]
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          presentation_status?:
            | Database["public"]["Enums"]["presentation_status"]
            | null
          search_id?: string
          stage?: Database["public"]["Enums"]["search_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "search_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_candidates_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      searches: {
        Row: {
          church: string
          church_size: string | null
          city: string | null
          compensation: string | null
          created_at: string
          created_by: string
          id: string
          launched_at: string | null
          manager_id: string | null
          monday_id: string | null
          reports_to: string | null
          role: string
          share_code: string | null
          stage: Database["public"]["Enums"]["search_stage"]
          status: Database["public"]["Enums"]["search_status"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          church: string
          church_size?: string | null
          city?: string | null
          compensation?: string | null
          created_at?: string
          created_by?: string
          id?: string
          launched_at?: string | null
          manager_id?: string | null
          monday_id?: string | null
          reports_to?: string | null
          role: string
          share_code?: string | null
          stage?: Database["public"]["Enums"]["search_stage"]
          status?: Database["public"]["Enums"]["search_status"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          church?: string
          church_size?: string | null
          city?: string | null
          compensation?: string | null
          created_at?: string
          created_by?: string
          id?: string
          launched_at?: string | null
          manager_id?: string | null
          monday_id?: string | null
          reports_to?: string | null
          role?: string
          share_code?: string | null
          stage?: Database["public"]["Enums"]["search_stage"]
          status?: Database["public"]["Enums"]["search_status"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      source_items: {
        Row: {
          candidate_id: string
          created_at: string
          created_by: string | null
          file_name: string | null
          id: string
          kind: Database["public"]["Enums"]["source_item_kind"]
          label: string | null
          monday_link: string | null
          status: Database["public"]["Enums"]["source_item_status"]
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          kind: Database["public"]["Enums"]["source_item_kind"]
          label?: string | null
          monday_link?: string | null
          status?: Database["public"]["Enums"]["source_item_status"]
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["source_item_kind"]
          label?: string | null
          monday_link?: string | null
          status?: Database["public"]["Enums"]["source_item_status"]
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_items_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
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
          role: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_member: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "owner"
        | "admin"
        | "search_manager"
        | "consultant"
        | "recruiting_partner"
      candidate_status:
        | "new"
        | "in_review"
        | "ready"
        | "presented"
        | "declined"
        | "placed"
      presentation_status:
        | "draft"
        | "in_review"
        | "ready"
        | "shared"
        | "archived"
      profile_section_status: "not_started" | "draft" | "edited" | "approved"
      search_stage:
        | "intake"
        | "sourcing"
        | "assessments"
        | "interviews"
        | "finalists"
        | "presented"
        | "placed"
      search_status:
        | "planning"
        | "active"
        | "shortlisting"
        | "evaluating"
        | "placed"
        | "closed"
      source_item_kind:
        | "resume"
        | "ministry_assessment"
        | "life_story"
        | "references"
        | "spouse"
        | "interview_notes"
        | "manager_notes"
        | "photos"
        | "video_links"
        | "other"
      source_item_status: "needed" | "linked" | "uploaded" | "verified"
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
      app_role: [
        "owner",
        "admin",
        "search_manager",
        "consultant",
        "recruiting_partner",
      ],
      candidate_status: [
        "new",
        "in_review",
        "ready",
        "presented",
        "declined",
        "placed",
      ],
      presentation_status: [
        "draft",
        "in_review",
        "ready",
        "shared",
        "archived",
      ],
      profile_section_status: ["not_started", "draft", "edited", "approved"],
      search_stage: [
        "intake",
        "sourcing",
        "assessments",
        "interviews",
        "finalists",
        "presented",
        "placed",
      ],
      search_status: [
        "planning",
        "active",
        "shortlisting",
        "evaluating",
        "placed",
        "closed",
      ],
      source_item_kind: [
        "resume",
        "ministry_assessment",
        "life_story",
        "references",
        "spouse",
        "interview_notes",
        "manager_notes",
        "photos",
        "video_links",
        "other",
      ],
      source_item_status: ["needed", "linked", "uploaded", "verified"],
    },
  },
} as const
