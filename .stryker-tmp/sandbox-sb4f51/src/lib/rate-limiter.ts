// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { config } from "./config";
export interface RateLimitConfig {
  windowMs: number;
  max: number;
}
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}

/**
 * Rate Limiter interface - supports both in-memory and Redis backends
 */
interface RateLimiterBackend {
  isAllowed(key: string, limitConfig: RateLimitConfig): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

/**
 * Database-backed rate limiter for persistence across restarts
 * Note: Currently not used due to circular dependency with db module
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class DatabaseRateLimiter implements RateLimiterBackend {
  private db: ReturnType<typeof import("./db").getDb>;
  constructor(db: ReturnType<typeof import("./db").getDb>) {
    if (stryMutAct_9fa48("3944")) {
      {}
    } else {
      stryCov_9fa48("3944");
      this.db = db;
    }
  }
  async isAllowed(key: string, limitConfig: RateLimitConfig): Promise<RateLimitResult> {
    if (stryMutAct_9fa48("3945")) {
      {}
    } else {
      stryCov_9fa48("3945");
      const now = Date.now();
      const resetTime = stryMutAct_9fa48("3946") ? now - limitConfig.windowMs : (stryCov_9fa48("3946"), now + limitConfig.windowMs);

      // Try to insert or update the rate limit record
      try {
        if (stryMutAct_9fa48("3947")) {
          {}
        } else {
          stryCov_9fa48("3947");
          const stmt = this.db.prepare(stryMutAct_9fa48("3948") ? `` : (stryCov_9fa48("3948"), `
        INSERT INTO rate_limit_log (key, count, reset_time)
        VALUES (?, 1, ?)
        ON CONFLICT(key)
        DO UPDATE SET
          count = CASE WHEN reset_time > ? THEN count + 1 ELSE 1 END,
          reset_time = CASE WHEN reset_time > ? THEN reset_time ELSE ? END
      `));
          const result = stmt.run(key, resetTime, now, now, resetTime);
          const newCount = (stryMutAct_9fa48("3952") ? result.changes <= 0 : stryMutAct_9fa48("3951") ? result.changes >= 0 : stryMutAct_9fa48("3950") ? false : stryMutAct_9fa48("3949") ? true : (stryCov_9fa48("3949", "3950", "3951", "3952"), result.changes > 0)) ? stryMutAct_9fa48("3955") ? this.db.prepare("SELECT count FROM rate_limit_log WHERE key = ?").get(key)?.count && 1 : stryMutAct_9fa48("3954") ? false : stryMutAct_9fa48("3953") ? true : (stryCov_9fa48("3953", "3954", "3955"), (stryMutAct_9fa48("3956") ? this.db.prepare("SELECT count FROM rate_limit_log WHERE key = ?").get(key).count : (stryCov_9fa48("3956"), this.db.prepare(stryMutAct_9fa48("3957") ? "" : (stryCov_9fa48("3957"), "SELECT count FROM rate_limit_log WHERE key = ?")).get(key)?.count)) || 1) : 1;
          const allowed = stryMutAct_9fa48("3961") ? newCount > limitConfig.max : stryMutAct_9fa48("3960") ? newCount < limitConfig.max : stryMutAct_9fa48("3959") ? false : stryMutAct_9fa48("3958") ? true : (stryCov_9fa48("3958", "3959", "3960", "3961"), newCount <= limitConfig.max);
          const currentCount = allowed ? newCount : limitConfig.max;
          return stryMutAct_9fa48("3962") ? {} : (stryCov_9fa48("3962"), {
            allowed,
            remaining: stryMutAct_9fa48("3963") ? Math.min(0, limitConfig.max - currentCount) : (stryCov_9fa48("3963"), Math.max(0, stryMutAct_9fa48("3964") ? limitConfig.max + currentCount : (stryCov_9fa48("3964"), limitConfig.max - currentCount))),
            resetTime: resetTime,
            limit: limitConfig.max
          });
        }
      } catch (error) {
        if (stryMutAct_9fa48("3965")) {
          {}
        } else {
          stryCov_9fa48("3965");
          console.error(stryMutAct_9fa48("3966") ? "" : (stryCov_9fa48("3966"), "Database rate limiter error:"), error);
          // Fall back to allowing the request
          return stryMutAct_9fa48("3967") ? {} : (stryCov_9fa48("3967"), {
            allowed: stryMutAct_9fa48("3968") ? false : (stryCov_9fa48("3968"), true),
            remaining: limitConfig.max,
            resetTime,
            limit: limitConfig.max
          });
        }
      }
    }
  }
  async reset(key: string): Promise<void> {
    if (stryMutAct_9fa48("3969")) {
      {}
    } else {
      stryCov_9fa48("3969");
      this.db.prepare(stryMutAct_9fa48("3970") ? "" : (stryCov_9fa48("3970"), "DELETE FROM rate_limit_log WHERE key = ?")).run(key);
    }
  }
}

/**
 * In-memory rate limiter (for development/testing)
 */
class MemoryRateLimiter implements RateLimiterBackend {
  private store: Map<string, {
    count: number;
    resetTime: number;
  }>;
  constructor() {
    if (stryMutAct_9fa48("3971")) {
      {}
    } else {
      stryCov_9fa48("3971");
      this.store = new Map();

      // Cleanup expired entries periodically
      setInterval(() => {
        if (stryMutAct_9fa48("3972")) {
          {}
        } else {
          stryCov_9fa48("3972");
          const now = Date.now();
          for (const [key, value] of this.store.entries()) {
            if (stryMutAct_9fa48("3973")) {
              {}
            } else {
              stryCov_9fa48("3973");
              if (stryMutAct_9fa48("3977") ? now <= value.resetTime : stryMutAct_9fa48("3976") ? now >= value.resetTime : stryMutAct_9fa48("3975") ? false : stryMutAct_9fa48("3974") ? true : (stryCov_9fa48("3974", "3975", "3976", "3977"), now > value.resetTime)) {
                if (stryMutAct_9fa48("3978")) {
                  {}
                } else {
                  stryCov_9fa48("3978");
                  this.store.delete(key);
                }
              }
            }
          }
        }
      }, 60000);
    }
  }
  async isAllowed(key: string, limitConfig: RateLimitConfig): Promise<RateLimitResult> {
    if (stryMutAct_9fa48("3979")) {
      {}
    } else {
      stryCov_9fa48("3979");
      const now = Date.now();
      const resetTime = stryMutAct_9fa48("3980") ? now - limitConfig.windowMs : (stryCov_9fa48("3980"), now + limitConfig.windowMs);
      const record = this.store.get(key);
      if (stryMutAct_9fa48("3983") ? !record && now > record.resetTime : stryMutAct_9fa48("3982") ? false : stryMutAct_9fa48("3981") ? true : (stryCov_9fa48("3981", "3982", "3983"), (stryMutAct_9fa48("3984") ? record : (stryCov_9fa48("3984"), !record)) || (stryMutAct_9fa48("3987") ? now <= record.resetTime : stryMutAct_9fa48("3986") ? now >= record.resetTime : stryMutAct_9fa48("3985") ? false : (stryCov_9fa48("3985", "3986", "3987"), now > record.resetTime)))) {
        if (stryMutAct_9fa48("3988")) {
          {}
        } else {
          stryCov_9fa48("3988");
          this.store.set(key, stryMutAct_9fa48("3989") ? {} : (stryCov_9fa48("3989"), {
            count: 1,
            resetTime
          }));
          return stryMutAct_9fa48("3990") ? {} : (stryCov_9fa48("3990"), {
            allowed: stryMutAct_9fa48("3991") ? false : (stryCov_9fa48("3991"), true),
            remaining: stryMutAct_9fa48("3992") ? limitConfig.max + 1 : (stryCov_9fa48("3992"), limitConfig.max - 1),
            resetTime,
            limit: limitConfig.max
          });
        }
      }
      if (stryMutAct_9fa48("3996") ? record.count < limitConfig.max : stryMutAct_9fa48("3995") ? record.count > limitConfig.max : stryMutAct_9fa48("3994") ? false : stryMutAct_9fa48("3993") ? true : (stryCov_9fa48("3993", "3994", "3995", "3996"), record.count >= limitConfig.max)) {
        if (stryMutAct_9fa48("3997")) {
          {}
        } else {
          stryCov_9fa48("3997");
          return stryMutAct_9fa48("3998") ? {} : (stryCov_9fa48("3998"), {
            allowed: stryMutAct_9fa48("3999") ? true : (stryCov_9fa48("3999"), false),
            remaining: 0,
            resetTime: record.resetTime,
            limit: limitConfig.max
          });
        }
      }
      stryMutAct_9fa48("4000") ? record.count-- : (stryCov_9fa48("4000"), record.count++);
      this.store.set(key, record);
      return stryMutAct_9fa48("4001") ? {} : (stryCov_9fa48("4001"), {
        allowed: stryMutAct_9fa48("4002") ? false : (stryCov_9fa48("4002"), true),
        remaining: stryMutAct_9fa48("4003") ? limitConfig.max + record.count : (stryCov_9fa48("4003"), limitConfig.max - record.count),
        resetTime,
        limit: limitConfig.max
      });
    }
  }
  async reset(key: string): Promise<void> {
    if (stryMutAct_9fa48("4004")) {
      {}
    } else {
      stryCov_9fa48("4004");
      this.store.delete(key);
    }
  }
}

/**
 * Redis-based rate limiter (for production)
 */
class RedisRateLimiter implements RateLimiterBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Redis type is complex
  private redis: any;
  constructor(redisUrl?: string) {
    if (stryMutAct_9fa48("4005")) {
      {}
    } else {
      stryCov_9fa48("4005");
      if (stryMutAct_9fa48("4007") ? false : stryMutAct_9fa48("4006") ? true : (stryCov_9fa48("4006", "4007"), redisUrl)) {
        if (stryMutAct_9fa48("4008")) {
          {}
        } else {
          stryCov_9fa48("4008");
          try {
            if (stryMutAct_9fa48("4009")) {
              {}
            } else {
              stryCov_9fa48("4009");
              // Dynamic import to avoid issues if Redis isn't configured
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              const Redis = require("ioredis");
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              this.redis = new Redis(redisUrl) as any;
            }
          } catch {
            if (stryMutAct_9fa48("4010")) {
              {}
            } else {
              stryCov_9fa48("4010");
              // Fall back to memory if Redis unavailable
              console.warn(stryMutAct_9fa48("4011") ? "" : (stryCov_9fa48("4011"), "Redis not available, falling back to in-memory rate limiting"));
            }
          }
        }
      }
    }
  }
  async isAllowed(key: string, limitConfig: RateLimitConfig): Promise<RateLimitResult> {
    if (stryMutAct_9fa48("4012")) {
      {}
    } else {
      stryCov_9fa48("4012");
      if (stryMutAct_9fa48("4015") ? false : stryMutAct_9fa48("4014") ? true : stryMutAct_9fa48("4013") ? this.redis : (stryCov_9fa48("4013", "4014", "4015"), !this.redis)) {
        if (stryMutAct_9fa48("4016")) {
          {}
        } else {
          stryCov_9fa48("4016");
          // Fall back to memory
          return new MemoryRateLimiter().isAllowed(key, limitConfig);
        }
      }
      try {
        if (stryMutAct_9fa48("4017")) {
          {}
        } else {
          stryCov_9fa48("4017");
          const resetTime = stryMutAct_9fa48("4018") ? Date.now() - limitConfig.windowMs : (stryCov_9fa48("4018"), Date.now() + limitConfig.windowMs);
          const redisKey = stryMutAct_9fa48("4019") ? `` : (stryCov_9fa48("4019"), `rate_limit:${key}`);
          const multi = this.redis.multi();
          multi.incr(redisKey);
          multi.ttl(redisKey);
          multi.expireat(redisKey, Math.floor(stryMutAct_9fa48("4020") ? resetTime * 1000 : (stryCov_9fa48("4020"), resetTime / 1000)));
          const results = await multi.exec();
          const count = results?.[0]?.[1] as number;
          const ttl = results?.[1]?.[1] as number;
          const allowed = stryMutAct_9fa48("4024") ? count > limitConfig.max : stryMutAct_9fa48("4023") ? count < limitConfig.max : stryMutAct_9fa48("4022") ? false : stryMutAct_9fa48("4021") ? true : (stryCov_9fa48("4021", "4022", "4023", "4024"), count <= limitConfig.max);
          const remaining = stryMutAct_9fa48("4025") ? Math.min(0, limitConfig.max - count) : (stryCov_9fa48("4025"), Math.max(0, stryMutAct_9fa48("4026") ? limitConfig.max + count : (stryCov_9fa48("4026"), limitConfig.max - count)));
          return stryMutAct_9fa48("4027") ? {} : (stryCov_9fa48("4027"), {
            allowed,
            remaining,
            resetTime: ttl ? stryMutAct_9fa48("4028") ? Date.now() - ttl * 1000 : (stryCov_9fa48("4028"), Date.now() + (stryMutAct_9fa48("4029") ? ttl / 1000 : (stryCov_9fa48("4029"), ttl * 1000))) : resetTime,
            limit: limitConfig.max
          });
        }
      } catch (error) {
        if (stryMutAct_9fa48("4030")) {
          {}
        } else {
          stryCov_9fa48("4030");
          console.error(stryMutAct_9fa48("4031") ? "" : (stryCov_9fa48("4031"), "Redis rate limiter error:"), error);
          const resetTime = stryMutAct_9fa48("4032") ? Date.now() - limitConfig.windowMs : (stryCov_9fa48("4032"), Date.now() + limitConfig.windowMs);
          return stryMutAct_9fa48("4033") ? {} : (stryCov_9fa48("4033"), {
            allowed: stryMutAct_9fa48("4034") ? false : (stryCov_9fa48("4034"), true),
            remaining: limitConfig.max,
            resetTime,
            limit: limitConfig.max
          });
        }
      }
    }
  }
  async reset(key: string): Promise<void> {
    if (stryMutAct_9fa48("4035")) {
      {}
    } else {
      stryCov_9fa48("4035");
      if (stryMutAct_9fa48("4037") ? false : stryMutAct_9fa48("4036") ? true : (stryCov_9fa48("4036", "4037"), this.redis)) {
        if (stryMutAct_9fa48("4038")) {
          {}
        } else {
          stryCov_9fa48("4038");
          await this.redis.del(stryMutAct_9fa48("4039") ? `` : (stryCov_9fa48("4039"), `rate_limit:${key}`));
        }
      }
    }
  }
}

