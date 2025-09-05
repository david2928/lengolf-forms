import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { createLineClient } from '@/lib/line-messaging';

export interface VendorOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  notes?: string;
}

export interface VendorOrderData {
  vendor: string;
  dailyOrderNumber: number;
  items: VendorOrderItem[];
  originalOrderId: string;
  staffName?: string;
}

/**
 * Get the next daily order number for a vendor (using Bangkok timezone)
 */
export async function getNextDailyOrderNumber(vendor: string): Promise<number> {
  // Get current date in Bangkok timezone
  const bangkokDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  console.log(`🕐 Bangkok date for order numbering: ${bangkokDate}`);

  const { data, error } = await supabase
    .schema('pos')
    .from('vendor_orders')
    .select('daily_order_number')
    .eq('vendor', vendor)
    .eq('order_date', bangkokDate)
    .order('daily_order_number', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error getting daily order number:', error);
    throw new Error('Failed to get daily order number');
  }

  const nextNumber = data ? data.daily_order_number + 1 : 1;
  console.log(`🔢 Next order number for ${vendor} on ${bangkokDate}: ${nextNumber}`);
  
  return nextNumber;
}

/**
 * Format vendor order for LINE message (simplified format with Bangkok timezone)
 */
export function formatVendorOrderMessage(
  orderNumber: number,
  items: VendorOrderItem[],
  staffName?: string
): string {
  const lines: string[] = [];
  
  // Add timestamp in Bangkok timezone and staff info
  const now = new Date();
  const bangkokTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);
  
  const staffInfo = staffName ? staffName.split('@')[0] : 'LENGOLF'; // Remove email domain if present
  
  lines.push(`${bangkokTime} ${staffInfo} Order ${orderNumber}:`);
  
  // Add items
  items.forEach(item => {
    let itemLine = `${item.quantity} ${item.productName}`;
    if (item.notes && item.notes.trim()) {
      itemLine += ` (${item.notes.trim()})`;
    }
    lines.push(itemLine);
  });
  
  return lines.join('\n');
}

/**
 * Get vendor items from an order
 */
export async function getVendorItemsFromOrder(orderId: string): Promise<{
  vendor: string;
  items: VendorOrderItem[];
}[]> {
  console.log('🔍 Getting vendor items for order:', orderId);
  
  // Use raw SQL query since cross-schema joins are complex in Supabase query builder
  const { data, error } = await supabase.rpc('get_vendor_items_for_order', {
    p_order_id: orderId
  });

  if (error) {
    console.error('Error fetching vendor items:', error);
    // Fallback to manual query if RPC doesn't exist
    return await getVendorItemsFallback(orderId);
  }

  if (!data || data.length === 0) {
    console.log('📝 No vendor items found for order:', orderId);
    return [];
  }

  // Group items by vendor
  const vendorGroups = new Map<string, VendorOrderItem[]>();
  
  data.forEach((item: any) => {
    if (item.vendor) {
      if (!vendorGroups.has(item.vendor)) {
        vendorGroups.set(item.vendor, []);
      }
      
      vendorGroups.get(item.vendor)!.push({
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        notes: item.item_notes || undefined
      });
    }
  });

  const result = Array.from(vendorGroups.entries()).map(([vendor, items]) => ({
    vendor,
    items
  }));

  console.log('🏪 Found vendor groups:', result);
  return result;
}

// Fallback function using correct SKU-based vendor logic
async function getVendorItemsFallback(orderId: string): Promise<{
  vendor: string;
  items: VendorOrderItem[];
}[]> {
  console.log('🔄 Using fallback vendor detection for order:', orderId);
  
  // Get order items
  const { data: orderItems, error } = await supabase
    .schema('pos')
    .from('order_items')
    .select(`
      product_id,
      quantity,
      notes,
      product_name
    `)
    .eq('order_id', orderId);

  if (error || !orderItems) {
    console.error('Error in fallback query:', error);
    return [];
  }

  // Get product details
  const productIds = orderItems.map((item: any) => item.product_id);
  const { data: products, error: productsError } = await supabase
    .schema('products')
    .from('products')
    .select('id, name')
    .in('id', productIds);

  if (productsError || !products) {
    console.error('Error fetching products:', productsError);
    return [];
  }

  // Check which products have SKU mappings (these are Smith & Co items)
  const { data: skuMappings, error: skuError } = await supabase
    .schema('pos')
    .from('lengolf_sales')
    .select('product_id, sku_number')
    .in('product_id', productIds);

  if (skuError) {
    console.error('Error fetching SKU mappings:', skuError);
    return [];
  }

  // Create maps for quick lookup - only include products with meaningful SKU numbers (containing "lengolf")
  const productMap = new Map(products.map((p: any) => [p.id, p]));
  const skuMap = new Set(
    (skuMappings || [])
      .filter((s: any) => 
        s.sku_number && 
        s.sku_number.trim().length > 1 &&
        s.sku_number !== '-' &&
        s.sku_number.toLowerCase().includes('lengolf')
      )
      .map((s: any) => s.product_id)
  );

  console.log('🔍 Products with SKU mappings:', Array.from(skuMap));

  // Group items by vendor (Smith & Co for items with SKU)
  const vendorItems: VendorOrderItem[] = [];
  
  orderItems.forEach((item: any) => {
    const product = productMap.get(item.product_id) as any;
    if (product && skuMap.has(item.product_id)) {
      vendorItems.push({
        productId: item.product_id,
        productName: product.name,
        quantity: item.quantity,
        notes: item.notes || undefined
      });
    }
  });

  if (vendorItems.length === 0) {
    return [];
  }

  return [{
    vendor: 'Smith & Co',
    items: vendorItems
  }];
}

