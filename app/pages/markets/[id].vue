<script setup lang="ts">
import { usePolymarket } from '~/composables/usePolymarket';
import type { MarketDetails } from '~/types/polymarket';

const route = useRoute();
const router = useRouter();
const { fetchMarketById, fetchPriceHistory, fetchOrderBook } = usePolymarket({ 
  limit: ref(20), 
  filter: ref('trending') 
});

// State
const market = ref<MarketDetails | null>(null);
const priceHistory = ref<any[]>([]);
const orderBook = ref<any>(null);
const pending = ref(true);
const error = ref<string | null>(null);
const selectedPeriod = ref('7d');
const activeTab = ref('overview');

// Client-only flag to prevent hydration mismatches with Date.now()
const isMounted = ref(false);
const detailLastUpdated = ref<Date | null>(null);

// Silent background polling — updates data without loading spinners
let orderBookInterval: ReturnType<typeof setInterval> | null = null;
let marketInterval: ReturnType<typeof setInterval> | null = null;

const refreshOrderBook = async () => {
  if (!market.value) return;
  const tokenId = market.value.tokenIds?.[0];
  if (!tokenId) return;
  try {
    const book = await fetchOrderBook(tokenId);
    if (book) {
      orderBook.value = book;
      detailLastUpdated.value = new Date();
    }
  } catch { /* silent fail — keep stale data */ }
};

const refreshMarketData = async () => {
  if (!market.value) return;
  try {
    const freshMarket = await fetchMarketById(route.params.id as string);
    if (freshMarket) {
      // Preserve tokenIds and merge fresh prices/volume/liquidity
      market.value = { ...market.value, ...freshMarket };
      detailLastUpdated.value = new Date();
    }
  } catch { /* silent fail — keep stale data */ }
};

onMounted(() => {
  isMounted.value = true;

  // Start polling after initial data loads
  const startPolling = () => {
    // Order book: every 10s (most time-sensitive)
    orderBookInterval = setInterval(refreshOrderBook, 10_000);
    // Market prices/volume: every 30s
    marketInterval = setInterval(refreshMarketData, 30_000);
  };

  // Wait for initial data, then start polling
  if (market.value) {
    startPolling();
  } else {
    const stop = watch(market, (val) => {
      if (val) {
        startPolling();
        stop();
      }
    });
  }
});

onUnmounted(() => {
  if (orderBookInterval) clearInterval(orderBookInterval);
  if (marketInterval) clearInterval(marketInterval);
});

// Fetch market data — server: false prevents hydration mismatches
// (chart.js needs Canvas, Date.now() differs between server & client)
const { data, pending: fetchPending, error: fetchError } = await useAsyncData(
  `market-${route.params.id}`,
  async () => {
    const marketData = await fetchMarketById(route.params.id as string);
    if (!marketData) throw new Error('Market not found');
    
    // Use the CLOB token ID (not market ID) for price history & order book
    const tokenId = marketData.tokenIds?.[0];
    
    const [history, book] = await Promise.all([
      tokenId ? fetchPriceHistory(tokenId, selectedPeriod.value) : Promise.resolve([]),
      tokenId ? fetchOrderBook(tokenId) : Promise.resolve(null)
    ]);
    
    return { market: marketData, history, book };
  },
  { server: false, lazy: true }
);

// Update reactive state
watchEffect(() => {
  if (data.value) {
    market.value = data.value.market;
    priceHistory.value = data.value.history;
    orderBook.value = data.value.book;
  }
  pending.value = fetchPending.value;
  error.value = fetchError.value?.message || null;
});

// Handle period change — uses a separate loading flag so it doesn't blank the whole page
const chartLoading = ref(false);
const handlePeriodChange = async (period: string) => {
  selectedPeriod.value = period;
  if (market.value) {
    const tokenId = market.value.tokenIds?.[0];
    if (!tokenId) return;
    chartLoading.value = true;
    try {
      priceHistory.value = await fetchPriceHistory(tokenId, period);
    } catch (err) {
      console.error('Error fetching price history:', err);
    } finally {
      chartLoading.value = false;
    }
  }
};

