import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;
const META_API_VERSION = process.env.META_API_VERSION || 'v23.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
      return NextResponse.json({ 
        error: "Meta Ads API credentials not configured" 
      }, { status: 400 });
    }

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [] as any[]
    };

    // Test 1: Fetch ads with creative info
    try {
      const adsUrl = `${META_BASE_URL}/act_${META_AD_ACCOUNT_ID}/ads`;
      const adsParams = new URLSearchParams({
        access_token: META_ACCESS_TOKEN,
        fields: 'id,name,status,creative{id,title,body,image_url,thumbnail_url,call_to_action_type,object_story_spec},adset_id',
        limit: '5'
      });

      const adsResponse = await fetch(`${adsUrl}?${adsParams}`);
      const adsData = await adsResponse.json();

      testResults.tests.push({
        test: "Ads with Creative Info",
        success: !adsData.error,
        data: adsData.error ? adsData.error : {
          count: adsData.data?.length || 0,
          ads: adsData.data || []
        },
        details: adsData.error ? adsData.error.message : `Found ${adsData.data?.length || 0} ads`
      });
    } catch (error) {
      testResults.tests.push({
        test: "Ads with Creative Info",
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: "Failed to fetch ads with creative data"
      });
    }

    // Test 2: Fetch ad creatives directly
    try {
      const creativesUrl = `${META_BASE_URL}/act_${META_AD_ACCOUNT_ID}/adcreatives`;
      const creativesParams = new URLSearchParams({
        access_token: META_ACCESS_TOKEN,
        fields: 'id,name,title,body,image_url,thumbnail_url,call_to_action_type,object_story_spec,status',
        limit: '5'
      });

      const creativesResponse = await fetch(`${creativesUrl}?${creativesParams}`);
      const creativesData = await creativesResponse.json();

      testResults.tests.push({
        test: "Ad Creatives Direct",
        success: !creativesData.error,
        data: creativesData.error ? creativesData.error : {
          count: creativesData.data?.length || 0,
          creatives: creativesData.data || []
        },
        details: creativesData.error ? creativesData.error.message : `Found ${creativesData.data?.length || 0} creatives`
      });
    } catch (error) {
      testResults.tests.push({
        test: "Ad Creatives Direct",
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: "Failed to fetch ad creatives directly"
      });
    }

    // Test 3: Check ad images/videos
    try {
      const imagesUrl = `${META_BASE_URL}/act_${META_AD_ACCOUNT_ID}/adimages`;
      const imagesParams = new URLSearchParams({
        access_token: META_ACCESS_TOKEN,
        fields: 'hash,url,width,height',
        limit: '5'
      });

      const imagesResponse = await fetch(`${imagesUrl}?${imagesParams}`);
      const imagesData = await imagesResponse.json();

      testResults.tests.push({
        test: "Ad Images",
        success: !imagesData.error,
        data: imagesData.error ? imagesData.error : {
          count: imagesData.data?.length || 0,
          images: imagesData.data || []
        },
        details: imagesData.error ? imagesData.error.message : `Found ${imagesData.data?.length || 0} images`
      });
    } catch (error) {
      testResults.tests.push({
        test: "Ad Images",
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: "Failed to fetch ad images"
      });
    }

    const allTestsPassed = testResults.tests.every(test => test.success);

    return NextResponse.json({
      success: allTestsPassed,
      message: allTestsPassed ? "All Meta Ads creative tests passed" : "Some tests failed",
      results: testResults
    });

  } catch (error) {
    console.error('Meta Ads test ads error:', error);
    return NextResponse.json({
      success: false,
      error: "Failed to test Meta Ads creative data",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}