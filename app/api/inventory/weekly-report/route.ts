import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { createLineClient } from '@/lib/line-messaging';
import { LINE_MESSAGING } from '@/lib/constants';

interface InventoryItem {
  product_name: string;
  supplier: string;
  current_value: number | string | null;
  reorder_threshold: number | null;
  input_type: string;
  category_name: string;
  category_id: string;
}

async function getLatestInventoryData(specificDate?: string): Promise<{ items: InventoryItem[], date: string }> {
  let targetDate: string;

  if (specificDate) {
    targetDate = specificDate;
  } else {
    const { data: latestDateResult, error: latestDateError } = await supabase
      .from('inventory_submission')
      .select('date')
      .order('date', { ascending: false })
      .limit(1);

    if (latestDateError || !latestDateResult || latestDateResult.length === 0) {
      return { items: [], date: '' };
    }
    targetDate = latestDateResult[0].date;
  }

  const { data: submissions, error: submissionsError } = await supabase
    .from('inventory_submission')
    .select(`
      product_id,
      value_numeric,
      value_text,
      date,
      created_at,
      inventory_products(
        name,
        supplier,
        reorder_threshold,
        input_type,
        category_id,
        inventory_categories(
          name
        )
      )
    `)
    .eq('date', targetDate)
    .order('created_at', { ascending: false });

  if (submissionsError || !submissions || submissions.length === 0) {
    return { items: [], date: targetDate };
  }

  const productDataMap = new Map<string, InventoryItem>();

  submissions.forEach((submission: Record<string, unknown>) => {
    const product = submission.inventory_products as Record<string, unknown> | null;
    if (!product || !(product.inventory_categories as Record<string, unknown>)) return;

    const productId = submission.product_id as string;
    if (!productDataMap.has(productId)) {
      let currentValue: number | string | null = null;
      if ((product.input_type as string) === 'number') {
        currentValue = submission.value_numeric as number | null;
      } else {
        currentValue = submission.value_text as string | null;
      }

      productDataMap.set(productId, {
        product_name: product.name as string,
        supplier: (product.supplier as string) || '',
        current_value: currentValue,
        reorder_threshold: product.reorder_threshold as number | null,
        input_type: product.input_type as string,
        category_name: (product.inventory_categories as Record<string, string>).name,
        category_id: product.category_id as string,
      });
    }
  });

  return { items: Array.from(productDataMap.values()), date: targetDate };
}

function getCategoryEmoji(categoryName: string): string {
  switch (categoryName.toLowerCase()) {
    case 'beer': return '\uD83C\uDF7A';
    case 'wine': return '\uD83C\uDF77';
    case 'liquor': return '\uD83E\uDD43';
    case 'non-alcoholic': return '\uD83E\uDD64';
    case 'food & supplies': return '\uD83C\uDF7D\uFE0F';
    case 'other': return '\uD83D\uDCE6';
    default: return '\uD83D\uDCCB';
  }
}

interface LowStockItem {
  item: InventoryItem;
  displayValue: string;
  glowSizes?: Array<{ size: string; qty: number }>;
  isCash: boolean;
}

