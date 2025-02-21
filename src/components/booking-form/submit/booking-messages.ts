import type { BookingFormData } from '@/types/booking-form';

const thaiWeekdays: { [key: string]: string } = {
  'Monday': 'จันทร์',
  'Tuesday': 'อังคาร',
  'Wednesday': 'พุธ',
  'Thursday': 'พฤหัสบดี',
  'Friday': 'ศุกร์',
  'Saturday': 'เสาร์',
  'Sunday': 'อาทิตย์'
};

const thaiMonths: { [key: string]: string } = {
  'January': 'มกราคม',
  'February': 'กุมภาพันธ์',
  'March': 'มีนาคม',
  'April': 'เมษายน',
  'May': 'พฤษภาคม',
  'June': 'มิถุนายน',
  'July': 'กรกฎาคม',
  'August': 'สิงหาคม',
  'September': 'กันยายน',
  'October': 'ตุลาคม',
  'November': 'พฤศจิกายน',
  'December': 'ธันวาคม'
};

interface BookingDetails {
  date: string;
  time: string;
  customer: string;
  contact?: string;
  type: string;
  bay: string;
  players: string;
  notes?: string;
}

function formatTime(time: string | Date | null): string {
  if (!time) return '';
  
  // If it's a string in HH:mm format, return it
  if (typeof time === 'string') {
    if (time.match(/^\d{2}:\d{2}$/)) {
      return time;
    }
    
    // For manual time input in HH:mm format
    if (time.includes(':')) {
      const [hours, minutes] = time.split(':');
      if (hours && minutes) {
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      }
    }
  }
  
  // For date objects or date strings
  try {
    const date = time instanceof Date ? time : new Date(time);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
  } catch (error) {
    console.error('Error formatting time:', error);
  }
  
  return '';
}

function getBookingDetails(formData: BookingFormData): BookingDetails | null {
  if (!formData.bookingDate) return null;

  const date = formData.bookingDate;
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const day = date.getDate();
  
  const startTime = formatTime(formData.startTime);
  const endTime = formatTime(formData.endTime);

  return {
    date: `${weekday}, ${month} ${day}`,
    time: `${startTime} - ${endTime}`,
    customer: formData.customerName || '',
    contact: formData.customerPhone,
    type: formData.bookingType || '',
    bay: formData.bayNumber || '',
    players: `${formData.numberOfPax}`,
    notes: formData.notes
  };
}

function formatThaiDate(date: Date): string {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const thaiWeekday = thaiWeekdays[weekday];
  const thaiMonth = thaiMonths[month];
  return `วัน${thaiWeekday}ที่ ${date.getDate()} ${thaiMonth}`;
}

export function generateMessages(formData: BookingFormData) {
  const details = getBookingDetails(formData);
  if (!details) return null;

  const thaiDate = formData.bookingDate ? formatThaiDate(formData.bookingDate) : '';
  const thaiPlayers = `${details.players} ท่าน`;

  // English Messages
  const enShort = [
    `Your bay booking has been confirmed.`,
    ``,
    `Date: ${details.date}`,
    `Time: ${details.time}`,
    ``,
    `See you soon! ⛳`
  ].filter(Boolean).join('\n');

  const enLong = [
    `Your bay booking has been confirmed.`,
    ``,
    `Date: ${details.date}`,
    `Time: ${details.time}`,
    `Customer: ${details.customer}`,
    details.contact ? `Contact: ${details.contact}` : '',
    `Players: ${details.players}`,
    ``,
    `Note: If you need to make any changes, please let us know at least 2 hours before your scheduled time.`,
    ``,
    `See you soon! ⛳`
  ].filter(Boolean).join('\n');

  // Thai Messages
  const thShort = [
    `ยืนยันการจองเบย์เรียบร้อยค่ะ`,
    ``,
    `วันที่: ${thaiDate}`,
    `เวลา: ${details.time}`,
    ``,
    `แล้วพบกันค่ะ ⛳`
  ].filter(Boolean).join('\n');

  const thLong = [
    `ยืนยันการจองเบย์เรียบร้อยค่ะ`,
    ``,
    `วันที่: ${thaiDate}`,
    `เวลา: ${details.time}`,
    `ลูกค้า: ${details.customer}`,
    details.contact ? `ติดต่อ: ${details.contact}` : '',
    `ผู้เล่น: ${thaiPlayers}`,
    ``,
    `หมายเหตุ: หากต้องการเปลี่ยนแปลงการจอง กรุณาแจ้งให้ทราบอย่างน้อย 2 ชม. ก่อนถึงเวลานัดหมายค่ะ`,
    ``,
    `แล้วพบกันค่ะ ⛳`
  ].filter(Boolean).join('\n');

  return {
    enShort,
    enLong,
    thShort,
    thLong
  };
} 