<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ProcessedMarket } from '~/types/polymarket';

const props = defineProps<{
  market: ProcessedMarket;
  compact?: boolean;
}>();

// Format volume
const formattedVolume = computed(() => {
  const vol = parseFloat(props.market.volume24hr || props.market.volume || '0');
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
});

// Get color based on outcome - simplified for dark mode
const getOutcomeColor = (outcome: string, price: number) => {
  if (outcome === 'Yes') return 'text-green-400';
  if (outcome === 'No') return 'text-red-400';
  if (price > 0.5) return 'text-blue-400';
  return 'text-gray-400';
};

// Get progress bar color
const getProgressColor = (outcome: string) => {
  if (outcome === 'Yes') return 'bg-green-500';
  if (outcome === 'No') return 'bg-red-500';
  return 'bg-blue-500';
};

// Price change indicators
const priceChanges = ref<Record<number, 'up' | 'down' | null>>({});

watch(() => props.market.outcomes, (newOutcomes, oldOutcomes) => {
  if (!oldOutcomes) return;
  
  newOutcomes.forEach((outcome, idx) => {
    const oldPrice = oldOutcomes[idx]?.rawPrice;
    const newPrice = outcome.rawPrice;
    
    if (oldPrice && newPrice && oldPrice !== newPrice) {
      priceChanges.value[idx] = newPrice > oldPrice ? 'up' : 'down';
      setTimeout(() => {
        priceChanges.value[idx] = null;
      }, 2000);
    }
  });
}, { deep: true });

const router = useRouter();
const route = useRoute();

const navigateToMarket = () => {
  router.push(`/markets/${props.market.id}`);
};
</script>

<template>
  <div @click="navigateToMarket" class="card hover:shadow-xl transition-shadow duration-200">
    <!-- Market Image (if available) -->
    <div v-if="market.image" class="h-32 bg-cover bg-center" :style="{ backgroundImage: `url(${market.image})` }" />
    
    <div class="p-4">
      <!-- Market Title -->
      <h3 class="font-semibold text-white mb-2 line-clamp-2" :title="market.question">
        {{ market.question }}
      </h3>
      
      <!-- Outcomes -->
      <div class="space-y-3 mt-4">
        <div 
          v-for="(outcome, idx) in market.outcomes" 
          :key="idx"
          class="space-y-1"
        >
          <div class="flex justify-between text-sm">
            <span :class="getOutcomeColor(outcome.outcome, outcome.rawPrice)">
              {{ outcome.outcome }}
            </span>
            
            <!-- Price with change indicator -->
            <div class="flex items-center space-x-1">
              <!-- Price change arrow -->
              <span 
                v-if="priceChanges[idx]" 
                class="text-xs font-bold"
                :class="priceChanges[idx] === 'up' ? 'text-green-500' : 'text-red-500'"
              >
                {{ priceChanges[idx] === 'up' ? '▲' : '▼' }}
              </span>
              
              <!-- Price -->
              <span 
                class="font-mono font-medium transition-colors duration-300"
                :class="{
                  'text-green-500': priceChanges[idx] === 'up',
                  'text-red-500': priceChanges[idx] === 'down',
                  'text-white': !priceChanges[idx]
                }"
              >
                {{ outcome.price }}
              </span>
            </div>
          </div>
          
          <!-- Progress bar - dark background -->
          <div class="w-full bg-gray-700 rounded-full h-1.5">
            <div 
              class="h-1.5 rounded-full transition-all duration-300"
              :class="getProgressColor(outcome.outcome)"
              :style="{ width: outcome.price }"
            />
          </div>
        </div>
      </div>
      
      <!-- Market Stats - dark borders -->
      <div class="mt-4 pt-3 border-t border-gray-700 flex justify-between text-xs text-gray-400">
        <div class="flex items-center space-x-1">
          <span class="font-medium">24h Vol:</span>
          <span>{{ formattedVolume }}</span>
        </div>
        <div class="flex items-center space-x-1">
          <span class="font-medium">Liquidity:</span>
          <span>${{ (parseFloat(market.liquidity || '0') / 1000).toFixed(0) }}K</span>
        </div>
      </div>
      
      <!-- Expand button -->
      <button 
        v-if="!compact && market.outcomes.length > 2"
        class="mt-2 text-xs text-purple-400 hover:underline focus:outline-none"
      >
        View all outcomes →
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes priceFlash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
.text-green-500, .text-red-500 {
  animation: priceFlash 0.5s ease-in-out;
}
</style>