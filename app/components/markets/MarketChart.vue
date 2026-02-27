<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import type { OutcomeWithPrice } from '~/types/polymarket';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const props = defineProps<{
  priceHistory: any[];
  selectedPeriod: string;
  outcomes: OutcomeWithPrice[];
}>();

const emit = defineEmits(['period-change']);

const chartData = ref({
  labels: [] as string[],
  datasets: [
    {
      label: 'Yes Price',
      data: [] as number[],
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 2,
      pointHoverRadius: 5
    },
    {
      label: 'No Price',
      data: [] as number[],
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 2,
      pointHoverRadius: 5
    }
  ]
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      labels: { color: '#9ca3af' }
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      callbacks: {
        label: (context: any) => {
          return `${context.dataset.label}: ${(context.raw * 100).toFixed(1)}%`;
        }
      }
    }
  },
  scales: {
    y: {
      grid: { color: '#374151' },
      ticks: { 
        color: '#9ca3af',
        callback: (value: any) => `${(value * 100).toFixed(0)}%`
      },
      min: 0,
      max: 1
    },
    x: {
      grid: { display: false },
      ticks: { color: '#9ca3af' }
    }
  }
};

const periods = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'all', label: 'All' }
];

// Update chart data when price history changes
// IMPORTANT: vue-chartjs only re-renders when the :data prop reference changes,
// so we must assign a brand-new object — mutating nested arrays won't trigger updates.
watch(() => props.priceHistory, (newHistory) => {
  if (newHistory && newHistory.length > 0) {
    const sorted = [...newHistory].sort((a, b) => a.t - b.t);
    
    const labels = sorted.map(point => {
      const date = new Date(point.t * 1000);
      if (props.selectedPeriod === '24h') {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    });
    
    const yesData = sorted.map(point => point.p || 0.5);
    const noData = sorted.map(point => 1 - (point.p || 0.5));
    
    // Create a brand-new object so vue-chartjs detects the change
    chartData.value = {
      labels,
      datasets: [
        {
          label: 'Yes Price',
          data: yesData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 5
        },
        {
          label: 'No Price',
          data: noData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 5
        }
      ]
    };
  }
}, { immediate: true });
</script>

<template>
  <div class="card px-3 py-4 sm:px-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-[14px] sm:text-lg font-semibold text-white">Price History</h2>
      <div class="flex space-x-1 sm:space-x-2">
        <button
          v-for="period in periods"
          :key="period.value"
          @click="emit('period-change', period.value)"
          class="px-2 sm:px-3 py-0.5 sm:py-1 text-sm rounded-lg transition-colors"
          :class="selectedPeriod === period.value 
            ? 'bg-purple-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
        >
          {{ period.label }}
        </button>
      </div>
    </div>
    
    <div class="h-80">
      <Line 
        v-if="priceHistory && priceHistory.length > 0"
        :data="chartData" 
        :options="chartOptions" 
      />
      <div v-else class="h-full flex items-center justify-center text-gray-400">
        No price history available
      </div>
    </div>
  </div>
</template>