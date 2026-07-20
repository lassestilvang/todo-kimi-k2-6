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
import { z } from "zod";

/**
 * Maximum request body size (1MB) to prevent DoS attacks
 */
export const MAX_REQUEST_SIZE = stryMutAct_9fa48("4093") ? 1024 / 1024 : (stryCov_9fa48("4093"), 1024 * 1024);

/**
 * Maximum number of items to return in a single API response
 */
export const MAX_LIMIT = 100;

/**
 * Default pagination limit
 */
export const DEFAULT_LIMIT = 20;

/**
 * Sanitize user input to prevent XSS attacks.
 * Uses regex-based sanitization for consistent behavior across server and client environments.
 */
export function sanitizeString(input: string | null | undefined): string | null {
  if (stryMutAct_9fa48("4094")) {
    {}
  } else {
    stryCov_9fa48("4094");
    if (stryMutAct_9fa48("4097") ? false : stryMutAct_9fa48("4096") ? true : stryMutAct_9fa48("4095") ? input : (stryCov_9fa48("4095", "4096", "4097"), !input)) return null;
    let clean = input;

    // Remove script tags with their content first (most dangerous)
    clean = clean.replace(stryMutAct_9fa48("4103") ? /<script[^>]*>[\s\s]*?<\/script>/gi : stryMutAct_9fa48("4102") ? /<script[^>]*>[\S\S]*?<\/script>/gi : stryMutAct_9fa48("4101") ? /<script[^>]*>[^\s\S]*?<\/script>/gi : stryMutAct_9fa48("4100") ? /<script[^>]*>[\s\S]<\/script>/gi : stryMutAct_9fa48("4099") ? /<script[>]*>[\s\S]*?<\/script>/gi : stryMutAct_9fa48("4098") ? /<script[^>]>[\s\S]*?<\/script>/gi : (stryCov_9fa48("4098", "4099", "4100", "4101", "4102", "4103"), /<script[^>]*>[\s\S]*?<\/script>/gi), stryMutAct_9fa48("4104") ? "Stryker was here!" : (stryCov_9fa48("4104"), "")) // Script with content
    .replace(stryMutAct_9fa48("4106") ? /<script[>]*>/gi : stryMutAct_9fa48("4105") ? /<script[^>]>/gi : (stryCov_9fa48("4105", "4106"), /<script[^>]*>/gi), stryMutAct_9fa48("4107") ? "Stryker was here!" : (stryCov_9fa48("4107"), "")) // Opening script tag
    .replace(/<\/script>/gi, stryMutAct_9fa48("4108") ? "Stryker was here!" : (stryCov_9fa48("4108"), "")); // Closing script tag

    // Strip all remaining HTML tags
    clean = clean.replace(stryMutAct_9fa48("4110") ? /<[>]+>/g : stryMutAct_9fa48("4109") ? /<[^>]>/g : (stryCov_9fa48("4109", "4110"), /<[^>]+>/g), stryMutAct_9fa48("4111") ? "Stryker was here!" : (stryCov_9fa48("4111"), ""));

    // Remove dangerous attributes and protocols
    clean = stryMutAct_9fa48("4112") ? clean.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "") // Remove event handlers
    .replace(/on\w+=/gi, "") // Remove unquoted event handlers
    .replace(/javascript:/gi, "") // Remove javascript: URLs
    .replace(/vbscript:/gi, "") // Remove vbscript: URLs
    .replace(/data:text\/html/gi, "") // Remove data:text/html URLs
    : (stryCov_9fa48("4112"), clean.replace(stryMutAct_9fa48("4122") ? /on\w+\s*=\s*["'][^"']*[^"']/gi : stryMutAct_9fa48("4121") ? /on\w+\s*=\s*["']["']*["']/gi : stryMutAct_9fa48("4120") ? /on\w+\s*=\s*["'][^"']["']/gi : stryMutAct_9fa48("4119") ? /on\w+\s*=\s*[^"'][^"']*["']/gi : stryMutAct_9fa48("4118") ? /on\w+\s*=\S*["'][^"']*["']/gi : stryMutAct_9fa48("4117") ? /on\w+\s*=\s["'][^"']*["']/gi : stryMutAct_9fa48("4116") ? /on\w+\S*=\s*["'][^"']*["']/gi : stryMutAct_9fa48("4115") ? /on\w+\s=\s*["'][^"']*["']/gi : stryMutAct_9fa48("4114") ? /on\W+\s*=\s*["'][^"']*["']/gi : stryMutAct_9fa48("4113") ? /on\w\s*=\s*["'][^"']*["']/gi : (stryCov_9fa48("4113", "4114", "4115", "4116", "4117", "4118", "4119", "4120", "4121", "4122"), /on\w+\s*=\s*["'][^"']*["']/gi), stryMutAct_9fa48("4123") ? "Stryker was here!" : (stryCov_9fa48("4123"), "")) // Remove event handlers
    .replace(stryMutAct_9fa48("4125") ? /on\W+=/gi : stryMutAct_9fa48("4124") ? /on\w=/gi : (stryCov_9fa48("4124", "4125"), /on\w+=/gi), stryMutAct_9fa48("4126") ? "Stryker was here!" : (stryCov_9fa48("4126"), "")) // Remove unquoted event handlers
    .replace(/javascript:/gi, stryMutAct_9fa48("4127") ? "Stryker was here!" : (stryCov_9fa48("4127"), "")) // Remove javascript: URLs
    .replace(/vbscript:/gi, stryMutAct_9fa48("4128") ? "Stryker was here!" : (stryCov_9fa48("4128"), "")) // Remove vbscript: URLs
    .replace(/data:text\/html/gi, stryMutAct_9fa48("4129") ? "Stryker was here!" : (stryCov_9fa48("4129"), "")) // Remove data:text/html URLs
    .trim());
    return clean;
  }
}

