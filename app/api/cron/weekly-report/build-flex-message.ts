import type { WeeklyData, WeekRange } from './fetch-weekly-data';

function formatThb(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatNum(n: number): string {
  return n.toLocaleString('en-US');
}

function formatPct(n: number): string {
  return n.toFixed(1) + '%';
}

/** Returns e.g. "+12.5%" or "-8.3%" with arrow emoji */
function wow(current: number, previous: number): { text: string; color: string } {
  if (previous === 0 && current === 0) return { text: '-', color: '#999999' };
  if (previous === 0) return { text: '\u2B06 new', color: '#27AE60' };
  const pct = ((current - previous) / previous) * 100;
  const arrow = pct >= 0 ? '\u25B2' : '\u25BC';
  const color = pct >= 0 ? '#27AE60' : '#E74C3C';
  return { text: `${arrow} ${Math.abs(pct).toFixed(1)}%`, color };
}

function dateLabel(week: WeekRange): string {
  // "Mar 10 - 16, 2026"
  const s = new Date(week.start + 'T00:00:00');
  const e = new Date(week.end + 'T00:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (s.getMonth() === e.getMonth()) {
    return `${months[s.getMonth()]} ${s.getDate()} - ${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${months[s.getMonth()]} ${s.getDate()} - ${months[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
}

function metricRow(label: string, value: string, change: { text: string; color: string }): Record<string, unknown> {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: label, size: 'sm', color: '#555555', flex: 4 },
      { type: 'text', text: value, size: 'sm', color: '#333333', weight: 'bold', flex: 3, align: 'end' },
      { type: 'text', text: change.text, size: 'xs', color: change.color, flex: 3, align: 'end' },
    ],
    margin: 'sm',
  };
}

function sectionHeader(text: string): Record<string, unknown> {
  return { type: 'text', text, size: 'sm', weight: 'bold', color: '#005a32', margin: 'lg' };
}

function separator(): Record<string, unknown> {
  return { type: 'separator', margin: 'md' };
}

function buildRevenueBubble(d: WeeklyData): Record<string, unknown> {
  const totalWow = wow(d.revenue.totalSales, d.prevRevenue.totalSales);
  const overallTrend = d.revenue.totalSales >= d.prevRevenue.totalSales;

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
            { type: 'text', text: '\uD83D\uDCC8 Weekly Report', weight: 'bold', color: '#FFFFFF', size: 'lg', flex: 4 },
            {
              type: 'box',
              layout: 'vertical',
              contents: [{ type: 'text', text: overallTrend ? '\u25B2 Up' : '\u25BC Down', size: 'xs', color: '#FFFFFF', align: 'center', weight: 'bold' }],
              backgroundColor: overallTrend ? '#27AE60' : '#E74C3C',
              cornerRadius: 'md',
              paddingAll: 'xs',
              flex: 2,
              justifyContent: 'center',
            },
          ],
          alignItems: 'center',
        },
        { type: 'text', text: dateLabel(d.week), color: '#FFFFFFCC', size: 'sm', margin: 'sm' },
      ],
      backgroundColor: '#005a32',
      paddingAll: 'lg',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // Revenue header
        sectionHeader('\uD83D\uDCB0 Revenue'),
        metricRow('Total Sales', `\u0E3F${formatThb(d.revenue.totalSales)}`, totalWow),
        metricRow('Transactions', formatNum(d.revenue.transactionCount), wow(d.revenue.transactionCount, d.prevRevenue.transactionCount)),
        separator(),
        // Payment breakdown
        sectionHeader('\uD83D\uDCB3 Payment Mix'),
        metricRow('Card', `\u0E3F${formatThb(d.revenue.cardTotal)}`, wow(d.revenue.cardTotal, d.prevRevenue.cardTotal)),
        metricRow('QR / Transfer', `\u0E3F${formatThb(d.revenue.qrTotal)}`, wow(d.revenue.qrTotal, d.prevRevenue.qrTotal)),
        metricRow('Cash', `\u0E3F${formatThb(d.revenue.cashTotal)}`, wow(d.revenue.cashTotal, d.prevRevenue.cashTotal)),
        separator(),
        // Revenue split by category
        sectionHeader('\uD83C\uDFAF Revenue Split'),
        metricRow('Bay Rentals', `\u0E3F${formatThb(d.revenue.categoryBreakdown.bayRentals)}`, wow(d.revenue.categoryBreakdown.bayRentals, d.prevRevenue.categoryBreakdown.bayRentals)),
        metricRow('Coaching', `\u0E3F${formatThb(d.revenue.categoryBreakdown.coaching)}`, wow(d.revenue.categoryBreakdown.coaching, d.prevRevenue.categoryBreakdown.coaching)),
        metricRow('Packages', `\u0E3F${formatThb(d.revenue.categoryBreakdown.packages)}`, wow(d.revenue.categoryBreakdown.packages, d.prevRevenue.categoryBreakdown.packages)),
        metricRow('Club Rentals', `\u0E3F${formatThb(d.revenue.categoryBreakdown.clubRentals)}`, wow(d.revenue.categoryBreakdown.clubRentals, d.prevRevenue.categoryBreakdown.clubRentals)),
        metricRow('F&B', `\u0E3F${formatThb(d.revenue.categoryBreakdown.fnb)}`, wow(d.revenue.categoryBreakdown.fnb, d.prevRevenue.categoryBreakdown.fnb)),
        metricRow('Other', `\u0E3F${formatThb(d.revenue.categoryBreakdown.other)}`, wow(d.revenue.categoryBreakdown.other, d.prevRevenue.categoryBreakdown.other)),
        // Data completeness note
        ...(d.revenue.daysWithClosing < 7 ? [{
          type: 'text' as const,
          text: `\u26A0\uFE0F ${d.revenue.daysWithClosing}/7 days closing data`,
          size: 'xs' as const,
          color: '#F39C12',
          margin: 'lg' as const,
        }] : []),
      ],
      paddingAll: 'lg',
    },
  };
}

function buildOperationsBubble(d: WeeklyData): Record<string, unknown> {
  // Bay utilization: 4 bays x 13 hours x 7 days = 364 available hours
  const availableHours = d.revenue.daysWithClosing > 0 ? d.revenue.daysWithClosing * 4 * 13 : 7 * 4 * 13;
  const utilization = availableHours > 0 ? (d.bookings.totalHours / availableHours) * 100 : 0;
  const prevAvailableHours = d.prevRevenue.daysWithClosing > 0 ? d.prevRevenue.daysWithClosing * 4 * 13 : 7 * 4 * 13;
  const prevUtilization = prevAvailableHours > 0 ? (d.prevBookings.totalHours / prevAvailableHours) * 100 : 0;

  // Top booking types (sorted by count, top 4)
  const sortedTypes = Object.entries(d.bookings.byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const typeRows = sortedTypes.map(([type, count]) => {
    const prevCount = d.prevBookings.byType[type] || 0;
    // Shorten type names
    const shortName = type
      .replace('Normal Bay Rate', 'Bay Rate')
      .replace('Coaching (Boss - Ratchavin)', 'Coach (B-R)')
      .replace('Coaching (Boss)', 'Coach (Boss)')
      .replace('Coaching (Min)', 'Coach (Min)')
      .replace('Others (e.g. Events)', 'Events')
      .replace('Play_Food_Package', 'Play+Food');
    return metricRow(shortName, String(count), wow(count, prevCount));
  });

  return {
    type: 'bubble',
    size: 'giga',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '\u26F3 Operations & Growth', weight: 'bold', color: '#FFFFFF', size: 'lg' },
        { type: 'text', text: dateLabel(d.week), color: '#FFFFFFCC', size: 'sm', margin: 'sm' },
      ],
      backgroundColor: '#005a32',
      paddingAll: 'lg',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        sectionHeader('\uD83D\uDDD3\uFE0F Bookings'),
        metricRow('Total Bookings', formatNum(d.bookings.total), wow(d.bookings.total, d.prevBookings.total)),
        metricRow('Bay Hours', formatNum(d.bookings.totalHours), wow(d.bookings.totalHours, d.prevBookings.totalHours)),
        metricRow('Utilization', formatPct(utilization), wow(utilization, prevUtilization)),
        separator(),
        sectionHeader('\uD83D\uDCCA By Type'),
        ...typeRows,
        separator(),
        sectionHeader('\uD83D\uDC65 Customers'),
        metricRow('Unique Visitors', formatNum(d.bookings.uniqueCustomers), wow(d.bookings.uniqueCustomers, d.prevBookings.uniqueCustomers)),
        metricRow('New Customers', formatNum(d.newCustomers), wow(d.newCustomers, d.prevNewCustomers)),
        metricRow('New Bookings', formatNum(d.bookings.newCustomerBookings), wow(d.bookings.newCustomerBookings, d.prevBookings.newCustomerBookings)),
        separator(),
        sectionHeader('\uD83C\uDFCC\uFE0F Coaching'),
        metricRow('Sessions', formatNum(d.bookings.coachingSessions), wow(d.bookings.coachingSessions, d.prevBookings.coachingSessions)),
        metricRow('Students', formatNum(d.bookings.coachingStudents), wow(d.bookings.coachingStudents, d.prevBookings.coachingStudents)),
        metricRow('Packages Sold', formatNum(d.packagesSold), wow(d.packagesSold, d.prevPackagesSold)),
      ],
      paddingAll: 'lg',
    },
  };
}

function buildMarketingBubble(d: WeeklyData): Record<string, unknown> {
  const totalAdSpend = d.googleAds.spend + d.metaAds.spend;
  const prevTotalAdSpend = d.prevGoogleAds.spend + d.prevMetaAds.spend;
  const totalClicks = d.googleAds.clicks + d.metaAds.clicks;
  const prevTotalClicks = d.prevGoogleAds.clicks + d.prevMetaAds.clicks;

  return {
    type: 'bubble',
    size: 'giga',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '\uD83D\uDCE3 Marketing', weight: 'bold', color: '#FFFFFF', size: 'lg' },
        { type: 'text', text: dateLabel(d.week), color: '#FFFFFFCC', size: 'sm', margin: 'sm' },
      ],
      backgroundColor: '#005a32',
      paddingAll: 'lg',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        sectionHeader('\uD83D\uDCB5 Ad Spend'),
        metricRow('Total Spend', `\u0E3F${formatThb(totalAdSpend)}`, wow(totalAdSpend, prevTotalAdSpend)),
        metricRow('Total Clicks', formatNum(totalClicks), wow(totalClicks, prevTotalClicks)),
        separator(),
        sectionHeader('Google Ads'),
        metricRow('Spend', `\u0E3F${formatThb(d.googleAds.spend)}`, wow(d.googleAds.spend, d.prevGoogleAds.spend)),
        metricRow('Clicks', formatNum(d.googleAds.clicks), wow(d.googleAds.clicks, d.prevGoogleAds.clicks)),
        metricRow('Impressions', formatNum(d.googleAds.impressions), wow(d.googleAds.impressions, d.prevGoogleAds.impressions)),
        metricRow('CTR', formatPct(d.googleAds.ctr), wow(d.googleAds.ctr, d.prevGoogleAds.ctr)),
        metricRow('CPC', `\u0E3F${d.googleAds.cpc.toFixed(2)}`, wow(d.googleAds.cpc, d.prevGoogleAds.cpc)),
        metricRow('Conversions', formatNum(d.googleAds.conversions), wow(d.googleAds.conversions, d.prevGoogleAds.conversions)),
        separator(),
        sectionHeader('Meta Ads'),
        metricRow('Spend', `\u0E3F${formatThb(d.metaAds.spend)}`, wow(d.metaAds.spend, d.prevMetaAds.spend)),
        metricRow('Clicks', formatNum(d.metaAds.clicks), wow(d.metaAds.clicks, d.prevMetaAds.clicks)),
        metricRow('Reach', formatNum(d.metaAds.reach), wow(d.metaAds.reach, d.prevMetaAds.reach)),
        metricRow('Impressions', formatNum(d.metaAds.impressions), wow(d.metaAds.impressions, d.prevMetaAds.impressions)),
        separator(),
        sectionHeader('\uD83C\uDF10 Website (GA)'),
        metricRow('Sessions', formatNum(d.website.sessions), wow(d.website.sessions, d.prevWebsite.sessions)),
        metricRow('Users', formatNum(d.website.users), wow(d.website.users, d.prevWebsite.users)),
        metricRow('New Users', formatNum(d.website.newUsers), wow(d.website.newUsers, d.prevWebsite.newUsers)),
        metricRow('Booking Conv.', formatNum(d.website.bookingConversions), wow(d.website.bookingConversions, d.prevWebsite.bookingConversions)),
      ],
      paddingAll: 'lg',
    },
  };
}

function reviewChangeText(current: number, prev: number): { text: string; color: string } {
  const diff = current - prev;
  if (diff === 0) return { text: '-', color: '#999999' };
  return { text: `+${diff}`, color: '#27AE60' };
}

function buildCompetitorBubble(d: WeeklyData): Record<string, unknown> {
  // Sort: LENGOLF first, then by review count
  const sorted = [...d.competitors].sort((a, b) => {
    if (a.name === 'LENGOLF') return -1;
    if (b.name === 'LENGOLF') return 1;
    return b.googleReviewCount - a.googleReviewCount;
  });

  // Google Reviews rows
  const reviewRows = sorted.map(c => {
    const isLengolf = c.name === 'LENGOLF';
    const rating = c.googleRating != null ? c.googleRating.toFixed(1) : '-';
    const change = reviewChangeText(c.googleReviewCount, c.prevGoogleReviewCount);
    return {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: `${isLengolf ? '\uD83C\uDFC6 ' : ''}${c.name}`,
          size: 'xs',
          color: isLengolf ? '#005a32' : '#555555',
          weight: isLengolf ? 'bold' : 'regular',
          flex: 5,
        },
        { type: 'text', text: rating, size: 'xs', color: '#333333', flex: 2, align: 'center' },
        { type: 'text', text: formatNum(c.googleReviewCount), size: 'xs', color: '#333333', flex: 2, align: 'center' },
        { type: 'text', text: change.text, size: 'xs', color: change.color, flex: 2, align: 'end' },
      ],
      margin: 'sm',
    };
  });

  // LINE Friends rows (only those with data)
  const withLine = sorted.filter(c => c.lineFriends > 0);
  const lineRows = withLine.map(c => {
    const isLengolf = c.name === 'LENGOLF';
    const diff = c.lineFriends - c.prevLineFriends;
    const change = wow(c.lineFriends, c.prevLineFriends);
    const diffText = diff > 0 ? `+${diff}` : diff === 0 ? '-' : String(diff);
    return {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: `${isLengolf ? '\uD83C\uDFC6 ' : ''}${c.name}`,
          size: 'xs',
          color: isLengolf ? '#005a32' : '#555555',
          weight: isLengolf ? 'bold' : 'regular',
          flex: 5,
        },
        { type: 'text', text: formatNum(c.lineFriends), size: 'xs', color: '#333333', flex: 2, align: 'center' },
        { type: 'text', text: diffText, size: 'xs', color: diff > 0 ? '#27AE60' : '#999999', flex: 2, align: 'center' },
        { type: 'text', text: change.text, size: 'xs', color: change.color, flex: 2, align: 'end' },
      ],
      margin: 'sm',
    };
  });

  return {
    type: 'bubble',
    size: 'giga',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '\uD83C\uDFC1 Competitors', weight: 'bold', color: '#FFFFFF', size: 'lg' },
        { type: 'text', text: dateLabel(d.week), color: '#FFFFFFCC', size: 'sm', margin: 'sm' },
      ],
      backgroundColor: '#005a32',
      paddingAll: 'lg',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // Google Reviews section
        sectionHeader('\u2B50 Google Reviews'),
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: 'Venue', size: 'xxs', color: '#AAAAAA', flex: 5, weight: 'bold' },
            { type: 'text', text: 'Rating', size: 'xxs', color: '#AAAAAA', flex: 2, align: 'center', weight: 'bold' },
            { type: 'text', text: 'Total', size: 'xxs', color: '#AAAAAA', flex: 2, align: 'center', weight: 'bold' },
            { type: 'text', text: 'WoW', size: 'xxs', color: '#AAAAAA', flex: 2, align: 'end', weight: 'bold' },
          ],
          margin: 'sm',
        },
        { type: 'separator', margin: 'xs' },
        ...reviewRows,
        // LINE Friends section
        ...(lineRows.length > 0 ? [
          separator(),
          sectionHeader('\uD83D\uDCAC LINE Friends'),
          {
            type: 'box' as const,
            layout: 'horizontal' as const,
            contents: [
              { type: 'text' as const, text: 'Venue', size: 'xxs' as const, color: '#AAAAAA', flex: 5, weight: 'bold' as const },
              { type: 'text' as const, text: 'Total', size: 'xxs' as const, color: '#AAAAAA', flex: 2, align: 'center' as const, weight: 'bold' as const },
              { type: 'text' as const, text: '+/-', size: 'xxs' as const, color: '#AAAAAA', flex: 2, align: 'center' as const, weight: 'bold' as const },
              { type: 'text' as const, text: 'WoW', size: 'xxs' as const, color: '#AAAAAA', flex: 2, align: 'end' as const, weight: 'bold' as const },
            ],
            margin: 'sm' as const,
          },
          { type: 'separator' as const, margin: 'xs' as const },
          ...lineRows,
        ] : []),
      ],
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
            label: 'View Sales Dashboard',
            uri: 'https://lengolf-forms.vercel.app/admin/sales-dashboard',
          },
          style: 'link',
          height: 'sm',
        },
      ],
      paddingAll: 'md',
    },
  };
}

export function buildWeeklyReportCarousel(data: WeeklyData): Record<string, unknown> {
  return {
    type: 'carousel',
    contents: [
      buildRevenueBubble(data),
      buildOperationsBubble(data),
      buildMarketingBubble(data),
      buildCompetitorBubble(data),
    ],
  };
}
