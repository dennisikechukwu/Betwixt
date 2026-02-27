<template>
  <div class="space-y-6">
    <!-- Header Skeleton -->
    <div class="card p-6 animate-pulse">
      <div class="h-8 bg-gray-700 rounded w-3/4 mb-4"></div>
      <div class="h-4 bg-gray-700 rounded w-full mb-2"></div>
      <div class="h-4 bg-gray-700 rounded w-5/6 mb-4"></div>
      <div class="flex gap-4">
        <div class="h-4 bg-gray-700 rounded w-24"></div>
        <div class="h-4 bg-gray-700 rounded w-24"></div>
      </div>
    </div>

    <!-- Content Grid Skeleton -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <!-- Outcomes Skeleton -->
        <div class="card p-6 animate-pulse">
          <div class="h-6 bg-gray-700 rounded w-40 mb-4"></div>
          <div class="space-y-4">
            <div v-for="n in 2" :key="n">
              <div class="flex justify-between mb-2">
                <div class="h-4 bg-gray-700 rounded w-16"></div>
                <div class="h-4 bg-gray-700 rounded w-12"></div>
              </div>
              <div class="h-3 bg-gray-700 rounded-full w-full"></div>
            </div>
          </div>
        </div>

        <!-- Chart Skeleton -->
        <div class="card p-6 animate-pulse">
          <div class="h-80 bg-gray-700 rounded"></div>
        </div>
      </div>

      <!-- Stats Skeleton -->
      <div class="card p-6 animate-pulse h-64"></div>
    </div>
  </div>
</template>