import useSWR from 'swr';
import { useState, useCallback, useEffect, useRef } from 'react';
import type { 
  GetTablesResponse, 
  Table, 
  OpenTableRequest, 
  OpenTableResponse,
  CloseTableRequest,
  CloseTableResponse,
  TransferTableRequest,
  TransferTableResponse,
  TableUpdateEvent
} from '@/types/pos';

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  if (!res.ok) throw new Error('Failed to fetch tables');
  const data = await res.json();
  return data as GetTablesResponse;
};

export function useTableManagement() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/pos/tables',
    fetcher,
    {
      refreshInterval: 5000, // Refresh every 5 seconds as fallback
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  );

  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Handle real-time table updates
  const handleTableUpdate = useCallback((event: TableUpdateEvent) => {
    console.log('Received table update:', event);
    
    switch (event.type) {
      case 'table_updated':
      case 'session_created':
      case 'session_closed':
      case 'order_added':
        // Refresh table data to get latest state
        mutate();
        break;
    }
  }, [mutate]);

  // Real-time WebSocket connection
  const initializeRealtime = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const ws = new WebSocket(`${process.env.NODE_ENV === 'development' ? 'ws://localhost:3000' : 'wss://' + window.location.host}/ws/pos/tables`);
      
      ws.onopen = () => {
        console.log('Table management WebSocket connected');
        setWsConnection(ws);
        wsRef.current = ws;
        
        // Subscribe to table updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          payload: { tableIds: data?.tables.map(t => t.id) }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: TableUpdateEvent = JSON.parse(event.data);
          handleTableUpdate(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Table management WebSocket disconnected');
        setWsConnection(null);
        wsRef.current = null;
        
        // Attempt reconnection after 3 seconds
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            initializeRealtime();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
    }
  }, [data?.tables, handleTableUpdate]);

  // Initialize WebSocket when component mounts or data changes
  // NOTE: WebSocket functionality temporarily disabled until server implementation is ready
  useEffect(() => {
    // TODO: Re-enable when WebSocket server is implemented
    // if (data?.tables && data.tables.length > 0) {
    //   initializeRealtime();
    // }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [initializeRealtime, data?.tables]);

  // API Operations
  const openTable = useCallback(async (tableId: string, request: OpenTableRequest): Promise<OpenTableResponse> => {
    const response = await fetch(`/api/pos/tables/${tableId}/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to open table');
    }

    const result: OpenTableResponse = await response.json();
    
    // Optimistically update the cache
    mutate();
    
    return result;
  }, [mutate]);

  const closeTable = useCallback(async (tableId: string, request?: CloseTableRequest): Promise<CloseTableResponse> => {
    const response = await fetch(`/api/pos/tables/${tableId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request || {})
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to close table');
    }

    const result: CloseTableResponse = await response.json();
    
    // Optimistically update the cache
    mutate();
    
    return result;
  }, [mutate]);

  const transferTable = useCallback(async (request: TransferTableRequest): Promise<TransferTableResponse> => {
    const response = await fetch('/api/pos/tables/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to transfer table');
    }

    const result: TransferTableResponse = await response.json();
    
    // Optimistically update the cache
    mutate();
    
    return result;
  }, [mutate]);

  const refreshTables = useCallback(async () => {
    // Force refresh by revalidating
    await mutate();
  }, [mutate]);

  return {
    // Data
    tables: data?.tables || [],
    zones: data?.zones || [],
    summary: data?.summary,
    selectedTable,
    
    // State
    isLoading,
    error,
    isConnected: true, // Always true since we're using polling instead of WebSocket
    
    // Actions
    setSelectedTable,
    openTable,
    closeTable,
    transferTable,
    refreshTables,
    
    // Real-time
    initializeRealtime
  };
}

// Hook for managing staff PIN session
export function useStaffPin() {
  const [currentPin, setCurrentPin] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);

  // Load from sessionStorage on mount
  useEffect(() => {
    const savedPin = sessionStorage.getItem('pos_staff_pin');
    const savedName = sessionStorage.getItem('pos_staff_name');
    if (savedPin) {
      setCurrentPin(savedPin);
      setStaffName(savedName);
    }
  }, []);

  const login = useCallback(async (pin: string) => {
    // Validate PIN with staff system
    const response = await fetch('/api/staff/validate-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });

    if (!response.ok) {
      throw new Error('Invalid PIN');
    }

    const { staff } = await response.json();
    
    setCurrentPin(pin);
    setStaffName(staff.name);
    
    // Persist in session storage
    sessionStorage.setItem('pos_staff_pin', pin);
    sessionStorage.setItem('pos_staff_name', staff.name);
    
    return staff;
  }, []);

  const logout = useCallback(() => {
    setCurrentPin(null);
    setStaffName(null);
    sessionStorage.removeItem('pos_staff_pin');
    sessionStorage.removeItem('pos_staff_name');
  }, []);

  return {
    currentPin,
    staffName,
    isLoggedIn: !!currentPin,
    login,
    logout
  };
}

// Hook for caching frequently used data
export function usePOSCache() {
  const [productCache, setProductCache] = useState<Map<string, any>>(new Map());
  const [customerCache, setCustomerCache] = useState<Map<string, any>>(new Map());

  // Load products into cache
  const { data: products } = useSWR('/api/products', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 minutes
  });

  // Load frequent customers into cache
  const { data: customers } = useSWR('/api/customers?frequent=true', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 minutes
  });

  useEffect(() => {
    if (products && Array.isArray(products)) {
      const productMap = new Map();
      products.forEach((product: any) => {
        productMap.set(product.id, { ...product, cachedAt: Date.now() });
      });
      setProductCache(productMap);
    }
  }, [products]);

  useEffect(() => {
    if (customers && Array.isArray(customers)) {
      const customerMap = new Map();
      customers.forEach((customer: any) => {
        customerMap.set(customer.id, { ...customer, cachedAt: Date.now() });
      });
      setCustomerCache(customerMap);
    }
  }, [customers]);

  const getCachedProduct = useCallback((id: string) => {
    return productCache.get(id) || null;
  }, [productCache]);

  const getCachedCustomer = useCallback((id: string) => {
    return customerCache.get(id) || null;
  }, [customerCache]);

  return {
    getCachedProduct,
    getCachedCustomer,
    productCacheSize: productCache.size,
    customerCacheSize: customerCache.size
  };
}