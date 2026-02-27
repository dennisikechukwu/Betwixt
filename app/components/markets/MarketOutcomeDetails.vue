<script setup lang="ts">
defineProps<{ market: any }>();

const getOutcomeColor = (outcome: string, price: number) => {
  if (outcome === 'Yes') return 'text-green-400';
  if (outcome === 'No') return 'text-red-400';
  if (price > 0.5) return 'text-blue-400';
  return 'text-gray-400';
};

const getProgressColor = (outcome: string) => {
  if (outcome === 'Yes') return 'bg-green-500';
  if (outcome === 'No') return 'bg-red-500';
  return 'bg-blue-500';
};
</script>

<template>
  <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 p-4">
    <h2 class="text-[16px] sm:text-lg font-semibold text-white mb-4">Outcome Probabilities</h2>
    <div class="space-y-4">
      <div v-for="(outcome, idx) in market.outcomes" :key="idx" class="space-y-2">
        <div class="flex justify-between items-center">
          <span :class="getOutcomeColor(outcome.outcome, outcome.rawPrice)" class="font-medium">
            {{ outcome.outcome }}
          </span>
          <span class="text-xl sm:text-2xl font-bold text-white">{{ outcome.price }}</span>
        </div>
        <div class="w-full bg-gray-700 rounded-full h-2 md:h-3">
          <div 
            class="h-2 md:h-3 rounded-full transition-all duration-300" 
            :class="getProgressColor(outcome.outcome)"
            :style="{ width: outcome.price }"
          />
        </div>
      </div>
    </div>
  </div>
</template>