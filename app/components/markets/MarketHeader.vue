<script setup lang="ts">
import type { MarketDetails } from '~/types/polymarket';

defineProps<{
  market: MarketDetails;
  timeRemaining: string | null;
}>();
</script>

<template>
  <div class="card p-4 ">
    <h1 class="text-xl sm:text-2xl font-bold text-white mb-2 font-family-archivo">{{ market.question }}</h1>
    <p v-if="market.description" class="text-gray-400 mb-4 font-light font-family-archivo">{{ market.description }}</p>
    
    <div class="flex flex-wrap items-center gap-4 text-sm font-light">
      <div v-if="timeRemaining" class="flex items-center text-gray-300">
        <svg class="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {{ timeRemaining }}
      </div>
      
      <div class="flex items-center text-gray-300 font-light">
        <svg class="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {{ new Date(market.endDate).toLocaleDateString() }}
      </div>
      
      <div class="flex items-center text-gray-300 font-light">
        <svg class="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        24h Vol: ${{ (parseFloat(market.volume24hr) / 1000000).toFixed(2) }}M
      </div>
    </div>
  </div>
</template>