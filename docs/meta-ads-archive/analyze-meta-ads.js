// Meta Ads Analysis Script
// Queries live data from the Meta Ads API endpoints

const API_BASE = 'http://localhost:3000/api/meta-ads';

async function fetchCampaigns() {
  console.log('📊 Fetching campaigns data...');
  const response = await fetch(`${API_BASE}/campaigns?days=30&sortBy=total_spend&sortOrder=desc&limit=100`);
  if (!response.ok) {
    throw new Error(`Failed to fetch campaigns: ${response.status}`);
  }
  return await response.json();
}

async function fetchCreatives() {
  console.log('🎨 Fetching creatives data...');
  const response = await fetch(`${API_BASE}/creatives?days=30&view=table&groupBy=campaign&limit=200`);
  if (!response.ok) {
    throw new Error(`Failed to fetch creatives: ${response.status}`);
  }
  return await response.json();
}

async function fetchOverviewMetrics() {
  console.log('📈 Fetching overview metrics...');
  const response = await fetch(`${API_BASE}/overview-metrics?days=30`);
  if (!response.ok) {
    throw new Error(`Failed to fetch overview: ${response.status}`);
  }
  return await response.json();
}

async function analyzeCampaigns(campaignsData) {
  console.log('\n=== CAMPAIGN ANALYSIS ===\n');

  const { campaigns, summary } = campaignsData;

  console.log('Total Campaigns:', summary.total_campaigns);
  console.log('Total Spend (30d): ฿' + summary.total_spend.toLocaleString());
  console.log('Total Impressions:', summary.total_impressions.toLocaleString());
  console.log('Total Clicks:', summary.total_clicks.toLocaleString());
  console.log('Average Performance Score:', summary.average_performance_score);
  console.log('');

  console.log('Performance Distribution:');
  console.log('  🟢 Excellent:', summary.excellent_campaigns);
  console.log('  🔵 Good:', summary.good_campaigns);
  console.log('  🔴 Needs Review:', summary.needs_review_campaigns);
  console.log('');

  console.log('Budget Recommendations:');
  console.log('  🚀 Scale Up:', summary.budget_recommendations.scale_up);
  console.log('  ✅ Maintain:', summary.budget_recommendations.maintain);
  console.log('  📉 Scale Down:', summary.budget_recommendations.scale_down);
  console.log('  🛑 Pause:', summary.budget_recommendations.pause);
  console.log('');

  console.log('Top 10 Campaigns by Spend:\n');
  campaigns.slice(0, 10).forEach((camp, idx) => {
    console.log(`${idx + 1}. ${camp.campaign_name}`);
    console.log(`   Objective: ${camp.objective}`);
    console.log(`   Spend: ฿${camp.total_spend.toLocaleString()}`);
    console.log(`   Performance Score: ${camp.performance_score}/100 (${camp.efficiency_rating})`);
    console.log(`   CTR: ${camp.average_ctr.toFixed(2)}% | CPC: ฿${camp.average_cpc.toFixed(2)} | CPM: ฿${camp.average_cpm.toFixed(2)}`);
    console.log(`   Recommendation: ${camp.budget_recommendation}`);
    if (camp.actual_leads > 0) {
      console.log(`   Leads: ${camp.actual_leads} | Cost/Lead: ฿${camp.cost_per_lead.toFixed(2)}`);
    }
    console.log('');
  });

  // Group by objective
  const byObjective = campaigns.reduce((acc, camp) => {
    const obj = camp.objective || 'UNKNOWN';
    if (!acc[obj]) {
      acc[obj] = { count: 0, spend: 0, campaigns: [] };
    }
    acc[obj].count++;
    acc[obj].spend += camp.total_spend;
    acc[obj].campaigns.push(camp);
    return acc;
  }, {});

  console.log('Campaigns by Objective:\n');
  Object.entries(byObjective).forEach(([objective, data]) => {
    console.log(`${objective}:`);
    console.log(`  Campaigns: ${data.count}`);
    console.log(`  Total Spend: ฿${data.spend.toLocaleString()}`);
    console.log(`  Avg Performance: ${(data.campaigns.reduce((sum, c) => sum + c.performance_score, 0) / data.count).toFixed(1)}/100`);
    console.log('');
  });

  return { campaigns, summary, byObjective };
}

