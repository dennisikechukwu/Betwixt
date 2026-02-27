<script setup lang="ts">
import type { OrderBook, MarketDetails } from '~/types/polymarket';

const props = defineProps<{
  orderBook: OrderBook | null;
  market: MarketDetails;
}>();

const formatPrice = (price: number) => {
  return (price * 100).toFixed(1) + '%';
};

const formatSize = (size: number) => {
  if (size >= 1000) return (size / 1000).toFixed(1) + 'K';
  return size.toFixed(2);
};
</script>

<template>
  <div class="card p-3 md:p-5">
    <h2 class="text-lg font-semibold text-white mb-4">Order Book</h2>
    
    <div v-if="!orderBook" class="text-center py-8 text-gray-400">
      Order book not available for this market
    </div>
    
    <div v-else class="grid grid-cols-2 gap-4">
      <!-- Bids -->
      <div>
        <h3 class="text-sm font-medium text-green-400 mb-2">Bids</h3>
        <div class="space-y-1">
          <div v-for="(bid, idx) in orderBook.bids.slice(0, 10)" :key="idx" 
               class="flex justify-between text-sm py-1 border-b border-gray-700 last:border-0">
            <span class="text-green-400">{{ formatPrice(bid.price) }}</span>
            <span class="text-gray-300">{{ formatSize(bid.size) }}</span>
          </div>
        </div>
      </div>
      
      <!-- Asks -->
      <div>
        <h3 class="text-sm font-medium text-red-400 mb-2">Asks</h3>
        <div class="space-y-1">
          <div v-for="(ask, idx) in orderBook.asks.slice(0, 10)" :key="idx"
               class="flex justify-between text-sm py-1 border-b border-gray-700 last:border-0">
            <span class="text-red-400">{{ formatPrice(ask.price) }}</span>
            <span class="text-gray-300">{{ formatSize(ask.size) }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Spread -->
    <div v-if="orderBook && orderBook.bids.length && orderBook.asks.length" class="mt-4 pt-4 border-t border-gray-700">
      <div class="flex justify-between text-sm">
        <span class="text-gray-400">Spread</span>
        <span class="text-white font-medium">
          {{ formatPrice((orderBook.asks[0]?.price ?? 0) - (orderBook.bids[0]?.price ?? 0)) }}
        </span>
      </div>
    </div>
  </div>
</template>