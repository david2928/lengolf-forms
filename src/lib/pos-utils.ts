// Helper function to format Thai date/time
export const formatThaiDateTime = (dateTimeString: string) => {
  if (!dateTimeString) return 'Invalid Date';
  
  try {
    // Parse the UTC timestamp
    const date = new Date(dateTimeString);
    
    // Convert to Bangkok timezone (UTC+7)
    const bangkokTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    
    // Format as DD/MM/YYYY HH:MM
    const day = bangkokTime.getUTCDate().toString().padStart(2, '0');
    const month = (bangkokTime.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = bangkokTime.getUTCFullYear();
    const hours = bangkokTime.getUTCHours().toString().padStart(2, '0');
    const minutes = bangkokTime.getUTCMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    return 'Invalid Date';
  }
};

// Format currency
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Get payment method icon (text-only for clean POS interface)
export const getPaymentIcon = (method: string) => {
  const lowerMethod = method.toLowerCase();
  if (lowerMethod.includes('cash')) return { icon: 'CASH', color: 'text-green-600' };
  if (lowerMethod.includes('card') || lowerMethod.includes('visa') || lowerMethod.includes('master')) 
    return { icon: 'CARD', color: 'text-blue-600' };
  if (lowerMethod.includes('prompt') || lowerMethod.includes('qr')) 
    return { icon: 'QR', color: 'text-purple-600' };
  return { icon: 'OTHER', color: 'text-gray-600' };
};