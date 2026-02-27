import type { ProcessedMarket, OutcomeWithPrice, MarketDetails, PriceHistoryPoint, OrderBook } from '~/types/polymarket';

export const usePolymarket = (options: { limit: Ref<number>; filter: Ref<string> }) => {
  const markets = ref<ProcessedMarket[]>([]);
  const pending = ref(true);
  const error = ref<any>(null);
  const lastUpdated = ref<Date | null>(null);
  
  // Use the refs directly
  const filterRef = options.filter;
  const limitRef = options.limit;
  
  // Store all fetched markets
  const allMarkets = ref<ProcessedMarket[]>([]);
  
  // Parse outcomes helper
  const parseOutcomes = (outcomesStr: string, pricesStr: string): OutcomeWithPrice[] => {
    try {
      if (!outcomesStr || !pricesStr) return [];
      const outcomes = JSON.parse(outcomesStr) as string[];
      const prices = JSON.parse(pricesStr) as string[];
      
      return outcomes.map((outcome, index) => {
        const priceStr = prices[index] ?? '0';
        const parsedPrice = parseFloat(priceStr);
        return {
          outcome,
          price: isNaN(parsedPrice) ? '0%' : (parsedPrice * 100).toFixed(0) + '%',
          rawPrice: isNaN(parsedPrice) ? 0 : parsedPrice,
        };
      });
    } catch (e) {
      return [];
    }
  };

  // Process market
  const processMarket = (market: any): ProcessedMarket => {
    const outcomes = parseOutcomes(market.outcomes, market.outcomePrices);
    
    // Parse CLOB token IDs (needed for price history & order book APIs)
    let tokenIds: string[] = [];
    try {
      if (market.clobTokenIds) {
        tokenIds = JSON.parse(market.clobTokenIds);
      }
    } catch (e) { /* ignore parse errors */ }
    
    return {
      ...market,
      outcomes,
      yesPrice: outcomes.find(o => o.outcome === 'Yes')?.rawPrice,
      noPrice: outcomes.find(o => o.outcome === 'No')?.rawPrice,
      tokenIds,
    };
  };

  // Fetch all markets for dashboard
  const fetchAllMarkets = async () => {
    try {
      // Fetch from markets endpoint
      const marketsResponse = await $fetch<any[]>('/api/polymarket/markets', {
        params: {
          active: true,
          closed: false,
          limit: 100,
          order: 'volume',
          ascending: false
        }
      });
      
      // Fetch from events to get more markets and tags
      const eventsResponse = await $fetch<any[]>('/api/polymarket/events', {
        params: {
          active: true,
          closed: false,
          limit: 50
        }
      }).catch(() => []);
      
      // Create a map of event data
      const eventMap = new Map();
      eventsResponse.forEach(event => {
        event.markets?.forEach((market: any) => {
          eventMap.set(market.id, {
            startDate: event.startDate,
            endDate: event.endDate,
            tags: event.tags || [],
            title: event.title,
            description: event.description
          });
        });
      });
      
      // Combine all markets
      const allMarketMap = new Map();
      
      // Add markets from markets endpoint
      marketsResponse.forEach(market => {
        allMarketMap.set(market.id, {
          ...market,
          ...(eventMap.get(market.id) || {})
        });
      });
      
      // Add markets from events that might not be in markets endpoint
      eventsResponse.forEach(event => {
        event.markets?.forEach((market: any) => {
          if (!allMarketMap.has(market.id)) {
            allMarketMap.set(market.id, {
              ...market,
              startDate: event.startDate,
              endDate: event.endDate,
              tags: event.tags || [],
              eventTitle: event.title,
              description: event.description
            });
          }
        });
      });
      
      const uniqueMarkets = Array.from(allMarketMap.values());
      allMarkets.value = uniqueMarkets.map(processMarket);
      
    } catch (err) {
      console.error('Error fetching markets:', err);
      throw err;
    }
  };

  // Apply filters client-side
  const applyFilter = () => {
    const currentFilter = unref(filterRef);
    const currentLimit = unref(limitRef);
    
    let filtered = [...allMarkets.value];
    
    switch(currentFilter) {
      case 'trending':
        // Already sorted by volume from API
        break;
        
      case 'recent':
        // Sort by start date (newest first)
        filtered.sort((a, b) => {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateB - dateA;
        });
        break;
        
      case 'closing-soon':
        // Sort by end date (soonest first)
        filtered.sort((a, b) => {
          const dateA = a.endDate ? new Date(a.endDate).getTime() : Infinity;
          const dateB = b.endDate ? new Date(b.endDate).getTime() : Infinity;
          return dateA - dateB;
        });
        break;
        
      case 'crypto':
        filtered = filtered.filter(m => {
          const tags = (m as any).tags || [];
          return tags.some((tag: any) => {
            const label = (tag.label || '').toLowerCase();
            const slug = (tag.slug || '').toLowerCase();
            return label.includes('crypto') || 
                   label.includes('bitcoin') || 
                   label.includes('ethereum') ||
                   slug.includes('crypto') ||
                   tag.id === 21;
          });
        });
        break;
        
      case 'politics':
        filtered = filtered.filter(m => {
          const tags = (m as any).tags || [];
          return tags.some((tag: any) => {
            const label = (tag.label || '').toLowerCase();
            const slug = (tag.slug || '').toLowerCase();
            return label.includes('politics') || 
                   label.includes('election') || 
                   label.includes('president') ||
                   label.includes('trump') ||
                   label.includes('biden') ||
                   slug.includes('politics') ||
                   tag.id === 2;
          });
        });
        break;
        
      case 'sports':
        filtered = filtered.filter(m => {
          const tags = (m as any).tags || [];
          return tags.some((tag: any) => {
            const label = (tag.label || '').toLowerCase();
            const slug = (tag.slug || '').toLowerCase();
            return label.includes('sports') || 
                   label.includes('nba') || 
                   label.includes('nfl') ||
                   label.includes('football') ||
                   label.includes('basketball') ||
                   label.includes('baseball') ||
                   label.includes('soccer') ||
                   slug.includes('sports') ||
                   tag.id === 100215;
          });
        });
        break;
        
      default:
        // Default to trending
        break;
    }
    
    // Limit results
    markets.value = filtered.slice(0, currentLimit);
  };

  // Fetch single market by ID for detail page
  const fetchMarketById = async (id: string): Promise<MarketDetails | null> => {
    try {
      // Try direct market endpoint first
      let market;
      try {
        market = await $fetch<any>(`/api/polymarket/markets/${id}`, {
          params: { id }
        });
      } catch {
        // Fallback: search by ID
        const markets = await $fetch<any[]>('/api/polymarket/markets', {
          params: { 
            id,
            limit: 1 
          }
        });
        market = markets?.[0];
      }
      
      if (!market) return null;
      
      // Fetch event details for additional info
      let event = null;
      if (market.events?.[0]?.id) {
        const events = await $fetch<any[]>('/api/polymarket/events', {
          params: { 
            id: market.events[0].id,
            limit: 1 
          }
        }).catch(() => []);
        event = events[0];
      }
      
      // Also try to fetch by conditionId if available
      if (!event && market.conditionId) {
        const events = await $fetch<any[]>('/api/polymarket/events', {
          params: { 
            condition_id: market.conditionId,
            limit: 1 
          }
        }).catch(() => []);
        event = events[0];
      }
      
      const processed = processMarket({
        ...market,
        startDate: market.startDate || event?.startDate,
        endDate: market.endDate || event?.endDate,
        tags: event?.tags || market.tags || []
      });
      
      return {
        ...processed,
        description: market.description || event?.description,
        resolutionSource: market.resolutionSource,
        resolutionCriteria: market.resolutionCriteria,
        volume24hr: market.volume24hr || '0',
        liquidity: market.liquidity || '0',
        startDate: market.startDate || event?.startDate,
        endDate: market.endDate || event?.endDate,
        tags: event?.tags || market.tags || []
      };
    } catch (err) {
      console.error('Error fetching market by ID:', err);
      return null;
    }
  };

  // Fetch a single chunk of price history from CLOB API
  const fetchPriceHistoryChunk = async (
    clobBase: string, tokenId: string, startTs: number, endTs: number, fidelity: number
  ): Promise<any[]> => {
    try {
      const response = await $fetch<any>(`${clobBase}/prices-history`, {
        params: { market: tokenId, startTs, endTs, fidelity }
      });
      return Array.isArray(response) ? response : (response?.history || []);
    } catch {
      return [];
    }
  };

  // Fetch price history for a market (requires CLOB token ID, not market ID)
  // Uses chunked requests because the CLOB API limits per-request time ranges:
  //   fidelity 60  → max ~2 days
  //   fidelity 1440 → max ~15 days
  const fetchPriceHistory = async (tokenId: string, period: string = '7d'): Promise<PriceHistoryPoint[]> => {
    try {
      if (!tokenId) return [];
      
      const config = useRuntimeConfig();
      
      // Period configs with chunk-safe max days per request
      const periodMap: Record<string, { fidelity: number; days: number; chunkDays: number }> = {
        '24h': { fidelity: 60, days: 1, chunkDays: 1 },
        '7d':  { fidelity: 1440, days: 7, chunkDays: 14 },
        '30d': { fidelity: 1440, days: 30, chunkDays: 14 },
        'all': { fidelity: 1440, days: 60, chunkDays: 14 }
      };
      
      const { fidelity, days, chunkDays } = (periodMap[period] || periodMap['7d'])!;
      const nowTs = Math.floor(Date.now() / 1000);
      const totalStartTs = nowTs - (days * 86400);
      
      let history: any[] = [];
      
      // Split into chunks if needed
      if (days <= chunkDays) {
        // Single request — fits within API limit
        history = await fetchPriceHistoryChunk(
          config.public.clobApiBase, tokenId, totalStartTs, nowTs, fidelity
        );
      } else {
        // Multiple parallel requests — each chunk max chunkDays
        const chunkSize = chunkDays * 86400;
        const chunks: { start: number; end: number }[] = [];
        
        let cursor = totalStartTs;
        while (cursor < nowTs) {
          const chunkEnd = Math.min(cursor + chunkSize, nowTs);
          chunks.push({ start: cursor, end: chunkEnd });
          cursor = chunkEnd;
        }
        
        // Fetch all chunks in parallel
        const results = await Promise.all(
          chunks.map(c => fetchPriceHistoryChunk(
            config.public.clobApiBase, tokenId, c.start, c.end, fidelity
          ))
        );
        
        // Merge and deduplicate by timestamp
        const seen = new Set<number>();
        for (const chunk of results) {
          for (const point of chunk) {
            const t = point.t || point.timestamp;
            if (t && !seen.has(t)) {
              seen.add(t);
              history.push(point);
            }
          }
        }
      }
      
      // If API returned nothing, generate synthetic fallback
      if (history.length === 0) {
        const yesPrice = 0.5;
        const now = Date.now();
        const step = days * 86400 * 1000 / 50;
        for (let i = 0; i < 50; i++) {
          const timestamp = Math.floor((now - (step * i)) / 1000);
          const variation = (Math.random() - 0.5) * 0.1;
          const price = Math.max(0.1, Math.min(0.9, yesPrice + variation));
          history.push({ t: timestamp, p: price });
        }
        history.reverse();
      }
      
      return history
        .map(point => ({
          t: point.t || point.timestamp || point.createdAt,
          p: point.p || point.price || parseFloat(point.outcomePrices?.[0] || '0')
        }))
        .filter(point => point.p > 0)
        .sort((a, b) => a.t - b.t);
    } catch (err) {
      console.error('Error fetching price history:', err);
      return [];
    }
  };

  // Fetch order book (requires CLOB token ID, not market ID)
  const fetchOrderBook = async (tokenId: string): Promise<OrderBook | null> => {
    try {
      if (!tokenId) return null;
      
      const config = useRuntimeConfig();
      
      // CLOB API requires token_id parameter
      const response = await $fetch<any>(`${config.public.clobApiBase}/book`, {
        params: { token_id: tokenId }
      }).catch(() => null);
      
      if (!response) {
        // Return mock order book for demo if API not available
        return {
          bids: Array.from({ length: 10 }, (_, i) => ({
            price: 0.5 - (i * 0.02) + (Math.random() * 0.01),
            size: Math.random() * 1000 + 100
          })).sort((a, b) => b.price - a.price),
          asks: Array.from({ length: 10 }, (_, i) => ({
            price: 0.5 + (i * 0.02) + (Math.random() * 0.01),
            size: Math.random() * 1000 + 100
          })).sort((a, b) => a.price - b.price)
        };
      }
      
      return {
        bids: (response.bids || []).map((b: any) => ({ 
          price: parseFloat(b.price), 
          size: parseFloat(b.size) 
        })),
        asks: (response.asks || []).map((a: any) => ({ 
          price: parseFloat(a.price), 
          size: parseFloat(a.size) 
        }))
      };
    } catch (err) {
      console.error('Error fetching order book:', err);
      return null;
    }
  };

  // Initialize dashboard data
  const initialize = async () => {
    pending.value = true;
    error.value = null;
    
    try {
      await fetchAllMarkets();
      applyFilter();
      lastUpdated.value = new Date();
    } catch (err) {
      console.error('Initialization error:', err);
      error.value = err;
    } finally {
      pending.value = false;
    }
  };

  // Refresh dashboard data
  const refresh = async () => {
    pending.value = true;
    error.value = null;
    
    try {
      await fetchAllMarkets();
      applyFilter();
      lastUpdated.value = new Date();
    } catch (err) {
      console.error('Refresh error:', err);
      error.value = err;
    } finally {
      pending.value = false;
    }
  };

  // Watch for filter changes
  watch([filterRef, limitRef], () => {
    if (allMarkets.value.length > 0) {
      applyFilter();
    }
  }, { immediate: true });

  // Auto-refresh on client only
  if (import.meta.client) {
    initialize();
    const interval = setInterval(refresh, 30000);
    onUnmounted(() => clearInterval(interval));
  }

  return {
    // Dashboard data
    markets: computed(() => markets.value),
    pending: computed(() => pending.value),
    error: computed(() => error.value),
    lastUpdated: computed(() => lastUpdated.value),
    refresh,
    
    // Detail page functions
    fetchMarketById,
    fetchPriceHistory,
    fetchOrderBook
  };
};