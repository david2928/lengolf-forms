export interface Database {
  public: {
    Tables: {
      packages: {
        Row: {
          id: string
          created_at: string
          customer_name: string
          package_type_id: number
          purchase_date: string
          first_use_date: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          customer_name: string
          package_type_id: number
          purchase_date: string
          first_use_date?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          customer_name?: string
          package_type_id?: number
          purchase_date?: string
          first_use_date?: string | null
        }
      }
      package_types: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
      }
    }
  }
}