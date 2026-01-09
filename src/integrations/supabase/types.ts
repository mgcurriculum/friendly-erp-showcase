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
      attendance: {
        Row: {
          attendance_date: string
          created_at: string
          created_by: string | null
          employee_id: string | null
          id: string
          in_time: string | null
          notes: string | null
          out_time: string | null
          shift: string | null
          status: string | null
        }
        Insert: {
          attendance_date?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          id?: string
          in_time?: string | null
          notes?: string | null
          out_time?: string | null
          shift?: string | null
          status?: string | null
        }
        Update: {
          attendance_date?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          id?: string
          in_time?: string | null
          notes?: string | null
          out_time?: string | null
          shift?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_order_items: {
        Row: {
          amount: number
          created_at: string
          delivered_quantity: number | null
          finished_good_id: string | null
          id: string
          order_id: string | null
          quantity: number
          rate: number
        }
        Insert: {
          amount: number
          created_at?: string
          delivered_quantity?: number | null
          finished_good_id?: string | null
          id?: string
          order_id?: string | null
          quantity: number
          rate: number
        }
        Update: {
          amount?: number
          created_at?: string
          delivered_quantity?: number | null
          finished_good_id?: string | null
          id?: string
          order_id?: string | null
          quantity?: number
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_order_items_finished_good_id_fkey"
            columns: ["finished_good_id"]
            isOneToOne: false
            referencedRelation: "finished_goods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          expected_delivery: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          status: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_mode: string | null
          payment_number: string
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_mode?: string | null
          payment_number: string
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_mode?: string | null
          payment_number?: string
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          code: string
          contact_person: string | null
          created_at: string
          credit_limit: number | null
          credit_period: number | null
          current_balance: number | null
          email: string | null
          gst_number: string | null
          id: string
          name: string
          opening_balance: number | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          credit_period?: number | null
          current_balance?: number | null
          email?: string | null
          gst_number?: string | null
          id?: string
          name: string
          opening_balance?: number | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          credit_period?: number | null
          current_balance?: number | null
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          opening_balance?: number | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cutting_sealing_entries: {
        Row: {
          batch_id: string | null
          created_at: string
          created_by: string | null
          cutting_number: string
          id: string
          job_date: string
          notes: string | null
          quantity_processed: number
          shift: string | null
          status: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          cutting_number: string
          id?: string
          job_date?: string
          notes?: string | null
          quantity_processed?: number
          shift?: string | null
          status?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          cutting_number?: string
          id?: string
          job_date?: string
          notes?: string | null
          quantity_processed?: number
          shift?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cutting_sealing_entries_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          delivery_date: string
          delivery_number: string
          driver_name: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          status: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_date?: string
          delivery_number: string
          driver_name?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_date?: string
          delivery_number?: string
          driver_name?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          code: string
          created_at: string
          department: string | null
          designation: string | null
          email: string | null
          id: string
          joining_date: string | null
          loan_balance: number | null
          name: string
          phone: string | null
          salary: number | null
          status: string | null
          suspense_balance: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          joining_date?: string | null
          loan_balance?: number | null
          name: string
          phone?: string | null
          salary?: number | null
          status?: string | null
          suspense_balance?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          joining_date?: string | null
          loan_balance?: number | null
          name?: string
          phone?: string | null
          salary?: number | null
          status?: string | null
          suspense_balance?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      finished_goods: {
        Row: {
          code: string
          color: string | null
          created_at: string
          current_stock: number | null
          id: string
          min_stock_level: number | null
          name: string
          no_per_kg: number | null
          rate: number | null
          size: string | null
          thickness: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          current_stock?: number | null
          id?: string
          min_stock_level?: number | null
          name: string
          no_per_kg?: number | null
          rate?: number | null
          size?: string | null
          thickness?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          current_stock?: number | null
          id?: string
          min_stock_level?: number | null
          name?: string
          no_per_kg?: number | null
          rate?: number | null
          size?: string | null
          thickness?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fuel_consumption: {
        Row: {
          created_at: string
          created_by: string | null
          fuel_date: string
          fuel_station: string | null
          fuel_type: string | null
          id: string
          notes: string | null
          odometer_reading: number | null
          price_per_liter: number
          quantity_liters: number
          receipt_number: string | null
          total_amount: number
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fuel_date?: string
          fuel_station?: string | null
          fuel_type?: string | null
          id?: string
          notes?: string | null
          odometer_reading?: number | null
          price_per_liter: number
          quantity_liters: number
          receipt_number?: string | null
          total_amount: number
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fuel_date?: string
          fuel_station?: string | null
          fuel_type?: string | null
          id?: string
          notes?: string | null
          odometer_reading?: number | null
          price_per_liter?: number
          quantity_liters?: number
          receipt_number?: string | null
          total_amount?: number
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_consumption_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      keil_collection_items: {
        Row: {
          bags_count: number | null
          collection_id: string | null
          collection_time: string | null
          created_at: string
          hce_id: string | null
          id: string
          remarks: string | null
          waste_type: string | null
          weight: number | null
        }
        Insert: {
          bags_count?: number | null
          collection_id?: string | null
          collection_time?: string | null
          created_at?: string
          hce_id?: string | null
          id?: string
          remarks?: string | null
          waste_type?: string | null
          weight?: number | null
        }
        Update: {
          bags_count?: number | null
          collection_id?: string | null
          collection_time?: string | null
          created_at?: string
          hce_id?: string | null
          id?: string
          remarks?: string | null
          waste_type?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "keil_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "keil_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keil_collection_items_hce_id_fkey"
            columns: ["hce_id"]
            isOneToOne: false
            referencedRelation: "keil_hce"
            referencedColumns: ["id"]
          },
        ]
      }
      keil_collections: {
        Row: {
          collection_date: string
          collection_number: string
          created_at: string
          created_by: string | null
          driver_id: string | null
          end_km: number | null
          end_time: string | null
          helper_id: string | null
          id: string
          notes: string | null
          route_id: string | null
          start_km: number | null
          start_time: string | null
          status: string | null
          total_bags: number | null
          total_weight: number | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          collection_date?: string
          collection_number: string
          created_at?: string
          created_by?: string | null
          driver_id?: string | null
          end_km?: number | null
          end_time?: string | null
          helper_id?: string | null
          id?: string
          notes?: string | null
          route_id?: string | null
          start_km?: number | null
          start_time?: string | null
          status?: string | null
          total_bags?: number | null
          total_weight?: number | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          collection_date?: string
          collection_number?: string
          created_at?: string
          created_by?: string | null
          driver_id?: string | null
          end_km?: number | null
          end_time?: string | null
          helper_id?: string | null
          id?: string
          notes?: string | null
          route_id?: string | null
          start_km?: number | null
          start_time?: string | null
          status?: string | null
          total_bags?: number | null
          total_weight?: number | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keil_collections_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keil_collections_helper_id_fkey"
            columns: ["helper_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keil_collections_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "keil_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keil_collections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      keil_hce: {
        Row: {
          address: string | null
          beds_count: number | null
          collection_frequency: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          hce_code: string
          hce_name: string
          hce_type: string | null
          id: string
          license_number: string | null
          phone: string | null
          route_id: string | null
          status: string | null
          updated_at: string
          waste_category: string | null
        }
        Insert: {
          address?: string | null
          beds_count?: number | null
          collection_frequency?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          hce_code: string
          hce_name: string
          hce_type?: string | null
          id?: string
          license_number?: string | null
          phone?: string | null
          route_id?: string | null
          status?: string | null
          updated_at?: string
          waste_category?: string | null
        }
        Update: {
          address?: string | null
          beds_count?: number | null
          collection_frequency?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          hce_code?: string
          hce_name?: string
          hce_type?: string | null
          id?: string
          license_number?: string | null
          phone?: string | null
          route_id?: string | null
          status?: string | null
          updated_at?: string
          waste_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keil_hce_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "keil_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      keil_routes: {
        Row: {
          area: string | null
          branch: string | null
          created_at: string
          description: string | null
          id: string
          route_code: string
          route_name: string
          route_type: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          branch?: string | null
          created_at?: string
          description?: string | null
          id?: string
          route_code: string
          route_name: string
          route_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          branch?: string | null
          created_at?: string
          description?: string | null
          id?: string
          route_code?: string
          route_name?: string
          route_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketing_visits: {
        Row: {
          contact_number: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_place: string | null
          employee_id: string | null
          entry_time: string | null
          exit_time: string | null
          id: string
          person_met: string | null
          remarks: string | null
          visit_date: string
        }
        Insert: {
          contact_number?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          customer_place?: string | null
          employee_id?: string | null
          entry_time?: string | null
          exit_time?: string | null
          id?: string
          person_met?: string | null
          remarks?: string | null
          visit_date?: string
        }
        Update: {
          contact_number?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          customer_place?: string | null
          employee_id?: string | null
          entry_time?: string | null
          exit_time?: string | null
          id?: string
          person_met?: string | null
          remarks?: string | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_visits_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      material_consumption: {
        Row: {
          batch_id: string | null
          consumption_date: string
          created_at: string
          id: string
          quantity: number
          raw_material_id: string | null
        }
        Insert: {
          batch_id?: string | null
          consumption_date?: string
          created_at?: string
          id?: string
          quantity: number
          raw_material_id?: string | null
        }
        Update: {
          batch_id?: string | null
          consumption_date?: string
          created_at?: string
          id?: string
          quantity?: number
          raw_material_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_consumption_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_consumption_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_entries: {
        Row: {
          created_at: string
          created_by: string | null
          cutting_sealing_id: string | null
          id: string
          job_date: string
          notes: string | null
          packing_number: string
          quantity_packed: number
          shift: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cutting_sealing_id?: string | null
          id?: string
          job_date?: string
          notes?: string | null
          packing_number: string
          quantity_packed?: number
          shift?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cutting_sealing_id?: string | null
          id?: string
          job_date?: string
          notes?: string | null
          packing_number?: string
          quantity_packed?: number
          shift?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packing_entries_cutting_sealing_id_fkey"
            columns: ["cutting_sealing_id"]
            isOneToOne: false
            referencedRelation: "cutting_sealing_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          reference: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          reference?: string | null
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          reference?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: []
      }
      production_batches: {
        Row: {
          batch_number: string
          created_at: string
          created_by: string | null
          employee_id: string | null
          finished_good_id: string | null
          id: string
          notes: string | null
          production_date: string
          quantity_produced: number | null
          shift: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          batch_number: string
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          finished_good_id?: string | null
          id?: string
          notes?: string | null
          production_date?: string
          quantity_produced?: number | null
          shift?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          batch_number?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          finished_good_id?: string | null
          id?: string
          notes?: string | null
          production_date?: string
          quantity_produced?: number | null
          shift?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_batches_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_finished_good_id_fkey"
            columns: ["finished_good_id"]
            isOneToOne: false
            referencedRelation: "finished_goods"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          purchase_id: string | null
          quantity: number
          rate: number
          raw_material_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          purchase_id?: string | null
          quantity: number
          rate: number
          raw_material_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          purchase_id?: string | null
          quantity?: number
          rate?: number
          raw_material_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string | null
          quantity: number
          rate: number
          raw_material_id: string | null
          received_quantity: number | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id?: string | null
          quantity: number
          rate: number
          raw_material_id?: string | null
          received_quantity?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string | null
          quantity?: number
          rate?: number
          raw_material_id?: string | null
          received_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_delivery: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          status: string | null
          supplier_id: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_returns: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          purchase_id: string | null
          reason: string | null
          return_date: string
          return_method: string | null
          return_number: string
          status: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          purchase_id?: string | null
          reason?: string | null
          return_date?: string
          return_method?: string | null
          return_number: string
          status?: string | null
          total_amount?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          purchase_id?: string | null
          reason?: string | null
          return_date?: string
          return_method?: string | null
          return_number?: string
          status?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_returns_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          order_id: string | null
          purchase_date: string
          purchase_number: string
          status: string | null
          supplier_id: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          order_id?: string | null
          purchase_date?: string
          purchase_number: string
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          order_id?: string | null
          purchase_date?: string
          purchase_number?: string
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_materials: {
        Row: {
          code: string
          created_at: string
          current_stock: number | null
          grade: string | null
          id: string
          min_stock_level: number | null
          name: string
          rate: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_stock?: number | null
          grade?: string | null
          id?: string
          min_stock_level?: number | null
          name: string
          rate?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_stock?: number | null
          grade?: string | null
          id?: string
          min_stock_level?: number | null
          name?: string
          rate?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sales_invoice_items: {
        Row: {
          amount: number
          created_at: string
          finished_good_id: string | null
          id: string
          invoice_id: string | null
          quantity: number
          rate: number
        }
        Insert: {
          amount: number
          created_at?: string
          finished_good_id?: string | null
          id?: string
          invoice_id?: string | null
          quantity: number
          rate: number
        }
        Update: {
          amount?: number
          created_at?: string
          finished_good_id?: string | null
          id?: string
          invoice_id?: string | null
          quantity?: number
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_items_finished_good_id_fkey"
            columns: ["finished_good_id"]
            isOneToOne: false
            referencedRelation: "finished_goods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoices: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          gst_amount: number | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          order_id: string | null
          paid_amount: number | null
          status: string | null
          subtotal: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          gst_amount?: number | null
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          order_id?: string | null
          paid_amount?: number | null
          status?: string | null
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          gst_amount?: number | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          order_id?: string | null
          paid_amount?: number | null
          status?: string | null
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_returns: {
        Row: {
          created_at: string
          created_by: string | null
          handled_by: string | null
          id: string
          invoice_id: string | null
          reason: string | null
          return_date: string
          return_method: string | null
          return_number: string
          status: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          handled_by?: string | null
          id?: string
          invoice_id?: string | null
          reason?: string | null
          return_date?: string
          return_method?: string | null
          return_number: string
          status?: string | null
          total_amount?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          handled_by?: string | null
          id?: string
          invoice_id?: string | null
          reason?: string | null
          return_date?: string
          return_method?: string | null
          return_number?: string
          status?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_returns_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_mode: string | null
          payment_number: string
          purchase_id: string | null
          reference_number: string | null
          supplier_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_mode?: string | null
          payment_number: string
          purchase_id?: string | null
          reference_number?: string | null
          supplier_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_mode?: string | null
          payment_number?: string
          purchase_id?: string | null
          reference_number?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          code: string
          contact_person: string | null
          created_at: string
          credit_limit: number | null
          credit_period: number | null
          current_balance: number | null
          email: string | null
          gst_number: string | null
          id: string
          name: string
          opening_balance: number | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          credit_period?: number | null
          current_balance?: number | null
          email?: string | null
          gst_number?: string | null
          id?: string
          name: string
          opening_balance?: number | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          credit_period?: number | null
          current_balance?: number | null
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          opening_balance?: number | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          address: string | null
          company_name: string
          created_at: string
          email: string | null
          gst_number: string | null
          id: string
          license_number: string | null
          logo_url: string | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          license_number?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          license_number?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: []
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
          created_at: string
          fitness_expiry: string | null
          gps_enabled: boolean | null
          id: string
          insurance_expiry: string | null
          make: string | null
          model: string | null
          purpose: string | null
          registration_number: string
          status: string | null
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          fitness_expiry?: string | null
          gps_enabled?: boolean | null
          id?: string
          insurance_expiry?: string | null
          make?: string | null
          model?: string | null
          purpose?: string | null
          registration_number: string
          status?: string | null
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          fitness_expiry?: string | null
          gps_enabled?: boolean | null
          id?: string
          insurance_expiry?: string | null
          make?: string | null
          model?: string | null
          purpose?: string | null
          registration_number?: string
          status?: string | null
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      wastage: {
        Row: {
          batch_id: string | null
          created_at: string
          created_by: string | null
          finished_good_id: string | null
          id: string
          quantity: number
          reason: string | null
          wastage_date: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          finished_good_id?: string | null
          id?: string
          quantity: number
          reason?: string | null
          wastage_date?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          finished_good_id?: string | null
          id?: string
          quantity?: number
          reason?: string | null
          wastage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "wastage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wastage_finished_good_id_fkey"
            columns: ["finished_good_id"]
            isOneToOne: false
            referencedRelation: "finished_goods"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: { Args: { prefix: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "manager" | "data_entry" | "viewer"
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
      app_role: ["super_admin", "manager", "data_entry", "viewer"],
    },
  },
} as const
