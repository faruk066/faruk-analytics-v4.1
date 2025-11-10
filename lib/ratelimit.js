const ratelimit = new Map();

export function checkRateLimit(ip, limit = 10, window = 60000) {
  const now = Date.now();
  const userRequests = ratelimit.get(ip) || [];
  
  const recentRequests = userRequests.filter(time => now - time < window);
  
  if (recentRequests.length >= limit) {
    return false;
  }
  
  recentRequests.push(now);
  ratelimit.set(ip, recentRequests);
  return true;
}