// Formatted "last updated" for display
const lastUpdatedText = computed(() => {
  if (!detailLastUpdated.value) return null;
  const secs = Math.floor((Date.now() - detailLastUpdated.value.getTime()) / 1000);
  if (secs < 5) return 'Just now';
  if (secs < 60) return `${secs}s ago`;
  return `${Math.floor(secs / 60)}m ago`;
});

// Re-compute lastUpdatedText every 5s so it stays current
const lastUpdatedTick = ref(0);
let tickInterval: ReturnType<typeof setInterval> | null = null;
onMounted(() => { tickInterval = setInterval(() => lastUpdatedTick.value++, 5000); });
onUnmounted(() => { if (tickInterval) clearInterval(tickInterval); });
// Touch the tick inside the computed so Vue tracks it
const lastUpdatedDisplay = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  lastUpdatedTick.value;
  return lastUpdatedText.value;
});

// Format date for countdown — only compute on client to avoid hydration mismatch
const timeRemaining = computed(() => {
  if (!isMounted.value) return null;
  if (!market.value?.endDate) return null;
  const end = new Date(market.value.endDate).getTime();
  const now = Date.now();
  const diff = end - now;
  
  if (diff <= 0) return 'Ended';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
});

// Navigate back
const goBack = () => {
  router.push('/');
};

// Share market — uses browser APIs with better error handling
// Share market — copies to clipboard automatically with user feedback
const shareMarket = async () => {
  const shareUrl = `${window.location.origin}/markets/${route.params.id}`;
  const shareTitle = market.value?.question || 'Betwixt Market';
  
  // Try native share first (opens share sheet on mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: `Check out this market on Betwixt: ${market.value?.question}`,
        url: shareUrl
      });
      return; // Successfully shared, exit
    } catch (err: any) {
      // User cancelled share - we'll fall back to copy
      if (err.name === 'AbortError') {
        // Still copy to clipboard for better UX
        await copyToClipboard(shareUrl);
      }
    }
  } else {
    // No native share support, just copy
    await copyToClipboard(shareUrl);
  }
};