function analyzeLowStock(items: InventoryItem[]): { lowStock: Map<string, LowStockItem[]>; totalLow: number; cashNeedsCollection: boolean } {
  const categoriesWithLowStock = new Map<string, LowStockItem[]>();
  let totalLow = 0;
  let cashNeedsCollection = false;

  items.forEach(item => {
    const { product_name, current_value, reorder_threshold, input_type, category_name } = item;
    let needsReorder = false;
    let displayValue = 'Unknown';
    let glowSizes: Array<{ size: string; qty: number }> | undefined;

    if (input_type === 'number' && typeof current_value === 'number' && reorder_threshold !== null) {
      needsReorder = current_value <= reorder_threshold;
      displayValue = String(current_value);
    } else if (input_type === 'stock_slider') {
      displayValue = typeof current_value === 'string' ? current_value : 'Unknown';
      needsReorder = displayValue === 'Need to Order' || displayValue === 'Out of Stock';
    } else if (input_type === 'glove_sizes' && typeof current_value === 'string') {
      try {
        const gloveData = JSON.parse(current_value);
        const lowSizesList = Object.entries(gloveData).filter(([, qty]) => {
          return typeof qty === 'number' && qty <= (reorder_threshold || 0);
        });
        if (lowSizesList.length > 0) {
          needsReorder = true;
          glowSizes = lowSizesList.map(([size, qty]) => ({ size, qty: qty as number }));
          displayValue = `${lowSizesList.length} size${lowSizesList.length !== 1 ? 's' : ''} low`;
        }
      } catch {
        // skip
      }
    }

    if (needsReorder) {
      totalLow++;
      const isCash = product_name.toLowerCase().includes('cash');
      if (isCash) cashNeedsCollection = true;

      if (!categoriesWithLowStock.has(category_name)) {
        categoriesWithLowStock.set(category_name, []);
      }
      categoriesWithLowStock.get(category_name)!.push({ item, displayValue, glowSizes, isCash });
    }
  });

  return { lowStock: categoriesWithLowStock, totalLow, cashNeedsCollection };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Color for stock level */
function stockColor(value: number | string, inputType: string): string {
  if (inputType === 'stock_slider') return '#C0392B';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num) || num === 0) return '#C0392B';
  if (num <= 2) return '#E74C3C';
  return '#E67E22';
}

/** Left color bar for each item row */
function colorBar(color: string): Record<string, unknown> {
  return {
    type: 'box',
    layout: 'vertical',
    contents: [{ type: 'filler' }],
    width: '4px',
    backgroundColor: color,
    cornerRadius: 'sm',
    flex: 0,
  };
}

/** Single compact item row: [color bar] [name + supplier] [stock value] */
function itemRow(
  name: string,
  supplier: string,
  stockText: string,
  color: string,
): Record<string, unknown> {
  const supplierLabel = supplier && supplier.trim() !== '' ? supplier : '';
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      colorBar(color),
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: name, size: 'xs', color: '#333333', weight: 'bold' },
              ...(supplierLabel ? [{
                type: 'text' as const,
                text: supplierLabel,
                size: 'xxs' as const,
                color: '#BBBBBB',
              }] : []),
            ],
            flex: 6,
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [{
              type: 'text',
              text: stockText,
              size: 'sm',
              color,
              weight: 'bold',
              align: 'end',
            }],
            flex: 3,
            justifyContent: 'center',
          },
        ],
        flex: 1,
        paddingStart: 'md',
      },
    ],
    spacing: 'none',
    paddingAll: 'sm',
    backgroundColor: '#FAFAFA',
    cornerRadius: 'md',
    margin: 'sm',
  };
}

