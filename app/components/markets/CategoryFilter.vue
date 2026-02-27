<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits(['update:modelValue']);

const categories = [
  { value: 'trending', label: 'Trending', icon: '📈' },
  { value: 'recent', label: 'Recent', icon: '⏱️' },
  { value: 'closing-soon', label: 'Closing Soon', icon: '⌛' },
  { value: 'crypto', label: 'Crypto', icon: '₿' },
  { value: 'politics', label: 'Politics', icon: '🏛️' },
  { value: 'sports', label: 'Sports', icon: '⚽' },
];
</script>

<template>
  <div class="flex flex-wrap items-start gap-2 font-family-archivo">
    <button
      v-for="cat in categories"
      :key="cat.value"
      @click="emit('update:modelValue', cat.value)"
      class="px-4 py-2 rounded-lg transition-all duration-200 font-medium"
      :class="modelValue === cat.value 
        ? 'bg-purple-600 text-white shadow-lg scale-105' 
        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'"
    >
      {{ cat.icon }} {{ cat.label }}
    </button>
  </div>
</template>