/**
 * Sanitizes HTML content while preserving safe formatting tags.
 * Uses regex-based sanitization for consistent behavior across environments.
 * Allows basic formatting: b, i, u, strong, em, p, br, ul, ol, li, h1-3, code, pre
 */
export function sanitizeHtml(input: string | null | undefined): string | null {
  if (stryMutAct_9fa48("4130")) {
    {}
  } else {
    stryCov_9fa48("4130");
    if (stryMutAct_9fa48("4133") ? false : stryMutAct_9fa48("4132") ? true : stryMutAct_9fa48("4131") ? input : (stryCov_9fa48("4131", "4132", "4133"), !input)) return null;
    let clean = input;

    // Remove script tags with their content first (most dangerous)
    clean = clean.replace(stryMutAct_9fa48("4139") ? /<script[^>]*>[\s\s]*?<\/script>/gi : stryMutAct_9fa48("4138") ? /<script[^>]*>[\S\S]*?<\/script>/gi : stryMutAct_9fa48("4137") ? /<script[^>]*>[^\s\S]*?<\/script>/gi : stryMutAct_9fa48("4136") ? /<script[^>]*>[\s\S]<\/script>/gi : stryMutAct_9fa48("4135") ? /<script[>]*>[\s\S]*?<\/script>/gi : stryMutAct_9fa48("4134") ? /<script[^>]>[\s\S]*?<\/script>/gi : (stryCov_9fa48("4134", "4135", "4136", "4137", "4138", "4139"), /<script[^>]*>[\s\S]*?<\/script>/gi), stryMutAct_9fa48("4140") ? "Stryker was here!" : (stryCov_9fa48("4140"), "")).replace(stryMutAct_9fa48("4142") ? /<script[>]*>/gi : stryMutAct_9fa48("4141") ? /<script[^>]>/gi : (stryCov_9fa48("4141", "4142"), /<script[^>]*>/gi), stryMutAct_9fa48("4143") ? "Stryker was here!" : (stryCov_9fa48("4143"), "")).replace(/<\/script>/gi, stryMutAct_9fa48("4144") ? "Stryker was here!" : (stryCov_9fa48("4144"), ""));

    // Strip dangerous tags completely (keeping their content)
    clean = clean.replace(stryMutAct_9fa48("4147") ? /<\/?(iframe|object|embed|form|input|button|select|textarea)[>]*>/gi : stryMutAct_9fa48("4146") ? /<\/?(iframe|object|embed|form|input|button|select|textarea)[^>]>/gi : stryMutAct_9fa48("4145") ? /<\/(iframe|object|embed|form|input|button|select|textarea)[^>]*>/gi : (stryCov_9fa48("4145", "4146", "4147"), /<\/?(iframe|object|embed|form|input|button|select|textarea)[^>]*>/gi), stryMutAct_9fa48("4148") ? "Stryker was here!" : (stryCov_9fa48("4148"), ""));

    // Remove dangerous attributes and protocols
    clean = clean.replace(stryMutAct_9fa48("4158") ? /on\w+\s*=\s*["'][^"']*[^"']/gi : stryMutAct_9fa48("4157") ? /on\w+\s*=\s*["']["']*["']/gi : stryMutAct_9fa48("4156") ? /on\w+\s*=\s*["'][^"']["']/gi : stryMutAct_9fa48("4155") ? /on\w+\s*=\s*[^"'][^"']*["']/gi : stryMutAct_9fa48("4154") ? /on\w+\s*=\S*["'][^"']*["']/gi : stryMutAct_9fa48("4153") ? /on\w+\s*=\s["'][^"']*["']/gi : stryMutAct_9fa48("4152") ? /on\w+\S*=\s*["'][^"']*["']/gi : stryMutAct_9fa48("4151") ? /on\w+\s=\s*["'][^"']*["']/gi : stryMutAct_9fa48("4150") ? /on\W+\s*=\s*["'][^"']*["']/gi : stryMutAct_9fa48("4149") ? /on\w\s*=\s*["'][^"']*["']/gi : (stryCov_9fa48("4149", "4150", "4151", "4152", "4153", "4154", "4155", "4156", "4157", "4158"), /on\w+\s*=\s*["'][^"']*["']/gi), stryMutAct_9fa48("4159") ? "Stryker was here!" : (stryCov_9fa48("4159"), "")).replace(stryMutAct_9fa48("4161") ? /on\W+=/gi : stryMutAct_9fa48("4160") ? /on\w=/gi : (stryCov_9fa48("4160", "4161"), /on\w+=/gi), stryMutAct_9fa48("4162") ? "Stryker was here!" : (stryCov_9fa48("4162"), "")).replace(/javascript:/gi, stryMutAct_9fa48("4163") ? "Stryker was here!" : (stryCov_9fa48("4163"), "")).replace(/vbscript:/gi, stryMutAct_9fa48("4164") ? "Stryker was here!" : (stryCov_9fa48("4164"), "")).replace(/data:text\/html/gi, stryMutAct_9fa48("4165") ? "Stryker was here!" : (stryCov_9fa48("4165"), ""));

    // Clean up extra whitespace
    clean = stryMutAct_9fa48("4166") ? clean.replace(/\s+/g, " ") : (stryCov_9fa48("4166"), clean.replace(stryMutAct_9fa48("4168") ? /\S+/g : stryMutAct_9fa48("4167") ? /\s/g : (stryCov_9fa48("4167", "4168"), /\s+/g), stryMutAct_9fa48("4169") ? "" : (stryCov_9fa48("4169"), " ")).trim());
    return clean;
  }
}
export function isValidSortField(field: string): boolean {
  if (stryMutAct_9fa48("4170")) {
    {}
  } else {
    stryCov_9fa48("4170");
    return (stryMutAct_9fa48("4171") ? [] : (stryCov_9fa48("4171"), [stryMutAct_9fa48("4172") ? "" : (stryCov_9fa48("4172"), "name"), stryMutAct_9fa48("4173") ? "" : (stryCov_9fa48("4173"), "date"), stryMutAct_9fa48("4174") ? "" : (stryCov_9fa48("4174"), "deadline"), stryMutAct_9fa48("4175") ? "" : (stryCov_9fa48("4175"), "priority"), stryMutAct_9fa48("4176") ? "" : (stryCov_9fa48("4176"), "created_at"), stryMutAct_9fa48("4177") ? "" : (stryCov_9fa48("4177"), "updated_at")])).includes(field);
  }
}
export function isValidSortDirection(direction: string): boolean {
  if (stryMutAct_9fa48("4178")) {
    {}
  } else {
    stryCov_9fa48("4178");
    return (stryMutAct_9fa48("4179") ? [] : (stryCov_9fa48("4179"), [stryMutAct_9fa48("4180") ? "" : (stryCov_9fa48("4180"), "asc"), stryMutAct_9fa48("4181") ? "" : (stryCov_9fa48("4181"), "desc")])).includes(direction);
  }
}

