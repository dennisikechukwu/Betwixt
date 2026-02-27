<script setup lang="ts">
import type { MarketDetails } from '~/types/polymarket';

const props = defineProps<{ market: MarketDetails }>();

const formatNumber = (num: string | number) => {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};
</script>

<template>
  <div class="card p-4">
    <h3 class=" text-[16px] sm:text-lg font-semibold text-white mb-3">Market Stats</h3>
    <div class="space-y-3">
      <div class="flex justify-between">
        <span class="text-gray-400 font-normal">24h Volume</span>
        <span class="text-white font-medium">{{ formatNumber(market.volume24hr) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-400 font-normal">Liquidity</span>
        <span class="text-white font-medium">{{ formatNumber(market.liquidity) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-400 font-normal">Start Date</span>
        <span class="text-white font-medium">{{ new Date(market.startDate).toLocaleDateString() }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-400 font-normal">End Date</span>
        <span class="text-white font-medium">{{ new Date(market.endDate).toLocaleDateString() }}</span>
      </div>
     
    </div>
  </div>
</template>