function buildInventoryFlexMessage(items: InventoryItem[], reportDate: string): Record<string, unknown> {
  const { lowStock, totalLow, cashNeedsCollection } = analyzeLowStock(items);
  const allGood = totalLow === 0;
  const okCount = items.length - totalLow;

  const bodyContents: Record<string, unknown>[] = [];

  if (allGood) {
    bodyContents.push({
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '\u2705 All inventory levels are good!', size: 'md', color: '#27AE60', weight: 'bold', margin: 'xl', align: 'center' },
        { type: 'text', text: `All ${items.length} products are fully stocked.`, size: 'xs', color: '#999999', margin: 'sm', align: 'center' },
      ],
      paddingAll: 'lg',
    });
  } else {
    // Status bar: green portion = OK, red portion = low
    const okPct = Math.round((okCount / items.length) * 100);
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: `\u2705 ${okCount} OK`, size: 'xxs', color: '#27AE60', weight: 'bold' },
        { type: 'text', text: `\u26A0\uFE0F ${totalLow} Low`, size: 'xxs', color: '#E74C3C', weight: 'bold', align: 'end' },
      ],
      margin: 'md',
    });
    // Progress bar
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        ...(okPct > 0 ? [{
          type: 'box' as const,
          layout: 'vertical' as const,
          contents: [{ type: 'filler' as const }],
          backgroundColor: '#27AE60',
          height: '6px',
          flex: okPct,
          cornerRadius: okPct === 100 ? 'md' : 'none',
        }] : []),
        ...(okPct < 100 ? [{
          type: 'box' as const,
          layout: 'vertical' as const,
          contents: [{ type: 'filler' as const }],
          backgroundColor: '#E74C3C',
          height: '6px',
          flex: 100 - okPct,
          cornerRadius: okPct === 0 ? 'md' : 'none',
        }] : []),
      ],
      cornerRadius: 'md',
      margin: 'sm',
    });

    const sortedCategories = Array.from(lowStock.keys()).sort();
    const supplierCounts = new Map<string, number>();

    sortedCategories.forEach((categoryName, catIdx) => {
      const categoryItems = lowStock.get(categoryName)!;
      const emoji = getCategoryEmoji(categoryName);

      if (catIdx > 0) {
        bodyContents.push({ type: 'separator', margin: 'lg' });
      }

      // Category header
      bodyContents.push({
        type: 'box',
        layout: 'horizontal',
        contents: [
          { type: 'text', text: `${emoji} ${categoryName}`, size: 'sm', weight: 'bold', color: '#005a32', flex: 5 },
          {
            type: 'box',
            layout: 'vertical',
            contents: [{ type: 'text', text: `${categoryItems.length}`, size: 'xxs', color: '#FFFFFF', align: 'center', weight: 'bold' }],
            backgroundColor: '#E74C3C',
            cornerRadius: 'xl',
            width: '22px',
            height: '18px',
            justifyContent: 'center',
            flex: 0,
          },
        ],
        margin: catIdx === 0 ? 'lg' : 'md',
        alignItems: 'center',
      });

      categoryItems.forEach(({ item, displayValue, glowSizes, isCash }) => {
        if (!isCash && item.supplier) {
          supplierCounts.set(item.supplier, (supplierCounts.get(item.supplier) || 0) + 1);
        }

        if (isCash) {
          bodyContents.push({
            type: 'box',
            layout: 'horizontal',
            contents: [
              colorBar('#C0392B'),
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      { type: 'text', text: `\uD83D\uDCB0 ${item.product_name}`, size: 'xs', color: '#C0392B', weight: 'bold' },
                      { type: 'text', text: 'COLLECT NOW', size: 'xxs', color: '#C0392B', weight: 'bold' },
                    ],
                    flex: 6,
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [{ type: 'text', text: `\u0E3F${displayValue}`, size: 'sm', color: '#C0392B', weight: 'bold', align: 'end' }],
                    flex: 3,
                    justifyContent: 'center',
                  },
                ],
                flex: 1,
                paddingStart: 'md',
              },
            ],
            paddingAll: 'sm',
            backgroundColor: '#FFF5F5',
            cornerRadius: 'md',
            margin: 'sm',
          });
          return;
        }

        if (glowSizes && glowSizes.length > 0) {
          bodyContents.push(itemRow(
            item.product_name,
            item.supplier,
            `${glowSizes.length} size${glowSizes.length !== 1 ? 's' : ''} low`,
            '#E67E22',
          ));
          glowSizes.forEach(({ size, qty }) => {
            bodyContents.push({
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: `   Size ${size}`, size: 'xxs', color: '#999999', flex: 5 },
                { type: 'text', text: `${qty} left`, size: 'xxs', color: qty === 0 ? '#C0392B' : '#E67E22', weight: 'bold', flex: 3, align: 'end' },
              ],
              margin: 'xs',
            });
          });
        } else {
          const color = stockColor(displayValue, item.input_type);
          const stockText = item.input_type === 'stock_slider'
            ? displayValue
            : String(displayValue);
          bodyContents.push(itemRow(item.product_name, item.supplier, stockText, color));
        }
      });
    });

    // Order summary grouped by supplier
    bodyContents.push({ type: 'separator', margin: 'lg' });

    const supplierRows: Record<string, unknown>[] = [];
    if (cashNeedsCollection) {
      supplierRows.push({
        type: 'box',
        layout: 'horizontal',
        contents: [
          { type: 'text', text: '\uD83D\uDCB0', size: 'xs', flex: 0 },
          { type: 'text', text: 'Collect cash', size: 'xs', color: '#C0392B', weight: 'bold', flex: 5 },
          { type: 'text', text: 'PRIORITY', size: 'xxs', color: '#C0392B', weight: 'bold', align: 'end', flex: 3 },
        ],
        margin: 'sm',
      });
    }

    const sortedSuppliers = Array.from(supplierCounts.entries()).sort((a, b) => b[1] - a[1]);
    sortedSuppliers.forEach(([supplier, count]) => {
      supplierRows.push({
        type: 'box',
        layout: 'horizontal',
        contents: [
          { type: 'text', text: '\uD83D\uDCE6', size: 'xs', flex: 0 },
          { type: 'text', text: supplier, size: 'xs', color: '#555555', flex: 5 },
          { type: 'text', text: `${count} item${count !== 1 ? 's' : ''}`, size: 'xs', color: '#888888', align: 'end', flex: 3 },
        ],
        margin: 'sm',
      });
    });

    bodyContents.push({
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '\uD83D\uDED2 Order From', size: 'sm', weight: 'bold', color: '#333333' },
            { type: 'text', text: `${sortedSuppliers.length} suppliers`, size: 'xxs', color: '#AAAAAA', align: 'end' },
          ],
        },
        { type: 'separator', margin: 'sm' },
        ...supplierRows,
      ],
      margin: 'md',
      backgroundColor: '#F8F9FA',
      cornerRadius: 'lg',
      paddingAll: 'md',
    });
  }

  return {
    type: 'bubble',
    size: 'giga',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '\uD83D\uDED2 Inventory Report', weight: 'bold', color: '#FFFFFF', size: 'lg', flex: 4 },
            {
              type: 'box',
              layout: 'vertical',
              contents: [{
                type: 'text',
                text: allGood ? '\u2705 All Good' : `${totalLow} need reorder`,
                size: 'xxs',
                color: '#FFFFFF',
                align: 'center',
                weight: 'bold',
              }],
              backgroundColor: allGood ? '#1E8449' : '#C0392B',
              cornerRadius: 'md',
              paddingAll: 'xs',
              flex: 3,
              justifyContent: 'center',
            },
          ],
          alignItems: 'center',
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: formatDate(reportDate), color: '#FFFFFFCC', size: 'sm' },
            { type: 'text', text: `${items.length} products`, color: '#FFFFFF80', size: 'xs', align: 'end' },
          ],
          margin: 'sm',
        },
      ],
      backgroundColor: '#005a32',
      paddingAll: 'lg',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: bodyContents,
      paddingAll: 'lg',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: 'View Inventory',
            uri: 'https://lengolf-forms.vercel.app/admin/inventory',
          },
          style: 'link',
          height: 'sm',
        },
      ],
      paddingAll: 'md',
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const testUserId = searchParams.get('testUserId');

    const { items, date } = await getLatestInventoryData(dateParam || undefined);

    if (items.length === 0) {
      return NextResponse.json({ success: false, error: 'No inventory data found' }, { status: 404 });
    }

    const flexContent = buildInventoryFlexMessage(items, date);
    const token = LINE_MESSAGING.channelAccessToken;
    if (!token) {
      return NextResponse.json({ error: 'LINE credentials not configured' }, { status: 500 });
    }

    const client = createLineClient(token);
    const targetId = testUserId || LINE_MESSAGING.groups.general;
    const { lowStock } = analyzeLowStock(items);
    const totalLow = Array.from(lowStock.values()).reduce((sum, arr) => sum + arr.length, 0);

    const altText = totalLow > 0
      ? `Inventory Report: ${totalLow} items need reorder (${date})`
      : `Inventory Report: All levels good (${date})`;

    await client.pushFlexMessage(targetId, altText, flexContent);

    return NextResponse.json({
      success: true,
      target: testUserId ? 'test_user' : 'general_group',
      dateUsed: date,
      itemsChecked: items.length,
      lowStockCount: totalLow,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[inventory-report] Error:', errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST handler for pg_cron compatibility (cron sends POST)
export async function POST(request: NextRequest) {
  return GET(request);
}
