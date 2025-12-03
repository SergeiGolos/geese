/**
 * RateLimiter - Token bucket rate limiting implementation
 * 
 * Provides rate limiting functionality to prevent resource exhaustion
 * from excessive operations (e.g., file reads, API calls).
 */

/**
 * Token bucket rate limiter
 * 
 * Uses the token bucket algorithm to enforce rate limits.
 * Tokens are added at a steady rate, and each operation consumes a token.
 * If no tokens are available, the operation must wait.
 */
class RateLimiter {
  /**
   * Create a new rate limiter
   * 
   * @param {number} maxPerSecond - Maximum operations allowed per second (default: 100)
   * @param {number} burstSize - Maximum burst size (default: same as maxPerSecond)
   * 
   * @example
   * // Allow 50 operations per second
   * const limiter = new RateLimiter(50);
   * 
   * // Allow 100 ops/sec with burst of 200
   * const limiter = new RateLimiter(100, 200);
   */
  constructor(maxPerSecond = 100, burstSize = null) {
    if (typeof maxPerSecond !== 'number' || maxPerSecond <= 0) {
      throw new Error('maxPerSecond must be a positive number');
    }
    
    this.maxPerSecond = maxPerSecond;
    this.burstSize = burstSize || maxPerSecond;
    this.tokens = this.burstSize;
    this.lastRefill = Date.now();
  }
  
  /**
   * Acquire a token to perform an operation
   * Waits if no tokens are available
   * 
   * Note: This implementation is safe for single-threaded JavaScript,
   * but in a multi-threaded environment you would need proper locking.
   * 
   * @returns {Promise<void>} Resolves when a token is acquired
   * 
   * @example
   * const limiter = new RateLimiter(50);
   * 
   * async function readFileWithLimit(path) {
   *   await limiter.acquire();
   *   return fs.readFile(path);
   * }
   */
  async acquire() {
    // Refill tokens based on time passed
    this._refillSync();
    
    // If we have tokens available, consume one and return immediately
    if (this.tokens >= 1) {
      this.tokens--;
      return;
    }
    
    // No tokens available - wait and retry
    // Calculate wait time to get at least one token
    const waitTime = (1 / this.maxPerSecond) * 1000;
    await this._sleep(waitTime);
    
    // Recursive call - will refill and try again
    return this.acquire();
  }
  
  /**
   * Try to acquire a token without waiting
   * 
   * @returns {boolean} True if token was acquired, false otherwise
   * 
   * @example
   * const limiter = new RateLimiter(50);
   * 
   * if (limiter.tryAcquire()) {
   *   // Perform operation
   *   console.log('Operation allowed');
   * } else {
   *   console.log('Rate limit exceeded');
   * }
   */
  tryAcquire() {
    this._refillSync();
    
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }
    
    return false;
  }
  
  /**
   * Get the current number of available tokens
   * 
   * @returns {number} Number of available tokens
   * 
   * @example
   * const limiter = new RateLimiter(50);
   * console.log(limiter.getAvailableTokens()); // 50
   */
  getAvailableTokens() {
    this._refillSync();
    return Math.floor(this.tokens);
  }
  
  /**
   * Reset the rate limiter to its initial state
   * 
   * @example
   * const limiter = new RateLimiter(50);
   * // ... use limiter ...
   * limiter.reset(); // Reset to full capacity
   */
  reset() {
    this.tokens = this.burstSize;
    this.lastRefill = Date.now();
  }
  
  /**
   * Refill tokens based on time passed
   * @private
   */
  _refillSync() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = (timePassed / 1000) * this.maxPerSecond;
    
    this.tokens = Math.min(this.burstSize, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
  
  /**
   * Sleep for a specified duration
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = RateLimiter;
