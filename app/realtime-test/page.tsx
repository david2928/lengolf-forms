'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RealtimeClient } from '@supabase/realtime-js';

// Dedicated realtime test page to debug the Supabase realtime issue

export default function RealtimeTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [client, setClient] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('not started');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[REALTIME TEST] ${message}`);
  };

  const testRealtimeConnection = async () => {
    try {
      addLog('🔍 Starting realtime connection test...');

      // Get environment variables
      const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY;

      addLog(`📋 Supabase URL: ${supabaseUrl ? 'Found' : 'Missing'}`);
      addLog(`🔑 Anon Key: ${supabaseAnonKey ? 'Found' : 'Missing'}`);

      if (!supabaseUrl || !supabaseAnonKey) {
        addLog('❌ Missing environment variables');
        setConnectionStatus('error - missing env vars');
        return;
      }

      // Try 1: Direct RealtimeClient with named import (should fix the constructor error)
      try {
        addLog('🚀 Testing direct RealtimeClient with named import...');

        const realtimeUrl = supabaseUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/realtime/v1';

        const realtimeClient = new RealtimeClient(realtimeUrl, {
          params: {
            apikey: supabaseAnonKey
          }
        });

        addLog(`✅ RealtimeClient created successfully with named import`);
        addLog(`🔗 Realtime URL: ${realtimeUrl}`);

        // Connect to realtime
        realtimeClient.connect();

        // Test basic realtime channel
        const channel = realtimeClient.channel('test-channel-direct');

        channel.on('broadcast', { event: 'test' }, (payload: any) => {
          addLog(`📨 Received broadcast (direct): ${JSON.stringify(payload)}`);
        });

        channel.subscribe((status: string) => {
          addLog(`🔌 Direct RealtimeClient status: ${status}`);
          setConnectionStatus(status);

          if (status === 'SUBSCRIBED') {
            addLog('✅ Successfully subscribed to direct realtime channel');

            // Test sending a broadcast message
            setTimeout(() => {
              addLog('📤 Sending test broadcast (direct)...');
              channel.send({
                type: 'broadcast',
                event: 'test',
                payload: { message: 'Hello from direct RealtimeClient!' }
              });
            }, 1000);
          }
        });

        // Test postgres changes subscription
        addLog('🗄️ Testing postgres changes with direct client...');

        const dbChannel = realtimeClient.channel('db-test-direct');

        dbChannel.on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'line_messages'
        }, (payload: any) => {
          addLog(`📨 Database change (direct): ${JSON.stringify(payload.new)}`);
        });

        dbChannel.subscribe((status: string) => {
          addLog(`🗄️ Database channel (direct): ${status}`);
        });

        setClient(realtimeClient);
        return; // Exit early if direct approach works

      } catch (directError) {
        addLog(`❌ Direct RealtimeClient failed: ${directError instanceof Error ? directError.message : 'Unknown error'}`);
        addLog(`🔄 Trying fallback with Supabase client...`);
      }

      // Try 2: Standard Supabase client for realtime (fallback)
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        addLog('✅ Created Supabase client as fallback...');

        // Test basic realtime channel
        const channel = supabase.channel('test-channel-supabase');

        channel.on('broadcast', { event: 'test' }, (payload) => {
          addLog(`📨 Received broadcast (Supabase): ${JSON.stringify(payload)}`);
        });

        channel.subscribe((status) => {
          addLog(`🔌 Supabase client status: ${status}`);
          setConnectionStatus(status);

          if (status === 'SUBSCRIBED') {
            addLog('✅ Successfully subscribed via Supabase client');

            // Test sending a broadcast message
            setTimeout(() => {
              addLog('📤 Sending test broadcast (Supabase)...');
              channel.send({
                type: 'broadcast',
                event: 'test',
                payload: { message: 'Hello from Supabase client!' }
              });
            }, 1000);
          }
        });

        // Test postgres changes subscription
        addLog('🗄️ Testing postgres changes via Supabase client...');

        const dbChannel = supabase.channel('db-test-supabase');

        dbChannel.on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'line_messages'
        }, (payload) => {
          addLog(`📨 Database change (Supabase): ${JSON.stringify(payload.new)}`);
        });

        dbChannel.subscribe((status) => {
          addLog(`🗄️ Database channel (Supabase): ${status}`);
        });

        setClient(supabase);

      } catch (clientError) {
        addLog(`❌ Both approaches failed: ${clientError instanceof Error ? clientError.message : 'Unknown error'}`);
        setConnectionStatus('error - all approaches failed');
        return;
      }

    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      addLog(`❌ Stack: ${error instanceof Error ? error.stack : 'No stack'}`);
      setConnectionStatus('error');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Supabase Realtime Debug Test</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Connection Status</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              connectionStatus === 'SUBSCRIBED' ? 'bg-green-100 text-green-800' :
              connectionStatus.includes('error') ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {connectionStatus}
            </span>
          </div>

          <div className="space-x-4">
            <button
              onClick={testRealtimeConnection}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Start Realtime Test
            </button>

            <button
              onClick={clearLogs}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Clear Logs
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Click "Start Realtime Test" to begin.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Manual Tests</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Test 1: Environment Variables</h3>
              <div className="text-sm text-gray-600">
                URL: {process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL ? '✅ Found' : '❌ Missing'}<br/>
                Key: {process.env.NEXT_PUBLIC_REFAC_SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing'}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Test 2: Client Creation</h3>
              <div className="text-sm text-gray-600">
                Client: {client ? '✅ Created' : '❌ Not created'}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Test 3: Manual Database Query</h3>
              <button
                onClick={async () => {
                  if (!client) {
                    addLog('❌ No client available for database test');
                    return;
                  }

                  try {
                    addLog('🗄️ Testing database query...');
                    const { data, error } = await client
                      .from('line_messages')
                      .select('id, message_text, created_at')
                      .limit(1);

                    if (error) {
                      addLog(`❌ Database query error: ${error.message}`);
                    } else {
                      addLog(`✅ Database query successful: ${data?.length || 0} rows`);
                      if (data && data.length > 0) {
                        addLog(`📄 Sample data: ${JSON.stringify(data[0])}`);
                      }
                    }
                  } catch (err) {
                    addLog(`❌ Database query exception: ${err instanceof Error ? err.message : 'Unknown'}`);
                  }
                }}
                disabled={!client}
                className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm"
              >
                Test Database Query
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}