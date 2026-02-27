import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  
  // CSS path - make sure this matches your file structure
  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [
      tailwindcss() as any,
    ],
  },

  runtimeConfig: {
    groqApiKey: '',
    public: {
      gammaApiBase: 'https://gamma-api.polymarket.com',
      clobApiBase: 'https://clob.polymarket.com',
    }
  },

  nitro: {
    routeRules: {
      // This proxies /api/polymarket/events → https://gamma-api.polymarket.com/events
      '/api/polymarket/**': { 
        proxy: 'https://gamma-api.polymarket.com/**' 
      }
    }
  },

  app: {
    head: {
      title: 'Betwixt - Prediction Market Intelligence',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'See what lies betwixt the markets - Real-time Polymarket data, correlations, and signals' }
      ],
    }
  },
  fonts: {
    families: [
      { name: 'Archivo', weights: [400, 500, 600, 700], provider: 'google' },
      { name: 'Inter', weights: [400, 500, 600, 700], provider: 'google' }
      
    ]
  },
   
  modules: ['@nuxt/fonts'],


})