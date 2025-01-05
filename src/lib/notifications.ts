export async function sendLineNotification(message: string, token: string) {
  const response = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ message }),
  });

  if (!response.ok) {
    throw new Error('Failed to send LINE notification');
  }

  return response;
}