// Select backend based on configuration
// Priority: Redis > Database > Memory
function initBackend(): RateLimiterBackend {
  if (stryMutAct_9fa48("4040")) {
    {}
  } else {
    stryCov_9fa48("4040");
    if (stryMutAct_9fa48("4042") ? false : stryMutAct_9fa48("4041") ? true : (stryCov_9fa48("4041", "4042"), config.redis.url)) {
      if (stryMutAct_9fa48("4043")) {
        {}
      } else {
        stryCov_9fa48("4043");
        return new RedisRateLimiter(config.redis.url);
      }
    }
    // Use memory backend as fallback (database backend has circular dependency issues)
    return new MemoryRateLimiter();
  }
}
const backend: RateLimiterBackend = initBackend();

// Named rate limiters for different endpoint types
export const rateLimits = stryMutAct_9fa48("4044") ? {} : (stryCov_9fa48("4044"), {
  api: stryMutAct_9fa48("4045") ? {} : (stryCov_9fa48("4045"), {
    windowMs: stryMutAct_9fa48("4046") ? 60 / 1000 : (stryCov_9fa48("4046"), 60 * 1000),
    max: 100
  }),
  auth: stryMutAct_9fa48("4047") ? {} : (stryCov_9fa48("4047"), {
    windowMs: stryMutAct_9fa48("4048") ? 15 * 60 / 1000 : (stryCov_9fa48("4048"), (stryMutAct_9fa48("4049") ? 15 / 60 : (stryCov_9fa48("4049"), 15 * 60)) * 1000),
    max: 10
  }),
  ai: stryMutAct_9fa48("4050") ? {} : (stryCov_9fa48("4050"), {
    windowMs: stryMutAct_9fa48("4051") ? 60 / 1000 : (stryCov_9fa48("4051"), 60 * 1000),
    max: 20
  }),
  strict: stryMutAct_9fa48("4052") ? {} : (stryCov_9fa48("4052"), {
    windowMs: stryMutAct_9fa48("4053") ? 60 / 1000 : (stryCov_9fa48("4053"), 60 * 1000),
    max: 30
  })
});

