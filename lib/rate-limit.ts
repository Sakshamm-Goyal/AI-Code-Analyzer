class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly refillRate: number;
  private readonly capacity: number;

  constructor(capacity: number, refillRate: number) {
    this.tokens = capacity;
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  async getToken(): Promise<boolean> {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    // Wait for token to become available
    const waitTime = Math.ceil((1 - this.tokens) / this.refillRate * 1000);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    this.refill();
    this.tokens -= 1;
    return true;
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
// 15 requests per minute (RPM)
const geminiMinuteLimiter = new TokenBucket(15, 15/60);

// 1,000,000 tokens per minute (TPM)
export const geminiTokenLimiter = new TokenBucket(1000000, 1000000);

// Helper function to wait for rate limit
export async function waitForRateLimit() {
  return geminiMinuteLimiter.getToken();
} 