async function analyzeCreatives(creativesData) {
  console.log('\n=== CREATIVE ANALYSIS ===\n');

  const { campaigns, total_campaigns, total_creatives, summary } = creativesData;

  console.log('Total Campaigns with Creatives:', total_campaigns);
  console.log('Total Active Ads:', summary.total_active_ads);
  console.log('Last 7d Spend: ฿' + summary.last_7d_spend.toLocaleString());
  console.log('Last 7d Results (Leads):', summary.last_7d_results);
  console.log('');

  // Flatten all creatives from all campaigns
  const allCreatives = [];
  campaigns.forEach(campaign => {
    campaign.adsets.forEach(adset => {
      adset.creatives.forEach(creative => {
        allCreatives.push({
          ...creative,
          campaign_name: campaign.campaign_name,
          adset_name: adset.adset_name
        });
      });
    });
  });

  console.log('Total Creatives:', allCreatives.length);
  console.log('');

  // Group by action status
  const byAction = allCreatives.reduce((acc, creative) => {
    const action = creative.action_status || 'unknown';
    if (!acc[action]) {
      acc[action] = [];
    }
    acc[action].push(creative);
    return acc;
  }, {});

  console.log('Creatives by Action Status:\n');
  Object.entries(byAction).forEach(([action, creatives]) => {
    const totalSpend = creatives.reduce((sum, c) => sum + c.last_7d_spend, 0);
    console.log(`${action.toUpperCase()}: ${creatives.length} creatives`);
    console.log(`  7d Spend: ฿${totalSpend.toLocaleString()}`);
    console.log('');
  });

  // Top performing creatives
  const sortedBySpend = [...allCreatives].sort((a, b) => b.last_7d_spend - a.last_7d_spend);

  console.log('Top 10 Creatives by 7d Spend:\n');
  sortedBySpend.slice(0, 10).forEach((creative, idx) => {
    console.log(`${idx + 1}. ${creative.creative_name}`);
    console.log(`   Campaign: ${creative.campaign_name}`);
    console.log(`   Adset: ${creative.adset_name}`);
    console.log(`   Type: ${creative.creative_type} | Status: ${creative.ad_status}`);
    console.log(`   7d Spend: ฿${creative.last_7d_spend.toLocaleString()}`);
    console.log(`   7d Leads: ${creative.last_7d_leads}`);
    console.log(`   CTR: ${creative.average_ctr.toFixed(2)}% | CPC: ฿${creative.average_cpc.toFixed(2)}`);
    console.log(`   Action: ${creative.action_status} - ${creative.action_reason}`);
    console.log('');
  });

  return { allCreatives, byAction, campaigns };
}

async function analyzeOverview(overviewData) {
  console.log('\n=== OVERVIEW METRICS (30d) ===\n');

  console.log('Spend & Bookings:');
  console.log(`  Total Spend: ฿${overviewData.totalSpend.toLocaleString()} (${overviewData.spendChange.toFixed(1)}%)`);
  console.log(`  Meta Bookings: ${overviewData.metaBookings} (${overviewData.bookingsChange.toFixed(1)}%)`);
  console.log(`  Cost per Booking: ฿${overviewData.costPerBooking.toFixed(2)} (${overviewData.costPerBookingChange.toFixed(1)}%)`);
  console.log('');

  console.log('Performance:');
  console.log(`  Impressions: ${overviewData.totalImpressions.toLocaleString()} (${overviewData.impressionsChange.toFixed(1)}%)`);
  console.log(`  Clicks: ${overviewData.totalClicks.toLocaleString()} (${overviewData.clicksChange.toFixed(1)}%)`);
  console.log(`  Average CTR: ${overviewData.averageCtr.toFixed(2)}% (${overviewData.ctrChange.toFixed(1)}%)`);
  console.log(`  Conversions: ${overviewData.conversions} (${overviewData.conversionsChange.toFixed(1)}%)`);
  console.log('');

  console.log('Platform Breakdown:');
  console.log('  Facebook:');
  console.log(`    Spend: ฿${overviewData.facebookSpend.toLocaleString()}`);
  console.log(`    Bookings: ${overviewData.facebookBookings}`);
  console.log(`    Impressions: ${overviewData.facebookImpressions.toLocaleString()}`);
  console.log(`    Clicks: ${overviewData.facebookClicks.toLocaleString()}`);
  console.log('  Instagram:');
  console.log(`    Spend: ฿${overviewData.instagramSpend.toLocaleString()}`);
  console.log(`    Bookings: ${overviewData.instagramBookings}`);
  console.log(`    Impressions: ${overviewData.instagramImpressions.toLocaleString()}`);
  console.log(`    Clicks: ${overviewData.instagramClicks.toLocaleString()}`);
  console.log('');

  const fbCostPerBooking = overviewData.facebookBookings > 0
    ? overviewData.facebookSpend / overviewData.facebookBookings
    : 0;
  const igCostPerBooking = overviewData.instagramBookings > 0
    ? overviewData.instagramSpend / overviewData.instagramBookings
    : 0;

  console.log('Platform Efficiency:');
  console.log(`  Facebook Cost/Booking: ฿${fbCostPerBooking.toFixed(2)}`);
  console.log(`  Instagram Cost/Booking: ฿${igCostPerBooking.toFixed(2)}`);
  console.log('');

  return overviewData;
}

async function main() {
  try {
    console.log('🚀 Starting Meta Ads Analysis...\n');
    console.log('='.repeat(60));

    // Fetch all data
    const [campaignsData, creativesData, overviewData] = await Promise.all([
      fetchCampaigns(),
      fetchCreatives(),
      fetchOverviewMetrics()
    ]);

    // Analyze each dataset
    const overview = await analyzeOverview(overviewData);
    const campaigns = await analyzeCampaigns(campaignsData);
    const creatives = await analyzeCreatives(creativesData);

    console.log('='.repeat(60));
    console.log('\n✅ Analysis Complete!\n');

    // Return structured data for further processing
    return {
      overview,
      campaigns,
      creatives,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(results => {
      console.log('Analysis results saved to variable: results');
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { main, fetchCampaigns, fetchCreatives, fetchOverviewMetrics };
