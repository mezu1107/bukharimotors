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
      ai_runs: {
        Row: {
          cost_tokens: number | null
          created_at: string
          feature: string
          id: string
          input: Json | null
          output: Json | null
          user_id: string | null
        }
        Insert: {
          cost_tokens?: number | null
          created_at?: string
          feature: string
          id?: string
          input?: Json | null
          output?: Json | null
          user_id?: string | null
        }
        Update: {
          cost_tokens?: number | null
          created_at?: string
          feature?: string
          id?: string
          input?: Json | null
          output?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: string
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          advance_amount: number
          balance_amount: number
          booking_no: string
          branch_id: string | null
          client_id: string
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          daily_rate: number
          damage_checklist: Json | null
          discount: number | null
          driver_id: string | null
          driver_rate: number | null
          dropoff_at: string
          dropoff_location: string | null
          extra_charges: number | null
          fuel_level_in: string | null
          fuel_level_out: string | null
          id: string
          notes: string | null
          odometer_in: number | null
          odometer_out: number | null
          pdf_url: string | null
          pickup_at: string
          pickup_location: string | null
          security_deposit: number | null
          signature_url: string | null
          status: Database["public"]["Enums"]["booking_status"]
          tax: number | null
          template_id: string | null
          terms_accepted: boolean
          total_amount: number
          updated_at: string
          vehicle_id: string
          with_driver: boolean
        }
        Insert: {
          advance_amount?: number
          balance_amount?: number
          booking_no: string
          branch_id?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          daily_rate?: number
          damage_checklist?: Json | null
          discount?: number | null
          driver_id?: string | null
          driver_rate?: number | null
          dropoff_at: string
          dropoff_location?: string | null
          extra_charges?: number | null
          fuel_level_in?: string | null
          fuel_level_out?: string | null
          id?: string
          notes?: string | null
          odometer_in?: number | null
          odometer_out?: number | null
          pdf_url?: string | null
          pickup_at: string
          pickup_location?: string | null
          security_deposit?: number | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          tax?: number | null
          template_id?: string | null
          terms_accepted?: boolean
          total_amount?: number
          updated_at?: string
          vehicle_id: string
          with_driver?: boolean
        }
        Update: {
          advance_amount?: number
          balance_amount?: number
          booking_no?: string
          branch_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          daily_rate?: number
          damage_checklist?: Json | null
          discount?: number | null
          driver_id?: string | null
          driver_rate?: number | null
          dropoff_at?: string
          dropoff_location?: string | null
          extra_charges?: number | null
          fuel_level_in?: string | null
          fuel_level_out?: string | null
          id?: string
          notes?: string | null
          odometer_in?: number | null
          odometer_out?: number | null
          pdf_url?: string | null
          pickup_at?: string
          pickup_location?: string | null
          security_deposit?: number | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          tax?: number | null
          template_id?: string | null
          terms_accepted?: boolean
          total_amount?: number
          updated_at?: string
          vehicle_id?: string
          with_driver?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          alt_phone: string | null
          city: string | null
          cnic: string | null
          cnic_back_url: string | null
          cnic_front_url: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          full_name: string
          id: string
          license_expiry: string | null
          license_no: string | null
          license_url: string | null
          loyalty_points: number
          notes: string | null
          phone: string
          photo_url: string | null
          total_bookings: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          alt_phone?: string | null
          city?: string | null
          cnic?: string | null
          cnic_back_url?: string | null
          cnic_front_url?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          id?: string
          license_expiry?: string | null
          license_no?: string | null
          license_url?: string | null
          loyalty_points?: number
          notes?: string | null
          phone: string
          photo_url?: string | null
          total_bookings?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          alt_phone?: string | null
          city?: string | null
          cnic?: string | null
          cnic_back_url?: string | null
          cnic_front_url?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          id?: string
          license_expiry?: string | null
          license_no?: string | null
          license_url?: string | null
          loyalty_points?: number
          notes?: string | null
          phone?: string
          photo_url?: string | null
          total_bookings?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          company_name: string
          email: string | null
          facebook_url: string | null
          form_banner: string | null
          id: boolean
          instagram_url: string | null
          logo_url: string | null
          phone: string | null
          tagline: string | null
          tiktok_url: string | null
          updated_at: string
          website: string | null
          whatsapp_number: string | null
          youtube_url: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string
          email?: string | null
          facebook_url?: string | null
          form_banner?: string | null
          id?: boolean
          instagram_url?: string | null
          logo_url?: string | null
          phone?: string | null
          tagline?: string | null
          tiktok_url?: string | null
          updated_at?: string
          website?: string | null
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          email?: string | null
          facebook_url?: string | null
          form_banner?: string | null
          id?: boolean
          instagram_url?: string | null
          logo_url?: string | null
          phone?: string | null
          tagline?: string | null
          tiktok_url?: string | null
          updated_at?: string
          website?: string | null
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      drivers: {
        Row: {
          address: string | null
          cnic: string | null
          created_at: string
          daily_rate: number
          full_name: string
          id: string
          license_expiry: string | null
          license_no: string | null
          license_url: string | null
          notes: string | null
          phone: string
          photo_url: string | null
          rating: number | null
          status: Database["public"]["Enums"]["driver_status"]
          total_trips: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnic?: string | null
          created_at?: string
          daily_rate?: number
          full_name: string
          id?: string
          license_expiry?: string | null
          license_no?: string | null
          license_url?: string | null
          notes?: string | null
          phone: string
          photo_url?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["driver_status"]
          total_trips?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnic?: string | null
          created_at?: string
          daily_rate?: number
          full_name?: string
          id?: string
          license_expiry?: string | null
          license_no?: string | null
          license_url?: string | null
          notes?: string | null
          phone?: string
          photo_url?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["driver_status"]
          total_trips?: number
          updated_at?: string
        }
        Relationships: []
      }
      form_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          schema: Json
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          schema?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          schema?: Json
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      inspections: {
        Row: {
          booking_id: string
          damage_areas: Json | null
          damage_notes: string | null
          exterior_condition: string | null
          fuel_level: string | null
          id: string
          inspected_at: string
          inspector_id: string | null
          interior_condition: string | null
          odometer: number | null
          photos: Json | null
          type: Database["public"]["Enums"]["inspection_type"]
        }
        Insert: {
          booking_id: string
          damage_areas?: Json | null
          damage_notes?: string | null
          exterior_condition?: string | null
          fuel_level?: string | null
          id?: string
          inspected_at?: string
          inspector_id?: string | null
          interior_condition?: string | null
          odometer?: number | null
          photos?: Json | null
          type: Database["public"]["Enums"]["inspection_type"]
        }
        Update: {
          booking_id?: string
          damage_areas?: Json | null
          damage_notes?: string | null
          exterior_condition?: string | null
          fuel_level?: string | null
          id?: string
          inspected_at?: string
          inspector_id?: string | null
          interior_condition?: string | null
          odometer?: number | null
          photos?: Json | null
          type?: Database["public"]["Enums"]["inspection_type"]
        }
        Relationships: [
          {
            foreignKeyName: "inspections_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          completed_date: string | null
          cost: number | null
          created_at: string
          description: string | null
          id: string
          invoice_url: string | null
          next_service_date: string | null
          odometer_at_service: number | null
          performed_by: string | null
          scheduled_date: string | null
          service_type: string
          vehicle_id: string
        }
        Insert: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          invoice_url?: string | null
          next_service_date?: string | null
          odometer_at_service?: number | null
          performed_by?: string | null
          scheduled_date?: string | null
          service_type: string
          vehicle_id: string
        }
        Update: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          invoice_url?: string | null
          next_service_date?: string | null
          odometer_at_service?: number | null
          performed_by?: string | null
          scheduled_date?: string | null
          service_type?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          related_id?: string | null
          related_type?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          paid_at: string
          received_by: string | null
          reference_no: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          received_by?: string | null
          reference_no?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          received_by?: string | null
          reference_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_fk"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          description: string | null
          discount_amount: number | null
          discount_pct: number | null
          id: string
          name: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_pct?: number | null
          id?: string
          name: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_pct?: number | null
          id?: string
          name?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          done_at: string | null
          due_at: string
          id: string
          is_done: boolean
          notify_before_minutes: number | null
          related_booking_id: string | null
          related_vehicle_id: string | null
          title: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          done_at?: string | null
          due_at: string
          id?: string
          is_done?: boolean
          notify_before_minutes?: number | null
          related_booking_id?: string | null
          related_vehicle_id?: string | null
          title: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          done_at?: string | null
          due_at?: string
          id?: string
          is_done?: boolean
          notify_before_minutes?: number | null
          related_booking_id?: string | null
          related_vehicle_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_related_booking_id_fkey"
            columns: ["related_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_related_vehicle_id_fkey"
            columns: ["related_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
      vehicles: {
        Row: {
          branch_id: string | null
          color: string | null
          created_at: string
          created_by: string | null
          current_odometer: number | null
          daily_rate: number
          features: Json | null
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          id: string
          make: string
          model: string
          monthly_rate: number | null
          notes: string | null
          photos: Json | null
          registration_no: string
          seats: number | null
          status: Database["public"]["Enums"]["vehicle_status"]
          transmission: string | null
          updated_at: string
          vehicle_type: string | null
          weekly_rate: number | null
          with_driver_extra: number | null
          year: number | null
        }
        Insert: {
          branch_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          current_odometer?: number | null
          daily_rate?: number
          features?: Json | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          make: string
          model: string
          monthly_rate?: number | null
          notes?: string | null
          photos?: Json | null
          registration_no: string
          seats?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          transmission?: string | null
          updated_at?: string
          vehicle_type?: string | null
          weekly_rate?: number | null
          with_driver_extra?: number | null
          year?: number | null
        }
        Update: {
          branch_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          current_odometer?: number | null
          daily_rate?: number
          features?: Json | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          make?: string
          model?: string
          monthly_rate?: number | null
          notes?: string | null
          photos?: Json | null
          registration_no?: string
          seats?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          transmission?: string | null
          updated_at?: string
          vehicle_type?: string | null
          weekly_rate?: number | null
          with_driver_extra?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "manager" | "staff"
      booking_status:
        | "pending"
        | "confirmed"
        | "active"
        | "completed"
        | "cancelled"
      driver_status: "available" | "on_trip" | "off_duty" | "inactive"
      fuel_type: "petrol" | "diesel" | "hybrid" | "electric" | "cng"
      inspection_type: "pre_rental" | "post_rental"
      payment_method: "cash" | "bank" | "easypaisa" | "jazzcash" | "other"
      vehicle_status: "available" | "rented" | "maintenance" | "inactive"
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
      app_role: ["admin", "manager", "staff"],
      booking_status: [
        "pending",
        "confirmed",
        "active",
        "completed",
        "cancelled",
      ],
      driver_status: ["available", "on_trip", "off_duty", "inactive"],
      fuel_type: ["petrol", "diesel", "hybrid", "electric", "cng"],
      inspection_type: ["pre_rental", "post_rental"],
      payment_method: ["cash", "bank", "easypaisa", "jazzcash", "other"],
      vehicle_status: ["available", "rented", "maintenance", "inactive"],
    },
  },
} as const