/**
 * Check if a request is allowed based on rate limits
 */
export async function checkRateLimit(key: string, limitConfig: RateLimitConfig): Promise<RateLimitResult> {
  if (stryMutAct_9fa48("4054")) {
    {}
  } else {
    stryCov_9fa48("4054");
    return backend.isAllowed(key, limitConfig);
  }
}

/**
 * Get a client identification key from the request
 * Handles various proxy headers for accurate client identification
 */
export function getClientKey(request: Request): string {
  if (stryMutAct_9fa48("4055")) {
    {}
  } else {
    stryCov_9fa48("4055");
    // Try X-Forwarded-For first (standard proxy header)
    const forwardedFor = stryMutAct_9fa48("4058") ? request.headers.get("x-forwarded-for").split(",")[0]?.trim() : stryMutAct_9fa48("4057") ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() : stryMutAct_9fa48("4056") ? request.headers.get("x-forwarded-for")?.split(",")[0] : (stryCov_9fa48("4056", "4057", "4058"), request.headers.get(stryMutAct_9fa48("4059") ? "" : (stryCov_9fa48("4059"), "x-forwarded-for"))?.split(stryMutAct_9fa48("4060") ? "" : (stryCov_9fa48("4060"), ","))[0]?.trim());

    // Fall back to X-Real-IP (used by some proxies)
    const realIp = request.headers.get(stryMutAct_9fa48("4061") ? "" : (stryCov_9fa48("4061"), "x-real-ip"));

    // Use the first available IP
    const ip = stryMutAct_9fa48("4064") ? (forwardedFor || realIp) && "127.0.0.1" : stryMutAct_9fa48("4063") ? false : stryMutAct_9fa48("4062") ? true : (stryCov_9fa48("4062", "4063", "4064"), (stryMutAct_9fa48("4066") ? forwardedFor && realIp : stryMutAct_9fa48("4065") ? false : (stryCov_9fa48("4065", "4066"), forwardedFor || realIp)) || (stryMutAct_9fa48("4067") ? "" : (stryCov_9fa48("4067"), "127.0.0.1")));

    // Combine with user ID if available (for authenticated users)
    const userId = stryMutAct_9fa48("4070") ? request.headers.get("x-user-id") && "anonymous" : stryMutAct_9fa48("4069") ? false : stryMutAct_9fa48("4068") ? true : (stryCov_9fa48("4068", "4069", "4070"), request.headers.get(stryMutAct_9fa48("4071") ? "" : (stryCov_9fa48("4071"), "x-user-id")) || (stryMutAct_9fa48("4072") ? "" : (stryCov_9fa48("4072"), "anonymous")));
    return stryMutAct_9fa48("4073") ? `` : (stryCov_9fa48("4073"), `${ip}:${userId}`);
  }
}

