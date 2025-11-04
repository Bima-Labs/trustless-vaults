const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price';

export const getBtcPriceInUsd = async (): Promise<number> => {
  try {
    const response = await fetch(`${COINGECKO_API_URL}?ids=bitcoin&vs_currencies=usd`);
    if (!response.ok) {
      console.error(`Failed to fetch BTC price: ${response.statusText}`);
      return 0; // Fallback to 0 if API call fails
    }
    const data = await response.json();
    return data.bitcoin.usd || 0; // Return price or 0 as fallback
  } catch (error) {
    console.error('Error fetching BTC price:', error);
    return 0; // Fallback to 0 on network or parsing error
  }
};