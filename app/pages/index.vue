<script setup lang="ts">
import { usePolymarket } from '~/composables/usePolymarket';

// Start with 'trending' on both server and client to avoid hydration mismatch
const filter = ref('trending');
const limit = ref(20);

// Restore saved filter after mount (client-only) so SSR and client initial render match
onMounted(() => {
  const saved = sessionStorage.getItem('betwixt-filter');
  if (saved) {
    filter.value = saved;
  }
});

// Persist filter selection so it survives navigation to detail pages
watch(filter, (val) => {
  if (import.meta.client) {
    sessionStorage.setItem('betwixt-filter', val);
  }
});

// Pass the refs directly, not their values
const { markets, pending, error, refresh, lastUpdated } = usePolymarket({
  limit,
  filter
});

const isMenuOpen = ref(false);

// Close menu when filter changes
watch(filter, () => {
  isMenuOpen.value = false;
});

// Format time
const timeAgo = computed(() => {
  if (!lastUpdated.value) return 'Never';
  const diff = Date.now() - lastUpdated.value.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
});
</script>

<template>
  <div class="min-h-screen bg-gray-900">
    <!-- Header -->
    <header class="bg-gray-800 shadow-sm border-b border-gray-700 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <!-- Top row: Logo and hamburger -->
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-family-archivo font-bold bg-linear-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              Betwixt
            </h1>
            <p class="text-sm text-gray-400 hidden sm:block font-family-archivo">
              See what lies betwixt the markets
            </p>
          </div>
          
          <div class="flex items-center space-x-4">
            <!-- Desktop Stats (hidden on mobile) -->
            <div class="hidden md:flex items-center space-x-4">
              <div class="text-sm text-gray-300">
                <span class="font-semibold">{{ markets.length }}</span> markets
              </div>
              <div class="text-xs text-gray-400 flex items-center">
                <span class="relative flex h-2 w-2 mr-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                live
              </div>
            </div>

            <!-- Hamburger Button -->
            <button 
              @click="isMenuOpen = !isMenuOpen"
              class="md:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
              :aria-label="isMenuOpen ? 'Close menu' : 'Open menu'"
            >
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path v-if="!isMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Filter bar: Hidden on mobile unless toggled, always visible on desktop -->
        <div 
          :class="[isMenuOpen ? 'block' : 'hidden', 'md:block']"
          class="mt-4 pt-4 border-t border-gray-700"
        >
          <div class="flex flex-col md:flex-row md:items-center gap-4">
            <!-- Category filter buttons - takes full width on mobile, flex on desktop -->
            <div class="flex-1">
              <MarketsCategoryFilter v-model="filter" />
            </div>
            
            <!-- Right section: Stats (mobile) and limit selector -->
            <div class="flex items-center justify-between md:justify-end gap-4">
              <!-- Mobile-only stats -->
              <div class="md:hidden text-xs text-gray-400">
                <span class="font-semibold">{{ markets.length }}</span> markets • {{ timeAgo }}
              </div>

              <!-- Limit selector -->
              <select 
                v-model="limit" 
                class="text-sm bg-gray-700 rounded-lg px-3 py-2 text-gray-300 border border-gray-600 focus:ring-2 focus:ring-purple-500 outline-none min-w-[120px]"
              >
                <option :value="10">10 markets</option>
                <option :value="20">20 markets</option>
                <option :value="50">50 markets</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading state -->
      <div v-if="pending && !markets.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="n in limit" :key="n" class="animate-pulse">
          <div class="bg-gray-800 rounded-lg h-48 p-4 space-y-4">
            <div class="h-4 bg-gray-700 rounded w-3/4"></div>
            <div class="space-y-2">
              <div class="h-2 bg-gray-700 rounded"></div>
              <div class="h-2 bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center py-12">
        <div class="text-red-500 text-xl mb-4">⚠️ Failed to load markets</div>
        <button @click="refresh" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          Try Again
        </button>
      </div>

      <!-- Market grid -->
      <TransitionGroup 
        v-else
        name="market-grid"
        tag="div"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <MarketsMarketCard 
          v-for="market in markets" 
          :key="market.id"
          :market="market"
        />
      </TransitionGroup>
      
      <!-- Empty state -->
      <div v-if="!pending && !error && markets.length === 0" class="text-center py-12 text-gray-400">
        No markets found for this filter
      </div>
    </main>
    
   
  </div>
</template>

<style scoped>
.market-grid-enter-active,
.market-grid-leave-active {
  transition: all 0.3s ease;
}
.market-grid-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.market-grid-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
.market-grid-move {
  transition: transform 0.3s ease;
}
</style>