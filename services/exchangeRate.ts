const BASE_URL = 'https://api.frankfurter.app/latest';
const CACHE_KEY = 'exchange_rates_cache';
const CACHE_DURATION_HOURS = 6;

interface RatesCache {
  rates: Record<string, number>;
  fetchedAt: string;
}

let memoryCache: RatesCache | null = null;

export async function getExchangeRatesToRON(): Promise<Record<string, number>> {
  // Verificăm cache-ul în memorie
  if (memoryCache) {
    const hoursElapsed = (Date.now() - new Date(memoryCache.fetchedAt).getTime()) / (1000 * 60 * 60);
    if (hoursElapsed < CACHE_DURATION_HOURS) {
      return memoryCache.rates;
    }
  }

  try {
    // Frankfurter nu suportă RON ca bază, deci luăm EUR->RON, USD->RON, GBP->RON
    const response = await fetch(`${BASE_URL}?from=EUR&to=RON,USD,GBP`);
    if (!response.ok) throw new Error('API error');
    const data = await response.json();

    // data.rates = { RON: 4.97, USD: 1.08, GBP: 0.85 } față de EUR
    // Noi vrem: câți RON face 1 unitate din fiecare valută
    const eurToRon = data.rates.RON;
    const eurToUsd = data.rates.USD;
    const eurToGbp = data.rates.GBP;

    const rates: Record<string, number> = {
      RON: 1,
      EUR: eurToRon,                    // 1 EUR = ~4.97 RON
      USD: eurToRon / eurToUsd,         // 1 USD = ~4.60 RON
      GBP: eurToRon / eurToGbp,         // 1 GBP = ~5.85 RON
    };

    memoryCache = { rates, fetchedAt: new Date().toISOString() };
    return rates;
  } catch {
    // Fallback la cursuri aproximative dacă API-ul nu e disponibil
    return { RON: 1, EUR: 5.0, USD: 4.6, GBP: 5.8 };
  }
}

export async function convertToRON(amount: number, fromCurrency: string): Promise<{ amountRON: number; rate: number }> {
  const rates = await getExchangeRatesToRON();
  const rate = rates[fromCurrency] ?? 1;
  return { amountRON: parseFloat((amount * rate).toFixed(2)), rate };
}