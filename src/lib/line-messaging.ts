import fetch from 'node-fetch';

/**
 * LINE Messaging API client for sending messages
 */
export class LineMessagingClient {
  private channelAccessToken: string;
  
  constructor(channelAccessToken: string) {
    if (!channelAccessToken) {
      throw new Error('LINE Channel Access Token is required');
    }
    this.channelAccessToken = channelAccessToken;
  }
  
  /**
   * Send a text message to a group
   * @param groupId The ID of the group to send the message to
   * @param text The text message to send
   */
  async pushTextMessage(groupId: string, text: string) {
    if (!groupId) {
      throw new Error('Group ID is required to send a message');
    }
    
    if (!text || text.trim() === '') {
      throw new Error('Message text cannot be empty');
    }
    
    const url = 'https://api.line.me/v2/bot/message/push';
    
    try {
      console.log(`Sending message to LINE group: ${groupId.substring(0, 8)}...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.channelAccessToken}`
        },
        body: JSON.stringify({
          to: groupId,
          messages: [
            {
              type: 'text',
              text: text
            }
          ]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error(`LINE Messaging API Error for group ${groupId}:`, errorData);
        throw new Error(`LINE message failed for group ${groupId}: ${errorData}`);
      }
      
      console.log(`Successfully sent message to LINE group: ${groupId.substring(0, 8)}...`);
      return response;
    } catch (error) {
      console.error(`LINE Messaging API Error for group ${groupId}:`, error);
      // Re-throw with context
      if (error instanceof Error) {
        throw new Error(`Failed to send message to group ${groupId}: ${error.message}`);
      } else {
        throw new Error(`Failed to send message to group ${groupId}: Unknown error`);
      }
    }
  }
  
  /**
   * Send a more complex flex message
   * @param groupId The ID of the group to send the message to
   * @param altText Alternative text for devices that don't support flex messages
   * @param contents The flex message contents
   */
  async pushFlexMessage(groupId: string, altText: string, contents: any) {
    if (!groupId) {
      throw new Error('Group ID is required to send a message');
    }
    
    if (!altText || altText.trim() === '') {
      throw new Error('Alternative text cannot be empty');
    }
    
    if (!contents) {
      throw new Error('Flex message contents cannot be empty');
    }
    
    const url = 'https://api.line.me/v2/bot/message/push';
    
    try {
      console.log(`Sending flex message to LINE group: ${groupId.substring(0, 8)}...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.channelAccessToken}`
        },
        body: JSON.stringify({
          to: groupId,
          messages: [
            {
              type: 'flex',
              altText: altText,
              contents: contents
            }
          ]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error(`LINE Messaging API Error for group ${groupId}:`, errorData);
        throw new Error(`LINE flex message failed for group ${groupId}: ${errorData}`);
      }
      
      console.log(`Successfully sent flex message to LINE group: ${groupId.substring(0, 8)}...`);
      return response;
    } catch (error) {
      console.error(`LINE Messaging API Error for group ${groupId}:`, error);
      // Re-throw with context
      if (error instanceof Error) {
        throw new Error(`Failed to send flex message to group ${groupId}: ${error.message}`);
      } else {
        throw new Error(`Failed to send flex message to group ${groupId}: Unknown error`);
      }
    }
  }
}

/**
 * Create a client instance with the provided channel access token
 * @param channelAccessToken The LINE channel access token
 */
export function createLineClient(channelAccessToken: string) {
  return new LineMessagingClient(channelAccessToken);
} 