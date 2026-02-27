<script setup lang="ts">
import type { MarketDetails, PriceHistoryPoint, OrderBook } from '~/types/polymarket';

const props = defineProps<{
  market: MarketDetails;
  priceHistory: PriceHistoryPoint[];
  orderBook: OrderBook | null;
}>();

const insight = ref('');
const loading = ref(false);
const error = ref('');
const hasFetched = ref(false);

const fetchInsight = async () => {
  if (loading.value) return;
  loading.value = true;
  error.value = '';
  insight.value = '';

  // Build order book summary for the prompt
  let orderBookSummary = '';
  if (props.orderBook) {
    const topBid = props.orderBook.bids[0];
    const topAsk = props.orderBook.asks[0];
    const bidDepth = props.orderBook.bids.reduce((sum, b) => sum + b.size, 0);
    const askDepth = props.orderBook.asks.reduce((sum, a) => sum + a.size, 0);
    orderBookSummary = `Best bid: ${((topBid?.price ?? 0) * 100).toFixed(1)}%, Best ask: ${((topAsk?.price ?? 0) * 100).toFixed(1)}%, Spread: ${(((topAsk?.price ?? 0) - (topBid?.price ?? 0)) * 100).toFixed(2)}%, Bid depth: ${bidDepth.toFixed(0)}, Ask depth: ${askDepth.toFixed(0)}`;
  }

  try {
    const data = await $fetch<{ insight: string; cached: boolean }>('/api/insights', {
      method: 'POST',
      body: {
        marketId: props.market.id,
        question: props.market.question,
        outcomes: props.market.outcomes,
        yesPrice: props.market.yesPrice,
        noPrice: props.market.noPrice,
        volume24hr: props.market.volume24hr,
        liquidity: props.market.liquidity,
        endDate: props.market.endDate,
        description: props.market.description,
        priceHistory: props.priceHistory?.slice(-20), // Last 20 points to stay within token limits
        orderBookSummary,
      }
    });
    insight.value = data.insight;
    hasFetched.value = true;
  } catch (err: any) {
    error.value = err.data?.statusMessage || err.message || 'Failed to generate insight';
  } finally {
    loading.value = false;
  }
};

// Simple markdown renderer for bold, bullets, and paragraphs
const renderMarkdown = (text: string): string => {
  return text
    // Bold: **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    // Bullet points
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-300">$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="space-y-1 my-2">$1</ul>')
    // Line breaks to paragraphs
    .split('\n\n')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => p.startsWith('<') ? p : `<p class="text-gray-300 text-sm">${p}</p>`)
    .join('');
};
</script>

<template>
  <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 overflow-hidden">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-md bg-purple-600/20 flex items-center justify-center">
          <svg class="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 class="text-sm font-semibold text-white">AI Insights</h3>
      
      </div>
      <button
        v-if="hasFetched && !loading"
        @click="fetchInsight"
        class="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        title="Refresh insight"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>

    <!-- Initial state — prompt to generate -->
    <div v-if="!hasFetched && !loading && !error" class="text-center py-4">
      <p class="text-gray-500 text-[13px] sm:text-[14px] mb-3">Get AI-powered analysis of this market's data, trends, and signals.</p>
      <button
        @click="fetchInsight"
        class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2 mx-auto"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Generate Insight
      </button>
    </div>

    <!-- Loading state -->
    <div v-else-if="loading" class="space-y-3 py-2">
      <div class="flex items-center gap-2 text-xs text-purple-400">
        <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Analyzing market data...
      </div>
      <div class="space-y-2">
        <div class="h-3 bg-gray-700 rounded w-full animate-pulse"></div>
        <div class="h-3 bg-gray-700 rounded w-5/6 animate-pulse"></div>
        <div class="h-3 bg-gray-700 rounded w-4/6 animate-pulse"></div>
        <div class="h-3 bg-gray-700 rounded w-full animate-pulse"></div>
        <div class="h-3 bg-gray-700 rounded w-3/6 animate-pulse"></div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="py-2">
      <p class="text-red-400 text-xs mb-2">{{ error }}</p>
      <button
        @click="fetchInsight"
        class="text-xs text-purple-400 hover:text-purple-300 transition-colors"
      >
        Try again
      </button>
    </div>

    <!-- Insight content -->
    <div v-else-if="insight" class="prose-sm">
      <div class="text-sm leading-relaxed" v-html="renderMarkdown(insight)"></div>
    </div>
  </div>
</template>