/**
 * Get just the IP address from the request
 */
export function getClientIp(request: Request): string {
  if (stryMutAct_9fa48("4074")) {
    {}
  } else {
    stryCov_9fa48("4074");
    return getClientKey(request).split(stryMutAct_9fa48("4075") ? "" : (stryCov_9fa48("4075"), ":"))[0];
  }
}

/**
 * Middleware helper for API routes
 */
export async function withRateLimit(request: Request, limitConfig: RateLimitConfig): Promise<{
  allowed: boolean;
  response?: Response;
}> {
  if (stryMutAct_9fa48("4076")) {
    {}
  } else {
    stryCov_9fa48("4076");
    const key = getClientKey(request);
    const result = await checkRateLimit(key, limitConfig);
    if (stryMutAct_9fa48("4079") ? false : stryMutAct_9fa48("4078") ? true : stryMutAct_9fa48("4077") ? result.allowed : (stryCov_9fa48("4077", "4078", "4079"), !result.allowed)) {
      if (stryMutAct_9fa48("4080")) {
        {}
      } else {
        stryCov_9fa48("4080");
        return stryMutAct_9fa48("4081") ? {} : (stryCov_9fa48("4081"), {
          allowed: stryMutAct_9fa48("4082") ? true : (stryCov_9fa48("4082"), false),
          response: new Response(JSON.stringify(stryMutAct_9fa48("4083") ? {} : (stryCov_9fa48("4083"), {
            error: stryMutAct_9fa48("4084") ? "" : (stryCov_9fa48("4084"), "Too many requests"),
            code: stryMutAct_9fa48("4085") ? "" : (stryCov_9fa48("4085"), "RATE_LIMITED"),
            resetTime: result.resetTime
          })), stryMutAct_9fa48("4086") ? {} : (stryCov_9fa48("4086"), {
            status: 429,
            headers: stryMutAct_9fa48("4087") ? {} : (stryCov_9fa48("4087"), {
              "Content-Type": stryMutAct_9fa48("4088") ? "" : (stryCov_9fa48("4088"), "application/json"),
              "Retry-After": Math.ceil(stryMutAct_9fa48("4089") ? (result.resetTime - Date.now()) * 1000 : (stryCov_9fa48("4089"), (stryMutAct_9fa48("4090") ? result.resetTime + Date.now() : (stryCov_9fa48("4090"), result.resetTime - Date.now())) / 1000)).toString()
            })
          }))
        });
      }
    }
    return stryMutAct_9fa48("4091") ? {} : (stryCov_9fa48("4091"), {
      allowed: stryMutAct_9fa48("4092") ? false : (stryCov_9fa48("4092"), true)
    });
  }
}