/**
 * Validates and parses pagination parameters
 */
export function parsePaginationParams(limit?: string | null, offset?: string | null): {
  limit: number;
  offset: number;
} {
  if (stryMutAct_9fa48("4182")) {
    {}
  } else {
    stryCov_9fa48("4182");
    const parsedLimit = limit ? parseInt(limit, 10) : DEFAULT_LIMIT;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return stryMutAct_9fa48("4183") ? {} : (stryCov_9fa48("4183"), {
      limit: stryMutAct_9fa48("4184") ? Math.max(Math.max(1, isNaN(parsedLimit) ? DEFAULT_LIMIT : parsedLimit), MAX_LIMIT) : (stryCov_9fa48("4184"), Math.min(stryMutAct_9fa48("4185") ? Math.min(1, isNaN(parsedLimit) ? DEFAULT_LIMIT : parsedLimit) : (stryCov_9fa48("4185"), Math.max(1, isNaN(parsedLimit) ? DEFAULT_LIMIT : parsedLimit)), MAX_LIMIT)),
      offset: stryMutAct_9fa48("4186") ? Math.min(0, isNaN(parsedOffset) ? 0 : parsedOffset) : (stryCov_9fa48("4186"), Math.max(0, isNaN(parsedOffset) ? 0 : parsedOffset))
    });
  }
}
export const taskSchema = z.object(stryMutAct_9fa48("4187") ? {} : (stryCov_9fa48("4187"), {
  name: stryMutAct_9fa48("4189") ? z.string().max(1, "Task name is required").max(500, "Task name must be 500 characters or less") : stryMutAct_9fa48("4188") ? z.string().min(1, "Task name is required").min(500, "Task name must be 500 characters or less") : (stryCov_9fa48("4188", "4189"), z.string().min(1, stryMutAct_9fa48("4190") ? "" : (stryCov_9fa48("4190"), "Task name is required")).max(500, stryMutAct_9fa48("4191") ? "" : (stryCov_9fa48("4191"), "Task name must be 500 characters or less"))),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  list_id: z.number().optional(),
  date: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  estimate: z.string().optional().nullable(),
  actual_time: z.string().optional().nullable(),
  priority: z.enum(stryMutAct_9fa48("4192") ? [] : (stryCov_9fa48("4192"), [stryMutAct_9fa48("4193") ? "" : (stryCov_9fa48("4193"), "critical"), stryMutAct_9fa48("4194") ? "" : (stryCov_9fa48("4194"), "high"), stryMutAct_9fa48("4195") ? "" : (stryCov_9fa48("4195"), "medium"), stryMutAct_9fa48("4196") ? "" : (stryCov_9fa48("4196"), "low"), stryMutAct_9fa48("4197") ? "" : (stryCov_9fa48("4197"), "none")])).default(stryMutAct_9fa48("4198") ? "" : (stryCov_9fa48("4198"), "none")),
  recurring: z.enum(stryMutAct_9fa48("4199") ? [] : (stryCov_9fa48("4199"), [stryMutAct_9fa48("4200") ? "" : (stryCov_9fa48("4200"), "none"), stryMutAct_9fa48("4201") ? "" : (stryCov_9fa48("4201"), "daily"), stryMutAct_9fa48("4202") ? "" : (stryCov_9fa48("4202"), "weekly"), stryMutAct_9fa48("4203") ? "" : (stryCov_9fa48("4203"), "weekdays"), stryMutAct_9fa48("4204") ? "" : (stryCov_9fa48("4204"), "monthly"), stryMutAct_9fa48("4205") ? "" : (stryCov_9fa48("4205"), "yearly"), stryMutAct_9fa48("4206") ? "" : (stryCov_9fa48("4206"), "custom")])).default(stryMutAct_9fa48("4207") ? "" : (stryCov_9fa48("4207"), "none")),
  recurring_config: z.string().optional().nullable(),
  label_ids: z.array(z.number()).optional(),
  subtasks: z.array(z.string()).optional(),
  reminders: z.array(z.string()).optional(),
  blocker_ids: z.array(z.number()).optional()
}));
export const listSchema = z.object(stryMutAct_9fa48("4208") ? {} : (stryCov_9fa48("4208"), {
  name: stryMutAct_9fa48("4210") ? z.string().max(1, "List name is required").max(100, "List name must be 100 characters or less") : stryMutAct_9fa48("4209") ? z.string().min(1, "List name is required").min(100, "List name must be 100 characters or less") : (stryCov_9fa48("4209", "4210"), z.string().min(1, stryMutAct_9fa48("4211") ? "" : (stryCov_9fa48("4211"), "List name is required")).max(100, stryMutAct_9fa48("4212") ? "" : (stryCov_9fa48("4212"), "List name must be 100 characters or less"))),
  emoji: stryMutAct_9fa48("4213") ? z.string().min(2, "Emoji must be 2 characters or less").optional().default("📋") : (stryCov_9fa48("4213"), z.string().max(2, stryMutAct_9fa48("4214") ? "" : (stryCov_9fa48("4214"), "Emoji must be 2 characters or less")).optional().default(stryMutAct_9fa48("4215") ? "" : (stryCov_9fa48("4215"), "📋"))),
  color: z.string().regex(stryMutAct_9fa48("4221") ? /^#([A-Fa-f0-9]{6}|[^A-Fa-f0-9]{3})$/ : stryMutAct_9fa48("4220") ? /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9])$/ : stryMutAct_9fa48("4219") ? /^#([^A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/ : stryMutAct_9fa48("4218") ? /^#([A-Fa-f0-9]|[A-Fa-f0-9]{3})$/ : stryMutAct_9fa48("4217") ? /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/ : stryMutAct_9fa48("4216") ? /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/ : (stryCov_9fa48("4216", "4217", "4218", "4219", "4220", "4221"), /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/), stryMutAct_9fa48("4222") ? "" : (stryCov_9fa48("4222"), "Invalid color format")).optional().default(stryMutAct_9fa48("4223") ? "" : (stryCov_9fa48("4223"), "#6366f1"))
}));
export const labelSchema = z.object(stryMutAct_9fa48("4224") ? {} : (stryCov_9fa48("4224"), {
  name: stryMutAct_9fa48("4226") ? z.string().max(1, "Label name is required").max(50, "Label name must be 50 characters or less") : stryMutAct_9fa48("4225") ? z.string().min(1, "Label name is required").min(50, "Label name must be 50 characters or less") : (stryCov_9fa48("4225", "4226"), z.string().min(1, stryMutAct_9fa48("4227") ? "" : (stryCov_9fa48("4227"), "Label name is required")).max(50, stryMutAct_9fa48("4228") ? "" : (stryCov_9fa48("4228"), "Label name must be 50 characters or less"))),
  icon: stryMutAct_9fa48("4229") ? z.string().min(2, "Icon must be 2 characters or less").optional().default("🏷️") : (stryCov_9fa48("4229"), z.string().max(2, stryMutAct_9fa48("4230") ? "" : (stryCov_9fa48("4230"), "Icon must be 2 characters or less")).optional().default(stryMutAct_9fa48("4231") ? "" : (stryCov_9fa48("4231"), "🏷️"))),
  color: z.string().regex(stryMutAct_9fa48("4237") ? /^#([A-Fa-f0-9]{6}|[^A-Fa-f0-9]{3})$/ : stryMutAct_9fa48("4236") ? /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9])$/ : stryMutAct_9fa48("4235") ? /^#([^A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/ : stryMutAct_9fa48("4234") ? /^#([A-Fa-f0-9]|[A-Fa-f0-9]{3})$/ : stryMutAct_9fa48("4233") ? /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/ : stryMutAct_9fa48("4232") ? /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/ : (stryCov_9fa48("4232", "4233", "4234", "4235", "4236", "4237"), /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/), stryMutAct_9fa48("4238") ? "" : (stryCov_9fa48("4238"), "Invalid color format")).optional().default(stryMutAct_9fa48("4239") ? "" : (stryCov_9fa48("4239"), "#8b5cf6"))
}));
export type TaskFormData = z.infer<typeof taskSchema>;
export type ListFormData = z.infer<typeof listSchema>;
export type LabelFormData = z.infer<typeof labelSchema>;

// Additional validation schemas
export const updateTaskSchema = taskSchema.partial().extend(stryMutAct_9fa48("4240") ? {} : (stryCov_9fa48("4240"), {
  completed: z.boolean().optional()
}));
export const templateSchema = z.object(stryMutAct_9fa48("4241") ? {} : (stryCov_9fa48("4241"), {
  name: stryMutAct_9fa48("4242") ? z.string().max(1, "Template name is required") : (stryCov_9fa48("4242"), z.string().min(1, stryMutAct_9fa48("4243") ? "" : (stryCov_9fa48("4243"), "Template name is required"))),
  description: z.string().optional().nullable(),
  list_id: z.number().optional(),
  priority: z.enum(stryMutAct_9fa48("4244") ? [] : (stryCov_9fa48("4244"), [stryMutAct_9fa48("4245") ? "" : (stryCov_9fa48("4245"), "critical"), stryMutAct_9fa48("4246") ? "" : (stryCov_9fa48("4246"), "high"), stryMutAct_9fa48("4247") ? "" : (stryCov_9fa48("4247"), "medium"), stryMutAct_9fa48("4248") ? "" : (stryCov_9fa48("4248"), "low"), stryMutAct_9fa48("4249") ? "" : (stryCov_9fa48("4249"), "none")])).default(stryMutAct_9fa48("4250") ? "" : (stryCov_9fa48("4250"), "none")),
  label_ids: z.array(z.number()).optional(),
  subtasks: z.array(z.string()).optional()
}));
export const customViewSchema = z.object(stryMutAct_9fa48("4251") ? {} : (stryCov_9fa48("4251"), {
  name: stryMutAct_9fa48("4252") ? z.string().max(1, "View name is required") : (stryCov_9fa48("4252"), z.string().min(1, stryMutAct_9fa48("4253") ? "" : (stryCov_9fa48("4253"), "View name is required"))),
  filter_preset: z.enum(stryMutAct_9fa48("4254") ? [] : (stryCov_9fa48("4254"), [stryMutAct_9fa48("4255") ? "" : (stryCov_9fa48("4255"), "needs_attention"), stryMutAct_9fa48("4256") ? "" : (stryCov_9fa48("4256"), "this_week"), stryMutAct_9fa48("4257") ? "" : (stryCov_9fa48("4257"), "with_labels"), stryMutAct_9fa48("4258") ? "" : (stryCov_9fa48("4258"), "with_subtasks"), stryMutAct_9fa48("4259") ? "" : (stryCov_9fa48("4259"), "completed")])).optional().nullable(),
  list_id: z.number().optional().nullable(),
  label_ids: z.array(z.number()).optional(),
  priority: z.enum(stryMutAct_9fa48("4260") ? [] : (stryCov_9fa48("4260"), [stryMutAct_9fa48("4261") ? "" : (stryCov_9fa48("4261"), "critical"), stryMutAct_9fa48("4262") ? "" : (stryCov_9fa48("4262"), "high"), stryMutAct_9fa48("4263") ? "" : (stryCov_9fa48("4263"), "medium"), stryMutAct_9fa48("4264") ? "" : (stryCov_9fa48("4264"), "low"), stryMutAct_9fa48("4265") ? "" : (stryCov_9fa48("4265"), "none")])).optional().nullable(),
  sort_field: z.enum(stryMutAct_9fa48("4266") ? [] : (stryCov_9fa48("4266"), [stryMutAct_9fa48("4267") ? "" : (stryCov_9fa48("4267"), "name"), stryMutAct_9fa48("4268") ? "" : (stryCov_9fa48("4268"), "date"), stryMutAct_9fa48("4269") ? "" : (stryCov_9fa48("4269"), "deadline"), stryMutAct_9fa48("4270") ? "" : (stryCov_9fa48("4270"), "priority"), stryMutAct_9fa48("4271") ? "" : (stryCov_9fa48("4271"), "created_at"), stryMutAct_9fa48("4272") ? "" : (stryCov_9fa48("4272"), "updated_at")])).default(stryMutAct_9fa48("4273") ? "" : (stryCov_9fa48("4273"), "date")),
  sort_direction: z.enum(stryMutAct_9fa48("4274") ? [] : (stryCov_9fa48("4274"), [stryMutAct_9fa48("4275") ? "" : (stryCov_9fa48("4275"), "asc"), stryMutAct_9fa48("4276") ? "" : (stryCov_9fa48("4276"), "desc")])).default(stryMutAct_9fa48("4277") ? "" : (stryCov_9fa48("4277"), "asc")),
  view_type: z.enum(stryMutAct_9fa48("4278") ? [] : (stryCov_9fa48("4278"), [stryMutAct_9fa48("4279") ? "" : (stryCov_9fa48("4279"), "today"), stryMutAct_9fa48("4280") ? "" : (stryCov_9fa48("4280"), "next7"), stryMutAct_9fa48("4281") ? "" : (stryCov_9fa48("4281"), "upcoming"), stryMutAct_9fa48("4282") ? "" : (stryCov_9fa48("4282"), "all"), stryMutAct_9fa48("4283") ? "" : (stryCov_9fa48("4283"), "list"), stryMutAct_9fa48("4284") ? "" : (stryCov_9fa48("4284"), "blocked")])).default(stryMutAct_9fa48("4285") ? "" : (stryCov_9fa48("4285"), "today"))
}));
export const timeEntrySchema = z.object(stryMutAct_9fa48("4286") ? {} : (stryCov_9fa48("4286"), {
  task_id: stryMutAct_9fa48("4287") ? z.number().max(1, "Task ID is required") : (stryCov_9fa48("4287"), z.number().min(1, stryMutAct_9fa48("4288") ? "" : (stryCov_9fa48("4288"), "Task ID is required"))),
  start_time: stryMutAct_9fa48("4289") ? z.string().max(1, "Start time is required") : (stryCov_9fa48("4289"), z.string().min(1, stryMutAct_9fa48("4290") ? "" : (stryCov_9fa48("4290"), "Start time is required"))),
  end_time: z.string().optional().nullable(),
  duration_seconds: stryMutAct_9fa48("4291") ? z.number().max(0).optional().nullable() : (stryCov_9fa48("4291"), z.number().min(0).optional().nullable()),
  description: z.string().optional().nullable()
}));

// New validation schemas
export const goalSchema = z.object(stryMutAct_9fa48("4292") ? {} : (stryCov_9fa48("4292"), {
  name: stryMutAct_9fa48("4294") ? z.string().max(1, "Goal name is required").max(200, "Goal name must be 200 characters or less") : stryMutAct_9fa48("4293") ? z.string().min(1, "Goal name is required").min(200, "Goal name must be 200 characters or less") : (stryCov_9fa48("4293", "4294"), z.string().min(1, stryMutAct_9fa48("4295") ? "" : (stryCov_9fa48("4295"), "Goal name is required")).max(200, stryMutAct_9fa48("4296") ? "" : (stryCov_9fa48("4296"), "Goal name must be 200 characters or less"))),
  description: z.string().optional().nullable(),
  target_count: stryMutAct_9fa48("4297") ? z.number().max(1, "Target count must be at least 1") : (stryCov_9fa48("4297"), z.number().min(1, stryMutAct_9fa48("4298") ? "" : (stryCov_9fa48("4298"), "Target count must be at least 1"))),
  target_unit: stryMutAct_9fa48("4299") ? z.string().max(1, "Target unit is required") : (stryCov_9fa48("4299"), z.string().min(1, stryMutAct_9fa48("4300") ? "" : (stryCov_9fa48("4300"), "Target unit is required"))),
  period: z.enum(stryMutAct_9fa48("4301") ? [] : (stryCov_9fa48("4301"), [stryMutAct_9fa48("4302") ? "" : (stryCov_9fa48("4302"), "daily"), stryMutAct_9fa48("4303") ? "" : (stryCov_9fa48("4303"), "weekly"), stryMutAct_9fa48("4304") ? "" : (stryCov_9fa48("4304"), "monthly"), stryMutAct_9fa48("4305") ? "" : (stryCov_9fa48("4305"), "yearly")]))
}));
export const workspaceSchema = z.object(stryMutAct_9fa48("4306") ? {} : (stryCov_9fa48("4306"), {
  name: stryMutAct_9fa48("4308") ? z.string().max(1, "Workspace name is required").max(100, "Workspace name must be 100 characters or less") : stryMutAct_9fa48("4307") ? z.string().min(1, "Workspace name is required").min(100, "Workspace name must be 100 characters or less") : (stryCov_9fa48("4307", "4308"), z.string().min(1, stryMutAct_9fa48("4309") ? "" : (stryCov_9fa48("4309"), "Workspace name is required")).max(100, stryMutAct_9fa48("4310") ? "" : (stryCov_9fa48("4310"), "Workspace name must be 100 characters or less"))),
  description: z.string().optional().nullable()
}));
export const reminderSchema = z.object(stryMutAct_9fa48("4311") ? {} : (stryCov_9fa48("4311"), {
  task_id: stryMutAct_9fa48("4312") ? z.number().max(1, "Task ID is required") : (stryCov_9fa48("4312"), z.number().min(1, stryMutAct_9fa48("4313") ? "" : (stryCov_9fa48("4313"), "Task ID is required"))),
  remind_at: stryMutAct_9fa48("4314") ? z.string().max(1, "Reminder time is required") : (stryCov_9fa48("4314"), z.string().min(1, stryMutAct_9fa48("4315") ? "" : (stryCov_9fa48("4315"), "Reminder time is required")))
}));
export const subtaskSchema = z.object(stryMutAct_9fa48("4316") ? {} : (stryCov_9fa48("4316"), {
  name: stryMutAct_9fa48("4317") ? z.string().max(1, "Subtask name is required") : (stryCov_9fa48("4317"), z.string().min(1, stryMutAct_9fa48("4318") ? "" : (stryCov_9fa48("4318"), "Subtask name is required")))
}));
export const searchParamsSchema = z.object(stryMutAct_9fa48("4319") ? {} : (stryCov_9fa48("4319"), {
  query: z.string().optional(),
  view: z.enum(stryMutAct_9fa48("4320") ? [] : (stryCov_9fa48("4320"), [stryMutAct_9fa48("4321") ? "" : (stryCov_9fa48("4321"), "today"), stryMutAct_9fa48("4322") ? "" : (stryCov_9fa48("4322"), "next7"), stryMutAct_9fa48("4323") ? "" : (stryCov_9fa48("4323"), "upcoming"), stryMutAct_9fa48("4324") ? "" : (stryCov_9fa48("4324"), "all"), stryMutAct_9fa48("4325") ? "" : (stryCov_9fa48("4325"), "blocked")])).optional(),
  listId: z.string().optional(),
  includeCompleted: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  priority: z.enum(stryMutAct_9fa48("4326") ? [] : (stryCov_9fa48("4326"), [stryMutAct_9fa48("4327") ? "" : (stryCov_9fa48("4327"), "critical"), stryMutAct_9fa48("4328") ? "" : (stryCov_9fa48("4328"), "high"), stryMutAct_9fa48("4329") ? "" : (stryCov_9fa48("4329"), "medium"), stryMutAct_9fa48("4330") ? "" : (stryCov_9fa48("4330"), "low"), stryMutAct_9fa48("4331") ? "" : (stryCov_9fa48("4331"), "none")])).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
  q: z.string().optional()
}));