/**
 * Save vendor order to database (using Bangkok timezone for order_date)
 */
export async function saveVendorOrder(vendorOrder: VendorOrderData): Promise<string> {
  // Get current date in Bangkok timezone
  const bangkokDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const { data, error } = await supabase
    .schema('pos')
    .from('vendor_orders')
    .insert({
      vendor: vendorOrder.vendor,
      daily_order_number: vendorOrder.dailyOrderNumber,
      order_date: bangkokDate,
      original_order_id: vendorOrder.originalOrderId,
      items: JSON.stringify(vendorOrder.items),
      staff_name: vendorOrder.staffName,
      line_message_sent: false
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving vendor order:', error);
    throw new Error('Failed to save vendor order');
  }

  console.log(`💾 Saved vendor order for ${vendorOrder.vendor} on ${bangkokDate} - Order #${vendorOrder.dailyOrderNumber}`);
  return data.id;
}

/**
 * Send LINE notification to vendor
 */
export async function sendVendorNotification(
  vendor: string,
  message: string,
  vendorOrderId: string
): Promise<void> {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  
  if (!channelAccessToken) {
    throw new Error('LINE Channel Access Token not configured');
  }

  // Get vendor-specific group ID
  let groupId: string;
  
  switch (vendor) {
    case 'Smith & Co':
      groupId = process.env.LINE_GROUP_SMITH_CO_ID || '';
      break;
    default:
      throw new Error(`No LINE group configured for vendor: ${vendor}`);
  }

  if (!groupId) {
    throw new Error(`LINE Group ID not configured for vendor: ${vendor}`);
  }

  try {
    const lineClient = createLineClient(channelAccessToken);
    await lineClient.pushTextMessage(groupId, message);

    // Update vendor order as sent
    await supabase
      .schema('pos')
      .from('vendor_orders')
      .update({
        line_message_sent: true,
        sent_at: new Date().toISOString()
      })
      .eq('id', vendorOrderId);

    console.log(`Successfully sent vendor notification to ${vendor}`);
  } catch (error) {
    console.error(`Failed to send vendor notification to ${vendor}:`, error);
    
    // Update vendor order with failed status (keeping line_message_sent as false)
    await supabase
      .schema('pos')
      .from('vendor_orders')
      .update({
        // Could add error_message field in the future
      })
      .eq('id', vendorOrderId);

    throw new Error(`Failed to send LINE notification to ${vendor}`);
  }
}

/**
 * Process vendor notification for an order
 */
export async function processVendorNotification(
  orderId: string,
  vendorItemsWithNotes: { vendor: string; items: VendorOrderItem[] }[],
  staffName?: string,
  customMessage?: string
): Promise<void> {
  for (const { vendor, items } of vendorItemsWithNotes) {
    try {
      // Get next order number
      const dailyOrderNumber = await getNextDailyOrderNumber(vendor);
      
      // Save vendor order
      const vendorOrderData: VendorOrderData = {
        vendor,
        dailyOrderNumber,
        items,
        originalOrderId: orderId,
        staffName
      };
      
      const vendorOrderId = await saveVendorOrder(vendorOrderData);
      
      // Use custom message if provided, otherwise format automatically
      const message = customMessage || formatVendorOrderMessage(dailyOrderNumber, items, staffName);
      await sendVendorNotification(vendor, message, vendorOrderId);
      
    } catch (error) {
      console.error(`Error processing vendor notification for ${vendor}:`, error);
      // Continue with other vendors even if one fails
    }
  }
}