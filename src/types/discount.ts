export interface Discount {
  id: string;
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  application_scope: 'item' | 'receipt';
  is_active: boolean;
  availability_type: 'always' | 'date_range';
  valid_from?: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
  discount_product_eligibility?: DiscountProductEligibility[];
}

export interface DiscountProductEligibility {
  id: string;
  discount_id: string;
  product_id: string;
  created_at: string;
  products?: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface DiscountApplication {
  discount_id: string;
  order_id?: string;
  order_item_id?: string;
  application_scope: 'item' | 'receipt';
}

export interface DiscountValidation {
  valid: boolean;
  reason?: string;
}

export interface CreateDiscountRequest {
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  application_scope: 'item' | 'receipt';
  availability_type: 'always' | 'date_range';
  valid_from?: string;
  valid_until?: string;
  eligible_product_ids?: string[];
}

export interface UpdateDiscountRequest extends CreateDiscountRequest {
  is_active?: boolean;
}

export interface DiscountCalculation {
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
}