// Helper function to copy to clipboard with visual feedback
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    
    // Optional: Add a temporary visual feedback
    const button = document.activeElement as HTMLElement;
    const originalInnerHTML = button?.innerHTML;
    
    if (button) {
      // Show checkmark temporarily
      button.innerHTML = `
        <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      `;
      
      // Revert back after 1.5 seconds
      setTimeout(() => {
        if (button) button.innerHTML = originalInnerHTML || '';
      }, 1500);
    }
  } catch (err) {
    console.error('Failed to copy:', err);
    // Final fallback - show prompt with pre-selected text
    prompt('Copy this link:', text);
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-900">
    <!-- Header -->
    <header class="bg-gray-800 shadow-sm border-b border-gray-700 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-3 md:space-x-4">
            <button 
              @click="goBack"
              class="flex cursor-pointer items-center text-gray-400 hover:text-white transition-colors"
            >
              <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
             
            </button>
            <NuxtLink to="/" class="text-xl font-bold bg-linear-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              Betwixt
            </NuxtLink>
          </div>
         <button 
  @click="shareMarket"
  class="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 active:bg-gray-500 transition-colors"
  title="Share"
  type="button"
  aria-label="Share market"
>
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
</button>
        </div>
      </div>
    </header>

    <!-- Full-page loading spinner overlay -->
    <Transition name="fade">
      <div
        v-if="pending"
        class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm"
      >
        <div class="relative">
          <!-- Outer ring -->
          <div class="w-16 h-16 rounded-full border-4 border-gray-700"></div>
          <!-- Spinning arc -->
          <div class="w-16 h-16 rounded-full border-4 border-transparent border-t-purple-500 border-r-blue-500 animate-spin absolute inset-0"></div>
        </div>
        <p class="mt-4 text-gray-400 text-sm tracking-wide animate-pulse">Loading market…</p>
      </div>
    </Transition>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading placeholder keeps layout stable while overlay is shown -->
      <div v-if="pending" class="space-y-6 opacity-0">
        <MarketsMarketLoading />
      </div>

      <!-- Error State -->
      <div v-else-if="error || !market" class="text-center py-12">
        <div class="text-red-500 p-3 bg-red-200 rounded-md text-xl mb-4 max-w-3xl mx-auto">Failed to load market</div>
        <button 
          @click="goBack"
          class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Return to Dashboard
        </button>
      </div>

      <!-- Market Content -->
      <div v-else class="space-y-5">
        <!-- Market Header -->
        <MarketsMarketHeader :market="market" :time-remaining="timeRemaining" />

        <!-- Live indicator -->
        <div v-if="lastUpdatedDisplay" class="flex items-center gap-2 text-xs text-gray-500">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span>Live</span>
          <span class="text-gray-600">&middot;</span>
          <span>Updated {{ lastUpdatedDisplay }}</span>
        </div>

        <!-- Tabs -->
        <div class="border-b border-gray-700">
          <nav class="flex space-x-8">
            <button
              @click="activeTab = 'overview'"
              class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
              :class="activeTab === 'overview' 
                ? 'border-purple-500 text-purple-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'"
            >
              Overview
            </button>
            <button
              @click="activeTab = 'orderbook'"
              class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
              :class="activeTab === 'orderbook' 
                ? 'border-purple-500 text-purple-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'"
              :disabled="!orderBook"
            >
              Order Book
              <span v-if="!orderBook" class="ml-2 text-xs text-gray-500">(Unavailable)</span>
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div v-if="activeTab === 'overview'">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left Column - Outcomes and Chart -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Outcome Details -->
              <MarketsMarketOutcomeDetails :market="market" />
              
              <!-- Price Chart (client-only: chart.js requires Canvas) -->
              <ClientOnly>
                <MarketsMarketChart 
                  :price-history="priceHistory"
                  :selected-period="selectedPeriod"
                  :outcomes="market.outcomes"
                  @period-change="handlePeriodChange"
                />
                <template #fallback>
                  <div class="card p-6">
                    <div class="flex justify-between items-center mb-4">
                      <div class="h-6 bg-gray-700 rounded w-32 animate-pulse"></div>
                      <div class="flex space-x-2">
                        <div v-for="n in 4" :key="n" class="h-8 w-12 bg-gray-700 rounded-lg animate-pulse"></div>
                      </div>
                    </div>
                    <div class="h-80 bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </template>
              </ClientOnly>
            </div>

            <!-- Right Column - Stats and Info -->
            <div class="space-y-6">
              <MarketsMarketStats :market="market" />
              
              <!-- AI Insights -->
              <MarketsMarketInsights 
                :market="market" 
                :price-history="priceHistory" 
                :order-book="orderBook" 
              />
              
              <!-- Resolution Info -->
              <div v-if="market.resolutionCriteria" class="card p-4">
                <h3 class="text-lg font-semibold text-white mb-3">Resolution</h3>
                <div class="space-y-3 text-sm">
                  <div v-if="market.resolutionCriteria">
                    <span class="text-gray-400">Criteria:</span>
                    <p class="text-gray-300 mt-1">{{ market.resolutionCriteria }}</p>
                  </div>
                  <div v-if="market.resolutionSource">
                    <span class="text-gray-400">Source:</span>
                    <p class="text-gray-300 mt-1">{{ market.resolutionSource }}</p>
                  </div>
                </div>
              </div>

              <!-- Tags -->
              <div v-if="market.tags && market.tags.length" class="card p-4">
                <h3 class="text-lg font-semibold text-white mb-3">Categories</h3>
                <div class="flex flex-wrap gap-2">
                  <span 
                    v-for="tag in market.tags" 
                    :key="tag.id"
                    class="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm"
                  >
                    {{ tag.label }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Order Book Tab -->
        <div v-if="activeTab === 'orderbook'" class="space-y-6">
          <MarketsMarketOrderBook :order-book="orderBook" :market="market" />
          <p v-if="lastUpdatedDisplay" class="text-xs text-gray-600 text-center">
            Order book refreshes every 10s &middot; Updated {{ lastUpdatedDisplay }}
          </p>
        </div>
      </div>
    </main>

   
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>