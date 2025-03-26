class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly refillRate: number;
  private readonly capacity: number;
  private isExhausted: boolean = false;
  private exhaustionTime: number = 0;

  constructor(capacity: number, refillRate: number) {
    this.tokens = capacity;
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  async getToken(retries = 3): Promise<boolean> {
    // Check if we're in an exhausted state (quota exceeded)
    if (this.isExhausted) {
      const now = Date.now();
      // If we've been exhausted for more than 60 seconds, try again
      if (now - this.exhaustionTime > 60000) {
        this.isExhausted = false;
        console.log("Attempting to recover from quota exhaustion...");
      } else {
        const waitTimeRemaining = Math.ceil((60000 - (now - this.exhaustionTime)) / 1000);
        console.log(`API quota exhausted. Waiting ${waitTimeRemaining}s before retry.`);
        
        // If we still have retries, wait and try again
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          return this.getToken(retries - 1);
        }
        
        return false;
      }
    }
    
    this.refill();
    
    // If we have less than 20% of our capacity, slow down dramatically to avoid hitting limits
    if (this.tokens < this.capacity * 0.2) {
      console.log(`Rate limit approaching: ${Math.floor(this.tokens)} tokens remaining. Adding delay...`);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds instead of 2
    }
    // If we have less than 50% of our capacity, add a smaller delay
    else if (this.tokens < this.capacity * 0.5) {
      console.log(`Rate limit caution: ${Math.floor(this.tokens)} tokens remaining. Adding short delay...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    // Wait for token to become available
    const waitTime = Math.ceil((1 - this.tokens) / this.refillRate * 1000);
    console.log(`Rate limit reached. Waiting ${waitTime}ms before continuing.`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    this.refill();
    this.tokens -= 1;
    return true;
  }

  markExhausted() {
    this.isExhausted = true;
    this.exhaustionTime = Date.now();
    console.log("API quota marked as exhausted. Will pause requests for 60 seconds.");
  }

  private refill() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const newTokens = timePassed * (this.refillRate / 1000);
    
    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }
}

// Create rate limiters based on Gemini's limits
// 15 requests per minute (RPM) - using the full available limit for Gemini 2.0 Flash
const geminiMinuteLimiter = new TokenBucket(15, 15/60);

// 1,000,000 tokens per minute (TPM)
const geminiTokenLimiter = new TokenBucket(1000000, 1000000/60);

// Gemini has a 1,500 RPD limit (requests per day)
const geminiDayLimiter = new TokenBucket(1500, 1500/(24*60));

// Helper function to wait for rate limit
export async function waitForRateLimit(): Promise<boolean> {
  const minuteOk = await geminiMinuteLimiter.getToken();
  if (!minuteOk) return false;
  
  const dayOk = await geminiDayLimiter.getToken();
  if (!dayOk) return false;
  
  return true;
}

// Helper to mark API as exhausted when we get a 429
export function markRateLimitExhausted() {
  geminiMinuteLimiter.markExhausted();
  geminiTokenLimiter.markExhausted();
} 