import Groq from 'groq-sdk';

// Simple in-memory cache to avoid re-querying for the same market
const cache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiKey = config.groqApiKey;

  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'GROQ_API_KEY not configured' });
  }

  const body = await readBody(event);
  const { marketId, question, outcomes, yesPrice, noPrice, volume24hr, liquidity, 
          endDate, description, priceHistory, orderBookSummary } = body;

  if (!marketId || !question) {
    throw createError({ statusCode: 400, statusMessage: 'marketId and question are required' });
  }

  // Check cache
  const cached = cache.get(marketId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { insight: cached.text, cached: true };
  }

  // Build the prompt with all available market data
  const outcomesText = outcomes?.map((o: any) => `${o.outcome}: ${o.price}`).join(', ') || 'N/A';
  
  let trendText = '';
  if (priceHistory && priceHistory.length >= 2) {
    const first = priceHistory[0];
    const last = priceHistory[priceHistory.length - 1];
    const changePct = ((last.p - first.p) * 100).toFixed(1);
    const direction = last.p > first.p ? 'up' : last.p < first.p ? 'down' : 'flat';
    trendText = `Price trend: ${direction} ${changePct}% (from ${(first.p * 100).toFixed(1)}% to ${(last.p * 100).toFixed(1)}%) over ${priceHistory.length} data points.`;
  }

  let timeText = '';
  if (endDate) {
    const remaining = new Date(endDate).getTime() - Date.now();
    if (remaining > 0) {
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      timeText = `Time remaining: ${days} days until resolution.`;
    } else {
      timeText = 'Market has ended.';
    }
  }

  const prompt = `You are a prediction market analyst for Betwixt, a Polymarket dashboard. Analyze this market and provide concise, actionable insights. Be direct and data-driven.

MARKET: "${question}"
${description ? `DESCRIPTION: ${description}` : ''}
CURRENT PRICES: ${outcomesText}
${yesPrice !== undefined ? `Yes: ${(yesPrice * 100).toFixed(1)}% | No: ${(noPrice * 100).toFixed(1)}%` : ''}
24H VOLUME: $${volume24hr || '0'}
LIQUIDITY: $${liquidity || '0'}
${trendText}
${timeText}
${orderBookSummary ? `ORDER BOOK: ${orderBookSummary}` : ''}

Provide your analysis in this exact format (use markdown):

**Market Summary**
One short paragraph explaining what this market is predicting in plain English.

**Trend Analysis**
2-3 sentences analyzing recent price movement, momentum, and what it signals about market sentiment.

**Key Signals**
- Bullet point 1 (most important signal)
- Bullet point 2
- Bullet point 3

**Outlook**
One sentence summarizing the overall market stance (bullish/bearish/neutral) with brief reasoning.

Keep the total response under 200 words. Be specific with numbers. Do not give financial advice.`;

  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a concise prediction market analyst. Respond with well-structured markdown.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 512,
    });

    const text = completion.choices[0]?.message?.content || 'No insight generated.';

    // Cache the result
    cache.set(marketId, { text, timestamp: Date.now() });

    return { insight: text, cached: false };
  } catch (err: any) {
    console.error('Groq API error:', err);
    throw createError({ 
      statusCode: 502, 
      statusMessage: err.message || 'Failed to generate AI insight' 
    });
  }
});
