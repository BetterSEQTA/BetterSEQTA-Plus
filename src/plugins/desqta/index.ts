import type { Plugin } from '../core/types';
import browser from 'webextension-polyfill';

interface CookieResponse {
  cookie?: {
    value: string;
  };
  error?: string;
}

const plugin: Plugin = {
  id: 'desqta',
  name: 'Desqta Integration',
  description: 'Connect BetterSEQTA-Plus with the Desqta desktop app',
  version: '1.0.0',
  beta: true,
  disableToggle: true,
  settings: {
    connect: {
      type: 'button',
      title: 'Connect to Desqta',
      description: 'Send your current session to the Desqta desktop app',
      trigger: async () => {
        try {
          // Get the current SEQTA URL from the page
          const seqtaUrl = window.location.origin;
          console.log('Attempting to get cookie from:', seqtaUrl);
          
          // Send message to background script to get cookie
          const response = await browser.runtime.sendMessage({
            type: 'GET_COOKIE',
            url: seqtaUrl,
            name: 'JSESSIONID'
          }) as CookieResponse;

          console.log('Received response:', response);

          if (response.error) {
            throw new Error(response.error);
          }

          if (!response.cookie) {
            console.log('No cookie found in response');
            alert('No active session found. Please log in to SEQTA first.');
            return;
          }

          console.log('Found cookie:', response.cookie);

          // Create the deep link URL with both cookie and URL
          const encodedCookie = encodeURIComponent(response.cookie.value);
          const encodedUrl = encodeURIComponent(seqtaUrl);
          const deepLinkUrl = `desqta://auth?cookie=${encodedCookie}&url=${encodedUrl}`;
          console.log('Generated deep link URL:', deepLinkUrl);

          // Open the deep link
          console.log('Opening deep link...');
          window.open(deepLinkUrl, '_blank');
        } catch (error) {
          console.error('Error in Desqta integration:', error);
          if (error instanceof Error) {
            alert(`Error: ${error.message}`);
          } else {
            alert('An error occurred while trying to connect to Desqta. Please try again.');
          }
        }
      }
    }
  },
  run: async () => {
    // Plugin initialization code if needed
  }
};

export default plugin; 