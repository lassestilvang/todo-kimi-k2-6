/**
 * AI Provider abstraction for task parsing
 * Supports multiple AI providers with fallback
 */
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
import type { TaskSuggestion, AITaskInput, AIEditCommand } from "./index";
import type { ProjectPlanInput, GeneratedProject, ProjectPhase, DecisionContext, GeneratedDecisionTemplate } from "./index";
import { logError, logWarn } from "@/lib/logger";
import { taskSuggestionSchema, aiInsightsSchema } from "./index";
import { formatMinutesToTime, parseTimeToMinutes, getNextDay, parseTimeRange, parseTime } from "../time-utils";
export interface AIProvider {
  name: string;
  parseTask(input: AITaskInput): Promise<TaskSuggestion>;
  parseTaskStream?(input: AITaskInput, onChunk: (chunk: string) => void): Promise<TaskSuggestion>;
  generateInsights(tasks: Array<{
    name: string;
    completed: boolean;
    priority: string;
    date?: string | null;
    deadline?: string | null;
  }>): Promise<{
    tips: string[];
    suggestions: string[];
    trends: string[];
  }>;
  generateTasksFromNotes?(notes: string, context?: {
    lists?: Array<{
      id: number;
      name: string;
      emoji: string;
    }>;
  }): Promise<Array<{
    name: string;
    description?: string;
    priority?: "critical" | "high" | "medium" | "low" | "none";
  }>>;
  parseEditCommand?(text: string, context: {
    tasks: Array<{
      id: number;
      name: string;
      completed: boolean;
      priority: string;
    }>;
  }): Promise<AIEditCommand>;
  generateProjectPlan?(input: ProjectPlanInput): Promise<GeneratedProject>;
  generateDecisionTemplate?(context: DecisionContext): Promise<GeneratedDecisionTemplate>;
}

/**
 * Default timeout for AI API requests (in milliseconds)
 */
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL_MS = stryMutAct_9fa48("1807") ? 5 * 60 / 1000 : (stryCov_9fa48("1807"), (stryMutAct_9fa48("1808") ? 5 / 60 : (stryCov_9fa48("1808"), 5 * 60)) * 1000);

/**
 * Helper function to add timeout to a promise
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (stryMutAct_9fa48("1809")) {
    {}
  } else {
    stryCov_9fa48("1809");
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<T>((_, reject) => {
      if (stryMutAct_9fa48("1810")) {
        {}
      } else {
        stryCov_9fa48("1810");
        timeoutId = setTimeout(stryMutAct_9fa48("1811") ? () => undefined : (stryCov_9fa48("1811"), () => reject(new Error(stryMutAct_9fa48("1812") ? `` : (stryCov_9fa48("1812"), `Request timed out after ${ms}ms`)))), ms);
      }
    });
    try {
      if (stryMutAct_9fa48("1813")) {
        {}
      } else {
        stryCov_9fa48("1813");
        const result = await Promise.race(stryMutAct_9fa48("1814") ? [] : (stryCov_9fa48("1814"), [promise, timeoutPromise]));
        return result;
      }
    } finally {
      if (stryMutAct_9fa48("1815")) {
        {}
      } else {
        stryCov_9fa48("1815");
        if (stryMutAct_9fa48("1817") ? false : stryMutAct_9fa48("1816") ? true : (stryCov_9fa48("1816", "1817"), timeoutId)) clearTimeout(timeoutId);
      }
    }
  }
}

/**
 * Simple in-memory cache for AI responses
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
class AICache {
  private cache = new Map<string, CacheEntry<any>>();
  get<T>(key: string): T | null {
    if (stryMutAct_9fa48("1818")) {
      {}
    } else {
      stryCov_9fa48("1818");
      const entry = this.cache.get(key);
      if (stryMutAct_9fa48("1821") ? false : stryMutAct_9fa48("1820") ? true : stryMutAct_9fa48("1819") ? entry : (stryCov_9fa48("1819", "1820", "1821"), !entry)) return null;
      if (stryMutAct_9fa48("1825") ? Date.now() - entry.timestamp <= CACHE_TTL_MS : stryMutAct_9fa48("1824") ? Date.now() - entry.timestamp >= CACHE_TTL_MS : stryMutAct_9fa48("1823") ? false : stryMutAct_9fa48("1822") ? true : (stryCov_9fa48("1822", "1823", "1824", "1825"), (stryMutAct_9fa48("1826") ? Date.now() + entry.timestamp : (stryCov_9fa48("1826"), Date.now() - entry.timestamp)) > CACHE_TTL_MS)) {
        if (stryMutAct_9fa48("1827")) {
          {}
        } else {
          stryCov_9fa48("1827");
          this.cache.delete(key);
          return null;
        }
      }
      return entry.data;
    }
  }
  set<T>(key: string, data: T): void {
    if (stryMutAct_9fa48("1828")) {
      {}
    } else {
      stryCov_9fa48("1828");
      this.cache.set(key, stryMutAct_9fa48("1829") ? {} : (stryCov_9fa48("1829"), {
        data,
        timestamp: Date.now()
      }));
    }
  }
  clear(): void {
    if (stryMutAct_9fa48("1830")) {
      {}
    } else {
      stryCov_9fa48("1830");
      this.cache.clear();
    }
  }
}
export const aiCache = new AICache();

/**
 * Keyword-based fallback parser (no API required)
 * Works well for basic task parsing
 */
export class KeywordParser implements AIProvider {
  name = stryMutAct_9fa48("1831") ? "" : (stryCov_9fa48("1831"), "keyword-parser");
  private readonly projectPhaseKeywords = stryMutAct_9fa48("1832") ? {} : (stryCov_9fa48("1832"), {
    planning: stryMutAct_9fa48("1833") ? [] : (stryCov_9fa48("1833"), [stryMutAct_9fa48("1834") ? "" : (stryCov_9fa48("1834"), "planning"), stryMutAct_9fa48("1835") ? "" : (stryCov_9fa48("1835"), "setup"), stryMutAct_9fa48("1836") ? "" : (stryCov_9fa48("1836"), "foundation"), stryMutAct_9fa48("1837") ? "" : (stryCov_9fa48("1837"), "design"), stryMutAct_9fa48("1838") ? "" : (stryCov_9fa48("1838"), "architect")]),
    development: stryMutAct_9fa48("1839") ? [] : (stryCov_9fa48("1839"), [stryMutAct_9fa48("1840") ? "" : (stryCov_9fa48("1840"), "development"), stryMutAct_9fa48("1841") ? "" : (stryCov_9fa48("1841"), "coding"), stryMutAct_9fa48("1842") ? "" : (stryCov_9fa48("1842"), "building"), stryMutAct_9fa48("1843") ? "" : (stryCov_9fa48("1843"), "implementation"), stryMutAct_9fa48("1844") ? "" : (stryCov_9fa48("1844"), "feature")]),
    testing: stryMutAct_9fa48("1845") ? [] : (stryCov_9fa48("1845"), [stryMutAct_9fa48("1846") ? "" : (stryCov_9fa48("1846"), "testing"), stryMutAct_9fa48("1847") ? "" : (stryCov_9fa48("1847"), "qa"), stryMutAct_9fa48("1848") ? "" : (stryCov_9fa48("1848"), "quality"), stryMutAct_9fa48("1849") ? "" : (stryCov_9fa48("1849"), "review"), stryMutAct_9fa48("1850") ? "" : (stryCov_9fa48("1850"), "debug"), stryMutAct_9fa48("1851") ? "" : (stryCov_9fa48("1851"), "audit")]),
    launch: stryMutAct_9fa48("1852") ? [] : (stryCov_9fa48("1852"), [stryMutAct_9fa48("1853") ? "" : (stryCov_9fa48("1853"), "launch"), stryMutAct_9fa48("1854") ? "" : (stryCov_9fa48("1854"), "release"), stryMutAct_9fa48("1855") ? "" : (stryCov_9fa48("1855"), "deployment"), stryMutAct_9fa48("1856") ? "" : (stryCov_9fa48("1856"), "go-live"), stryMutAct_9fa48("1857") ? "" : (stryCov_9fa48("1857"), "production")]),
    maintenance: stryMutAct_9fa48("1858") ? [] : (stryCov_9fa48("1858"), [stryMutAct_9fa48("1859") ? "" : (stryCov_9fa48("1859"), "maintenance"), stryMutAct_9fa48("1860") ? "" : (stryCov_9fa48("1860"), "update"), stryMutAct_9fa48("1861") ? "" : (stryCov_9fa48("1861"), "optimize"), stryMutAct_9fa48("1862") ? "" : (stryCov_9fa48("1862"), "refactor"), stryMutAct_9fa48("1863") ? "" : (stryCov_9fa48("1863"), "support")])
  });
  private readonly phasePriorityKeywords = stryMutAct_9fa48("1864") ? {} : (stryCov_9fa48("1864"), {
    critical: stryMutAct_9fa48("1865") ? [] : (stryCov_9fa48("1865"), [stryMutAct_9fa48("1866") ? "" : (stryCov_9fa48("1866"), "critical"), stryMutAct_9fa48("1867") ? "" : (stryCov_9fa48("1867"), "urgent"), stryMutAct_9fa48("1868") ? "" : (stryCov_9fa48("1868"), "asap"), stryMutAct_9fa48("1869") ? "" : (stryCov_9fa48("1869"), "must-have"), stryMutAct_9fa48("1870") ? "" : (stryCov_9fa48("1870"), "blocking"), stryMutAct_9fa48("1871") ? "" : (stryCov_9fa48("1871"), "immediately")]),
    high: stryMutAct_9fa48("1872") ? [] : (stryCov_9fa48("1872"), [stryMutAct_9fa48("1873") ? "" : (stryCov_9fa48("1873"), "high priority"), stryMutAct_9fa48("1874") ? "" : (stryCov_9fa48("1874"), "important"), stryMutAct_9fa48("1875") ? "" : (stryCov_9fa48("1875"), "soon"), stryMutAct_9fa48("1876") ? "" : (stryCov_9fa48("1876"), "required"), stryMutAct_9fa48("1877") ? "" : (stryCov_9fa48("1877"), "needed")]),
    medium: stryMutAct_9fa48("1878") ? [] : (stryCov_9fa48("1878"), [stryMutAct_9fa48("1879") ? "" : (stryCov_9fa48("1879"), "medium priority"), stryMutAct_9fa48("1880") ? "" : (stryCov_9fa48("1880"), "normal"), stryMutAct_9fa48("1881") ? "" : (stryCov_9fa48("1881"), "standard"), stryMutAct_9fa48("1882") ? "" : (stryCov_9fa48("1882"), "important but not urgent")]),
    low: stryMutAct_9fa48("1883") ? [] : (stryCov_9fa48("1883"), [stryMutAct_9fa48("1884") ? "" : (stryCov_9fa48("1884"), "low priority"), stryMutAct_9fa48("1885") ? "" : (stryCov_9fa48("1885"), "later"), stryMutAct_9fa48("1886") ? "" : (stryCov_9fa48("1886"), "optional"), stryMutAct_9fa48("1887") ? "" : (stryCov_9fa48("1887"), "nice-to-have"), stryMutAct_9fa48("1888") ? "" : (stryCov_9fa48("1888"), "backlog")])
  });
  private readonly priorityKeywords = stryMutAct_9fa48("1889") ? {} : (stryCov_9fa48("1889"), {
    critical: stryMutAct_9fa48("1890") ? [] : (stryCov_9fa48("1890"), [stryMutAct_9fa48("1891") ? "" : (stryCov_9fa48("1891"), "urgent"), stryMutAct_9fa48("1892") ? "" : (stryCov_9fa48("1892"), "asap"), stryMutAct_9fa48("1893") ? "" : (stryCov_9fa48("1893"), "critical"), stryMutAct_9fa48("1894") ? "" : (stryCov_9fa48("1894"), "high priority"), stryMutAct_9fa48("1895") ? "" : (stryCov_9fa48("1895"), "deadline")]),
    high: stryMutAct_9fa48("1896") ? [] : (stryCov_9fa48("1896"), [stryMutAct_9fa48("1897") ? "" : (stryCov_9fa48("1897"), "important"), stryMutAct_9fa48("1898") ? "" : (stryCov_9fa48("1898"), "high priority"), stryMutAct_9fa48("1899") ? "" : (stryCov_9fa48("1899"), "soon"), stryMutAct_9fa48("1900") ? "" : (stryCov_9fa48("1900"), "today"), stryMutAct_9fa48("1901") ? "" : (stryCov_9fa48("1901"), "this week")]),
    medium: stryMutAct_9fa48("1902") ? [] : (stryCov_9fa48("1902"), [stryMutAct_9fa48("1903") ? "" : (stryCov_9fa48("1903"), "medium priority"), stryMutAct_9fa48("1904") ? "" : (stryCov_9fa48("1904"), "normal"), stryMutAct_9fa48("1905") ? "" : (stryCov_9fa48("1905"), "standard")]),
    low: stryMutAct_9fa48("1906") ? [] : (stryCov_9fa48("1906"), [stryMutAct_9fa48("1907") ? "" : (stryCov_9fa48("1907"), "low priority"), stryMutAct_9fa48("1908") ? "" : (stryCov_9fa48("1908"), "later"), stryMutAct_9fa48("1909") ? "" : (stryCov_9fa48("1909"), "someday"), stryMutAct_9fa48("1910") ? "" : (stryCov_9fa48("1910"), "optional"), stryMutAct_9fa48("1911") ? "" : (stryCov_9fa48("1911"), "backlog")])
  });
  private readonly durationKeywords: Record<string, number> = stryMutAct_9fa48("1912") ? {} : (stryCov_9fa48("1912"), {
    meeting: 30,
    call: 30,
    review: 15,
    write: 120,
    report: 120,
    email: 15,
    research: 60,
    coding: 120,
    design: 90,
    planning: 60,
    reading: 30,
    brainstorm: 45,
    presentation: 60,
    interview: 60,
    debugging: 90,
    refactoring: 120
  });
  private readonly recurringKeywords = stryMutAct_9fa48("1913") ? {} : (stryCov_9fa48("1913"), {
    daily: stryMutAct_9fa48("1914") ? [] : (stryCov_9fa48("1914"), [stryMutAct_9fa48("1915") ? "" : (stryCov_9fa48("1915"), "daily"), stryMutAct_9fa48("1916") ? "" : (stryCov_9fa48("1916"), "every day"), stryMutAct_9fa48("1917") ? "" : (stryCov_9fa48("1917"), "each day")]),
    weekly: stryMutAct_9fa48("1918") ? [] : (stryCov_9fa48("1918"), [stryMutAct_9fa48("1919") ? "" : (stryCov_9fa48("1919"), "weekly"), stryMutAct_9fa48("1920") ? "" : (stryCov_9fa48("1920"), "every week"), stryMutAct_9fa48("1921") ? "" : (stryCov_9fa48("1921"), "each week")]),
    weekdays: stryMutAct_9fa48("1922") ? [] : (stryCov_9fa48("1922"), [stryMutAct_9fa48("1923") ? "" : (stryCov_9fa48("1923"), "weekdays"), stryMutAct_9fa48("1924") ? "" : (stryCov_9fa48("1924"), "mon-fri"), stryMutAct_9fa48("1925") ? "" : (stryCov_9fa48("1925"), "monday tuesday wednesday thursday friday")]),
    monthly: stryMutAct_9fa48("1926") ? [] : (stryCov_9fa48("1926"), [stryMutAct_9fa48("1927") ? "" : (stryCov_9fa48("1927"), "monthly"), stryMutAct_9fa48("1928") ? "" : (stryCov_9fa48("1928"), "every month"), stryMutAct_9fa48("1929") ? "" : (stryCov_9fa48("1929"), "each month")]),
    yearly: stryMutAct_9fa48("1930") ? [] : (stryCov_9fa48("1930"), [stryMutAct_9fa48("1931") ? "" : (stryCov_9fa48("1931"), "yearly"), stryMutAct_9fa48("1932") ? "" : (stryCov_9fa48("1932"), "every year"), stryMutAct_9fa48("1933") ? "" : (stryCov_9fa48("1933"), "each year")])
  });
  private readonly listKeywords: Record<string, string> = stryMutAct_9fa48("1934") ? {} : (stryCov_9fa48("1934"), {
    "work": stryMutAct_9fa48("1935") ? "" : (stryCov_9fa48("1935"), "Work"),
    "personal": stryMutAct_9fa48("1936") ? "" : (stryCov_9fa48("1936"), "Personal"),
    "health": stryMutAct_9fa48("1937") ? "" : (stryCov_9fa48("1937"), "Health"),
    "finance": stryMutAct_9fa48("1938") ? "" : (stryCov_9fa48("1938"), "Finance"),
    "home": stryMutAct_9fa48("1939") ? "" : (stryCov_9fa48("1939"), "Home"),
    "family": stryMutAct_9fa48("1940") ? "" : (stryCov_9fa48("1940"), "Family"),
    "travel": stryMutAct_9fa48("1941") ? "" : (stryCov_9fa48("1941"), "Travel"),
    "errand": stryMutAct_9fa48("1942") ? "" : (stryCov_9fa48("1942"), "Errands"),
    "gym": stryMutAct_9fa48("1943") ? "" : (stryCov_9fa48("1943"), "Health"),
    "exercise": stryMutAct_9fa48("1944") ? "" : (stryCov_9fa48("1944"), "Health"),
    "meeting": stryMutAct_9fa48("1945") ? "" : (stryCov_9fa48("1945"), "Work"),
    "call": stryMutAct_9fa48("1946") ? "" : (stryCov_9fa48("1946"), "Work"),
    "email": stryMutAct_9fa48("1947") ? "" : (stryCov_9fa48("1947"), "Work"),
    "review": stryMutAct_9fa48("1948") ? "" : (stryCov_9fa48("1948"), "Work"),
    "project": stryMutAct_9fa48("1949") ? "" : (stryCov_9fa48("1949"), "Work"),
    "study": stryMutAct_9fa48("1950") ? "" : (stryCov_9fa48("1950"), "Personal"),
    "learning": stryMutAct_9fa48("1951") ? "" : (stryCov_9fa48("1951"), "Personal"),
    "grocery": stryMutAct_9fa48("1952") ? "" : (stryCov_9fa48("1952"), "Shopping"),
    "buy": stryMutAct_9fa48("1953") ? "" : (stryCov_9fa48("1953"), "Shopping"),
    "doctor": stryMutAct_9fa48("1954") ? "" : (stryCov_9fa48("1954"), "Health"),
    "appointment": stryMutAct_9fa48("1955") ? "" : (stryCov_9fa48("1955"), "Health"),
    "pay": stryMutAct_9fa48("1956") ? "" : (stryCov_9fa48("1956"), "Finance"),
    "bill": stryMutAct_9fa48("1957") ? "" : (stryCov_9fa48("1957"), "Finance"),
    "budget": stryMutAct_9fa48("1958") ? "" : (stryCov_9fa48("1958"), "Finance"),
    "clean": stryMutAct_9fa48("1959") ? "" : (stryCov_9fa48("1959"), "Home"),
    "chore": stryMutAct_9fa48("1960") ? "" : (stryCov_9fa48("1960"), "Home"),
    "trip": stryMutAct_9fa48("1961") ? "" : (stryCov_9fa48("1961"), "Travel"),
    "vacation": stryMutAct_9fa48("1962") ? "" : (stryCov_9fa48("1962"), "Travel")
  });
  private readonly dayKeywords = stryMutAct_9fa48("1963") ? [] : (stryCov_9fa48("1963"), [stryMutAct_9fa48("1964") ? "" : (stryCov_9fa48("1964"), "monday"), stryMutAct_9fa48("1965") ? "" : (stryCov_9fa48("1965"), "tuesday"), stryMutAct_9fa48("1966") ? "" : (stryCov_9fa48("1966"), "wednesday"), stryMutAct_9fa48("1967") ? "" : (stryCov_9fa48("1967"), "thursday"), stryMutAct_9fa48("1968") ? "" : (stryCov_9fa48("1968"), "friday"), stryMutAct_9fa48("1969") ? "" : (stryCov_9fa48("1969"), "saturday"), stryMutAct_9fa48("1970") ? "" : (stryCov_9fa48("1970"), "sunday")]);

  // Common project phase names based on typical project workflows
  private readonly standardPhaseNames = stryMutAct_9fa48("1971") ? [] : (stryCov_9fa48("1971"), [stryMutAct_9fa48("1972") ? [] : (stryCov_9fa48("1972"), [stryMutAct_9fa48("1973") ? "" : (stryCov_9fa48("1973"), "Planning"), stryMutAct_9fa48("1974") ? "" : (stryCov_9fa48("1974"), "Initiation"), stryMutAct_9fa48("1975") ? "" : (stryCov_9fa48("1975"), "Setup"), stryMutAct_9fa48("1976") ? "" : (stryCov_9fa48("1976"), "Research"), stryMutAct_9fa48("1977") ? "" : (stryCov_9fa48("1977"), "Design")]), stryMutAct_9fa48("1978") ? [] : (stryCov_9fa48("1978"), [stryMutAct_9fa48("1979") ? "" : (stryCov_9fa48("1979"), "Development"), stryMutAct_9fa48("1980") ? "" : (stryCov_9fa48("1980"), "Implementation"), stryMutAct_9fa48("1981") ? "" : (stryCov_9fa48("1981"), "Building"), stryMutAct_9fa48("1982") ? "" : (stryCov_9fa48("1982"), "Creation")]), stryMutAct_9fa48("1983") ? [] : (stryCov_9fa48("1983"), [stryMutAct_9fa48("1984") ? "" : (stryCov_9fa48("1984"), "Testing"), stryMutAct_9fa48("1985") ? "" : (stryCov_9fa48("1985"), "Quality Assurance"), stryMutAct_9fa48("1986") ? "" : (stryCov_9fa48("1986"), "Review"), stryMutAct_9fa48("1987") ? "" : (stryCov_9fa48("1987"), "Debugging"), stryMutAct_9fa48("1988") ? "" : (stryCov_9fa48("1988"), "Audit")]), stryMutAct_9fa48("1989") ? [] : (stryCov_9fa48("1989"), [stryMutAct_9fa48("1990") ? "" : (stryCov_9fa48("1990"), "Launch"), stryMutAct_9fa48("1991") ? "" : (stryCov_9fa48("1991"), "Release"), stryMutAct_9fa48("1992") ? "" : (stryCov_9fa48("1992"), "Deployment"), stryMutAct_9fa48("1993") ? "" : (stryCov_9fa48("1993"), "Go-Live")]), stryMutAct_9fa48("1994") ? [] : (stryCov_9fa48("1994"), [stryMutAct_9fa48("1995") ? "" : (stryCov_9fa48("1995"), "Maintenance"), stryMutAct_9fa48("1996") ? "" : (stryCov_9fa48("1996"), "Updates"), stryMutAct_9fa48("1997") ? "" : (stryCov_9fa48("1997"), "Optimization"), stryMutAct_9fa48("1998") ? "" : (stryCov_9fa48("1998"), "Support")])]);
  async parseTask(input: AITaskInput): Promise<TaskSuggestion> {
    if (stryMutAct_9fa48("1999")) {
      {}
    } else {
      stryCov_9fa48("1999");
      const text = stryMutAct_9fa48("2000") ? input.text.toUpperCase() : (stryCov_9fa48("2000"), input.text.toLowerCase());

      // Extract priority
      let priority: "critical" | "high" | "medium" | "low" | "none" = stryMutAct_9fa48("2001") ? "" : (stryCov_9fa48("2001"), "none");
      for (const [p, keywords] of Object.entries(this.priorityKeywords)) {
        if (stryMutAct_9fa48("2002")) {
          {}
        } else {
          stryCov_9fa48("2002");
          if (stryMutAct_9fa48("2005") ? keywords.every(k => text.includes(k)) : stryMutAct_9fa48("2004") ? false : stryMutAct_9fa48("2003") ? true : (stryCov_9fa48("2003", "2004", "2005"), keywords.some(stryMutAct_9fa48("2006") ? () => undefined : (stryCov_9fa48("2006"), k => text.includes(k))))) {
            if (stryMutAct_9fa48("2007")) {
              {}
            } else {
              stryCov_9fa48("2007");
              priority = p as "critical" | "high" | "medium" | "low" | "none";
              break;
            }
          }
        }
      }

      // Extract recurring pattern FIRST (before everyMatch check)
      let recurring: "none" | "daily" | "weekly" | "weekdays" | "monthly" | "yearly" | "custom" = stryMutAct_9fa48("2008") ? "" : (stryCov_9fa48("2008"), "none");
      for (const [rec, keywords] of Object.entries(this.recurringKeywords)) {
        if (stryMutAct_9fa48("2009")) {
          {}
        } else {
          stryCov_9fa48("2009");
          if (stryMutAct_9fa48("2012") ? keywords.every(k => text.includes(k)) : stryMutAct_9fa48("2011") ? false : stryMutAct_9fa48("2010") ? true : (stryCov_9fa48("2010", "2011", "2012"), keywords.some(stryMutAct_9fa48("2013") ? () => undefined : (stryCov_9fa48("2013"), k => text.includes(k))))) {
            if (stryMutAct_9fa48("2014")) {
              {}
            } else {
              stryCov_9fa48("2014");
              recurring = rec as "none" | "daily" | "weekly" | "weekdays" | "monthly" | "yearly" | "custom";
              break;
            }
          }
        }
      }

      // Variable for custom recurring config (set in everyMatch block below)
      let recurringConfig: string | undefined;

      // Extract duration
      let estimated_duration: number | undefined;
      for (const [keyword, duration] of Object.entries(this.durationKeywords)) {
        if (stryMutAct_9fa48("2015")) {
          {}
        } else {
          stryCov_9fa48("2015");
          if (stryMutAct_9fa48("2017") ? false : stryMutAct_9fa48("2016") ? true : (stryCov_9fa48("2016", "2017"), text.includes(keyword))) {
            if (stryMutAct_9fa48("2018")) {
              {}
            } else {
              stryCov_9fa48("2018");
              estimated_duration = duration;
              break;
            }
          }
        }
      }

      // Extract date patterns
      let suggested_date: string | undefined;
      let deadline: string | undefined;

      // Check for specific dates
      const today = new Date();
      const tomorrow = new Date(stryMutAct_9fa48("2019") ? today.getTime() - 24 * 60 * 60 * 1000 : (stryCov_9fa48("2019"), today.getTime() + (stryMutAct_9fa48("2020") ? 24 * 60 * 60 / 1000 : (stryCov_9fa48("2020"), (stryMutAct_9fa48("2021") ? 24 * 60 / 60 : (stryCov_9fa48("2021"), (stryMutAct_9fa48("2022") ? 24 / 60 : (stryCov_9fa48("2022"), 24 * 60)) * 60)) * 1000))));
      const nextWeek = new Date(stryMutAct_9fa48("2023") ? today.getTime() - 7 * 24 * 60 * 1000 : (stryCov_9fa48("2023"), today.getTime() + (stryMutAct_9fa48("2024") ? 7 * 24 * 60 / 1000 : (stryCov_9fa48("2024"), (stryMutAct_9fa48("2025") ? 7 * 24 / 60 : (stryCov_9fa48("2025"), (stryMutAct_9fa48("2026") ? 7 / 24 : (stryCov_9fa48("2026"), 7 * 24)) * 60)) * 1000))));
      if (stryMutAct_9fa48("2028") ? false : stryMutAct_9fa48("2027") ? true : (stryCov_9fa48("2027", "2028"), text.includes(stryMutAct_9fa48("2029") ? "" : (stryCov_9fa48("2029"), "tomorrow")))) {
        if (stryMutAct_9fa48("2030")) {
          {}
        } else {
          stryCov_9fa48("2030");
          suggested_date = tomorrow.toISOString().split(stryMutAct_9fa48("2031") ? "" : (stryCov_9fa48("2031"), "T"))[0];
        }
      } else if (stryMutAct_9fa48("2034") ? text.includes("next week") && text.includes("weekend") : stryMutAct_9fa48("2033") ? false : stryMutAct_9fa48("2032") ? true : (stryCov_9fa48("2032", "2033", "2034"), text.includes(stryMutAct_9fa48("2035") ? "" : (stryCov_9fa48("2035"), "next week")) || text.includes(stryMutAct_9fa48("2036") ? "" : (stryCov_9fa48("2036"), "weekend")))) {
        if (stryMutAct_9fa48("2037")) {
          {}
        } else {
          stryCov_9fa48("2037");
          suggested_date = nextWeek.toISOString().split(stryMutAct_9fa48("2038") ? "" : (stryCov_9fa48("2038"), "T"))[0];
        }
      } else if (stryMutAct_9fa48("2040") ? false : stryMutAct_9fa48("2039") ? true : (stryCov_9fa48("2039", "2040"), text.includes(stryMutAct_9fa48("2041") ? "" : (stryCov_9fa48("2041"), "today")))) {
        if (stryMutAct_9fa48("2042")) {
          {}
        } else {
          stryCov_9fa48("2042");
          suggested_date = today.toISOString().split(stryMutAct_9fa48("2043") ? "" : (stryCov_9fa48("2043"), "T"))[0];
        }
      }

      // Check for specific weekdays
      for (const day of this.dayKeywords) {
        if (stryMutAct_9fa48("2044")) {
          {}
        } else {
          stryCov_9fa48("2044");
          if (stryMutAct_9fa48("2046") ? false : stryMutAct_9fa48("2045") ? true : (stryCov_9fa48("2045", "2046"), text.includes(day))) {
            if (stryMutAct_9fa48("2047")) {
              {}
            } else {
              stryCov_9fa48("2047");
              const nextDay = this.getNextDay(day);
              if (stryMutAct_9fa48("2050") ? false : stryMutAct_9fa48("2049") ? true : stryMutAct_9fa48("2048") ? suggested_date : (stryCov_9fa48("2048", "2049", "2050"), !suggested_date)) suggested_date = nextDay.toISOString().split(stryMutAct_9fa48("2051") ? "" : (stryCov_9fa48("2051"), "T"))[0];
              break;
            }
          }
        }
      }

      // Enhanced date parsing: "in X days/weeks"
      const inMatch = text.match(stryMutAct_9fa48("2058") ? /in\s+(\d+)\s+(day|week|month|year)s/ : stryMutAct_9fa48("2057") ? /in\s+(\d+)\S+(day|week|month|year)s?/ : stryMutAct_9fa48("2056") ? /in\s+(\d+)\s(day|week|month|year)s?/ : stryMutAct_9fa48("2055") ? /in\s+(\D+)\s+(day|week|month|year)s?/ : stryMutAct_9fa48("2054") ? /in\s+(\d)\s+(day|week|month|year)s?/ : stryMutAct_9fa48("2053") ? /in\S+(\d+)\s+(day|week|month|year)s?/ : stryMutAct_9fa48("2052") ? /in\s(\d+)\s+(day|week|month|year)s?/ : (stryCov_9fa48("2052", "2053", "2054", "2055", "2056", "2057", "2058"), /in\s+(\d+)\s+(day|week|month|year)s?/));
      if (stryMutAct_9fa48("2061") ? inMatch || !suggested_date : stryMutAct_9fa48("2060") ? false : stryMutAct_9fa48("2059") ? true : (stryCov_9fa48("2059", "2060", "2061"), inMatch && (stryMutAct_9fa48("2062") ? suggested_date : (stryCov_9fa48("2062"), !suggested_date)))) {
        if (stryMutAct_9fa48("2063")) {
          {}
        } else {
          stryCov_9fa48("2063");
          const daysNum = parseInt(inMatch[1]);
          const daysUnit = inMatch[2];
          const multiplier = (stryMutAct_9fa48("2066") ? daysUnit !== "day" : stryMutAct_9fa48("2065") ? false : stryMutAct_9fa48("2064") ? true : (stryCov_9fa48("2064", "2065", "2066"), daysUnit === (stryMutAct_9fa48("2067") ? "" : (stryCov_9fa48("2067"), "day")))) ? 1 : (stryMutAct_9fa48("2070") ? daysUnit !== "week" : stryMutAct_9fa48("2069") ? false : stryMutAct_9fa48("2068") ? true : (stryCov_9fa48("2068", "2069", "2070"), daysUnit === (stryMutAct_9fa48("2071") ? "" : (stryCov_9fa48("2071"), "week")))) ? 7 : (stryMutAct_9fa48("2074") ? daysUnit !== "month" : stryMutAct_9fa48("2073") ? false : stryMutAct_9fa48("2072") ? true : (stryCov_9fa48("2072", "2073", "2074"), daysUnit === (stryMutAct_9fa48("2075") ? "" : (stryCov_9fa48("2075"), "month")))) ? 30 : 365;
          const futureDate = new Date(stryMutAct_9fa48("2076") ? Date.now() - daysNum * multiplier * 24 * 60 * 60 * 1000 : (stryCov_9fa48("2076"), Date.now() + (stryMutAct_9fa48("2077") ? daysNum * multiplier * 24 * 60 * 60 / 1000 : (stryCov_9fa48("2077"), (stryMutAct_9fa48("2078") ? daysNum * multiplier * 24 * 60 / 60 : (stryCov_9fa48("2078"), (stryMutAct_9fa48("2079") ? daysNum * multiplier * 24 / 60 : (stryCov_9fa48("2079"), (stryMutAct_9fa48("2080") ? daysNum * multiplier / 24 : (stryCov_9fa48("2080"), (stryMutAct_9fa48("2081") ? daysNum / multiplier : (stryCov_9fa48("2081"), daysNum * multiplier)) * 24)) * 60)) * 60)) * 1000))));
          suggested_date = futureDate.toISOString().split(stryMutAct_9fa48("2082") ? "" : (stryCov_9fa48("2082"), "T"))[0];
        }
      }

      // Parse "every X day/week/month/year" patterns for custom recurring
      // Supports: "every day", "every 3 days", "every week", "every 2 weeks", etc.
      const everyMatch = text.match(stryMutAct_9fa48("2089") ? /every\s+(\d+)\s*(day|week|weekday|month|year)s/i : stryMutAct_9fa48("2088") ? /every\s+(\d+)\S*(day|week|weekday|month|year)s?/i : stryMutAct_9fa48("2087") ? /every\s+(\d+)\s(day|week|weekday|month|year)s?/i : stryMutAct_9fa48("2086") ? /every\s+(\D+)\s*(day|week|weekday|month|year)s?/i : stryMutAct_9fa48("2085") ? /every\s+(\d)\s*(day|week|weekday|month|year)s?/i : stryMutAct_9fa48("2084") ? /every\S+(\d+)\s*(day|week|weekday|month|year)s?/i : stryMutAct_9fa48("2083") ? /every\s(\d+)\s*(day|week|weekday|month|year)s?/i : (stryCov_9fa48("2083", "2084", "2085", "2086", "2087", "2088", "2089"), /every\s+(\d+)\s*(day|week|weekday|month|year)s?/i));
      if (stryMutAct_9fa48("2092") ? everyMatch || recurring === "none" : stryMutAct_9fa48("2091") ? false : stryMutAct_9fa48("2090") ? true : (stryCov_9fa48("2090", "2091", "2092"), everyMatch && (stryMutAct_9fa48("2094") ? recurring !== "none" : stryMutAct_9fa48("2093") ? true : (stryCov_9fa48("2093", "2094"), recurring === (stryMutAct_9fa48("2095") ? "" : (stryCov_9fa48("2095"), "none")))))) {
        if (stryMutAct_9fa48("2096")) {
          {}
        } else {
          stryCov_9fa48("2096");
          const recNum = parseInt(everyMatch[1]);
          const recUnit = stryMutAct_9fa48("2097") ? everyMatch[2].toUpperCase() : (stryCov_9fa48("2097"), everyMatch[2].toLowerCase());
          const intervalMap: Record<string, {
            interval: number;
            unit: "days" | "weeks" | "months" | "years";
          }> = stryMutAct_9fa48("2098") ? {} : (stryCov_9fa48("2098"), {
            "day": stryMutAct_9fa48("2099") ? {} : (stryCov_9fa48("2099"), {
              interval: recNum,
              unit: stryMutAct_9fa48("2100") ? "" : (stryCov_9fa48("2100"), "days")
            }),
            "week": stryMutAct_9fa48("2101") ? {} : (stryCov_9fa48("2101"), {
              interval: recNum,
              unit: stryMutAct_9fa48("2102") ? "" : (stryCov_9fa48("2102"), "weeks")
            }),
            "weekday": stryMutAct_9fa48("2103") ? {} : (stryCov_9fa48("2103"), {
              interval: 1,
              unit: stryMutAct_9fa48("2104") ? "" : (stryCov_9fa48("2104"), "days")
            }),
            // weekdays treated as daily for config
            "month": stryMutAct_9fa48("2105") ? {} : (stryCov_9fa48("2105"), {
              interval: recNum,
              unit: stryMutAct_9fa48("2106") ? "" : (stryCov_9fa48("2106"), "months")
            }),
            "year": stryMutAct_9fa48("2107") ? {} : (stryCov_9fa48("2107"), {
              interval: recNum,
              unit: stryMutAct_9fa48("2108") ? "" : (stryCov_9fa48("2108"), "years")
            })
          });
          const interval = intervalMap[recUnit];
          if (stryMutAct_9fa48("2110") ? false : stryMutAct_9fa48("2109") ? true : (stryCov_9fa48("2109", "2110"), interval)) {
            if (stryMutAct_9fa48("2111")) {
              {}
            } else {
              stryCov_9fa48("2111");
              recurring = stryMutAct_9fa48("2112") ? "" : (stryCov_9fa48("2112"), "custom");
              // Store for later use in return

              recurringConfig = JSON.stringify(interval);
            }
          }
        }
      }

      // Enhanced deadline parsing
      const deadlinePatterns = stryMutAct_9fa48("2113") ? [] : (stryCov_9fa48("2113"), [stryMutAct_9fa48("2114") ? {} : (stryCov_9fa48("2114"), {
        pattern: stryMutAct_9fa48("2123") ? /deadline[:\s]+(\d{4}-\d{2}-\D{2})/i : stryMutAct_9fa48("2122") ? /deadline[:\s]+(\d{4}-\d{2}-\d)/i : stryMutAct_9fa48("2121") ? /deadline[:\s]+(\d{4}-\D{2}-\d{2})/i : stryMutAct_9fa48("2120") ? /deadline[:\s]+(\d{4}-\d-\d{2})/i : stryMutAct_9fa48("2119") ? /deadline[:\s]+(\D{4}-\d{2}-\d{2})/i : stryMutAct_9fa48("2118") ? /deadline[:\s]+(\d-\d{2}-\d{2})/i : stryMutAct_9fa48("2117") ? /deadline[:\S]+(\d{4}-\d{2}-\d{2})/i : stryMutAct_9fa48("2116") ? /deadline[^:\s]+(\d{4}-\d{2}-\d{2})/i : stryMutAct_9fa48("2115") ? /deadline[:\s](\d{4}-\d{2}-\d{2})/i : (stryCov_9fa48("2115", "2116", "2117", "2118", "2119", "2120", "2121", "2122", "2123"), /deadline[:\s]+(\d{4}-\d{2}-\d{2})/i),
        parse: stryMutAct_9fa48("2124") ? () => undefined : (stryCov_9fa48("2124"), (m: string[]) => m[1])
      }), stryMutAct_9fa48("2125") ? {} : (stryCov_9fa48("2125"), {
        pattern: stryMutAct_9fa48("2134") ? /due[:\s]+(\d{4}-\d{2}-\D{2})/i : stryMutAct_9fa48("2133") ? /due[:\s]+(\d{4}-\d{2}-\d)/i : stryMutAct_9fa48("2132") ? /due[:\s]+(\d{4}-\D{2}-\d{2})/i : stryMutAct_9fa48("2131") ? /due[:\s]+(\d{4}-\d-\d{2})/i : stryMutAct_9fa48("2130") ? /due[:\s]+(\D{4}-\d{2}-\d{2})/i : stryMutAct_9fa48("2129") ? /due[:\s]+(\d-\d{2}-\d{2})/i : stryMutAct_9fa48("2128") ? /due[:\S]+(\d{4}-\d{2}-\d{2})/i : stryMutAct_9fa48("2127") ? /due[^:\s]+(\d{4}-\d{2}-\d{2})/i : stryMutAct_9fa48("2126") ? /due[:\s](\d{4}-\d{2}-\d{2})/i : (stryCov_9fa48("2126", "2127", "2128", "2129", "2130", "2131", "2132", "2133", "2134"), /due[:\s]+(\d{4}-\d{2}-\d{2})/i),
        parse: stryMutAct_9fa48("2135") ? () => undefined : (stryCov_9fa48("2135"), (m: string[]) => m[1])
      }), stryMutAct_9fa48("2136") ? {} : (stryCov_9fa48("2136"), {
        pattern: stryMutAct_9fa48("2139") ? /by[:\S]+(tomorrow)/i : stryMutAct_9fa48("2138") ? /by[^:\s]+(tomorrow)/i : stryMutAct_9fa48("2137") ? /by[:\s](tomorrow)/i : (stryCov_9fa48("2137", "2138", "2139"), /by[:\s]+(tomorrow)/i),
        parse: stryMutAct_9fa48("2140") ? () => undefined : (stryCov_9fa48("2140"), () => tomorrow.toISOString().split(stryMutAct_9fa48("2141") ? "" : (stryCov_9fa48("2141"), "T"))[0])
      }), stryMutAct_9fa48("2142") ? {} : (stryCov_9fa48("2142"), {
        pattern: stryMutAct_9fa48("2145") ? /by[:\S]+(next week)/i : stryMutAct_9fa48("2144") ? /by[^:\s]+(next week)/i : stryMutAct_9fa48("2143") ? /by[:\s](next week)/i : (stryCov_9fa48("2143", "2144", "2145"), /by[:\s]+(next week)/i),
        parse: stryMutAct_9fa48("2146") ? () => undefined : (stryCov_9fa48("2146"), () => nextWeek.toISOString().split(stryMutAct_9fa48("2147") ? "" : (stryCov_9fa48("2147"), "T"))[0])
      })]);
      for (const {
        pattern,
        parse
      } of deadlinePatterns) {
        if (stryMutAct_9fa48("2148")) {
          {}
        } else {
          stryCov_9fa48("2148");
          const match = text.match(pattern);
          if (stryMutAct_9fa48("2150") ? false : stryMutAct_9fa48("2149") ? true : (stryCov_9fa48("2149", "2150"), match)) {
            if (stryMutAct_9fa48("2151")) {
              {}
            } else {
              stryCov_9fa48("2151");
              deadline = parse(match);
              break;
            }
          }
        }
      }

      // Extract list/project context - first check explicit list mention, then keywords
      let list_name: string | undefined;
      let list_id: number | undefined;

      // Check for explicit list mention
      const listMatch = text.match(stryMutAct_9fa48("2163") ? /(?:in|for|under)\s+(?:the\s+)?([a-z][a-z\s]+?)(?:\S+(?:project|list|folder)|$)/i : stryMutAct_9fa48("2162") ? /(?:in|for|under)\s+(?:the\s+)?([a-z][a-z\s]+?)(?:\s(?:project|list|folder)|$)/i : stryMutAct_9fa48("2161") ? /(?:in|for|under)\s+(?:the\s+)?([a-z][a-z\s]+?)(?:\s+(?:project|list|folder))/i : stryMutAct_9fa48("2160") ? /(?:in|for|under)\s+(?:the\s+)?([a-z][a-z\S]+?)(?:\s+(?:project|list|folder)|$)/i : stryMutAct_9fa48("2159") ? /(?:in|for|under)\s+(?:the\s+)?([a-z][^a-z\s]+?)(?:\s+(?:project|list|folder)|$)/i : stryMutAct_9fa48("2158") ? /(?:in|for|under)\s+(?:the\s+)?([a-z][a-z\s])(?:\s+(?:project|list|folder)|$)/i : stryMutAct_9fa48("2157") ? /(?:in|for|under)\s+(?:the\s+)?([^a-z][a-z\s]+?)(?:\s+(?:project|list|folder)|$)/i : stryMutAct_9fa48("2156") ? /(?:in|for|under)\s+(?:the\S+)?([a-z][a-z\s]+?)(?:\s+(?:project|list|folder)|$)/i : stryMutAct_9fa48("2155") ? /(?:in|for|under)\s+(?:the\s)?([a-z][a-z\s]+?)(?:\s+(?:project|list|folder)|$)/i : stryMutAct_9fa48("2154") ? /(?:in|for|under)\s+(?:the\s+)([a-z][a-z\s]+?)(?:\s+(?:project|list|folder)|$)/i : stryMutAct_9fa48("2153") ? /(?:in|for|under)\S+(?:the\s+)?([a-z][a-z\s]+?)(?:\s+(?:project|list|folder)|$)/i : stryMutAct_9fa48("2152") ? /(?:in|for|under)\s(?:the\s+)?([a-z][a-z\s]+?)(?:\s+(?:project|list|folder)|$)/i : (stryCov_9fa48("2152", "2153", "2154", "2155", "2156", "2157", "2158", "2159", "2160", "2161", "2162", "2163"), /(?:in|for|under)\s+(?:the\s+)?([a-z][a-z\s]+?)(?:\s+(?:project|list|folder)|$)/i));
      if (stryMutAct_9fa48("2165") ? false : stryMutAct_9fa48("2164") ? true : (stryCov_9fa48("2164", "2165"), listMatch)) {
        if (stryMutAct_9fa48("2166")) {
          {}
        } else {
          stryCov_9fa48("2166");
          list_name = stryMutAct_9fa48("2167") ? listMatch[1] : (stryCov_9fa48("2167"), listMatch[1].trim());
        }
      }

      // Check context lists if available
      if (stryMutAct_9fa48("2170") ? input.context?.lists || !list_name : stryMutAct_9fa48("2169") ? false : stryMutAct_9fa48("2168") ? true : (stryCov_9fa48("2168", "2169", "2170"), (stryMutAct_9fa48("2171") ? input.context.lists : (stryCov_9fa48("2171"), input.context?.lists)) && (stryMutAct_9fa48("2172") ? list_name : (stryCov_9fa48("2172"), !list_name)))) {
        if (stryMutAct_9fa48("2173")) {
          {}
        } else {
          stryCov_9fa48("2173");
          for (const list of input.context.lists) {
            if (stryMutAct_9fa48("2174")) {
              {}
            } else {
              stryCov_9fa48("2174");
              if (stryMutAct_9fa48("2177") ? text.includes(list.name.toLowerCase()) && text.includes(list.emoji) : stryMutAct_9fa48("2176") ? false : stryMutAct_9fa48("2175") ? true : (stryCov_9fa48("2175", "2176", "2177"), text.includes(stryMutAct_9fa48("2178") ? list.name.toUpperCase() : (stryCov_9fa48("2178"), list.name.toLowerCase())) || text.includes(list.emoji))) {
                if (stryMutAct_9fa48("2179")) {
                  {}
                } else {
                  stryCov_9fa48("2179");
                  list_name = list.name;
                  list_id = list.id;
                  break;
                }
              }
            }
          }
        }
      }

      // Check list keywords
      if (stryMutAct_9fa48("2182") ? false : stryMutAct_9fa48("2181") ? true : stryMutAct_9fa48("2180") ? list_name : (stryCov_9fa48("2180", "2181", "2182"), !list_name)) {
        if (stryMutAct_9fa48("2183")) {
          {}
        } else {
          stryCov_9fa48("2183");
          for (const [keyword, name] of Object.entries(this.listKeywords)) {
            if (stryMutAct_9fa48("2184")) {
              {}
            } else {
              stryCov_9fa48("2184");
              if (stryMutAct_9fa48("2186") ? false : stryMutAct_9fa48("2185") ? true : (stryCov_9fa48("2185", "2186"), text.includes(keyword))) {
                if (stryMutAct_9fa48("2187")) {
                  {}
                } else {
                  stryCov_9fa48("2187");
                  list_name = name;
                  break;
                }
              }
            }
          }
        }
      }

      // Parse time range for start/end times
      const timeRange = this.parseTimeRange(text);

      // Build recurring_config for custom intervals
      if (stryMutAct_9fa48("2190") ? recurring !== "custom" : stryMutAct_9fa48("2189") ? false : stryMutAct_9fa48("2188") ? true : (stryCov_9fa48("2188", "2189", "2190"), recurring === (stryMutAct_9fa48("2191") ? "" : (stryCov_9fa48("2191"), "custom")))) {
        // recurringConfig is already set above from the everyMatch block
      }
      return stryMutAct_9fa48("2192") ? {} : (stryCov_9fa48("2192"), {
        name: this.cleanTaskName(input.text),
        description: this.generateDescription(input.text, priority, estimated_duration),
        priority,
        estimated_duration,
        suggested_date,
        recurring,
        recurring_config: recurringConfig,
        list_name,
        list_id,
        deadline,
        start_time: stryMutAct_9fa48("2193") ? timeRange.start_time : (stryCov_9fa48("2193"), timeRange?.start_time),
        end_time: stryMutAct_9fa48("2194") ? timeRange.end_time : (stryCov_9fa48("2194"), timeRange?.end_time)
      });
    }
  }
  private cleanTaskName(text: string): string {
    if (stryMutAct_9fa48("2195")) {
      {}
    } else {
      stryCov_9fa48("2195");
      // Remove common prefixes and keywords
      const prefixes = stryMutAct_9fa48("2196") ? [] : (stryCov_9fa48("2196"), [stryMutAct_9fa48("2197") ? "" : (stryCov_9fa48("2197"), "create a task for"), stryMutAct_9fa48("2198") ? "" : (stryCov_9fa48("2198"), "add"), stryMutAct_9fa48("2199") ? "" : (stryCov_9fa48("2199"), "schedule"), stryMutAct_9fa48("2200") ? "" : (stryCov_9fa48("2200"), "remind me to"), stryMutAct_9fa48("2201") ? "" : (stryCov_9fa48("2201"), "i need to"), stryMutAct_9fa48("2202") ? "" : (stryCov_9fa48("2202"), "please"), stryMutAct_9fa48("2203") ? "" : (stryCov_9fa48("2203"), "don't forget to"), stryMutAct_9fa48("2204") ? "" : (stryCov_9fa48("2204"), "remember to"), stryMutAct_9fa48("2205") ? "" : (stryCov_9fa48("2205"), "let's"), stryMutAct_9fa48("2206") ? "" : (stryCov_9fa48("2206"), "let us")]);
      let name = text;
      for (const prefix of prefixes) {
        if (stryMutAct_9fa48("2207")) {
          {}
        } else {
          stryCov_9fa48("2207");
          name = name.replace(new RegExp(stryMutAct_9fa48("2208") ? `` : (stryCov_9fa48("2208"), `^${prefix}\\s*`), stryMutAct_9fa48("2209") ? "" : (stryCov_9fa48("2209"), "i")), stryMutAct_9fa48("2210") ? "Stryker was here!" : (stryCov_9fa48("2210"), ""));
        }
      }

      // Remove trailing context that's not part of the task name
      name = name.replace(stryMutAct_9fa48("2214") ? /\s*\(due.\)$/i : stryMutAct_9fa48("2213") ? /\S*\(due.*?\)$/i : stryMutAct_9fa48("2212") ? /\s\(due.*?\)$/i : stryMutAct_9fa48("2211") ? /\s*\(due.*?\)/i : (stryCov_9fa48("2211", "2212", "2213", "2214"), /\s*\(due.*?\)$/i), stryMutAct_9fa48("2215") ? "Stryker was here!" : (stryCov_9fa48("2215"), ""));
      name = name.replace(stryMutAct_9fa48("2217") ? /\S*\binbox\b/i : stryMutAct_9fa48("2216") ? /\s\binbox\b/i : (stryCov_9fa48("2216", "2217"), /\s*\binbox\b/i), stryMutAct_9fa48("2218") ? "Stryker was here!" : (stryCov_9fa48("2218"), ""));
      return stryMutAct_9fa48("2219") ? name.trim().charAt(0).toUpperCase() - name.slice(1) : (stryCov_9fa48("2219"), (stryMutAct_9fa48("2222") ? name.charAt(0).toUpperCase() : stryMutAct_9fa48("2221") ? name.trim().toUpperCase() : stryMutAct_9fa48("2220") ? name.trim().charAt(0).toLowerCase() : (stryCov_9fa48("2220", "2221", "2222"), name.trim().charAt(0).toUpperCase())) + (stryMutAct_9fa48("2223") ? name : (stryCov_9fa48("2223"), name.slice(1))));
    }
  }
  private generateDescription(text: string, priority: string, duration?: number): string | undefined {
    if (stryMutAct_9fa48("2224")) {
      {}
    } else {
      stryCov_9fa48("2224");
      const desc: string[] = stryMutAct_9fa48("2225") ? ["Stryker was here"] : (stryCov_9fa48("2225"), []);
      if (stryMutAct_9fa48("2228") ? priority === "critical" && text.includes("urgent") : stryMutAct_9fa48("2227") ? false : stryMutAct_9fa48("2226") ? true : (stryCov_9fa48("2226", "2227", "2228"), (stryMutAct_9fa48("2230") ? priority !== "critical" : stryMutAct_9fa48("2229") ? false : (stryCov_9fa48("2229", "2230"), priority === (stryMutAct_9fa48("2231") ? "" : (stryCov_9fa48("2231"), "critical")))) || text.includes(stryMutAct_9fa48("2232") ? "" : (stryCov_9fa48("2232"), "urgent")))) {
        if (stryMutAct_9fa48("2233")) {
          {}
        } else {
          stryCov_9fa48("2233");
          desc.push(stryMutAct_9fa48("2234") ? "" : (stryCov_9fa48("2234"), "High priority task - requires immediate attention"));
        }
      }
      if (stryMutAct_9fa48("2236") ? false : stryMutAct_9fa48("2235") ? true : (stryCov_9fa48("2235", "2236"), duration)) {
        if (stryMutAct_9fa48("2237")) {
          {}
        } else {
          stryCov_9fa48("2237");
          desc.push(stryMutAct_9fa48("2238") ? `` : (stryCov_9fa48("2238"), `Estimated time: ${duration} minutes`));
        }
      }
      return (stryMutAct_9fa48("2242") ? desc.length <= 0 : stryMutAct_9fa48("2241") ? desc.length >= 0 : stryMutAct_9fa48("2240") ? false : stryMutAct_9fa48("2239") ? true : (stryCov_9fa48("2239", "2240", "2241", "2242"), desc.length > 0)) ? desc.join(stryMutAct_9fa48("2243") ? "" : (stryCov_9fa48("2243"), ". ")) : undefined;
    }
  }

  /**
   * Parse time from text - using shared utility
   */
  private parseTime(text: string): {
    hours: number;
    minutes: number;
  } | null {
    if (stryMutAct_9fa48("2244")) {
      {}
    } else {
      stryCov_9fa48("2244");
      return parseTime(text);
    }
  }

  /**
   * Parse time range - using shared utility
   */
  private parseTimeRange(text: string): {
    start_time?: string;
    end_time?: string;
  } | null {
    if (stryMutAct_9fa48("2245")) {
      {}
    } else {
      stryCov_9fa48("2245");
      return parseTimeRange(text);
    }
  }

  /**
   * Find the next occurrence of a specific day - using shared utility
   */
  private getNextDay(dayName: string): Date {
    if (stryMutAct_9fa48("2246")) {
      {}
    } else {
      stryCov_9fa48("2246");
      return getNextDay(dayName);
    }
  }

  /**
   * Generate tasks from bullet points or notes
   */
  async generateTasksFromNotes(notes: string): Promise<Array<{
    name: string;
    description?: string;
    priority?: "critical" | "high" | "medium" | "low" | "none";
  }>> {
    if (stryMutAct_9fa48("2247")) {
      {}
    } else {
      stryCov_9fa48("2247");
      const lines = stryMutAct_9fa48("2248") ? notes.split("\n") : (stryCov_9fa48("2248"), notes.split(stryMutAct_9fa48("2249") ? "" : (stryCov_9fa48("2249"), "\n")).filter(stryMutAct_9fa48("2250") ? () => undefined : (stryCov_9fa48("2250"), line => stryMutAct_9fa48("2251") ? line : (stryCov_9fa48("2251"), line.trim()))));
      const tasks: Array<{
        name: string;
        description?: string;
        priority?: "critical" | "high" | "medium" | "low" | "none";
      }> = stryMutAct_9fa48("2252") ? ["Stryker was here"] : (stryCov_9fa48("2252"), []);
      for (const line of lines) {
        if (stryMutAct_9fa48("2253")) {
          {}
        } else {
          stryCov_9fa48("2253");
          // Remove markdown bullet characters
          const cleanLine = stryMutAct_9fa48("2254") ? line.replace(/^[\s]*[-*>\d.\)\s]+/, "") : (stryCov_9fa48("2254"), line.replace(stryMutAct_9fa48("2262") ? /^[\s]*[-*>\d.\)\S]+/ : stryMutAct_9fa48("2261") ? /^[\s]*[-*>\D.\)\s]+/ : stryMutAct_9fa48("2260") ? /^[\s]*[^-*>\d.\)\s]+/ : stryMutAct_9fa48("2259") ? /^[\s]*[-*>\d.\)\s]/ : stryMutAct_9fa48("2258") ? /^[\S]*[-*>\d.\)\s]+/ : stryMutAct_9fa48("2257") ? /^[^\s]*[-*>\d.\)\s]+/ : stryMutAct_9fa48("2256") ? /^[\s][-*>\d.\)\s]+/ : stryMutAct_9fa48("2255") ? /[\s]*[-*>\d.\)\s]+/ : (stryCov_9fa48("2255", "2256", "2257", "2258", "2259", "2260", "2261", "2262"), /^[\s]*[-*>\d.\)\s]+/), stryMutAct_9fa48("2263") ? "Stryker was here!" : (stryCov_9fa48("2263"), "")).trim());
          if (stryMutAct_9fa48("2266") ? cleanLine || cleanLine.length > 3 : stryMutAct_9fa48("2265") ? false : stryMutAct_9fa48("2264") ? true : (stryCov_9fa48("2264", "2265", "2266"), cleanLine && (stryMutAct_9fa48("2269") ? cleanLine.length <= 3 : stryMutAct_9fa48("2268") ? cleanLine.length >= 3 : stryMutAct_9fa48("2267") ? true : (stryCov_9fa48("2267", "2268", "2269"), cleanLine.length > 3)))) {
            if (stryMutAct_9fa48("2270")) {
              {}
            } else {
              stryCov_9fa48("2270");
              tasks.push(stryMutAct_9fa48("2271") ? {} : (stryCov_9fa48("2271"), {
                name: cleanLine,
                priority: stryMutAct_9fa48("2272") ? "" : (stryCov_9fa48("2272"), "medium")
              }));
            }
          }
        }
      }
      return tasks;
    }
  }

  /**
   * Generate a project plan from natural language description
   */
  async generateProjectPlan(input: ProjectPlanInput): Promise<GeneratedProject> {
    if (stryMutAct_9fa48("2273")) {
      {}
    } else {
      stryCov_9fa48("2273");
      const {
        projectName,
        description = stryMutAct_9fa48("2274") ? "Stryker was here!" : (stryCov_9fa48("2274"), ""),
        constraints = {},
        context = {}
      } = input;
      const normalizedDescription = stryMutAct_9fa48("2275") ? (description + " " + projectName).toUpperCase() : (stryCov_9fa48("2275"), (description + (stryMutAct_9fa48("2276") ? "" : (stryCov_9fa48("2276"), " ")) + projectName).toLowerCase());

      // Determine project duration based on constraints or description analysis
      const totalDuration = this.calculateProjectDuration(normalizedDescription, constraints);

      // Identify phases based on keywords in the description
      const phases = this.identifyPhases(normalizedDescription, totalDuration);

      // Calculate total duration (sum of all phase durations)
      let calculatedDuration = 0;
      for (const phase of phases) {
        if (stryMutAct_9fa48("2277")) {
          {}
        } else {
          stryCov_9fa48("2277");
          if (stryMutAct_9fa48("2279") ? false : stryMutAct_9fa48("2278") ? true : (stryCov_9fa48("2278", "2279"), phase.duration_days)) {
            if (stryMutAct_9fa48("2280")) {
              {}
            } else {
              stryCov_9fa48("2280");
              stryMutAct_9fa48("2281") ? calculatedDuration -= phase.duration_days : (stryCov_9fa48("2281"), calculatedDuration += phase.duration_days);
            }
          }
        }
      }

      // If no phases detected, create a default single phase
      if (stryMutAct_9fa48("2284") ? phases.length !== 0 : stryMutAct_9fa48("2283") ? false : stryMutAct_9fa48("2282") ? true : (stryCov_9fa48("2282", "2283", "2284"), phases.length === 0)) {
        if (stryMutAct_9fa48("2285")) {
          {}
        } else {
          stryCov_9fa48("2285");
          phases.push(stryMutAct_9fa48("2286") ? {} : (stryCov_9fa48("2286"), {
            name: stryMutAct_9fa48("2287") ? "" : (stryCov_9fa48("2287"), "Execution"),
            description: stryMutAct_9fa48("2288") ? `` : (stryCov_9fa48("2288"), `Primary phase for ${projectName}`),
            duration_days: totalDuration,
            priority: stryMutAct_9fa48("2289") ? "" : (stryCov_9fa48("2289"), "high")
          }));
          calculatedDuration = totalDuration;
        }
      }

      // Distribute remaining days across phases if calculated < total
      if (stryMutAct_9fa48("2293") ? calculatedDuration >= totalDuration : stryMutAct_9fa48("2292") ? calculatedDuration <= totalDuration : stryMutAct_9fa48("2291") ? false : stryMutAct_9fa48("2290") ? true : (stryCov_9fa48("2290", "2291", "2292", "2293"), calculatedDuration < totalDuration)) {
        if (stryMutAct_9fa48("2294")) {
          {}
        } else {
          stryCov_9fa48("2294");
          const remainingDays = stryMutAct_9fa48("2295") ? totalDuration + calculatedDuration : (stryCov_9fa48("2295"), totalDuration - calculatedDuration);
          // Add remaining days to the highest priority phase or spread across all
          if (stryMutAct_9fa48("2299") ? phases.length <= 0 : stryMutAct_9fa48("2298") ? phases.length >= 0 : stryMutAct_9fa48("2297") ? false : stryMutAct_9fa48("2296") ? true : (stryCov_9fa48("2296", "2297", "2298", "2299"), phases.length > 0)) {
            if (stryMutAct_9fa48("2300")) {
              {}
            } else {
              stryCov_9fa48("2300");
              phases[0] = stryMutAct_9fa48("2301") ? {} : (stryCov_9fa48("2301"), {
                ...phases[0],
                duration_days: stryMutAct_9fa48("2302") ? (phases[0].duration_days || 0) - remainingDays : (stryCov_9fa48("2302"), (stryMutAct_9fa48("2305") ? phases[0].duration_days && 0 : stryMutAct_9fa48("2304") ? false : stryMutAct_9fa48("2303") ? true : (stryCov_9fa48("2303", "2304", "2305"), phases[0].duration_days || 0)) + remainingDays)
              });
            }
          }
        }
      }
      return stryMutAct_9fa48("2306") ? {} : (stryCov_9fa48("2306"), {
        name: projectName,
        description: stryMutAct_9fa48("2309") ? description && undefined : stryMutAct_9fa48("2308") ? false : stryMutAct_9fa48("2307") ? true : (stryCov_9fa48("2307", "2308", "2309"), description || undefined),
        phases,
        total_duration_days: stryMutAct_9fa48("2312") ? calculatedDuration && totalDuration : stryMutAct_9fa48("2311") ? false : stryMutAct_9fa48("2310") ? true : (stryCov_9fa48("2310", "2311", "2312"), calculatedDuration || totalDuration),
        provider: this.name
      });
    }
  }

  /**
   * Generate a decision template based on context
   */
  async generateDecisionTemplate(context: {
    decisionType?: string;
    task?: {
      name: string;
      priority?: string;
      deadline?: string;
    };
  }): Promise<{
    name: string;
    prompt_template: string;
    option_template?: string;
    provider: string;
  }> {
    if (stryMutAct_9fa48("2313")) {
      {}
    } else {
      stryCov_9fa48("2313");
      const decisionTemplates: Record<string, {
        name: string;
        prompt_template: string;
        option_template?: string;
      }> = stryMutAct_9fa48("2314") ? {} : (stryCov_9fa48("2314"), {
        priority: stryMutAct_9fa48("2315") ? {} : (stryCov_9fa48("2315"), {
          name: stryMutAct_9fa48("2316") ? "" : (stryCov_9fa48("2316"), "Priority Decision Template"),
          prompt_template: stryMutAct_9fa48("2317") ? "" : (stryCov_9fa48("2317"), "You need to decide on priority for task: {task_name}. Consider: deadline, urgency, impact, effort required. What's the best priority level (critical, high, medium, low)?"),
          option_template: stryMutAct_9fa48("2318") ? "" : (stryCov_9fa48("2318"), '[{{ "critical": "Urgent and important - do immediately", "high": "Important but not urgent - schedule soon", "medium": "Standard priority - do when scheduled", "low": "Can wait - low impact" }}]')
        }),
        approach: stryMutAct_9fa48("2319") ? {} : (stryCov_9fa48("2319"), {
          name: stryMutAct_9fa48("2320") ? "" : (stryCov_9fa48("2320"), "Approach Decision Template"),
          prompt_template: stryMutAct_9fa48("2321") ? "" : (stryCov_9fa48("2321"), "You need to decide on an approach for: {task_name}. What's the best strategy? Consider: available resources, constraints, past learnings, and desired outcome."),
          option_template: stryMutAct_9fa48("2322") ? "" : (stryCov_9fa48("2322"), '[{{ "method1": "Description", "method2": "Description", "method3": "Description" }}]')
        }),
        tool: stryMutAct_9fa48("2323") ? {} : (stryCov_9fa48("2323"), {
          name: stryMutAct_9fa48("2324") ? "" : (stryCov_9fa48("2324"), "Tool Selection Template"),
          prompt_template: stryMutAct_9fa48("2325") ? "" : (stryCov_9fa48("2325"), "You need to select a tool for: {task_name}. What tool best fits the need? Consider: cost, integration, learning curve, and capabilities."),
          option_template: stryMutAct_9fa48("2326") ? "" : (stryCov_9fa48("2326"), '[{{ "tool_name": "Features, pros, cons", "alternative": "Features, pros, cons" }}]')
        }),
        timeline: stryMutAct_9fa48("2327") ? {} : (stryCov_9fa48("2327"), {
          name: stryMutAct_9fa48("2328") ? "" : (stryCov_9fa48("2328"), "Timeline Decision Template"),
          prompt_template: stryMutAct_9fa48("2329") ? "" : (stryCov_9fa48("2329"), "You need to decide on a timeline for: {task_name}. When should this be completed? Consider: dependencies, deadlines, and available time."),
          option_template: stryMutAct_9fa48("2330") ? "" : (stryCov_9fa48("2330"), '[{{ "date": "Duration, milestones", "alternative_date": "Duration, milestones" }}]')
        }),
        allocation: stryMutAct_9fa48("2331") ? {} : (stryCov_9fa48("2331"), {
          name: stryMutAct_9fa48("2332") ? "" : (stryCov_9fa48("2332"), "Resource Allocation Template"),
          prompt_template: stryMutAct_9fa48("2333") ? "" : (stryCov_9fa48("2333"), "You need to allocate resources for: {task_name}. How should resources be distributed? Consider: team capacity, skill requirements, and priority."),
          option_template: stryMutAct_9fa48("2334") ? "" : (stryCov_9fa48("2334"), '[{{ "allocation1": "Resources, rationale", "allocation2": "Resources, rationale" }}]')
        }),
        cancellation: stryMutAct_9fa48("2335") ? {} : (stryCov_9fa48("2335"), {
          name: stryMutAct_9fa48("2336") ? "" : (stryCov_9fa48("2336"), "Cancellation Decision Template"),
          prompt_template: stryMutAct_9fa48("2337") ? "" : (stryCov_9fa48("2337"), "You need to decide whether to cancel: {task_name}. What are the costs and benefits of cancellation vs. completion? Consider: time invested, remaining work, and opportunity cost."),
          option_template: stryMutAct_9fa48("2338") ? "" : (stryCov_9fa48("2338"), '[{{ "cancel": "Rationale, costs", "complete": "Rationale, benefits", "defer": "Conditions for deferral" }}]')
        })
      });
      const template = stryMutAct_9fa48("2341") ? decisionTemplates[context.decisionType || "approach"] && decisionTemplates.approach : stryMutAct_9fa48("2340") ? false : stryMutAct_9fa48("2339") ? true : (stryCov_9fa48("2339", "2340", "2341"), decisionTemplates[stryMutAct_9fa48("2344") ? context.decisionType && "approach" : stryMutAct_9fa48("2343") ? false : stryMutAct_9fa48("2342") ? true : (stryCov_9fa48("2342", "2343", "2344"), context.decisionType || (stryMutAct_9fa48("2345") ? "" : (stryCov_9fa48("2345"), "approach")))] || decisionTemplates.approach);
      return stryMutAct_9fa48("2346") ? {} : (stryCov_9fa48("2346"), {
        ...template,
        provider: this.name
      });
    }
  }

  /**
   * Calculate project duration from description and constraints
   */
  private calculateProjectDuration(description: string, constraints: ProjectPlanInput["constraints"]): number {
    if (stryMutAct_9fa48("2347")) {
      {}
    } else {
      stryCov_9fa48("2347");
      // Check for explicit constraint dates
      if (stryMutAct_9fa48("2350") ? constraints?.deadline || constraints?.startDate : stryMutAct_9fa48("2349") ? false : stryMutAct_9fa48("2348") ? true : (stryCov_9fa48("2348", "2349", "2350"), (stryMutAct_9fa48("2351") ? constraints.deadline : (stryCov_9fa48("2351"), constraints?.deadline)) && (stryMutAct_9fa48("2352") ? constraints.startDate : (stryCov_9fa48("2352"), constraints?.startDate)))) {
        if (stryMutAct_9fa48("2353")) {
          {}
        } else {
          stryCov_9fa48("2353");
          const deadline = new Date(constraints.deadline);
          const startDate = new Date(constraints.startDate);
          const diffDays = Math.ceil(stryMutAct_9fa48("2354") ? (deadline.getTime() - startDate.getTime()) * (1000 * 60 * 60 * 24) : (stryCov_9fa48("2354"), (stryMutAct_9fa48("2355") ? deadline.getTime() + startDate.getTime() : (stryCov_9fa48("2355"), deadline.getTime() - startDate.getTime())) / (stryMutAct_9fa48("2356") ? 1000 * 60 * 60 / 24 : (stryCov_9fa48("2356"), (stryMutAct_9fa48("2357") ? 1000 * 60 / 60 : (stryCov_9fa48("2357"), (stryMutAct_9fa48("2358") ? 1000 / 60 : (stryCov_9fa48("2358"), 1000 * 60)) * 60)) * 24))));
          if (stryMutAct_9fa48("2362") ? diffDays <= 0 : stryMutAct_9fa48("2361") ? diffDays >= 0 : stryMutAct_9fa48("2360") ? false : stryMutAct_9fa48("2359") ? true : (stryCov_9fa48("2359", "2360", "2361", "2362"), diffDays > 0)) return diffDays;
        }
      }

      // Check for duration keywords in description
      const durationPatterns = stryMutAct_9fa48("2363") ? [] : (stryCov_9fa48("2363"), [stryMutAct_9fa48("2364") ? {} : (stryCov_9fa48("2364"), {
        pattern: stryMutAct_9fa48("2368") ? /(\d+)\S*day/i : stryMutAct_9fa48("2367") ? /(\d+)\sday/i : stryMutAct_9fa48("2366") ? /(\D+)\s*day/i : stryMutAct_9fa48("2365") ? /(\d)\s*day/i : (stryCov_9fa48("2365", "2366", "2367", "2368"), /(\d+)\s*day/i),
        days: 1
      }), stryMutAct_9fa48("2369") ? {} : (stryCov_9fa48("2369"), {
        pattern: stryMutAct_9fa48("2373") ? /(\d+)\S*week/i : stryMutAct_9fa48("2372") ? /(\d+)\sweek/i : stryMutAct_9fa48("2371") ? /(\D+)\s*week/i : stryMutAct_9fa48("2370") ? /(\d)\s*week/i : (stryCov_9fa48("2370", "2371", "2372", "2373"), /(\d+)\s*week/i),
        days: 7
      }), stryMutAct_9fa48("2374") ? {} : (stryCov_9fa48("2374"), {
        pattern: stryMutAct_9fa48("2378") ? /(\d+)\S*month/i : stryMutAct_9fa48("2377") ? /(\d+)\smonth/i : stryMutAct_9fa48("2376") ? /(\D+)\s*month/i : stryMutAct_9fa48("2375") ? /(\d)\s*month/i : (stryCov_9fa48("2375", "2376", "2377", "2378"), /(\d+)\s*month/i),
        days: 30
      }), stryMutAct_9fa48("2379") ? {} : (stryCov_9fa48("2379"), {
        pattern: stryMutAct_9fa48("2383") ? /(\d+)\S*hour/i : stryMutAct_9fa48("2382") ? /(\d+)\shour/i : stryMutAct_9fa48("2381") ? /(\D+)\s*hour/i : stryMutAct_9fa48("2380") ? /(\d)\s*hour/i : (stryCov_9fa48("2380", "2381", "2382", "2383"), /(\d+)\s*hour/i),
        days: 0
      })]);

      // Look for timeline indicators
      const timelineMatch = description.match(stryMutAct_9fa48("2384") ? /(quick|fast|rapid|short).(project|delivery|milestone)/i : (stryCov_9fa48("2384"), /(quick|fast|rapid|short).*?(project|delivery|milestone)/i));
      if (stryMutAct_9fa48("2386") ? false : stryMutAct_9fa48("2385") ? true : (stryCov_9fa48("2385", "2386"), timelineMatch)) {
        if (stryMutAct_9fa48("2387")) {
          {}
        } else {
          stryCov_9fa48("2387");
          return 14;
        }
      }
      const mediumMatch = description.match(/medium|standard|normal|typical/i);
      if (stryMutAct_9fa48("2389") ? false : stryMutAct_9fa48("2388") ? true : (stryCov_9fa48("2388", "2389"), mediumMatch)) {
        if (stryMutAct_9fa48("2390")) {
          {}
        } else {
          stryCov_9fa48("2390");
          return 60;
        }
      }
      const longMatch = description.match(/(long|extended|comprehensive|major|enterprise|large)/i);
      if (stryMutAct_9fa48("2392") ? false : stryMutAct_9fa48("2391") ? true : (stryCov_9fa48("2391", "2392"), longMatch)) {
        if (stryMutAct_9fa48("2393")) {
          {}
        } else {
          stryCov_9fa48("2393");
          return 180;
        }
      }

      // Default duration based on project complexity keywords
      const complexityKeywords = stryMutAct_9fa48("2394") ? {} : (stryCov_9fa48("2394"), {
        "simple": 30,
        "basic": 30,
        "standard": 60,
        "complex": 90,
        "advanced": 90,
        "enterprise": 180,
        "major": 120,
        "comprehensive": 150
      });
      for (const [keyword, defaultDays] of Object.entries(complexityKeywords)) {
        if (stryMutAct_9fa48("2395")) {
          {}
        } else {
          stryCov_9fa48("2395");
          if (stryMutAct_9fa48("2397") ? false : stryMutAct_9fa48("2396") ? true : (stryCov_9fa48("2396", "2397"), description.includes(keyword))) {
            if (stryMutAct_9fa48("2398")) {
              {}
            } else {
              stryCov_9fa48("2398");
              return defaultDays;
            }
          }
        }
      }

      // Check for "sprint" or "agile" patterns
      if (stryMutAct_9fa48("2401") ? description.includes("sprint") && description.includes("agile") : stryMutAct_9fa48("2400") ? false : stryMutAct_9fa48("2399") ? true : (stryCov_9fa48("2399", "2400", "2401"), description.includes(stryMutAct_9fa48("2402") ? "" : (stryCov_9fa48("2402"), "sprint")) || description.includes(stryMutAct_9fa48("2403") ? "" : (stryCov_9fa48("2403"), "agile")))) {
        if (stryMutAct_9fa48("2404")) {
          {}
        } else {
          stryCov_9fa48("2404");
          return 90;
        }
      }

      // Check for "launch" or "rollout" keywords
      if (stryMutAct_9fa48("2407") ? (description.includes("launch") || description.includes("rollout")) && description.includes("release") : stryMutAct_9fa48("2406") ? false : stryMutAct_9fa48("2405") ? true : (stryCov_9fa48("2405", "2406", "2407"), (stryMutAct_9fa48("2409") ? description.includes("launch") && description.includes("rollout") : stryMutAct_9fa48("2408") ? false : (stryCov_9fa48("2408", "2409"), description.includes(stryMutAct_9fa48("2410") ? "" : (stryCov_9fa48("2410"), "launch")) || description.includes(stryMutAct_9fa48("2411") ? "" : (stryCov_9fa48("2411"), "rollout")))) || description.includes(stryMutAct_9fa48("2412") ? "" : (stryCov_9fa48("2412"), "release")))) {
        if (stryMutAct_9fa48("2413")) {
          {}
        } else {
          stryCov_9fa48("2413");
          return 60;
        }
      }

      // Default project duration
      return 60;
    }
  }

  /**
   * Identify phases based on keywords in the description
   */
  private identifyPhases(description: string, totalDuration: number): ProjectPhase[] {
    if (stryMutAct_9fa48("2414")) {
      {}
    } else {
      stryCov_9fa48("2414");
      const phases: ProjectPhase[] = stryMutAct_9fa48("2415") ? ["Stryker was here"] : (stryCov_9fa48("2415"), []);
      let remainingDays = totalDuration;

      // Define standard phase templates
      const phaseTemplates: Array<{
        namePattern: string[];
        description?: string;
        priorityKeyword: string[];
        estimatedDays?: number;
      }> = stryMutAct_9fa48("2416") ? [] : (stryCov_9fa48("2416"), [stryMutAct_9fa48("2417") ? {} : (stryCov_9fa48("2417"), {
        namePattern: stryMutAct_9fa48("2418") ? [] : (stryCov_9fa48("2418"), [stryMutAct_9fa48("2419") ? "" : (stryCov_9fa48("2419"), "planning"), stryMutAct_9fa48("2420") ? "" : (stryCov_9fa48("2420"), "setup"), stryMutAct_9fa48("2421") ? "" : (stryCov_9fa48("2421"), "design"), stryMutAct_9fa48("2422") ? "" : (stryCov_9fa48("2422"), "research")]),
        description: stryMutAct_9fa48("2423") ? "" : (stryCov_9fa48("2423"), "Initial planning, research, and design work"),
        priorityKeyword: stryMutAct_9fa48("2424") ? [] : (stryCov_9fa48("2424"), [stryMutAct_9fa48("2425") ? "" : (stryCov_9fa48("2425"), "critical"), stryMutAct_9fa48("2426") ? "" : (stryCov_9fa48("2426"), "important"), stryMutAct_9fa48("2427") ? "" : (stryCov_9fa48("2427"), "essential"), stryMutAct_9fa48("2428") ? "" : (stryCov_9fa48("2428"), "foundational")]),
        estimatedDays: Math.floor(stryMutAct_9fa48("2429") ? totalDuration / 0.15 : (stryCov_9fa48("2429"), totalDuration * 0.15))
      }), stryMutAct_9fa48("2430") ? {} : (stryCov_9fa48("2430"), {
        namePattern: stryMutAct_9fa48("2431") ? [] : (stryCov_9fa48("2431"), [stryMutAct_9fa48("2432") ? "" : (stryCov_9fa48("2432"), "development"), stryMutAct_9fa48("2433") ? "" : (stryCov_9fa48("2433"), "building"), stryMutAct_9fa48("2434") ? "" : (stryCov_9fa48("2434"), "implementation"), stryMutAct_9fa48("2435") ? "" : (stryCov_9fa48("2435"), "coding"), stryMutAct_9fa48("2436") ? "" : (stryCov_9fa48("2436"), "creation")]),
        description: stryMutAct_9fa48("2437") ? "" : (stryCov_9fa48("2437"), "Core development and implementation work"),
        priorityKeyword: stryMutAct_9fa48("2438") ? [] : (stryCov_9fa48("2438"), [stryMutAct_9fa48("2439") ? "" : (stryCov_9fa48("2439"), "high"), stryMutAct_9fa48("2440") ? "" : (stryCov_9fa48("2440"), "critical"), stryMutAct_9fa48("2441") ? "" : (stryCov_9fa48("2441"), "essential"), stryMutAct_9fa48("2442") ? "" : (stryCov_9fa48("2442"), "main")]),
        estimatedDays: Math.floor(stryMutAct_9fa48("2443") ? totalDuration / 0.5 : (stryCov_9fa48("2443"), totalDuration * 0.5))
      }), stryMutAct_9fa48("2444") ? {} : (stryCov_9fa48("2444"), {
        namePattern: stryMutAct_9fa48("2445") ? [] : (stryCov_9fa48("2445"), [stryMutAct_9fa48("2446") ? "" : (stryCov_9fa48("2446"), "testing"), stryMutAct_9fa48("2447") ? "" : (stryCov_9fa48("2447"), "review"), stryMutAct_9fa48("2448") ? "" : (stryCov_9fa48("2448"), "qa"), stryMutAct_9fa48("2449") ? "" : (stryCov_9fa48("2449"), "quality"), stryMutAct_9fa48("2450") ? "" : (stryCov_9fa48("2450"), "debug")]),
        description: stryMutAct_9fa48("2451") ? "" : (stryCov_9fa48("2451"), "Testing, quality assurance, and bug fixes"),
        priorityKeyword: stryMutAct_9fa48("2452") ? [] : (stryCov_9fa48("2452"), [stryMutAct_9fa48("2453") ? "" : (stryCov_9fa48("2453"), "high"), stryMutAct_9fa48("2454") ? "" : (stryCov_9fa48("2454"), "important"), stryMutAct_9fa48("2455") ? "" : (stryCov_9fa48("2455"), "required")]),
        estimatedDays: Math.floor(stryMutAct_9fa48("2456") ? totalDuration / 0.2 : (stryCov_9fa48("2456"), totalDuration * 0.2))
      }), stryMutAct_9fa48("2457") ? {} : (stryCov_9fa48("2457"), {
        namePattern: stryMutAct_9fa48("2458") ? [] : (stryCov_9fa48("2458"), [stryMutAct_9fa48("2459") ? "" : (stryCov_9fa48("2459"), "launch"), stryMutAct_9fa48("2460") ? "" : (stryCov_9fa48("2460"), "deployment"), stryMutAct_9fa48("2461") ? "" : (stryCov_9fa48("2461"), "release"), stryMutAct_9fa48("2462") ? "" : (stryCov_9fa48("2462"), "go-live")]),
        description: stryMutAct_9fa48("2463") ? "" : (stryCov_9fa48("2463"), "Final deployment and launch activities"),
        priorityKeyword: stryMutAct_9fa48("2464") ? [] : (stryCov_9fa48("2464"), [stryMutAct_9fa48("2465") ? "" : (stryCov_9fa48("2465"), "critical"), stryMutAct_9fa48("2466") ? "" : (stryCov_9fa48("2466"), "urgent"), stryMutAct_9fa48("2467") ? "" : (stryCov_9fa48("2467"), "must-have"), stryMutAct_9fa48("2468") ? "" : (stryCov_9fa48("2468"), "final")]),
        estimatedDays: Math.floor(stryMutAct_9fa48("2469") ? totalDuration / 0.1 : (stryCov_9fa48("2469"), totalDuration * 0.1))
      }), stryMutAct_9fa48("2470") ? {} : (stryCov_9fa48("2470"), {
        namePattern: stryMutAct_9fa48("2471") ? [] : (stryCov_9fa48("2471"), [stryMutAct_9fa48("2472") ? "" : (stryCov_9fa48("2472"), "maintenance"), stryMutAct_9fa48("2473") ? "" : (stryCov_9fa48("2473"), "support"), stryMutAct_9fa48("2474") ? "" : (stryCov_9fa48("2474"), "update"), stryMutAct_9fa48("2475") ? "" : (stryCov_9fa48("2475"), "optimization")]),
        description: stryMutAct_9fa48("2476") ? "" : (stryCov_9fa48("2476"), "Post-launch monitoring and optimization"),
        priorityKeyword: stryMutAct_9fa48("2477") ? [] : (stryCov_9fa48("2477"), [stryMutAct_9fa48("2478") ? "" : (stryCov_9fa48("2478"), "medium"), stryMutAct_9fa48("2479") ? "" : (stryCov_9fa48("2479"), "ongoing"), stryMutAct_9fa48("2480") ? "" : (stryCov_9fa48("2480"), "support")]),
        estimatedDays: Math.floor(stryMutAct_9fa48("2481") ? totalDuration / 0.05 : (stryCov_9fa48("2481"), totalDuration * 0.05))
      })]);

      // Track which phases have been detected
      const detectedPhaseKeys = new Set<string>();

      // Find matching phases based on keywords
      for (const [phaseIndex, template] of phaseTemplates.entries()) {
        if (stryMutAct_9fa48("2482")) {
          {}
        } else {
          stryCov_9fa48("2482");
          const matches = stryMutAct_9fa48("2483") ? template.namePattern : (stryCov_9fa48("2483"), template.namePattern.filter(stryMutAct_9fa48("2484") ? () => undefined : (stryCov_9fa48("2484"), pattern => stryMutAct_9fa48("2487") ? description.includes(pattern) && detectedPhaseKeys.has(pattern) : stryMutAct_9fa48("2486") ? false : stryMutAct_9fa48("2485") ? true : (stryCov_9fa48("2485", "2486", "2487"), description.includes(pattern) || detectedPhaseKeys.has(pattern)))));
          if (stryMutAct_9fa48("2491") ? matches.length <= 0 : stryMutAct_9fa48("2490") ? matches.length >= 0 : stryMutAct_9fa48("2489") ? false : stryMutAct_9fa48("2488") ? true : (stryCov_9fa48("2488", "2489", "2490", "2491"), matches.length > 0)) {
            if (stryMutAct_9fa48("2492")) {
              {}
            } else {
              stryCov_9fa48("2492");
              // Determine priority based on keywords in description
              let priority: "critical" | "high" | "medium" | "low" | "none" = stryMutAct_9fa48("2493") ? "" : (stryCov_9fa48("2493"), "medium");
              if (stryMutAct_9fa48("2496") ? template.priorityKeyword.every(k => description.includes(k)) : stryMutAct_9fa48("2495") ? false : stryMutAct_9fa48("2494") ? true : (stryCov_9fa48("2494", "2495", "2496"), template.priorityKeyword.some(stryMutAct_9fa48("2497") ? () => undefined : (stryCov_9fa48("2497"), k => description.includes(k))))) {
                if (stryMutAct_9fa48("2498")) {
                  {}
                } else {
                  stryCov_9fa48("2498");
                  if (stryMutAct_9fa48("2501") ? (template.priorityKeyword.includes("critical") || template.priorityKeyword.includes("must-have")) && template.priorityKeyword.includes("urgent") : stryMutAct_9fa48("2500") ? false : stryMutAct_9fa48("2499") ? true : (stryCov_9fa48("2499", "2500", "2501"), (stryMutAct_9fa48("2503") ? template.priorityKeyword.includes("critical") && template.priorityKeyword.includes("must-have") : stryMutAct_9fa48("2502") ? false : (stryCov_9fa48("2502", "2503"), template.priorityKeyword.includes(stryMutAct_9fa48("2504") ? "" : (stryCov_9fa48("2504"), "critical")) || template.priorityKeyword.includes(stryMutAct_9fa48("2505") ? "" : (stryCov_9fa48("2505"), "must-have")))) || template.priorityKeyword.includes(stryMutAct_9fa48("2506") ? "" : (stryCov_9fa48("2506"), "urgent")))) {
                    if (stryMutAct_9fa48("2507")) {
                      {}
                    } else {
                      stryCov_9fa48("2507");
                      priority = stryMutAct_9fa48("2508") ? "" : (stryCov_9fa48("2508"), "critical");
                    }
                  } else if (stryMutAct_9fa48("2510") ? false : stryMutAct_9fa48("2509") ? true : (stryCov_9fa48("2509", "2510"), template.priorityKeyword.includes(stryMutAct_9fa48("2511") ? "" : (stryCov_9fa48("2511"), "high")))) {
                    if (stryMutAct_9fa48("2512")) {
                      {}
                    } else {
                      stryCov_9fa48("2512");
                      priority = stryMutAct_9fa48("2513") ? "" : (stryCov_9fa48("2513"), "high");
                    }
                  } else if (stryMutAct_9fa48("2515") ? false : stryMutAct_9fa48("2514") ? true : (stryCov_9fa48("2514", "2515"), template.priorityKeyword.includes(stryMutAct_9fa48("2516") ? "" : (stryCov_9fa48("2516"), "medium")))) {
                    if (stryMutAct_9fa48("2517")) {
                      {}
                    } else {
                      stryCov_9fa48("2517");
                      priority = stryMutAct_9fa48("2518") ? "" : (stryCov_9fa48("2518"), "medium");
                    }
                  } else {
                    if (stryMutAct_9fa48("2519")) {
                      {}
                    } else {
                      stryCov_9fa48("2519");
                      priority = stryMutAct_9fa48("2520") ? "" : (stryCov_9fa48("2520"), "low");
                    }
                  }
                }
              }

              // Calculate duration (minimum 3 days, use estimatedDays if found)
              let phaseDays = stryMutAct_9fa48("2523") ? template.estimatedDays && Math.max(3, Math.floor(totalDuration / 5)) : stryMutAct_9fa48("2522") ? false : stryMutAct_9fa48("2521") ? true : (stryCov_9fa48("2521", "2522", "2523"), template.estimatedDays || (stryMutAct_9fa48("2524") ? Math.min(3, Math.floor(totalDuration / 5)) : (stryCov_9fa48("2524"), Math.max(3, Math.floor(stryMutAct_9fa48("2525") ? totalDuration * 5 : (stryCov_9fa48("2525"), totalDuration / 5))))));

              // Check if there are specific duration mentions
              const phaseNumberMatch = description.match(new RegExp(stryMutAct_9fa48("2526") ? `` : (stryCov_9fa48("2526"), `${matches[0]}\\s*(\\d+)\\s*(?:day|week)`), stryMutAct_9fa48("2527") ? "" : (stryCov_9fa48("2527"), "i")));
              if (stryMutAct_9fa48("2529") ? false : stryMutAct_9fa48("2528") ? true : (stryCov_9fa48("2528", "2529"), phaseNumberMatch)) {
                if (stryMutAct_9fa48("2530")) {
                  {}
                } else {
                  stryCov_9fa48("2530");
                  const num = parseInt(phaseNumberMatch[1], 10);
                  const unit = stryMutAct_9fa48("2531") ? phaseNumberMatch[2].toUpperCase() : (stryCov_9fa48("2531"), phaseNumberMatch[2].toLowerCase());
                  phaseDays = (stryMutAct_9fa48("2534") ? unit !== "week" : stryMutAct_9fa48("2533") ? false : stryMutAct_9fa48("2532") ? true : (stryCov_9fa48("2532", "2533", "2534"), unit === (stryMutAct_9fa48("2535") ? "" : (stryCov_9fa48("2535"), "week")))) ? stryMutAct_9fa48("2536") ? num / 7 : (stryCov_9fa48("2536"), num * 7) : num;
                }
              }

              // Mark these patterns as detected
              for (const match of matches) {
                if (stryMutAct_9fa48("2537")) {
                  {}
                } else {
                  stryCov_9fa48("2537");
                  detectedPhaseKeys.add(match);
                }
              }
              phases.push(stryMutAct_9fa48("2538") ? {} : (stryCov_9fa48("2538"), {
                name: this.formatPhaseName(matches[0], phaseIndex),
                description: template.description,
                duration_days: phaseDays,
                priority
              }));
              stryMutAct_9fa48("2539") ? remainingDays += phaseDays : (stryCov_9fa48("2539"), remainingDays -= phaseDays);
            }
          }
        }
      }
      return phases;
    }
  }

  /**
   * Format phase name to be more readable and appropriate
   */
  private formatPhaseName(keyword: string, phaseIndex: number): string {
    if (stryMutAct_9fa48("2540")) {
      {}
    } else {
      stryCov_9fa48("2540");
      const nameMap: Record<string, string> = stryMutAct_9fa48("2541") ? {} : (stryCov_9fa48("2541"), {
        "planning": stryMutAct_9fa48("2542") ? "" : (stryCov_9fa48("2542"), "Planning"),
        "setup": stryMutAct_9fa48("2543") ? "" : (stryCov_9fa48("2543"), "Setup"),
        "design": stryMutAct_9fa48("2544") ? "" : (stryCov_9fa48("2544"), "Design"),
        "research": stryMutAct_9fa48("2545") ? "" : (stryCov_9fa48("2545"), "Research"),
        "development": stryMutAct_9fa48("2546") ? "" : (stryCov_9fa48("2546"), "Development"),
        "building": stryMutAct_9fa48("2547") ? "" : (stryCov_9fa48("2547"), "Building"),
        "implementation": stryMutAct_9fa48("2548") ? "" : (stryCov_9fa48("2548"), "Implementation"),
        "coding": stryMutAct_9fa48("2549") ? "" : (stryCov_9fa48("2549"), "Coding"),
        "creation": stryMutAct_9fa48("2550") ? "" : (stryCov_9fa48("2550"), "Creation"),
        "testing": stryMutAct_9fa48("2551") ? "" : (stryCov_9fa48("2551"), "Testing"),
        "review": stryMutAct_9fa48("2552") ? "" : (stryCov_9fa48("2552"), "Review"),
        "qa": stryMutAct_9fa48("2553") ? "" : (stryCov_9fa48("2553"), "QA"),
        "quality": stryMutAct_9fa48("2554") ? "" : (stryCov_9fa48("2554"), "Quality Assurance"),
        "debug": stryMutAct_9fa48("2555") ? "" : (stryCov_9fa48("2555"), "Debugging"),
        "launch": stryMutAct_9fa48("2556") ? "" : (stryCov_9fa48("2556"), "Launch"),
        "deployment": stryMutAct_9fa48("2557") ? "" : (stryCov_9fa48("2557"), "Deployment"),
        "release": stryMutAct_9fa48("2558") ? "" : (stryCov_9fa48("2558"), "Release"),
        "go-live": stryMutAct_9fa48("2559") ? "" : (stryCov_9fa48("2559"), "Go Live"),
        "maintenance": stryMutAct_9fa48("2560") ? "" : (stryCov_9fa48("2560"), "Maintenance"),
        "support": stryMutAct_9fa48("2561") ? "" : (stryCov_9fa48("2561"), "Support"),
        "update": stryMutAct_9fa48("2562") ? "" : (stryCov_9fa48("2562"), "Update"),
        "optimization": stryMutAct_9fa48("2563") ? "" : (stryCov_9fa48("2563"), "Optimization")
      });
      return stryMutAct_9fa48("2566") ? nameMap[keyword.toLowerCase()] && keyword.charAt(0).toUpperCase() + keyword.slice(1) : stryMutAct_9fa48("2565") ? false : stryMutAct_9fa48("2564") ? true : (stryCov_9fa48("2564", "2565", "2566"), nameMap[stryMutAct_9fa48("2567") ? keyword.toUpperCase() : (stryCov_9fa48("2567"), keyword.toLowerCase())] || (stryMutAct_9fa48("2568") ? keyword.charAt(0).toUpperCase() - keyword.slice(1) : (stryCov_9fa48("2568"), (stryMutAct_9fa48("2570") ? keyword.toUpperCase() : stryMutAct_9fa48("2569") ? keyword.charAt(0).toLowerCase() : (stryCov_9fa48("2569", "2570"), keyword.charAt(0).toUpperCase())) + (stryMutAct_9fa48("2571") ? keyword : (stryCov_9fa48("2571"), keyword.slice(1))))));
    }
  }
  async generateInsights(tasks: Array<{
    name: string;
    completed: boolean;
    priority: string;
    date?: string | null;
    deadline?: string | null;
  }>): Promise<{
    tips: string[];
    suggestions: string[];
    trends: string[];
  }> {
    if (stryMutAct_9fa48("2572")) {
      {}
    } else {
      stryCov_9fa48("2572");
      const completed = stryMutAct_9fa48("2573") ? tasks.length : (stryCov_9fa48("2573"), tasks.filter(stryMutAct_9fa48("2574") ? () => undefined : (stryCov_9fa48("2574"), t => t.completed)).length);
      const total = tasks.length;
      const completionRate = (stryMutAct_9fa48("2578") ? total <= 0 : stryMutAct_9fa48("2577") ? total >= 0 : stryMutAct_9fa48("2576") ? false : stryMutAct_9fa48("2575") ? true : (stryCov_9fa48("2575", "2576", "2577", "2578"), total > 0)) ? Math.round(stryMutAct_9fa48("2579") ? completed / total / 100 : (stryCov_9fa48("2579"), (stryMutAct_9fa48("2580") ? completed * total : (stryCov_9fa48("2580"), completed / total)) * 100)) : 0;
      const now = new Date();
      const tips: string[] = stryMutAct_9fa48("2581") ? ["Stryker was here"] : (stryCov_9fa48("2581"), []);
      const suggestions: string[] = stryMutAct_9fa48("2582") ? ["Stryker was here"] : (stryCov_9fa48("2582"), []);
      const trends: string[] = stryMutAct_9fa48("2583") ? ["Stryker was here"] : (stryCov_9fa48("2583"), []);

      // Productivity tips based on completion rate
      if (stryMutAct_9fa48("2587") ? completionRate >= 30 : stryMutAct_9fa48("2586") ? completionRate <= 30 : stryMutAct_9fa48("2585") ? false : stryMutAct_9fa48("2584") ? true : (stryCov_9fa48("2584", "2585", "2586", "2587"), completionRate < 30)) {
        if (stryMutAct_9fa48("2588")) {
          {}
        } else {
          stryCov_9fa48("2588");
          tips.push(stryMutAct_9fa48("2589") ? "" : (stryCov_9fa48("2589"), "Your completion rate is quite low. Try breaking large tasks into smaller, actionable steps."));
        }
      } else if (stryMutAct_9fa48("2593") ? completionRate >= 50 : stryMutAct_9fa48("2592") ? completionRate <= 50 : stryMutAct_9fa48("2591") ? false : stryMutAct_9fa48("2590") ? true : (stryCov_9fa48("2590", "2591", "2592", "2593"), completionRate < 50)) {
        if (stryMutAct_9fa48("2594")) {
          {}
        } else {
          stryCov_9fa48("2594");
          tips.push(stryMutAct_9fa48("2595") ? "" : (stryCov_9fa48("2595"), "Focus on completing high-priority tasks first to improve your completion rate."));
        }
      } else if (stryMutAct_9fa48("2599") ? completionRate < 80 : stryMutAct_9fa48("2598") ? completionRate > 80 : stryMutAct_9fa48("2597") ? false : stryMutAct_9fa48("2596") ? true : (stryCov_9fa48("2596", "2597", "2598", "2599"), completionRate >= 80)) {
        if (stryMutAct_9fa48("2600")) {
          {}
        } else {
          stryCov_9fa48("2600");
          tips.push(stryMutAct_9fa48("2601") ? "" : (stryCov_9fa48("2601"), "Great job! Your completion rate is excellent. Consider taking on more challenging tasks."));
        }
      } else if (stryMutAct_9fa48("2605") ? completionRate < 60 : stryMutAct_9fa48("2604") ? completionRate > 60 : stryMutAct_9fa48("2603") ? false : stryMutAct_9fa48("2602") ? true : (stryCov_9fa48("2602", "2603", "2604", "2605"), completionRate >= 60)) {
        if (stryMutAct_9fa48("2606")) {
          {}
        } else {
          stryCov_9fa48("2606");
          tips.push(stryMutAct_9fa48("2607") ? "" : (stryCov_9fa48("2607"), "Good progress! Keep focusing on consistency to reach the next level."));
        }
      }

      // Priority-based suggestions
      const criticalTasks = stryMutAct_9fa48("2608") ? tasks : (stryCov_9fa48("2608"), tasks.filter(stryMutAct_9fa48("2609") ? () => undefined : (stryCov_9fa48("2609"), t => stryMutAct_9fa48("2612") ? t.priority === "critical" || !t.completed : stryMutAct_9fa48("2611") ? false : stryMutAct_9fa48("2610") ? true : (stryCov_9fa48("2610", "2611", "2612"), (stryMutAct_9fa48("2614") ? t.priority !== "critical" : stryMutAct_9fa48("2613") ? true : (stryCov_9fa48("2613", "2614"), t.priority === (stryMutAct_9fa48("2615") ? "" : (stryCov_9fa48("2615"), "critical")))) && (stryMutAct_9fa48("2616") ? t.completed : (stryCov_9fa48("2616"), !t.completed))))));
      const highPriorityTasks = stryMutAct_9fa48("2617") ? tasks : (stryCov_9fa48("2617"), tasks.filter(stryMutAct_9fa48("2618") ? () => undefined : (stryCov_9fa48("2618"), t => stryMutAct_9fa48("2621") ? t.priority === "high" || !t.completed : stryMutAct_9fa48("2620") ? false : stryMutAct_9fa48("2619") ? true : (stryCov_9fa48("2619", "2620", "2621"), (stryMutAct_9fa48("2623") ? t.priority !== "high" : stryMutAct_9fa48("2622") ? true : (stryCov_9fa48("2622", "2623"), t.priority === (stryMutAct_9fa48("2624") ? "" : (stryCov_9fa48("2624"), "high")))) && (stryMutAct_9fa48("2625") ? t.completed : (stryCov_9fa48("2625"), !t.completed))))));
      if (stryMutAct_9fa48("2629") ? criticalTasks.length <= 3 : stryMutAct_9fa48("2628") ? criticalTasks.length >= 3 : stryMutAct_9fa48("2627") ? false : stryMutAct_9fa48("2626") ? true : (stryCov_9fa48("2626", "2627", "2628", "2629"), criticalTasks.length > 3)) {
        if (stryMutAct_9fa48("2630")) {
          {}
        } else {
          stryCov_9fa48("2630");
          suggestions.push(stryMutAct_9fa48("2631") ? `` : (stryCov_9fa48("2631"), `You have ${criticalTasks.length} critical tasks pending. Consider breaking them into smaller steps.`));
        }
      } else if (stryMutAct_9fa48("2634") ? criticalTasks.length !== 1 : stryMutAct_9fa48("2633") ? false : stryMutAct_9fa48("2632") ? true : (stryCov_9fa48("2632", "2633", "2634"), criticalTasks.length === 1)) {
        if (stryMutAct_9fa48("2635")) {
          {}
        } else {
          stryCov_9fa48("2635");
          suggestions.push(stryMutAct_9fa48("2636") ? `` : (stryCov_9fa48("2636"), `Focus on completing "${criticalTasks[0].name}" - your only critical task.`));
        }
      }
      if (stryMutAct_9fa48("2640") ? highPriorityTasks.length <= 5 : stryMutAct_9fa48("2639") ? highPriorityTasks.length >= 5 : stryMutAct_9fa48("2638") ? false : stryMutAct_9fa48("2637") ? true : (stryCov_9fa48("2637", "2638", "2639", "2640"), highPriorityTasks.length > 5)) {
        if (stryMutAct_9fa48("2641")) {
          {}
        } else {
          stryCov_9fa48("2641");
          suggestions.push(stryMutAct_9fa48("2642") ? `` : (stryCov_9fa48("2642"), `${highPriorityTasks.length} high-priority tasks could be rescheduled if not urgent.`));
        }
      }

      // Overdue analysis
      const overdueTasks = stryMutAct_9fa48("2643") ? tasks : (stryCov_9fa48("2643"), tasks.filter(stryMutAct_9fa48("2644") ? () => undefined : (stryCov_9fa48("2644"), t => stryMutAct_9fa48("2647") ? t.deadline && new Date(t.deadline) < now || !t.completed : stryMutAct_9fa48("2646") ? false : stryMutAct_9fa48("2645") ? true : (stryCov_9fa48("2645", "2646", "2647"), (stryMutAct_9fa48("2649") ? t.deadline || new Date(t.deadline) < now : stryMutAct_9fa48("2648") ? true : (stryCov_9fa48("2648", "2649"), t.deadline && (stryMutAct_9fa48("2652") ? new Date(t.deadline) >= now : stryMutAct_9fa48("2651") ? new Date(t.deadline) <= now : stryMutAct_9fa48("2650") ? true : (stryCov_9fa48("2650", "2651", "2652"), new Date(t.deadline) < now)))) && (stryMutAct_9fa48("2653") ? t.completed : (stryCov_9fa48("2653"), !t.completed))))));
      if (stryMutAct_9fa48("2657") ? overdueTasks.length <= 0 : stryMutAct_9fa48("2656") ? overdueTasks.length >= 0 : stryMutAct_9fa48("2655") ? false : stryMutAct_9fa48("2654") ? true : (stryCov_9fa48("2654", "2655", "2656", "2657"), overdueTasks.length > 0)) {
        if (stryMutAct_9fa48("2658")) {
          {}
        } else {
          stryCov_9fa48("2658");
          const oldestOverdue = overdueTasks.reduce(stryMutAct_9fa48("2659") ? () => undefined : (stryCov_9fa48("2659"), (oldest, t) => (stryMutAct_9fa48("2662") ? t.deadline || !oldest.deadline || new Date(t.deadline) < new Date(oldest.deadline) : stryMutAct_9fa48("2661") ? false : stryMutAct_9fa48("2660") ? true : (stryCov_9fa48("2660", "2661", "2662"), t.deadline && (stryMutAct_9fa48("2664") ? !oldest.deadline && new Date(t.deadline) < new Date(oldest.deadline) : stryMutAct_9fa48("2663") ? true : (stryCov_9fa48("2663", "2664"), (stryMutAct_9fa48("2665") ? oldest.deadline : (stryCov_9fa48("2665"), !oldest.deadline)) || (stryMutAct_9fa48("2668") ? new Date(t.deadline) >= new Date(oldest.deadline) : stryMutAct_9fa48("2667") ? new Date(t.deadline) <= new Date(oldest.deadline) : stryMutAct_9fa48("2666") ? false : (stryCov_9fa48("2666", "2667", "2668"), new Date(t.deadline) < new Date(oldest.deadline))))))) ? t : oldest), {
            deadline: null as string | null
          } as typeof tasks[0]);
          suggestions.push(stryMutAct_9fa48("2669") ? `` : (stryCov_9fa48("2669"), `${overdueTasks.length} task(s) are overdue. Review and update deadlines or prioritize completion.`));
          if (stryMutAct_9fa48("2671") ? false : stryMutAct_9fa48("2670") ? true : (stryCov_9fa48("2670", "2671"), oldestOverdue.deadline)) {
            if (stryMutAct_9fa48("2672")) {
              {}
            } else {
              stryCov_9fa48("2672");
              const daysOverdue = Math.floor(stryMutAct_9fa48("2673") ? (now.getTime() - new Date(oldestOverdue.deadline).getTime()) * (1000 * 60 * 60 * 24) : (stryCov_9fa48("2673"), (stryMutAct_9fa48("2674") ? now.getTime() + new Date(oldestOverdue.deadline).getTime() : (stryCov_9fa48("2674"), now.getTime() - new Date(oldestOverdue.deadline).getTime())) / (stryMutAct_9fa48("2675") ? 1000 * 60 * 60 / 24 : (stryCov_9fa48("2675"), (stryMutAct_9fa48("2676") ? 1000 * 60 / 60 : (stryCov_9fa48("2676"), (stryMutAct_9fa48("2677") ? 1000 / 60 : (stryCov_9fa48("2677"), 1000 * 60)) * 60)) * 24))));
              suggestions.push(stryMutAct_9fa48("2678") ? `` : (stryCov_9fa48("2678"), `Your oldest overdue task "${oldestOverdue.name}" has been pending for ${daysOverdue} days.`));
            }
          }
        }
      }

      // Deadline proximity suggestions
      const thisWeek = stryMutAct_9fa48("2679") ? tasks : (stryCov_9fa48("2679"), tasks.filter(stryMutAct_9fa48("2680") ? () => undefined : (stryCov_9fa48("2680"), t => stryMutAct_9fa48("2683") ? t.deadline && new Date(t.deadline) >= now && new Date(t.deadline) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) || !t.completed : stryMutAct_9fa48("2682") ? false : stryMutAct_9fa48("2681") ? true : (stryCov_9fa48("2681", "2682", "2683"), (stryMutAct_9fa48("2685") ? t.deadline && new Date(t.deadline) >= now || new Date(t.deadline) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) : stryMutAct_9fa48("2684") ? true : (stryCov_9fa48("2684", "2685"), (stryMutAct_9fa48("2687") ? t.deadline || new Date(t.deadline) >= now : stryMutAct_9fa48("2686") ? true : (stryCov_9fa48("2686", "2687"), t.deadline && (stryMutAct_9fa48("2690") ? new Date(t.deadline) < now : stryMutAct_9fa48("2689") ? new Date(t.deadline) > now : stryMutAct_9fa48("2688") ? true : (stryCov_9fa48("2688", "2689", "2690"), new Date(t.deadline) >= now)))) && (stryMutAct_9fa48("2693") ? new Date(t.deadline) > new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) : stryMutAct_9fa48("2692") ? new Date(t.deadline) < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) : stryMutAct_9fa48("2691") ? true : (stryCov_9fa48("2691", "2692", "2693"), new Date(t.deadline) <= new Date(stryMutAct_9fa48("2694") ? now.getTime() - 7 * 24 * 60 * 60 * 1000 : (stryCov_9fa48("2694"), now.getTime() + (stryMutAct_9fa48("2695") ? 7 * 24 * 60 * 60 / 1000 : (stryCov_9fa48("2695"), (stryMutAct_9fa48("2696") ? 7 * 24 * 60 / 60 : (stryCov_9fa48("2696"), (stryMutAct_9fa48("2697") ? 7 * 24 / 60 : (stryCov_9fa48("2697"), (stryMutAct_9fa48("2698") ? 7 / 24 : (stryCov_9fa48("2698"), 7 * 24)) * 60)) * 60)) * 1000)))))))) && (stryMutAct_9fa48("2699") ? t.completed : (stryCov_9fa48("2699"), !t.completed))))));
      if (stryMutAct_9fa48("2703") ? thisWeek.length <= 0 : stryMutAct_9fa48("2702") ? thisWeek.length >= 0 : stryMutAct_9fa48("2701") ? false : stryMutAct_9fa48("2700") ? true : (stryCov_9fa48("2700", "2701", "2702", "2703"), thisWeek.length > 0)) {
        if (stryMutAct_9fa48("2704")) {
          {}
        } else {
          stryCov_9fa48("2704");
          tips.push(stryMutAct_9fa48("2705") ? `` : (stryCov_9fa48("2705"), `${thisWeek.length} task(s) due this week. Consider blocking dedicated time for them.`));
        }
      }

      // Trends analysis
      trends.push(stryMutAct_9fa48("2706") ? `` : (stryCov_9fa48("2706"), `Current completion rate: ${completionRate}%`));
      trends.push(stryMutAct_9fa48("2707") ? `` : (stryCov_9fa48("2707"), `${criticalTasks.length} critical, ${highPriorityTasks.length} high-priority tasks in progress`));
      trends.push(stryMutAct_9fa48("2708") ? `` : (stryCov_9fa48("2708"), `${overdueTasks.length} overdue, ${thisWeek.length} due this week`));

      // Productivity insights
      const avgCompletion = (stryMutAct_9fa48("2712") ? tasks.length <= 0 : stryMutAct_9fa48("2711") ? tasks.length >= 0 : stryMutAct_9fa48("2710") ? false : stryMutAct_9fa48("2709") ? true : (stryCov_9fa48("2709", "2710", "2711", "2712"), tasks.length > 0)) ? stryMutAct_9fa48("2713") ? completed * tasks.length : (stryCov_9fa48("2713"), completed / tasks.length) : 0;
      if (stryMutAct_9fa48("2717") ? avgCompletion <= 0.8 : stryMutAct_9fa48("2716") ? avgCompletion >= 0.8 : stryMutAct_9fa48("2715") ? false : stryMutAct_9fa48("2714") ? true : (stryCov_9fa48("2714", "2715", "2716", "2717"), avgCompletion > 0.8)) {
        if (stryMutAct_9fa48("2718")) {
          {}
        } else {
          stryCov_9fa48("2718");
          trends.push(stryMutAct_9fa48("2719") ? "" : (stryCov_9fa48("2719"), "Excellent productivity - consider setting more ambitious goals"));
        }
      } else if (stryMutAct_9fa48("2723") ? avgCompletion <= 0.5 : stryMutAct_9fa48("2722") ? avgCompletion >= 0.5 : stryMutAct_9fa48("2721") ? false : stryMutAct_9fa48("2720") ? true : (stryCov_9fa48("2720", "2721", "2722", "2723"), avgCompletion > 0.5)) {
        if (stryMutAct_9fa48("2724")) {
          {}
        } else {
          stryCov_9fa48("2724");
          trends.push(stryMutAct_9fa48("2725") ? "" : (stryCov_9fa48("2725"), "Steady progress - focus on consistency"));
        }
      } else {
        if (stryMutAct_9fa48("2726")) {
          {}
        } else {
          stryCov_9fa48("2726");
          trends.push(stryMutAct_9fa48("2727") ? "" : (stryCov_9fa48("2727"), "Opportunity to improve task completion habits"));
        }
      }
      return stryMutAct_9fa48("2728") ? {} : (stryCov_9fa48("2728"), {
        tips,
        suggestions,
        trends
      });
    }
  }
}

/**
 * OpenAI GPT-4 integration for advanced task parsing
 * Requires OPENAI_API_KEY environment variable
 */
export class OpenAIProvider implements AIProvider {
  name = stryMutAct_9fa48("2729") ? "" : (stryCov_9fa48("2729"), "openai-gpt4");
  private readonly model: string;
  private readonly baseURL: string;
  private readonly maxRetries: number;
  constructor() {
    if (stryMutAct_9fa48("2730")) {
      {}
    } else {
      stryCov_9fa48("2730");
      this.model = stryMutAct_9fa48("2733") ? process.env.OPENAI_MODEL && "gpt-4o" : stryMutAct_9fa48("2732") ? false : stryMutAct_9fa48("2731") ? true : (stryCov_9fa48("2731", "2732", "2733"), process.env.OPENAI_MODEL || (stryMutAct_9fa48("2734") ? "" : (stryCov_9fa48("2734"), "gpt-4o")));
      this.baseURL = stryMutAct_9fa48("2737") ? process.env.OPENAI_BASE_URL && "https://api.openai.com/v1" : stryMutAct_9fa48("2736") ? false : stryMutAct_9fa48("2735") ? true : (stryCov_9fa48("2735", "2736", "2737"), process.env.OPENAI_BASE_URL || (stryMutAct_9fa48("2738") ? "" : (stryCov_9fa48("2738"), "https://api.openai.com/v1")));
      this.maxRetries = 3;
    }
  }
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    if (stryMutAct_9fa48("2739")) {
      {}
    } else {
      stryCov_9fa48("2739");
      let lastError: Error | undefined;
      for (let i = 0; stryMutAct_9fa48("2742") ? i >= this.maxRetries : stryMutAct_9fa48("2741") ? i <= this.maxRetries : stryMutAct_9fa48("2740") ? false : (stryCov_9fa48("2740", "2741", "2742"), i < this.maxRetries); stryMutAct_9fa48("2743") ? i-- : (stryCov_9fa48("2743"), i++)) {
        if (stryMutAct_9fa48("2744")) {
          {}
        } else {
          stryCov_9fa48("2744");
          try {
            if (stryMutAct_9fa48("2745")) {
              {}
            } else {
              stryCov_9fa48("2745");
              return await fn();
            }
          } catch (error) {
            if (stryMutAct_9fa48("2746")) {
              {}
            } else {
              stryCov_9fa48("2746");
              lastError = error instanceof Error ? error : new Error(String(error));
              if (stryMutAct_9fa48("2750") ? i >= this.maxRetries - 1 : stryMutAct_9fa48("2749") ? i <= this.maxRetries - 1 : stryMutAct_9fa48("2748") ? false : stryMutAct_9fa48("2747") ? true : (stryCov_9fa48("2747", "2748", "2749", "2750"), i < (stryMutAct_9fa48("2751") ? this.maxRetries + 1 : (stryCov_9fa48("2751"), this.maxRetries - 1)))) {
                if (stryMutAct_9fa48("2752")) {
                  {}
                } else {
                  stryCov_9fa48("2752");
                  // Exponential backoff: 1s, 2s, 4s
                  await new Promise(stryMutAct_9fa48("2753") ? () => undefined : (stryCov_9fa48("2753"), resolve => setTimeout(resolve, stryMutAct_9fa48("2754") ? Math.pow(2, i) / 1000 : (stryCov_9fa48("2754"), Math.pow(2, i) * 1000))));
                }
              }
            }
          }
        }
      }
      throw lastError;
    }
  }
  async parseTask(input: AITaskInput): Promise<TaskSuggestion> {
    if (stryMutAct_9fa48("2755")) {
      {}
    } else {
      stryCov_9fa48("2755");
      if (stryMutAct_9fa48("2758") ? false : stryMutAct_9fa48("2757") ? true : stryMutAct_9fa48("2756") ? process.env.OPENAI_API_KEY : (stryCov_9fa48("2756", "2757", "2758"), !process.env.OPENAI_API_KEY)) {
        if (stryMutAct_9fa48("2759")) {
          {}
        } else {
          stryCov_9fa48("2759");
          throw new Error(stryMutAct_9fa48("2760") ? "" : (stryCov_9fa48("2760"), "OPENAI_API_KEY not configured"));
        }
      }
      const prompt = stryMutAct_9fa48("2761") ? `` : (stryCov_9fa48("2761"), `
Parse the following natural language task input into a structured task object.
Return only valid JSON.

Input: "${input.text}"

Output format:
{
  "name": "Task name (clear and concise)",
  "description": "Brief description or null",
  "priority": "critical|high|medium|low|none",
  "estimated_duration": number in minutes or null,
  "suggested_date": "YYYY-MM-DD" or null,
  "recurring": "none|daily|weekly|weekdays|monthly|yearly|custom",
  "deadline": "YYYY-MM-DD" or null
}
`);
      try {
        if (stryMutAct_9fa48("2762")) {
          {}
        } else {
          stryCov_9fa48("2762");
          return await this.withRetry(async () => {
            if (stryMutAct_9fa48("2763")) {
              {}
            } else {
              stryCov_9fa48("2763");
              const response = await withTimeout(fetch(stryMutAct_9fa48("2764") ? `` : (stryCov_9fa48("2764"), `${this.baseURL}/chat/completions`), stryMutAct_9fa48("2765") ? {} : (stryCov_9fa48("2765"), {
                method: stryMutAct_9fa48("2766") ? "" : (stryCov_9fa48("2766"), "POST"),
                headers: stryMutAct_9fa48("2767") ? {} : (stryCov_9fa48("2767"), {
                  "Authorization": stryMutAct_9fa48("2768") ? `` : (stryCov_9fa48("2768"), `Bearer ${process.env.OPENAI_API_KEY}`),
                  "Content-Type": stryMutAct_9fa48("2769") ? "" : (stryCov_9fa48("2769"), "application/json")
                }),
                body: JSON.stringify(stryMutAct_9fa48("2770") ? {} : (stryCov_9fa48("2770"), {
                  model: this.model,
                  messages: stryMutAct_9fa48("2771") ? [] : (stryCov_9fa48("2771"), [stryMutAct_9fa48("2772") ? {} : (stryCov_9fa48("2772"), {
                    role: stryMutAct_9fa48("2773") ? "" : (stryCov_9fa48("2773"), "user"),
                    content: prompt
                  })]),
                  temperature: 0.3,
                  stream: stryMutAct_9fa48("2774") ? true : (stryCov_9fa48("2774"), false)
                }))
              })), DEFAULT_TIMEOUT_MS);
              if (stryMutAct_9fa48("2777") ? false : stryMutAct_9fa48("2776") ? true : stryMutAct_9fa48("2775") ? response.ok : (stryCov_9fa48("2775", "2776", "2777"), !response.ok)) {
                if (stryMutAct_9fa48("2778")) {
                  {}
                } else {
                  stryCov_9fa48("2778");
                  const errorBody = await response.text();
                  logError(stryMutAct_9fa48("2779") ? "" : (stryCov_9fa48("2779"), "OpenAI API error"), stryMutAct_9fa48("2780") ? {} : (stryCov_9fa48("2780"), {
                    status: response.status,
                    body: errorBody
                  }));
                  throw new Error(stryMutAct_9fa48("2781") ? `` : (stryCov_9fa48("2781"), `OpenAI API error: ${response.status} ${response.statusText}`));
                }
              }
              const data = await response.json();
              const content = stryMutAct_9fa48("2782") ? data.choices[0]?.message?.content && "{}" : (stryCov_9fa48("2782"), (stryMutAct_9fa48("2784") ? data.choices[0].message?.content : stryMutAct_9fa48("2783") ? data.choices[0]?.message.content : (stryCov_9fa48("2783", "2784"), data.choices[0]?.message?.content)) ?? (stryMutAct_9fa48("2785") ? "" : (stryCov_9fa48("2785"), "{}")));
              const parsed = taskSuggestionSchema.safeParse(JSON.parse(content));
              if (stryMutAct_9fa48("2788") ? false : stryMutAct_9fa48("2787") ? true : stryMutAct_9fa48("2786") ? parsed.success : (stryCov_9fa48("2786", "2787", "2788"), !parsed.success)) {
                if (stryMutAct_9fa48("2789")) {
                  {}
                } else {
                  stryCov_9fa48("2789");
                  logWarn(stryMutAct_9fa48("2790") ? "" : (stryCov_9fa48("2790"), "OpenAI response validation failed, using fallback"), stryMutAct_9fa48("2791") ? {} : (stryCov_9fa48("2791"), {
                    issues: parsed.error.issues
                  }));
                  // Fallback to keyword parser on validation failure
                  return new KeywordParser().parseTask(input);
                }
              }
              return parsed.data;
            }
          });
        }
      } catch (error) {
        if (stryMutAct_9fa48("2792")) {
          {}
        } else {
          stryCov_9fa48("2792");
          logError(stryMutAct_9fa48("2793") ? "" : (stryCov_9fa48("2793"), "OpenAI parsing failed"), undefined, error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      }
    }
  }
  async parseTaskStream(input: AITaskInput, onChunk: (chunk: string) => Promise<void> | void): Promise<TaskSuggestion> {
    if (stryMutAct_9fa48("2794")) {
      {}
    } else {
      stryCov_9fa48("2794");
      if (stryMutAct_9fa48("2797") ? false : stryMutAct_9fa48("2796") ? true : stryMutAct_9fa48("2795") ? process.env.OPENAI_API_KEY : (stryCov_9fa48("2795", "2796", "2797"), !process.env.OPENAI_API_KEY)) {
        if (stryMutAct_9fa48("2798")) {
          {}
        } else {
          stryCov_9fa48("2798");
          return new KeywordParser().parseTask(input);
        }
      }
      const prompt = stryMutAct_9fa48("2799") ? `` : (stryCov_9fa48("2799"), `
Parse the following natural language task input into a structured task object.
Return only valid JSON.

Input: "${input.text}"

Output format:
{
  "name": "Task name (clear and concise)",
  "description": "Brief description or null",
  "priority": "critical|high|medium|low|none",
  "estimated_duration": number in minutes or null,
  "suggested_date": "YYYY-MM-DD" or null,
  "recurring": "none|daily|weekly|weekdays|monthly|yearly|custom",
  "deadline": "YYYY-MM-DD" or null
}
`);
      const response = await fetch(stryMutAct_9fa48("2800") ? `` : (stryCov_9fa48("2800"), `${this.baseURL}/chat/completions`), stryMutAct_9fa48("2801") ? {} : (stryCov_9fa48("2801"), {
        method: stryMutAct_9fa48("2802") ? "" : (stryCov_9fa48("2802"), "POST"),
        headers: stryMutAct_9fa48("2803") ? {} : (stryCov_9fa48("2803"), {
          "Authorization": stryMutAct_9fa48("2804") ? `` : (stryCov_9fa48("2804"), `Bearer ${process.env.OPENAI_API_KEY}`),
          "Content-Type": stryMutAct_9fa48("2805") ? "" : (stryCov_9fa48("2805"), "application/json")
        }),
        body: JSON.stringify(stryMutAct_9fa48("2806") ? {} : (stryCov_9fa48("2806"), {
          model: this.model,
          messages: stryMutAct_9fa48("2807") ? [] : (stryCov_9fa48("2807"), [stryMutAct_9fa48("2808") ? {} : (stryCov_9fa48("2808"), {
            role: stryMutAct_9fa48("2809") ? "" : (stryCov_9fa48("2809"), "user"),
            content: prompt
          })]),
          temperature: 0.3,
          stream: stryMutAct_9fa48("2810") ? false : (stryCov_9fa48("2810"), true)
        }))
      }));
      if (stryMutAct_9fa48("2813") ? !response.ok && !response.body : stryMutAct_9fa48("2812") ? false : stryMutAct_9fa48("2811") ? true : (stryCov_9fa48("2811", "2812", "2813"), (stryMutAct_9fa48("2814") ? response.ok : (stryCov_9fa48("2814"), !response.ok)) || (stryMutAct_9fa48("2815") ? response.body : (stryCov_9fa48("2815"), !response.body)))) {
        if (stryMutAct_9fa48("2816")) {
          {}
        } else {
          stryCov_9fa48("2816");
          return new KeywordParser().parseTask(input);
        }
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = stryMutAct_9fa48("2817") ? "Stryker was here!" : (stryCov_9fa48("2817"), "");
      try {
        if (stryMutAct_9fa48("2818")) {
          {}
        } else {
          stryCov_9fa48("2818");
          while (stryMutAct_9fa48("2820") ? false : stryMutAct_9fa48("2819") ? false : (stryCov_9fa48("2819", "2820"), true)) {
            if (stryMutAct_9fa48("2821")) {
              {}
            } else {
              stryCov_9fa48("2821");
              const {
                done,
                value
              } = await reader.read();
              if (stryMutAct_9fa48("2823") ? false : stryMutAct_9fa48("2822") ? true : (stryCov_9fa48("2822", "2823"), done)) break;
              const chunk = decoder.decode(value, stryMutAct_9fa48("2824") ? {} : (stryCov_9fa48("2824"), {
                stream: stryMutAct_9fa48("2825") ? false : (stryCov_9fa48("2825"), true)
              }));
              const lines = chunk.split(stryMutAct_9fa48("2826") ? "" : (stryCov_9fa48("2826"), "\n"));
              for (const line of lines) {
                if (stryMutAct_9fa48("2827")) {
                  {}
                } else {
                  stryCov_9fa48("2827");
                  if (stryMutAct_9fa48("2830") ? line.endsWith("data: ") : stryMutAct_9fa48("2829") ? false : stryMutAct_9fa48("2828") ? true : (stryCov_9fa48("2828", "2829", "2830"), line.startsWith(stryMutAct_9fa48("2831") ? "" : (stryCov_9fa48("2831"), "data: ")))) {
                    if (stryMutAct_9fa48("2832")) {
                      {}
                    } else {
                      stryCov_9fa48("2832");
                      const data = stryMutAct_9fa48("2833") ? line : (stryCov_9fa48("2833"), line.slice(6));
                      if (stryMutAct_9fa48("2836") ? data !== "[DONE]" : stryMutAct_9fa48("2835") ? false : stryMutAct_9fa48("2834") ? true : (stryCov_9fa48("2834", "2835", "2836"), data === (stryMutAct_9fa48("2837") ? "" : (stryCov_9fa48("2837"), "[DONE]")))) continue;
                      try {
                        if (stryMutAct_9fa48("2838")) {
                          {}
                        } else {
                          stryCov_9fa48("2838");
                          const parsed = JSON.parse(data);
                          const content = stryMutAct_9fa48("2841") ? parsed.choices[0]?.delta?.content && "" : stryMutAct_9fa48("2840") ? false : stryMutAct_9fa48("2839") ? true : (stryCov_9fa48("2839", "2840", "2841"), (stryMutAct_9fa48("2843") ? parsed.choices[0].delta?.content : stryMutAct_9fa48("2842") ? parsed.choices[0]?.delta.content : (stryCov_9fa48("2842", "2843"), parsed.choices[0]?.delta?.content)) || (stryMutAct_9fa48("2844") ? "Stryker was here!" : (stryCov_9fa48("2844"), "")));
                          if (stryMutAct_9fa48("2846") ? false : stryMutAct_9fa48("2845") ? true : (stryCov_9fa48("2845", "2846"), content)) {
                            if (stryMutAct_9fa48("2847")) {
                              {}
                            } else {
                              stryCov_9fa48("2847");
                              stryMutAct_9fa48("2848") ? accumulatedContent -= content : (stryCov_9fa48("2848"), accumulatedContent += content);
                              await onChunk(content);
                            }
                          }
                        }
                      } catch {
                        // Skip invalid JSON - streaming chunks may be partial
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } finally {
        if (stryMutAct_9fa48("2849")) {
          {}
        } else {
          stryCov_9fa48("2849");
          reader.releaseLock();
        }
      }

      // Return parsed result from the accumulated content
      try {
        if (stryMutAct_9fa48("2850")) {
          {}
        } else {
          stryCov_9fa48("2850");
          const parsed = taskSuggestionSchema.safeParse(JSON.parse(stryMutAct_9fa48("2853") ? accumulatedContent && "{}" : stryMutAct_9fa48("2852") ? false : stryMutAct_9fa48("2851") ? true : (stryCov_9fa48("2851", "2852", "2853"), accumulatedContent || (stryMutAct_9fa48("2854") ? "" : (stryCov_9fa48("2854"), "{}")))));
          if (stryMutAct_9fa48("2856") ? false : stryMutAct_9fa48("2855") ? true : (stryCov_9fa48("2855", "2856"), parsed.success)) {
            if (stryMutAct_9fa48("2857")) {
              {}
            } else {
              stryCov_9fa48("2857");
              return parsed.data;
            }
          }
        }
      } catch {
        // Fall back to keyword parser on parse error
      }
      return new KeywordParser().parseTask(input);
    }
  }
  async generateInsights(tasks: Array<{
    name: string;
    completed: boolean;
    priority: string;
    date?: string | null;
    deadline?: string | null;
  }>): Promise<{
    tips: string[];
    suggestions: string[];
    trends: string[];
  }> {
    if (stryMutAct_9fa48("2858")) {
      {}
    } else {
      stryCov_9fa48("2858");
      if (stryMutAct_9fa48("2861") ? false : stryMutAct_9fa48("2860") ? true : stryMutAct_9fa48("2859") ? process.env.OPENAI_API_KEY : (stryCov_9fa48("2859", "2860", "2861"), !process.env.OPENAI_API_KEY)) {
        if (stryMutAct_9fa48("2862")) {
          {}
        } else {
          stryCov_9fa48("2862");
          return stryMutAct_9fa48("2863") ? {} : (stryCov_9fa48("2863"), {
            tips: stryMutAct_9fa48("2864") ? ["Stryker was here"] : (stryCov_9fa48("2864"), []),
            suggestions: stryMutAct_9fa48("2865") ? ["Stryker was here"] : (stryCov_9fa48("2865"), []),
            trends: stryMutAct_9fa48("2866") ? ["Stryker was here"] : (stryCov_9fa48("2866"), [])
          });
        }
      }
      const prompt = stryMutAct_9fa48("2867") ? `` : (stryCov_9fa48("2867"), `
Analyze these tasks and provide productivity insights:

Tasks: ${JSON.stringify(tasks)}

Return JSON:
{
  "tips": ["tip1", "tip2"],
  "suggestions": ["suggestion1"],
  "trends": ["trend1"]
}
`);
      try {
        if (stryMutAct_9fa48("2868")) {
          {}
        } else {
          stryCov_9fa48("2868");
          return await this.withRetry(async () => {
            if (stryMutAct_9fa48("2869")) {
              {}
            } else {
              stryCov_9fa48("2869");
              const response = await fetch(stryMutAct_9fa48("2870") ? `` : (stryCov_9fa48("2870"), `${this.baseURL}/chat/completions`), stryMutAct_9fa48("2871") ? {} : (stryCov_9fa48("2871"), {
                method: stryMutAct_9fa48("2872") ? "" : (stryCov_9fa48("2872"), "POST"),
                headers: stryMutAct_9fa48("2873") ? {} : (stryCov_9fa48("2873"), {
                  "Authorization": stryMutAct_9fa48("2874") ? `` : (stryCov_9fa48("2874"), `Bearer ${process.env.OPENAI_API_KEY}`),
                  "Content-Type": stryMutAct_9fa48("2875") ? "" : (stryCov_9fa48("2875"), "application/json")
                }),
                body: JSON.stringify(stryMutAct_9fa48("2876") ? {} : (stryCov_9fa48("2876"), {
                  model: this.model,
                  messages: stryMutAct_9fa48("2877") ? [] : (stryCov_9fa48("2877"), [stryMutAct_9fa48("2878") ? {} : (stryCov_9fa48("2878"), {
                    role: stryMutAct_9fa48("2879") ? "" : (stryCov_9fa48("2879"), "user"),
                    content: prompt
                  })]),
                  temperature: 0.5
                }))
              }));
              if (stryMutAct_9fa48("2882") ? false : stryMutAct_9fa48("2881") ? true : stryMutAct_9fa48("2880") ? response.ok : (stryCov_9fa48("2880", "2881", "2882"), !response.ok)) {
                if (stryMutAct_9fa48("2883")) {
                  {}
                } else {
                  stryCov_9fa48("2883");
                  throw new Error(stryMutAct_9fa48("2884") ? `` : (stryCov_9fa48("2884"), `OpenAI API error: ${response.status}`));
                }
              }
              const data = await response.json();
              const content = stryMutAct_9fa48("2885") ? data.choices[0]?.message?.content && '{"tips":[],"suggestions":[],"trends":[]}' : (stryCov_9fa48("2885"), (stryMutAct_9fa48("2887") ? data.choices[0].message?.content : stryMutAct_9fa48("2886") ? data.choices[0]?.message.content : (stryCov_9fa48("2886", "2887"), data.choices[0]?.message?.content)) ?? (stryMutAct_9fa48("2888") ? "" : (stryCov_9fa48("2888"), '{"tips":[],"suggestions":[],"trends":[]}')));
              const parsed = aiInsightsSchema.safeParse(JSON.parse(content));
              if (stryMutAct_9fa48("2891") ? false : stryMutAct_9fa48("2890") ? true : stryMutAct_9fa48("2889") ? parsed.success : (stryCov_9fa48("2889", "2890", "2891"), !parsed.success)) {
                if (stryMutAct_9fa48("2892")) {
                  {}
                } else {
                  stryCov_9fa48("2892");
                  logWarn(stryMutAct_9fa48("2893") ? "" : (stryCov_9fa48("2893"), "OpenAI insights validation failed"), stryMutAct_9fa48("2894") ? {} : (stryCov_9fa48("2894"), {
                    issues: parsed.error.issues
                  }));
                  return stryMutAct_9fa48("2895") ? {} : (stryCov_9fa48("2895"), {
                    tips: stryMutAct_9fa48("2896") ? ["Stryker was here"] : (stryCov_9fa48("2896"), []),
                    suggestions: stryMutAct_9fa48("2897") ? ["Stryker was here"] : (stryCov_9fa48("2897"), []),
                    trends: stryMutAct_9fa48("2898") ? ["Stryker was here"] : (stryCov_9fa48("2898"), [])
                  });
                }
              }
              return parsed.data;
            }
          });
        }
      } catch (error) {
        if (stryMutAct_9fa48("2899")) {
          {}
        } else {
          stryCov_9fa48("2899");
          logError(stryMutAct_9fa48("2900") ? "" : (stryCov_9fa48("2900"), "OpenAI insights failed"), undefined, error instanceof Error ? error : new Error(String(error)));
          return stryMutAct_9fa48("2901") ? {} : (stryCov_9fa48("2901"), {
            tips: stryMutAct_9fa48("2902") ? ["Stryker was here"] : (stryCov_9fa48("2902"), []),
            suggestions: stryMutAct_9fa48("2903") ? ["Stryker was here"] : (stryCov_9fa48("2903"), []),
            trends: stryMutAct_9fa48("2904") ? ["Stryker was here"] : (stryCov_9fa48("2904"), [])
          });
        }
      }
    }
  }
  async generateTasksFromNotes(notes: string): Promise<Array<{
    name: string;
    description?: string;
    priority?: "critical" | "high" | "medium" | "low" | "none";
  }>> {
    if (stryMutAct_9fa48("2905")) {
      {}
    } else {
      stryCov_9fa48("2905");
      if (stryMutAct_9fa48("2908") ? false : stryMutAct_9fa48("2907") ? true : stryMutAct_9fa48("2906") ? process.env.OPENAI_API_KEY : (stryCov_9fa48("2906", "2907", "2908"), !process.env.OPENAI_API_KEY)) {
        if (stryMutAct_9fa48("2909")) {
          {}
        } else {
          stryCov_9fa48("2909");
          return stryMutAct_9fa48("2910") ? ["Stryker was here"] : (stryCov_9fa48("2910"), []);
        }
      }
      const prompt = stryMutAct_9fa48("2911") ? `` : (stryCov_9fa48("2911"), `
Extract actionable tasks from the following notes/bullet points. Return JSON array only:

"${notes}"

Format:
[
  {"name": "Task 1", "description": "optional description", "priority": "medium"},
  {"name": "Task 2", "priority": "high"}
]
Only return valid JSON.
`);
      try {
        if (stryMutAct_9fa48("2912")) {
          {}
        } else {
          stryCov_9fa48("2912");
          const response = await fetch(stryMutAct_9fa48("2913") ? `` : (stryCov_9fa48("2913"), `${this.baseURL}/chat/completions`), stryMutAct_9fa48("2914") ? {} : (stryCov_9fa48("2914"), {
            method: stryMutAct_9fa48("2915") ? "" : (stryCov_9fa48("2915"), "POST"),
            headers: stryMutAct_9fa48("2916") ? {} : (stryCov_9fa48("2916"), {
              "Authorization": stryMutAct_9fa48("2917") ? `` : (stryCov_9fa48("2917"), `Bearer ${process.env.OPENAI_API_KEY}`),
              "Content-Type": stryMutAct_9fa48("2918") ? "" : (stryCov_9fa48("2918"), "application/json")
            }),
            body: JSON.stringify(stryMutAct_9fa48("2919") ? {} : (stryCov_9fa48("2919"), {
              model: this.model,
              messages: stryMutAct_9fa48("2920") ? [] : (stryCov_9fa48("2920"), [stryMutAct_9fa48("2921") ? {} : (stryCov_9fa48("2921"), {
                role: stryMutAct_9fa48("2922") ? "" : (stryCov_9fa48("2922"), "user"),
                content: prompt
              })]),
              temperature: 0.3
            }))
          }));
          if (stryMutAct_9fa48("2925") ? false : stryMutAct_9fa48("2924") ? true : stryMutAct_9fa48("2923") ? response.ok : (stryCov_9fa48("2923", "2924", "2925"), !response.ok)) {
            if (stryMutAct_9fa48("2926")) {
              {}
            } else {
              stryCov_9fa48("2926");
              return stryMutAct_9fa48("2927") ? ["Stryker was here"] : (stryCov_9fa48("2927"), []);
            }
          }
          const data = await response.json();
          return JSON.parse(stryMutAct_9fa48("2930") ? data.choices[0]?.message?.content && "[]" : stryMutAct_9fa48("2929") ? false : stryMutAct_9fa48("2928") ? true : (stryCov_9fa48("2928", "2929", "2930"), (stryMutAct_9fa48("2932") ? data.choices[0].message?.content : stryMutAct_9fa48("2931") ? data.choices[0]?.message.content : (stryCov_9fa48("2931", "2932"), data.choices[0]?.message?.content)) || (stryMutAct_9fa48("2933") ? "" : (stryCov_9fa48("2933"), "[]"))));
        }
      } catch {
        if (stryMutAct_9fa48("2934")) {
          {}
        } else {
          stryCov_9fa48("2934");
          return stryMutAct_9fa48("2935") ? ["Stryker was here"] : (stryCov_9fa48("2935"), []);
        }
      }
    }
  }
}

/**
 * Claude integration via Anthropic API
 * Requires ANTHROPIC_API_KEY environment variable
 */
export class ClaudeProvider implements AIProvider {
  name = stryMutAct_9fa48("2936") ? "" : (stryCov_9fa48("2936"), "claude-sonnet");
  private readonly model: string;
  private readonly baseURL: string;
  private readonly maxRetries: number;
  constructor() {
    if (stryMutAct_9fa48("2937")) {
      {}
    } else {
      stryCov_9fa48("2937");
      this.model = stryMutAct_9fa48("2940") ? process.env.CLAUDE_MODEL && "claude-3-5-sonnet-latest" : stryMutAct_9fa48("2939") ? false : stryMutAct_9fa48("2938") ? true : (stryCov_9fa48("2938", "2939", "2940"), process.env.CLAUDE_MODEL || (stryMutAct_9fa48("2941") ? "" : (stryCov_9fa48("2941"), "claude-3-5-sonnet-latest")));
      this.baseURL = stryMutAct_9fa48("2944") ? process.env.CLAUDE_BASE_URL && "https://api.anthropic.com" : stryMutAct_9fa48("2943") ? false : stryMutAct_9fa48("2942") ? true : (stryCov_9fa48("2942", "2943", "2944"), process.env.CLAUDE_BASE_URL || (stryMutAct_9fa48("2945") ? "" : (stryCov_9fa48("2945"), "https://api.anthropic.com")));
      this.maxRetries = 3;
    }
  }
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    if (stryMutAct_9fa48("2946")) {
      {}
    } else {
      stryCov_9fa48("2946");
      let lastError: Error | undefined;
      for (let i = 0; stryMutAct_9fa48("2949") ? i >= this.maxRetries : stryMutAct_9fa48("2948") ? i <= this.maxRetries : stryMutAct_9fa48("2947") ? false : (stryCov_9fa48("2947", "2948", "2949"), i < this.maxRetries); stryMutAct_9fa48("2950") ? i-- : (stryCov_9fa48("2950"), i++)) {
        if (stryMutAct_9fa48("2951")) {
          {}
        } else {
          stryCov_9fa48("2951");
          try {
            if (stryMutAct_9fa48("2952")) {
              {}
            } else {
              stryCov_9fa48("2952");
              return await fn();
            }
          } catch (error) {
            if (stryMutAct_9fa48("2953")) {
              {}
            } else {
              stryCov_9fa48("2953");
              lastError = error instanceof Error ? error : new Error(String(error));
              if (stryMutAct_9fa48("2957") ? i >= this.maxRetries - 1 : stryMutAct_9fa48("2956") ? i <= this.maxRetries - 1 : stryMutAct_9fa48("2955") ? false : stryMutAct_9fa48("2954") ? true : (stryCov_9fa48("2954", "2955", "2956", "2957"), i < (stryMutAct_9fa48("2958") ? this.maxRetries + 1 : (stryCov_9fa48("2958"), this.maxRetries - 1)))) {
                if (stryMutAct_9fa48("2959")) {
                  {}
                } else {
                  stryCov_9fa48("2959");
                  // Exponential backoff: 1s, 2s, 4s
                  await new Promise(stryMutAct_9fa48("2960") ? () => undefined : (stryCov_9fa48("2960"), resolve => setTimeout(resolve, stryMutAct_9fa48("2961") ? Math.pow(2, i) / 1000 : (stryCov_9fa48("2961"), Math.pow(2, i) * 1000))));
                }
              }
            }
          }
        }
      }
      throw lastError;
    }
  }
  async parseTask(input: AITaskInput): Promise<TaskSuggestion> {
    if (stryMutAct_9fa48("2962")) {
      {}
    } else {
      stryCov_9fa48("2962");
      if (stryMutAct_9fa48("2965") ? false : stryMutAct_9fa48("2964") ? true : stryMutAct_9fa48("2963") ? process.env.ANTHROPIC_API_KEY : (stryCov_9fa48("2963", "2964", "2965"), !process.env.ANTHROPIC_API_KEY)) {
        if (stryMutAct_9fa48("2966")) {
          {}
        } else {
          stryCov_9fa48("2966");
          throw new Error(stryMutAct_9fa48("2967") ? "" : (stryCov_9fa48("2967"), "ANTHROPIC_API_KEY not configured"));
        }
      }
      const prompt = stryMutAct_9fa48("2968") ? `` : (stryCov_9fa48("2968"), `
Parse this task request into structured JSON:

"${input.text}"

Return only JSON with these fields:
- name: string (clear, concise task name)
- description: string or null
- priority: "critical" | "high" | "medium" | "low" | "none"
- estimated_duration: number (minutes) or null
- suggested_date: "YYYY-MM-DD" or null
- recurring: "none" | "daily" | "weekly" | "weekdays" | "monthly" | "yearly" | "custom"
- deadline: "YYYY-MM-DD" or null
`);
      try {
        if (stryMutAct_9fa48("2969")) {
          {}
        } else {
          stryCov_9fa48("2969");
          return await this.withRetry(async () => {
            if (stryMutAct_9fa48("2970")) {
              {}
            } else {
              stryCov_9fa48("2970");
              const response = await withTimeout(fetch(stryMutAct_9fa48("2971") ? `` : (stryCov_9fa48("2971"), `${this.baseURL}/v1/messages`), stryMutAct_9fa48("2972") ? {} : (stryCov_9fa48("2972"), {
                method: stryMutAct_9fa48("2973") ? "" : (stryCov_9fa48("2973"), "POST"),
                headers: stryMutAct_9fa48("2974") ? {} : (stryCov_9fa48("2974"), {
                  "x-api-key": process.env.ANTHROPIC_API_KEY!,
                  "Content-Type": stryMutAct_9fa48("2975") ? "" : (stryCov_9fa48("2975"), "application/json"),
                  "anthropic-version": stryMutAct_9fa48("2976") ? "" : (stryCov_9fa48("2976"), "2023-06-01")
                }),
                body: JSON.stringify(stryMutAct_9fa48("2977") ? {} : (stryCov_9fa48("2977"), {
                  model: this.model,
                  max_tokens: 500,
                  messages: stryMutAct_9fa48("2978") ? [] : (stryCov_9fa48("2978"), [stryMutAct_9fa48("2979") ? {} : (stryCov_9fa48("2979"), {
                    role: stryMutAct_9fa48("2980") ? "" : (stryCov_9fa48("2980"), "user"),
                    content: prompt
                  })])
                }))
              })), DEFAULT_TIMEOUT_MS);
              if (stryMutAct_9fa48("2983") ? false : stryMutAct_9fa48("2982") ? true : stryMutAct_9fa48("2981") ? response.ok : (stryCov_9fa48("2981", "2982", "2983"), !response.ok)) {
                if (stryMutAct_9fa48("2984")) {
                  {}
                } else {
                  stryCov_9fa48("2984");
                  const errorBody = await response.text();
                  logError(stryMutAct_9fa48("2985") ? "" : (stryCov_9fa48("2985"), "Claude API error"), stryMutAct_9fa48("2986") ? {} : (stryCov_9fa48("2986"), {
                    status: response.status,
                    body: errorBody
                  }));
                  throw new Error(stryMutAct_9fa48("2987") ? `` : (stryCov_9fa48("2987"), `Claude API error: ${response.status} ${response.statusText}`));
                }
              }
              const data = await response.json();
              const content = stryMutAct_9fa48("2988") ? data.content[0]?.text && "{}" : (stryCov_9fa48("2988"), (stryMutAct_9fa48("2989") ? data.content[0].text : (stryCov_9fa48("2989"), data.content[0]?.text)) ?? (stryMutAct_9fa48("2990") ? "" : (stryCov_9fa48("2990"), "{}")));
              const parsed = taskSuggestionSchema.safeParse(JSON.parse(content));
              if (stryMutAct_9fa48("2993") ? false : stryMutAct_9fa48("2992") ? true : stryMutAct_9fa48("2991") ? parsed.success : (stryCov_9fa48("2991", "2992", "2993"), !parsed.success)) {
                if (stryMutAct_9fa48("2994")) {
                  {}
                } else {
                  stryCov_9fa48("2994");
                  logWarn(stryMutAct_9fa48("2995") ? "" : (stryCov_9fa48("2995"), "Claude response validation failed, using fallback"), stryMutAct_9fa48("2996") ? {} : (stryCov_9fa48("2996"), {
                    issues: parsed.error.issues
                  }));
                  // Fallback to keyword parser on validation failure
                  return new KeywordParser().parseTask(input);
                }
              }
              return parsed.data;
            }
          });
        }
      } catch (error) {
        if (stryMutAct_9fa48("2997")) {
          {}
        } else {
          stryCov_9fa48("2997");
          logError(stryMutAct_9fa48("2998") ? "" : (stryCov_9fa48("2998"), "Claude parsing failed"), undefined, error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      }
    }
  }
  async generateInsights(tasks: Array<{
    name: string;
    completed: boolean;
    priority: string;
    date?: string | null;
    deadline?: string | null;
  }>): Promise<{
    tips: string[];
    suggestions: string[];
    trends: string[];
  }> {
    if (stryMutAct_9fa48("2999")) {
      {}
    } else {
      stryCov_9fa48("2999");
      if (stryMutAct_9fa48("3002") ? false : stryMutAct_9fa48("3001") ? true : stryMutAct_9fa48("3000") ? process.env.ANTHROPIC_API_KEY : (stryCov_9fa48("3000", "3001", "3002"), !process.env.ANTHROPIC_API_KEY)) {
        if (stryMutAct_9fa48("3003")) {
          {}
        } else {
          stryCov_9fa48("3003");
          return stryMutAct_9fa48("3004") ? {} : (stryCov_9fa48("3004"), {
            tips: stryMutAct_9fa48("3005") ? ["Stryker was here"] : (stryCov_9fa48("3005"), []),
            suggestions: stryMutAct_9fa48("3006") ? ["Stryker was here"] : (stryCov_9fa48("3006"), []),
            trends: stryMutAct_9fa48("3007") ? ["Stryker was here"] : (stryCov_9fa48("3007"), [])
          });
        }
      }
      const prompt = stryMutAct_9fa48("3008") ? `` : (stryCov_9fa48("3008"), `
Analyze these tasks and provide productivity insights:

${JSON.stringify(tasks)}

Return JSON: {"tips":["..."],"suggestions":["..."],"trends":["..."]}
`);
      try {
        if (stryMutAct_9fa48("3009")) {
          {}
        } else {
          stryCov_9fa48("3009");
          return await this.withRetry(async () => {
            if (stryMutAct_9fa48("3010")) {
              {}
            } else {
              stryCov_9fa48("3010");
              const response = await fetch(stryMutAct_9fa48("3011") ? `` : (stryCov_9fa48("3011"), `${this.baseURL}/v1/messages`), stryMutAct_9fa48("3012") ? {} : (stryCov_9fa48("3012"), {
                method: stryMutAct_9fa48("3013") ? "" : (stryCov_9fa48("3013"), "POST"),
                headers: stryMutAct_9fa48("3014") ? {} : (stryCov_9fa48("3014"), {
                  "x-api-key": process.env.ANTHROPIC_API_KEY!,
                  "Content-Type": stryMutAct_9fa48("3015") ? "" : (stryCov_9fa48("3015"), "application/json"),
                  "anthropic-version": stryMutAct_9fa48("3016") ? "" : (stryCov_9fa48("3016"), "2023-06-01")
                }),
                body: JSON.stringify(stryMutAct_9fa48("3017") ? {} : (stryCov_9fa48("3017"), {
                  model: this.model,
                  max_tokens: 500,
                  messages: stryMutAct_9fa48("3018") ? [] : (stryCov_9fa48("3018"), [stryMutAct_9fa48("3019") ? {} : (stryCov_9fa48("3019"), {
                    role: stryMutAct_9fa48("3020") ? "" : (stryCov_9fa48("3020"), "user"),
                    content: prompt
                  })])
                }))
              }));
              if (stryMutAct_9fa48("3023") ? false : stryMutAct_9fa48("3022") ? true : stryMutAct_9fa48("3021") ? response.ok : (stryCov_9fa48("3021", "3022", "3023"), !response.ok)) {
                if (stryMutAct_9fa48("3024")) {
                  {}
                } else {
                  stryCov_9fa48("3024");
                  throw new Error(stryMutAct_9fa48("3025") ? `` : (stryCov_9fa48("3025"), `Claude API error: ${response.status}`));
                }
              }
              const data = await response.json();
              const content = stryMutAct_9fa48("3026") ? data.content[0]?.text && '{"tips":[],"suggestions":[],"trends":[]}' : (stryCov_9fa48("3026"), (stryMutAct_9fa48("3027") ? data.content[0].text : (stryCov_9fa48("3027"), data.content[0]?.text)) ?? (stryMutAct_9fa48("3028") ? "" : (stryCov_9fa48("3028"), '{"tips":[],"suggestions":[],"trends":[]}')));
              const parsed = aiInsightsSchema.safeParse(JSON.parse(content));
              if (stryMutAct_9fa48("3031") ? false : stryMutAct_9fa48("3030") ? true : stryMutAct_9fa48("3029") ? parsed.success : (stryCov_9fa48("3029", "3030", "3031"), !parsed.success)) {
                if (stryMutAct_9fa48("3032")) {
                  {}
                } else {
                  stryCov_9fa48("3032");
                  logWarn(stryMutAct_9fa48("3033") ? "" : (stryCov_9fa48("3033"), "Claude insights validation failed"), stryMutAct_9fa48("3034") ? {} : (stryCov_9fa48("3034"), {
                    issues: parsed.error.issues
                  }));
                  return stryMutAct_9fa48("3035") ? {} : (stryCov_9fa48("3035"), {
                    tips: stryMutAct_9fa48("3036") ? ["Stryker was here"] : (stryCov_9fa48("3036"), []),
                    suggestions: stryMutAct_9fa48("3037") ? ["Stryker was here"] : (stryCov_9fa48("3037"), []),
                    trends: stryMutAct_9fa48("3038") ? ["Stryker was here"] : (stryCov_9fa48("3038"), [])
                  });
                }
              }
              return parsed.data;
            }
          });
        }
      } catch (error) {
        if (stryMutAct_9fa48("3039")) {
          {}
        } else {
          stryCov_9fa48("3039");
          logError(stryMutAct_9fa48("3040") ? "" : (stryCov_9fa48("3040"), "Claude insights failed"), undefined, error instanceof Error ? error : new Error(String(error)));
          return stryMutAct_9fa48("3041") ? {} : (stryCov_9fa48("3041"), {
            tips: stryMutAct_9fa48("3042") ? ["Stryker was here"] : (stryCov_9fa48("3042"), []),
            suggestions: stryMutAct_9fa48("3043") ? ["Stryker was here"] : (stryCov_9fa48("3043"), []),
            trends: stryMutAct_9fa48("3044") ? ["Stryker was here"] : (stryCov_9fa48("3044"), [])
          });
        }
      }
    }
  }
  async generateTasksFromNotes(notes: string): Promise<Array<{
    name: string;
    description?: string;
    priority?: "critical" | "high" | "medium" | "low" | "none";
  }>> {
    if (stryMutAct_9fa48("3045")) {
      {}
    } else {
      stryCov_9fa48("3045");
      if (stryMutAct_9fa48("3048") ? false : stryMutAct_9fa48("3047") ? true : stryMutAct_9fa48("3046") ? process.env.ANTHROPIC_API_KEY : (stryCov_9fa48("3046", "3047", "3048"), !process.env.ANTHROPIC_API_KEY)) {
        if (stryMutAct_9fa48("3049")) {
          {}
        } else {
          stryCov_9fa48("3049");
          return stryMutAct_9fa48("3050") ? ["Stryker was here"] : (stryCov_9fa48("3050"), []);
        }
      }
      const prompt = stryMutAct_9fa48("3051") ? `` : (stryCov_9fa48("3051"), `
Extract actionable tasks from the following notes/bullet points. Return JSON array:

"${notes}"

Format:
[
  {"name": "Task 1", "description": "optional description", "priority": "medium"},
  {"name": "Task 2", "priority": "high"}
]
Only return valid JSON.
`);
      try {
        if (stryMutAct_9fa48("3052")) {
          {}
        } else {
          stryCov_9fa48("3052");
          const response = await fetch(stryMutAct_9fa48("3053") ? `` : (stryCov_9fa48("3053"), `${this.baseURL}/v1/messages`), stryMutAct_9fa48("3054") ? {} : (stryCov_9fa48("3054"), {
            method: stryMutAct_9fa48("3055") ? "" : (stryCov_9fa48("3055"), "POST"),
            headers: stryMutAct_9fa48("3056") ? {} : (stryCov_9fa48("3056"), {
              "x-api-key": process.env.ANTHROPIC_API_KEY!,
              "Content-Type": stryMutAct_9fa48("3057") ? "" : (stryCov_9fa48("3057"), "application/json"),
              "anthropic-version": stryMutAct_9fa48("3058") ? "" : (stryCov_9fa48("3058"), "2023-06-01")
            }),
            body: JSON.stringify(stryMutAct_9fa48("3059") ? {} : (stryCov_9fa48("3059"), {
              model: this.model,
              max_tokens: 1000,
              messages: stryMutAct_9fa48("3060") ? [] : (stryCov_9fa48("3060"), [stryMutAct_9fa48("3061") ? {} : (stryCov_9fa48("3061"), {
                role: stryMutAct_9fa48("3062") ? "" : (stryCov_9fa48("3062"), "user"),
                content: prompt
              })])
            }))
          }));
          if (stryMutAct_9fa48("3065") ? false : stryMutAct_9fa48("3064") ? true : stryMutAct_9fa48("3063") ? response.ok : (stryCov_9fa48("3063", "3064", "3065"), !response.ok)) {
            if (stryMutAct_9fa48("3066")) {
              {}
            } else {
              stryCov_9fa48("3066");
              return stryMutAct_9fa48("3067") ? ["Stryker was here"] : (stryCov_9fa48("3067"), []);
            }
          }
          const data = await response.json();
          return JSON.parse(stryMutAct_9fa48("3068") ? data.content[0]?.text && "[]" : (stryCov_9fa48("3068"), (stryMutAct_9fa48("3069") ? data.content[0].text : (stryCov_9fa48("3069"), data.content[0]?.text)) ?? (stryMutAct_9fa48("3070") ? "" : (stryCov_9fa48("3070"), "[]"))));
        }
      } catch {
        if (stryMutAct_9fa48("3071")) {
          {}
        } else {
          stryCov_9fa48("3071");
          return stryMutAct_9fa48("3072") ? ["Stryker was here"] : (stryCov_9fa48("3072"), []);
        }
      }
    }
  }
}

/**
 * Provider manager - selects best available provider
 */
export class AIManager {
  private providers: AIProvider[];
  constructor() {
    if (stryMutAct_9fa48("3073")) {
      {}
    } else {
      stryCov_9fa48("3073");
      this.providers = stryMutAct_9fa48("3074") ? ["Stryker was here"] : (stryCov_9fa48("3074"), []);

      // Add keyword parser as fallback
      this.providers.push(new KeywordParser());

      // Add AI providers if configured
      if (stryMutAct_9fa48("3076") ? false : stryMutAct_9fa48("3075") ? true : (stryCov_9fa48("3075", "3076"), process.env.OPENAI_API_KEY)) {
        if (stryMutAct_9fa48("3077")) {
          {}
        } else {
          stryCov_9fa48("3077");
          this.providers.push(new OpenAIProvider());
        }
      }
      if (stryMutAct_9fa48("3079") ? false : stryMutAct_9fa48("3078") ? true : (stryCov_9fa48("3078", "3079"), process.env.ANTHROPIC_API_KEY)) {
        if (stryMutAct_9fa48("3080")) {
          {}
        } else {
          stryCov_9fa48("3080");
          this.providers.push(new ClaudeProvider());
        }
      }
    }
  }
  async parseTask(input: AITaskInput): Promise<TaskSuggestion & {
    provider: string;
  }> {
    if (stryMutAct_9fa48("3081")) {
      {}
    } else {
      stryCov_9fa48("3081");
      // Check cache first (only for keyword parser to avoid stale AI results)
      const cacheKey = stryMutAct_9fa48("3082") ? `` : (stryCov_9fa48("3082"), `parse:${input.text}`);
      const cachedResult = aiCache.get<TaskSuggestion & {
        provider: string;
      }>(cacheKey);
      if (stryMutAct_9fa48("3084") ? false : stryMutAct_9fa48("3083") ? true : (stryCov_9fa48("3083", "3084"), cachedResult)) {
        if (stryMutAct_9fa48("3085")) {
          {}
        } else {
          stryCov_9fa48("3085");
          return cachedResult;
        }
      }
      for (const provider of this.providers) {
        if (stryMutAct_9fa48("3086")) {
          {}
        } else {
          stryCov_9fa48("3086");
          try {
            if (stryMutAct_9fa48("3087")) {
              {}
            } else {
              stryCov_9fa48("3087");
              const result = await provider.parseTask(input);
              const resultWithProvider = stryMutAct_9fa48("3088") ? {} : (stryCov_9fa48("3088"), {
                ...result,
                provider: provider.name
              });

              // Cache keyword parser results
              if (stryMutAct_9fa48("3091") ? provider.name !== "keyword-parser" : stryMutAct_9fa48("3090") ? false : stryMutAct_9fa48("3089") ? true : (stryCov_9fa48("3089", "3090", "3091"), provider.name === (stryMutAct_9fa48("3092") ? "" : (stryCov_9fa48("3092"), "keyword-parser")))) {
                if (stryMutAct_9fa48("3093")) {
                  {}
                } else {
                  stryCov_9fa48("3093");
                  aiCache.set(cacheKey, resultWithProvider);
                }
              }
              return resultWithProvider;
            }
          } catch (error) {
            if (stryMutAct_9fa48("3094")) {
              {}
            } else {
              stryCov_9fa48("3094");
              logWarn(stryMutAct_9fa48("3095") ? `` : (stryCov_9fa48("3095"), `${provider.name} failed, trying next provider`), stryMutAct_9fa48("3096") ? {} : (stryCov_9fa48("3096"), {
                error: error instanceof Error ? error.message : String(error)
              }));
              continue;
            }
          }
        }
      }

      // Fallback to keyword parser (should never fail)
      const result = await new KeywordParser().parseTask(input);
      return stryMutAct_9fa48("3097") ? {} : (stryCov_9fa48("3097"), {
        ...result,
        provider: stryMutAct_9fa48("3098") ? "" : (stryCov_9fa48("3098"), "keyword-parser")
      });
    }
  }
  async generateInsights(tasks: Array<{
    name: string;
    completed: boolean;
    priority: string;
    date?: string | null;
    deadline?: string | null;
  }>): Promise<{
    tips: string[];
    suggestions: string[];
    trends: string[];
    provider: string;
  }> {
    if (stryMutAct_9fa48("3099")) {
      {}
    } else {
      stryCov_9fa48("3099");
      // Use the first AI provider, fallback to keyword parser
      for (const provider of this.providers) {
        if (stryMutAct_9fa48("3100")) {
          {}
        } else {
          stryCov_9fa48("3100");
          if (stryMutAct_9fa48("3103") ? provider.name === "keyword-parser" : stryMutAct_9fa48("3102") ? false : stryMutAct_9fa48("3101") ? true : (stryCov_9fa48("3101", "3102", "3103"), provider.name !== (stryMutAct_9fa48("3104") ? "" : (stryCov_9fa48("3104"), "keyword-parser")))) {
            if (stryMutAct_9fa48("3105")) {
              {}
            } else {
              stryCov_9fa48("3105");
              try {
                if (stryMutAct_9fa48("3106")) {
                  {}
                } else {
                  stryCov_9fa48("3106");
                  const result = await provider.generateInsights(tasks);
                  return stryMutAct_9fa48("3107") ? {} : (stryCov_9fa48("3107"), {
                    ...result,
                    provider: provider.name
                  });
                }
              } catch (error) {
                if (stryMutAct_9fa48("3108")) {
                  {}
                } else {
                  stryCov_9fa48("3108");
                  logWarn(stryMutAct_9fa48("3109") ? `` : (stryCov_9fa48("3109"), `${provider.name} insights failed`), stryMutAct_9fa48("3110") ? {} : (stryCov_9fa48("3110"), {
                    error: error instanceof Error ? error.message : String(error)
                  }));
                }
              }
            }
          }
        }
      }
      const result = await new KeywordParser().generateInsights(tasks);
      return stryMutAct_9fa48("3111") ? {} : (stryCov_9fa48("3111"), {
        ...result,
        provider: stryMutAct_9fa48("3112") ? "" : (stryCov_9fa48("3112"), "keyword-parser")
      });
    }
  }
  async generateTasksFromNotes(notes: string, context?: {
    lists?: Array<{
      id: number;
      name: string;
      emoji: string;
    }>;
  }): Promise<Array<TaskSuggestion & {
    provider: string;
  }>> {
    if (stryMutAct_9fa48("3113")) {
      {}
    } else {
      stryCov_9fa48("3113");
      // Try AI providers first (skip keyword-parser since we want to use it as fallback)
      for (const provider of this.providers) {
        if (stryMutAct_9fa48("3114")) {
          {}
        } else {
          stryCov_9fa48("3114");
          if (stryMutAct_9fa48("3117") ? provider.name !== "keyword-parser" || typeof (provider as any).generateTasksFromNotes === "function" : stryMutAct_9fa48("3116") ? false : stryMutAct_9fa48("3115") ? true : (stryCov_9fa48("3115", "3116", "3117"), (stryMutAct_9fa48("3119") ? provider.name === "keyword-parser" : stryMutAct_9fa48("3118") ? true : (stryCov_9fa48("3118", "3119"), provider.name !== (stryMutAct_9fa48("3120") ? "" : (stryCov_9fa48("3120"), "keyword-parser")))) && (stryMutAct_9fa48("3122") ? typeof (provider as any).generateTasksFromNotes !== "function" : stryMutAct_9fa48("3121") ? true : (stryCov_9fa48("3121", "3122"), typeof (provider as any).generateTasksFromNotes === (stryMutAct_9fa48("3123") ? "" : (stryCov_9fa48("3123"), "function")))))) {
            if (stryMutAct_9fa48("3124")) {
              {}
            } else {
              stryCov_9fa48("3124");
              try {
                if (stryMutAct_9fa48("3125")) {
                  {}
                } else {
                  stryCov_9fa48("3125");
                  const result = await (provider as any).generateTasksFromNotes(notes, context);
                  if (stryMutAct_9fa48("3128") ? result || result.length > 0 : stryMutAct_9fa48("3127") ? false : stryMutAct_9fa48("3126") ? true : (stryCov_9fa48("3126", "3127", "3128"), result && (stryMutAct_9fa48("3131") ? result.length <= 0 : stryMutAct_9fa48("3130") ? result.length >= 0 : stryMutAct_9fa48("3129") ? true : (stryCov_9fa48("3129", "3130", "3131"), result.length > 0)))) {
                    if (stryMutAct_9fa48("3132")) {
                      {}
                    } else {
                      stryCov_9fa48("3132");
                      return result.map(stryMutAct_9fa48("3133") ? () => undefined : (stryCov_9fa48("3133"), (task: TaskSuggestion) => stryMutAct_9fa48("3134") ? {} : (stryCov_9fa48("3134"), {
                        ...task,
                        provider: provider.name
                      })));
                    }
                  }
                }
              } catch (error) {
                if (stryMutAct_9fa48("3135")) {
                  {}
                } else {
                  stryCov_9fa48("3135");
                  logWarn(stryMutAct_9fa48("3136") ? `` : (stryCov_9fa48("3136"), `${provider.name} notes generation failed, trying next provider`), stryMutAct_9fa48("3137") ? {} : (stryCov_9fa48("3137"), {
                    error: error instanceof Error ? error.message : String(error)
                  }));
                }
              }
            }
          }
        }
      }

      // Fallback to keyword parser
      const parser = new KeywordParser();
      const result = await parser.generateTasksFromNotes(notes);
      return result.map(stryMutAct_9fa48("3138") ? () => undefined : (stryCov_9fa48("3138"), task => stryMutAct_9fa48("3139") ? {} : (stryCov_9fa48("3139"), {
        ...task,
        provider: stryMutAct_9fa48("3140") ? "" : (stryCov_9fa48("3140"), "keyword-parser")
      })));
    }
  }

  /**
   * Generate a project plan from natural language description
   */
  async generateProjectPlan(input: ProjectPlanInput): Promise<GeneratedProject & {
    provider: string;
  }> {
    if (stryMutAct_9fa48("3141")) {
      {}
    } else {
      stryCov_9fa48("3141");
      // Try providers that support project planning (keyword parser always has it)
      for (const provider of this.providers) {
        if (stryMutAct_9fa48("3142")) {
          {}
        } else {
          stryCov_9fa48("3142");
          if (stryMutAct_9fa48("3145") ? typeof (provider as any).generateProjectPlan !== "function" : stryMutAct_9fa48("3144") ? false : stryMutAct_9fa48("3143") ? true : (stryCov_9fa48("3143", "3144", "3145"), typeof (provider as any).generateProjectPlan === (stryMutAct_9fa48("3146") ? "" : (stryCov_9fa48("3146"), "function")))) {
            if (stryMutAct_9fa48("3147")) {
              {}
            } else {
              stryCov_9fa48("3147");
              try {
                if (stryMutAct_9fa48("3148")) {
                  {}
                } else {
                  stryCov_9fa48("3148");
                  const result = await (provider as any).generateProjectPlan(input);
                  if (stryMutAct_9fa48("3150") ? false : stryMutAct_9fa48("3149") ? true : (stryCov_9fa48("3149", "3150"), result)) {
                    if (stryMutAct_9fa48("3151")) {
                      {}
                    } else {
                      stryCov_9fa48("3151");
                      return stryMutAct_9fa48("3152") ? {} : (stryCov_9fa48("3152"), {
                        ...result,
                        provider: provider.name
                      });
                    }
                  }
                }
              } catch (error) {
                if (stryMutAct_9fa48("3153")) {
                  {}
                } else {
                  stryCov_9fa48("3153");
                  logWarn(stryMutAct_9fa48("3154") ? `` : (stryCov_9fa48("3154"), `${provider.name} project plan generation failed`), stryMutAct_9fa48("3155") ? {} : (stryCov_9fa48("3155"), {
                    error: error instanceof Error ? error.message : String(error)
                  }));
                }
              }
            }
          }
        }
      }

      // Fallback to keyword parser (should never fail)
      const parser = new KeywordParser();
      const result = await parser.generateProjectPlan(input);
      return stryMutAct_9fa48("3156") ? {} : (stryCov_9fa48("3156"), {
        ...result,
        provider: stryMutAct_9fa48("3157") ? "" : (stryCov_9fa48("3157"), "keyword-parser")
      });
    }
  }

  /**
   * Generate a decision template based on context
   */
  async generateDecisionTemplate(context: {
    decisionType?: string;
    task?: {
      name: string;
      priority?: string;
      deadline?: string;
    };
  }): Promise<{
    name: string;
    prompt_template: string;
    option_template?: string;
  }> {
    if (stryMutAct_9fa48("3158")) {
      {}
    } else {
      stryCov_9fa48("3158");
      // Try keyword parser first (always available)
      const parser = new KeywordParser();
      try {
        if (stryMutAct_9fa48("3159")) {
          {}
        } else {
          stryCov_9fa48("3159");
          return await parser.generateDecisionTemplate(context);
        }
      } catch (error) {
        if (stryMutAct_9fa48("3160")) {
          {}
        } else {
          stryCov_9fa48("3160");
          logWarn(stryMutAct_9fa48("3161") ? "" : (stryCov_9fa48("3161"), "Decision template generation failed"), stryMutAct_9fa48("3162") ? {} : (stryCov_9fa48("3162"), {
            error: error instanceof Error ? error.message : String(error)
          }));
          // Return a default template
          return stryMutAct_9fa48("3163") ? {} : (stryCov_9fa48("3163"), {
            name: stryMutAct_9fa48("3164") ? "" : (stryCov_9fa48("3164"), "General Decision Template"),
            prompt_template: stryMutAct_9fa48("3165") ? "" : (stryCov_9fa48("3165"), "You need to make a decision about: {task_name}. What are the options, pros, and cons of each?"),
            option_template: stryMutAct_9fa48("3166") ? "" : (stryCov_9fa48("3166"), '[{{ "option1": "Description, pros, cons" }}]')
          });
        }
      }
    }
  }
  clearCache(): void {
    if (stryMutAct_9fa48("3167")) {
      {}
    } else {
      stryCov_9fa48("3167");
      aiCache.clear();
    }
  }

  /**
   * Parse natural language edit commands for existing tasks
   */
  async parseEditCommand(text: string, context: {
    tasks: Array<{
      id: number;
      name: string;
      completed: boolean;
      priority: string;
    }>;
  }): Promise<AIEditCommand & {
    provider: string;
  }> {
    if (stryMutAct_9fa48("3168")) {
      {}
    } else {
      stryCov_9fa48("3168");
      const cacheKey = stryMutAct_9fa48("3169") ? `` : (stryCov_9fa48("3169"), `edit:${text}`);
      const cachedResult = aiCache.get<AIEditCommand & {
        provider: string;
      }>(cacheKey);
      if (stryMutAct_9fa48("3171") ? false : stryMutAct_9fa48("3170") ? true : (stryCov_9fa48("3170", "3171"), cachedResult)) {
        if (stryMutAct_9fa48("3172")) {
          {}
        } else {
          stryCov_9fa48("3172");
          return cachedResult;
        }
      }

      // Check for simple keyword patterns first
      const simpleResult = this.trySimpleEditCommand(text, context);
      if (stryMutAct_9fa48("3174") ? false : stryMutAct_9fa48("3173") ? true : (stryCov_9fa48("3173", "3174"), simpleResult)) {
        if (stryMutAct_9fa48("3175")) {
          {}
        } else {
          stryCov_9fa48("3175");
          aiCache.set(cacheKey, stryMutAct_9fa48("3176") ? {} : (stryCov_9fa48("3176"), {
            ...simpleResult,
            provider: stryMutAct_9fa48("3177") ? "" : (stryCov_9fa48("3177"), "keyword-parser")
          }));
          return stryMutAct_9fa48("3178") ? {} : (stryCov_9fa48("3178"), {
            ...simpleResult,
            provider: stryMutAct_9fa48("3179") ? "" : (stryCov_9fa48("3179"), "keyword-parser")
          });
        }
      }

      // Try AI providers
      for (const provider of this.providers) {
        if (stryMutAct_9fa48("3180")) {
          {}
        } else {
          stryCov_9fa48("3180");
          try {
            if (stryMutAct_9fa48("3181")) {
              {}
            } else {
              stryCov_9fa48("3181");
              if (stryMutAct_9fa48("3184") ? provider.name !== "keyword-parser" || typeof (provider as any).parseEditCommand === "function" : stryMutAct_9fa48("3183") ? false : stryMutAct_9fa48("3182") ? true : (stryCov_9fa48("3182", "3183", "3184"), (stryMutAct_9fa48("3186") ? provider.name === "keyword-parser" : stryMutAct_9fa48("3185") ? true : (stryCov_9fa48("3185", "3186"), provider.name !== (stryMutAct_9fa48("3187") ? "" : (stryCov_9fa48("3187"), "keyword-parser")))) && (stryMutAct_9fa48("3189") ? typeof (provider as any).parseEditCommand !== "function" : stryMutAct_9fa48("3188") ? true : (stryCov_9fa48("3188", "3189"), typeof (provider as any).parseEditCommand === (stryMutAct_9fa48("3190") ? "" : (stryCov_9fa48("3190"), "function")))))) {
                if (stryMutAct_9fa48("3191")) {
                  {}
                } else {
                  stryCov_9fa48("3191");
                  const result = await (provider as any).parseEditCommand(text, context);
                  if (stryMutAct_9fa48("3193") ? false : stryMutAct_9fa48("3192") ? true : (stryCov_9fa48("3192", "3193"), result)) {
                    if (stryMutAct_9fa48("3194")) {
                      {}
                    } else {
                      stryCov_9fa48("3194");
                      return stryMutAct_9fa48("3195") ? {} : (stryCov_9fa48("3195"), {
                        ...result,
                        provider: provider.name
                      });
                    }
                  }
                }
              }
            }
          } catch (error) {
            if (stryMutAct_9fa48("3196")) {
              {}
            } else {
              stryCov_9fa48("3196");
              logWarn(stryMutAct_9fa48("3197") ? `` : (stryCov_9fa48("3197"), `${provider.name} edit command failed`), stryMutAct_9fa48("3198") ? {} : (stryCov_9fa48("3198"), {
                error: error instanceof Error ? error.message : String(error)
              }));
              continue;
            }
          }
        }
      }

      // Fallback: return a safe command that won't modify anything
      return stryMutAct_9fa48("3199") ? {} : (stryCov_9fa48("3199"), {
        action: "edit" as const,
        provider: stryMutAct_9fa48("3200") ? "" : (stryCov_9fa48("3200"), "keyword-parser")
      });
    }
  }

  /**
   * Try to parse using simple keyword patterns
   */
  private trySimpleEditCommand(text: string, context: {
    tasks: Array<{
      id: number;
      name: string;
      completed: boolean;
      priority: string;
    }>;
  }): AIEditCommand | null {
    if (stryMutAct_9fa48("3201")) {
      {}
    } else {
      stryCov_9fa48("3201");
      // Pattern: "complete/mark done [task name]" or "mark [task] as complete"
      const completeMatch = text.match(stryMutAct_9fa48("3216") ? /(?:complete|mark\s+(?:as\s+)?done|finish|done)[:\s]+(.+?)(?:\s*$|\s*[^.!?])/i : stryMutAct_9fa48("3215") ? /(?:complete|mark\s+(?:as\s+)?done|finish|done)[:\s]+(.+?)(?:\s*$|\S*[.!?])/i : stryMutAct_9fa48("3214") ? /(?:complete|mark\s+(?:as\s+)?done|finish|done)[:\s]+(.+?)(?:\s*$|\s[.!?])/i : stryMutAct_9fa48("3213") ? /(?:complete|mark\s+(?:as\s+)?done|finish|done)[:\s]+(.+?)(?:\S*$|\s*[.!?])/i : stryMutAct_9fa48("3212") ? /(?:complete|mark\s+(?:as\s+)?done|finish|done)[:\s]+(.+?)(?:\s$|\s*[.!?])/i : stryMutAct_9fa48("3211") ? /(?:complete|mark\s+(?:as\s+)?done|finish|done)[:\s]+(.+?)(?:\s*|\s*[.!?])/i : stryMutAct_9fa48("3210") ? /(?:complete|mark\s+(?:as\s+)?done|finish|done)[:\s]+(.)(?:\s*$|\s*[.!?])/i : stryMutAct_9fa48("3209") ? /(?:complete|mark\s+(?:as\s+)?done|finish|done)[:\S]+(.+?)(?:\s*$|\s*[.!?])/i : stryMutAct_9fa48("3208") ? /(?:complete|mark\s+(?:as\s+)?done|finish|done)[^:\s]+(.+?)(?:\s*$|\s*[.!?])/i : stryMutAct_9fa48("3207") ? /(?:complete|mark\s+(?:as\s+)?done|finish|done)[:\s](.+?)(?:\s*$|\s*[.!?])/i : stryMutAct_9fa48("3206") ? /(?:complete|mark\s+(?:as\S+)?done|finish|done)[:\s]+(.+?)(?:\s*$|\s*[.!?])/i : stryMutAct_9fa48("3205") ? /(?:complete|mark\s+(?:as\s)?done|finish|done)[:\s]+(.+?)(?:\s*$|\s*[.!?])/i : stryMutAct_9fa48("3204") ? /(?:complete|mark\s+(?:as\s+)done|finish|done)[:\s]+(.+?)(?:\s*$|\s*[.!?])/i : stryMutAct_9fa48("3203") ? /(?:complete|mark\S+(?:as\s+)?done|finish|done)[:\s]+(.+?)(?:\s*$|\s*[.!?])/i : stryMutAct_9fa48("3202") ? /(?:complete|mark\s(?:as\s+)?done|finish|done)[:\s]+(.+?)(?:\s*$|\s*[.!?])/i : (stryCov_9fa48("3202", "3203", "3204", "3205", "3206", "3207", "3208", "3209", "3210", "3211", "3212", "3213", "3214", "3215", "3216"), /(?:complete|mark\s+(?:as\s+)?done|finish|done)[:\s]+(.+?)(?:\s*$|\s*[.!?])/i));
      if (stryMutAct_9fa48("3218") ? false : stryMutAct_9fa48("3217") ? true : (stryCov_9fa48("3217", "3218"), completeMatch)) {
        if (stryMutAct_9fa48("3219")) {
          {}
        } else {
          stryCov_9fa48("3219");
          const taskName = stryMutAct_9fa48("3220") ? completeMatch[1] : (stryCov_9fa48("3220"), completeMatch[1].trim());
          const task = context.tasks.find(stryMutAct_9fa48("3221") ? () => undefined : (stryCov_9fa48("3221"), t => stryMutAct_9fa48("3222") ? t.name.toUpperCase().includes(taskName.toLowerCase()) : (stryCov_9fa48("3222"), t.name.toLowerCase().includes(stryMutAct_9fa48("3223") ? taskName.toUpperCase() : (stryCov_9fa48("3223"), taskName.toLowerCase())))));
          if (stryMutAct_9fa48("3225") ? false : stryMutAct_9fa48("3224") ? true : (stryCov_9fa48("3224", "3225"), task)) {
            if (stryMutAct_9fa48("3226")) {
              {}
            } else {
              stryCov_9fa48("3226");
              return stryMutAct_9fa48("3227") ? {} : (stryCov_9fa48("3227"), {
                action: stryMutAct_9fa48("3228") ? "" : (stryCov_9fa48("3228"), "complete"),
                taskId: task.id
              });
            }
          }
        }
      }

      // Pattern: "delete/remove [task name]"
      const deleteMatch = text.match(stryMutAct_9fa48("3241") ? /(?:delete|remove)[:\s]+(?:task\s+)?(.+?)(?:\s*$|\s*[^.!?])/i : stryMutAct_9fa48("3240") ? /(?:delete|remove)[:\s]+(?:task\s+)?(.+?)(?:\s*$|\S*[.!?])/i : stryMutAct_9fa48("3239") ? /(?:delete|remove)[:\s]+(?:task\s+)?(.+?)(?:\s*$|\s[.!?])/i : stryMutAct_9fa48("3238") ? /(?:delete|remove)[:\s]+(?:task\s+)?(.+?)(?:\S*$|\s*[.!?])/i : stryMutAct_9fa48("3237") ? /(?:delete|remove)[:\s]+(?:task\s+)?(.+?)(?:\s$|\s*[.!?])/i : stryMutAct_9fa48("3236") ? /(?:delete|remove)[:\s]+(?:task\s+)?(.+?)(?:\s*|\s*[.!?])/i : stryMutAct_9fa48("3235") ? /(?:delete|remove)[:\s]+(?:task\s+)?(.)(?:\s*$|\s*[.!?])/i : stryMutAct_9fa48("3234") ? /(?:delete|remove)[:\s]+(?:task\S+)?(.+?)(?:\s*$|\s*[.!?])/i : stryMutAct_9fa48("3233") ? /(?:delete|remove)[:\s]+(?:task\s)?(.+?)(?:\s*$|\s*[.!?])/i : stryMutAct_9fa48("3232") ? /(?:delete|remove)[:\s]+(?:task\s+)(.+?)(?:\s*$|\s*[.!?])/i : stryMutAct_9fa48("3231") ? /(?:delete|remove)[:\S]+(?:task\s+)?(.+?)(?:\s*$|\s*[.!?])/i : stryMutAct_9fa48("3230") ? /(?:delete|remove)[^:\s]+(?:task\s+)?(.+?)(?:\s*$|\s*[.!?])/i : stryMutAct_9fa48("3229") ? /(?:delete|remove)[:\s](?:task\s+)?(.+?)(?:\s*$|\s*[.!?])/i : (stryCov_9fa48("3229", "3230", "3231", "3232", "3233", "3234", "3235", "3236", "3237", "3238", "3239", "3240", "3241"), /(?:delete|remove)[:\s]+(?:task\s+)?(.+?)(?:\s*$|\s*[.!?])/i));
      if (stryMutAct_9fa48("3243") ? false : stryMutAct_9fa48("3242") ? true : (stryCov_9fa48("3242", "3243"), deleteMatch)) {
        if (stryMutAct_9fa48("3244")) {
          {}
        } else {
          stryCov_9fa48("3244");
          const taskName = stryMutAct_9fa48("3245") ? deleteMatch[1] : (stryCov_9fa48("3245"), deleteMatch[1].trim());
          const task = context.tasks.find(stryMutAct_9fa48("3246") ? () => undefined : (stryCov_9fa48("3246"), t => stryMutAct_9fa48("3247") ? t.name.toUpperCase().includes(taskName.toLowerCase()) : (stryCov_9fa48("3247"), t.name.toLowerCase().includes(stryMutAct_9fa48("3248") ? taskName.toUpperCase() : (stryCov_9fa48("3248"), taskName.toLowerCase())))));
          if (stryMutAct_9fa48("3250") ? false : stryMutAct_9fa48("3249") ? true : (stryCov_9fa48("3249", "3250"), task)) {
            if (stryMutAct_9fa48("3251")) {
              {}
            } else {
              stryCov_9fa48("3251");
              return stryMutAct_9fa48("3252") ? {} : (stryCov_9fa48("3252"), {
                action: stryMutAct_9fa48("3253") ? "" : (stryCov_9fa48("3253"), "delete"),
                taskId: task.id
              });
            }
          }
        }
      }

      // Pattern: "change priority of [task] to [level]"
      const priorityMatch = text.match(stryMutAct_9fa48("3265") ? /(?:set|change)\s+(?:priority\s+of\s+)?(.+?)\s+to\S+(critical|high|medium|low)/i : stryMutAct_9fa48("3264") ? /(?:set|change)\s+(?:priority\s+of\s+)?(.+?)\s+to\s(critical|high|medium|low)/i : stryMutAct_9fa48("3263") ? /(?:set|change)\s+(?:priority\s+of\s+)?(.+?)\S+to\s+(critical|high|medium|low)/i : stryMutAct_9fa48("3262") ? /(?:set|change)\s+(?:priority\s+of\s+)?(.+?)\sto\s+(critical|high|medium|low)/i : stryMutAct_9fa48("3261") ? /(?:set|change)\s+(?:priority\s+of\s+)?(.)\s+to\s+(critical|high|medium|low)/i : stryMutAct_9fa48("3260") ? /(?:set|change)\s+(?:priority\s+of\S+)?(.+?)\s+to\s+(critical|high|medium|low)/i : stryMutAct_9fa48("3259") ? /(?:set|change)\s+(?:priority\s+of\s)?(.+?)\s+to\s+(critical|high|medium|low)/i : stryMutAct_9fa48("3258") ? /(?:set|change)\s+(?:priority\S+of\s+)?(.+?)\s+to\s+(critical|high|medium|low)/i : stryMutAct_9fa48("3257") ? /(?:set|change)\s+(?:priority\sof\s+)?(.+?)\s+to\s+(critical|high|medium|low)/i : stryMutAct_9fa48("3256") ? /(?:set|change)\s+(?:priority\s+of\s+)(.+?)\s+to\s+(critical|high|medium|low)/i : stryMutAct_9fa48("3255") ? /(?:set|change)\S+(?:priority\s+of\s+)?(.+?)\s+to\s+(critical|high|medium|low)/i : stryMutAct_9fa48("3254") ? /(?:set|change)\s(?:priority\s+of\s+)?(.+?)\s+to\s+(critical|high|medium|low)/i : (stryCov_9fa48("3254", "3255", "3256", "3257", "3258", "3259", "3260", "3261", "3262", "3263", "3264", "3265"), /(?:set|change)\s+(?:priority\s+of\s+)?(.+?)\s+to\s+(critical|high|medium|low)/i));
      if (stryMutAct_9fa48("3267") ? false : stryMutAct_9fa48("3266") ? true : (stryCov_9fa48("3266", "3267"), priorityMatch)) {
        if (stryMutAct_9fa48("3268")) {
          {}
        } else {
          stryCov_9fa48("3268");
          const taskName = stryMutAct_9fa48("3269") ? priorityMatch[1] : (stryCov_9fa48("3269"), priorityMatch[1].trim());
          const priority = stryMutAct_9fa48("3270") ? priorityMatch[2].toUpperCase() : (stryCov_9fa48("3270"), priorityMatch[2].toLowerCase());
          const task = context.tasks.find(stryMutAct_9fa48("3271") ? () => undefined : (stryCov_9fa48("3271"), t => stryMutAct_9fa48("3272") ? t.name.toUpperCase().includes(taskName.toLowerCase()) : (stryCov_9fa48("3272"), t.name.toLowerCase().includes(stryMutAct_9fa48("3273") ? taskName.toUpperCase() : (stryCov_9fa48("3273"), taskName.toLowerCase())))));
          if (stryMutAct_9fa48("3275") ? false : stryMutAct_9fa48("3274") ? true : (stryCov_9fa48("3274", "3275"), task)) {
            if (stryMutAct_9fa48("3276")) {
              {}
            } else {
              stryCov_9fa48("3276");
              return stryMutAct_9fa48("3277") ? {} : (stryCov_9fa48("3277"), {
                action: stryMutAct_9fa48("3278") ? "" : (stryCov_9fa48("3278"), "prioritize"),
                taskId: task.id,
                updates: stryMutAct_9fa48("3279") ? {} : (stryCov_9fa48("3279"), {
                  priority
                })
              });
            }
          }
        }
      }

      // Pattern: "add label [label] to [task]"
      const labelMatch = text.match(stryMutAct_9fa48("3291") ? /(?:add|assign)\s+(?:label\s+)?(\w+)\s+to\s+(.)/i : stryMutAct_9fa48("3290") ? /(?:add|assign)\s+(?:label\s+)?(\w+)\s+to\S+(.+)/i : stryMutAct_9fa48("3289") ? /(?:add|assign)\s+(?:label\s+)?(\w+)\s+to\s(.+)/i : stryMutAct_9fa48("3288") ? /(?:add|assign)\s+(?:label\s+)?(\w+)\S+to\s+(.+)/i : stryMutAct_9fa48("3287") ? /(?:add|assign)\s+(?:label\s+)?(\w+)\sto\s+(.+)/i : stryMutAct_9fa48("3286") ? /(?:add|assign)\s+(?:label\s+)?(\W+)\s+to\s+(.+)/i : stryMutAct_9fa48("3285") ? /(?:add|assign)\s+(?:label\s+)?(\w)\s+to\s+(.+)/i : stryMutAct_9fa48("3284") ? /(?:add|assign)\s+(?:label\S+)?(\w+)\s+to\s+(.+)/i : stryMutAct_9fa48("3283") ? /(?:add|assign)\s+(?:label\s)?(\w+)\s+to\s+(.+)/i : stryMutAct_9fa48("3282") ? /(?:add|assign)\s+(?:label\s+)(\w+)\s+to\s+(.+)/i : stryMutAct_9fa48("3281") ? /(?:add|assign)\S+(?:label\s+)?(\w+)\s+to\s+(.+)/i : stryMutAct_9fa48("3280") ? /(?:add|assign)\s(?:label\s+)?(\w+)\s+to\s+(.+)/i : (stryCov_9fa48("3280", "3281", "3282", "3283", "3284", "3285", "3286", "3287", "3288", "3289", "3290", "3291"), /(?:add|assign)\s+(?:label\s+)?(\w+)\s+to\s+(.+)/i));
      if (stryMutAct_9fa48("3293") ? false : stryMutAct_9fa48("3292") ? true : (stryCov_9fa48("3292", "3293"), labelMatch)) {
        if (stryMutAct_9fa48("3294")) {
          {}
        } else {
          stryCov_9fa48("3294");
          const labelName = labelMatch[1];
          const taskName = stryMutAct_9fa48("3295") ? labelMatch[2].replace(/[.!?]$/, "") : (stryCov_9fa48("3295"), labelMatch[2].replace(stryMutAct_9fa48("3297") ? /[^.!?]$/ : stryMutAct_9fa48("3296") ? /[.!?]/ : (stryCov_9fa48("3296", "3297"), /[.!?]$/), stryMutAct_9fa48("3298") ? "Stryker was here!" : (stryCov_9fa48("3298"), "")).trim());
          const task = context.tasks.find(stryMutAct_9fa48("3299") ? () => undefined : (stryCov_9fa48("3299"), t => stryMutAct_9fa48("3300") ? t.name.toUpperCase().includes(taskName.toLowerCase()) : (stryCov_9fa48("3300"), t.name.toLowerCase().includes(stryMutAct_9fa48("3301") ? taskName.toUpperCase() : (stryCov_9fa48("3301"), taskName.toLowerCase())))));
          if (stryMutAct_9fa48("3303") ? false : stryMutAct_9fa48("3302") ? true : (stryCov_9fa48("3302", "3303"), task)) {
            if (stryMutAct_9fa48("3304")) {
              {}
            } else {
              stryCov_9fa48("3304");
              return stryMutAct_9fa48("3305") ? {} : (stryCov_9fa48("3305"), {
                action: stryMutAct_9fa48("3306") ? "" : (stryCov_9fa48("3306"), "add_label"),
                taskId: task.id,
                updates: stryMutAct_9fa48("3307") ? {} : (stryCov_9fa48("3307"), {
                  labelName
                })
              });
            }
          }
        }
      }

      // Pattern: "move [task] to [list name]" or "move [task] to inbox"
      const moveMatch = text.match(stryMutAct_9fa48("3318") ? /(?:move|put)\s+(?:task\s+)?(.+?)\s+to\s+(.)/i : stryMutAct_9fa48("3317") ? /(?:move|put)\s+(?:task\s+)?(.+?)\s+to\S+(.+)/i : stryMutAct_9fa48("3316") ? /(?:move|put)\s+(?:task\s+)?(.+?)\s+to\s(.+)/i : stryMutAct_9fa48("3315") ? /(?:move|put)\s+(?:task\s+)?(.+?)\S+to\s+(.+)/i : stryMutAct_9fa48("3314") ? /(?:move|put)\s+(?:task\s+)?(.+?)\sto\s+(.+)/i : stryMutAct_9fa48("3313") ? /(?:move|put)\s+(?:task\s+)?(.)\s+to\s+(.+)/i : stryMutAct_9fa48("3312") ? /(?:move|put)\s+(?:task\S+)?(.+?)\s+to\s+(.+)/i : stryMutAct_9fa48("3311") ? /(?:move|put)\s+(?:task\s)?(.+?)\s+to\s+(.+)/i : stryMutAct_9fa48("3310") ? /(?:move|put)\s+(?:task\s+)(.+?)\s+to\s+(.+)/i : stryMutAct_9fa48("3309") ? /(?:move|put)\S+(?:task\s+)?(.+?)\s+to\s+(.+)/i : stryMutAct_9fa48("3308") ? /(?:move|put)\s(?:task\s+)?(.+?)\s+to\s+(.+)/i : (stryCov_9fa48("3308", "3309", "3310", "3311", "3312", "3313", "3314", "3315", "3316", "3317", "3318"), /(?:move|put)\s+(?:task\s+)?(.+?)\s+to\s+(.+)/i));
      if (stryMutAct_9fa48("3320") ? false : stryMutAct_9fa48("3319") ? true : (stryCov_9fa48("3319", "3320"), moveMatch)) {
        if (stryMutAct_9fa48("3321")) {
          {}
        } else {
          stryCov_9fa48("3321");
          const taskName = stryMutAct_9fa48("3322") ? moveMatch[1] : (stryCov_9fa48("3322"), moveMatch[1].trim());
          const listName = stryMutAct_9fa48("3323") ? moveMatch[2] : (stryCov_9fa48("3323"), moveMatch[2].trim());
          const task = context.tasks.find(stryMutAct_9fa48("3324") ? () => undefined : (stryCov_9fa48("3324"), t => stryMutAct_9fa48("3325") ? t.name.toUpperCase().includes(taskName.toLowerCase()) : (stryCov_9fa48("3325"), t.name.toLowerCase().includes(stryMutAct_9fa48("3326") ? taskName.toUpperCase() : (stryCov_9fa48("3326"), taskName.toLowerCase())))));
          if (stryMutAct_9fa48("3328") ? false : stryMutAct_9fa48("3327") ? true : (stryCov_9fa48("3327", "3328"), task)) {
            if (stryMutAct_9fa48("3329")) {
              {}
            } else {
              stryCov_9fa48("3329");
              return stryMutAct_9fa48("3330") ? {} : (stryCov_9fa48("3330"), {
                action: stryMutAct_9fa48("3331") ? "" : (stryCov_9fa48("3331"), "edit"),
                taskId: task.id,
                updates: stryMutAct_9fa48("3332") ? {} : (stryCov_9fa48("3332"), {
                  listName
                })
              });
            }
          }
        }
      }

      // Pattern: "schedule [task] for [date]" or "move [task] to [day]"
      const scheduleMatch = text.match(stryMutAct_9fa48("3343") ? /(?:schedule|move|set)\s+(?:task\s+)?(.+?)\s+(?:for|on|to)\s+(.)/i : stryMutAct_9fa48("3342") ? /(?:schedule|move|set)\s+(?:task\s+)?(.+?)\s+(?:for|on|to)\S+(.+)/i : stryMutAct_9fa48("3341") ? /(?:schedule|move|set)\s+(?:task\s+)?(.+?)\s+(?:for|on|to)\s(.+)/i : stryMutAct_9fa48("3340") ? /(?:schedule|move|set)\s+(?:task\s+)?(.+?)\S+(?:for|on|to)\s+(.+)/i : stryMutAct_9fa48("3339") ? /(?:schedule|move|set)\s+(?:task\s+)?(.+?)\s(?:for|on|to)\s+(.+)/i : stryMutAct_9fa48("3338") ? /(?:schedule|move|set)\s+(?:task\s+)?(.)\s+(?:for|on|to)\s+(.+)/i : stryMutAct_9fa48("3337") ? /(?:schedule|move|set)\s+(?:task\S+)?(.+?)\s+(?:for|on|to)\s+(.+)/i : stryMutAct_9fa48("3336") ? /(?:schedule|move|set)\s+(?:task\s)?(.+?)\s+(?:for|on|to)\s+(.+)/i : stryMutAct_9fa48("3335") ? /(?:schedule|move|set)\s+(?:task\s+)(.+?)\s+(?:for|on|to)\s+(.+)/i : stryMutAct_9fa48("3334") ? /(?:schedule|move|set)\S+(?:task\s+)?(.+?)\s+(?:for|on|to)\s+(.+)/i : stryMutAct_9fa48("3333") ? /(?:schedule|move|set)\s(?:task\s+)?(.+?)\s+(?:for|on|to)\s+(.+)/i : (stryCov_9fa48("3333", "3334", "3335", "3336", "3337", "3338", "3339", "3340", "3341", "3342", "3343"), /(?:schedule|move|set)\s+(?:task\s+)?(.+?)\s+(?:for|on|to)\s+(.+)/i));
      if (stryMutAct_9fa48("3346") ? scheduleMatch && !completeMatch || !deleteMatch : stryMutAct_9fa48("3345") ? false : stryMutAct_9fa48("3344") ? true : (stryCov_9fa48("3344", "3345", "3346"), (stryMutAct_9fa48("3348") ? scheduleMatch || !completeMatch : stryMutAct_9fa48("3347") ? true : (stryCov_9fa48("3347", "3348"), scheduleMatch && (stryMutAct_9fa48("3349") ? completeMatch : (stryCov_9fa48("3349"), !completeMatch)))) && (stryMutAct_9fa48("3350") ? deleteMatch : (stryCov_9fa48("3350"), !deleteMatch)))) {
        if (stryMutAct_9fa48("3351")) {
          {}
        } else {
          stryCov_9fa48("3351");
          const taskName = stryMutAct_9fa48("3352") ? scheduleMatch[1] : (stryCov_9fa48("3352"), scheduleMatch[1].trim());
          const dateStr = stryMutAct_9fa48("3353") ? scheduleMatch[2] : (stryCov_9fa48("3353"), scheduleMatch[2].trim());
          const task = context.tasks.find(stryMutAct_9fa48("3354") ? () => undefined : (stryCov_9fa48("3354"), t => stryMutAct_9fa48("3355") ? t.name.toUpperCase().includes(taskName.toLowerCase()) : (stryCov_9fa48("3355"), t.name.toLowerCase().includes(stryMutAct_9fa48("3356") ? taskName.toUpperCase() : (stryCov_9fa48("3356"), taskName.toLowerCase())))));
          if (stryMutAct_9fa48("3358") ? false : stryMutAct_9fa48("3357") ? true : (stryCov_9fa48("3357", "3358"), task)) {
            if (stryMutAct_9fa48("3359")) {
              {}
            } else {
              stryCov_9fa48("3359");
              // Try to parse date
              const date = this.parseNaturalDate(dateStr);
              if (stryMutAct_9fa48("3361") ? false : stryMutAct_9fa48("3360") ? true : (stryCov_9fa48("3360", "3361"), date)) {
                if (stryMutAct_9fa48("3362")) {
                  {}
                } else {
                  stryCov_9fa48("3362");
                  return stryMutAct_9fa48("3363") ? {} : (stryCov_9fa48("3363"), {
                    action: stryMutAct_9fa48("3364") ? "" : (stryCov_9fa48("3364"), "schedule"),
                    taskId: task.id,
                    updates: stryMutAct_9fa48("3365") ? {} : (stryCov_9fa48("3365"), {
                      date
                    })
                  });
                }
              }
            }
          }
        }
      }

      // Pattern: "postpone [task] to tomorrow/today/next week"
      const postponeMatch = text.match(stryMutAct_9fa48("3377") ? /(?:postpone|defer|push)\s+(?:task\s+)?(.+?)\s+(?:to\s+)?(.)/i : stryMutAct_9fa48("3376") ? /(?:postpone|defer|push)\s+(?:task\s+)?(.+?)\s+(?:to\S+)?(.+)/i : stryMutAct_9fa48("3375") ? /(?:postpone|defer|push)\s+(?:task\s+)?(.+?)\s+(?:to\s)?(.+)/i : stryMutAct_9fa48("3374") ? /(?:postpone|defer|push)\s+(?:task\s+)?(.+?)\s+(?:to\s+)(.+)/i : stryMutAct_9fa48("3373") ? /(?:postpone|defer|push)\s+(?:task\s+)?(.+?)\S+(?:to\s+)?(.+)/i : stryMutAct_9fa48("3372") ? /(?:postpone|defer|push)\s+(?:task\s+)?(.+?)\s(?:to\s+)?(.+)/i : stryMutAct_9fa48("3371") ? /(?:postpone|defer|push)\s+(?:task\s+)?(.)\s+(?:to\s+)?(.+)/i : stryMutAct_9fa48("3370") ? /(?:postpone|defer|push)\s+(?:task\S+)?(.+?)\s+(?:to\s+)?(.+)/i : stryMutAct_9fa48("3369") ? /(?:postpone|defer|push)\s+(?:task\s)?(.+?)\s+(?:to\s+)?(.+)/i : stryMutAct_9fa48("3368") ? /(?:postpone|defer|push)\s+(?:task\s+)(.+?)\s+(?:to\s+)?(.+)/i : stryMutAct_9fa48("3367") ? /(?:postpone|defer|push)\S+(?:task\s+)?(.+?)\s+(?:to\s+)?(.+)/i : stryMutAct_9fa48("3366") ? /(?:postpone|defer|push)\s(?:task\s+)?(.+?)\s+(?:to\s+)?(.+)/i : (stryCov_9fa48("3366", "3367", "3368", "3369", "3370", "3371", "3372", "3373", "3374", "3375", "3376", "3377"), /(?:postpone|defer|push)\s+(?:task\s+)?(.+?)\s+(?:to\s+)?(.+)/i));
      if (stryMutAct_9fa48("3379") ? false : stryMutAct_9fa48("3378") ? true : (stryCov_9fa48("3378", "3379"), postponeMatch)) {
        if (stryMutAct_9fa48("3380")) {
          {}
        } else {
          stryCov_9fa48("3380");
          const taskName = stryMutAct_9fa48("3381") ? postponeMatch[1] : (stryCov_9fa48("3381"), postponeMatch[1].trim());
          const timeRef = stryMutAct_9fa48("3382") ? postponeMatch[2] : (stryCov_9fa48("3382"), postponeMatch[2].trim());
          const task = context.tasks.find(stryMutAct_9fa48("3383") ? () => undefined : (stryCov_9fa48("3383"), t => stryMutAct_9fa48("3384") ? t.name.toUpperCase().includes(taskName.toLowerCase()) : (stryCov_9fa48("3384"), t.name.toLowerCase().includes(stryMutAct_9fa48("3385") ? taskName.toUpperCase() : (stryCov_9fa48("3385"), taskName.toLowerCase())))));
          if (stryMutAct_9fa48("3387") ? false : stryMutAct_9fa48("3386") ? true : (stryCov_9fa48("3386", "3387"), task)) {
            if (stryMutAct_9fa48("3388")) {
              {}
            } else {
              stryCov_9fa48("3388");
              const date = this.parseNaturalDate(timeRef);
              if (stryMutAct_9fa48("3390") ? false : stryMutAct_9fa48("3389") ? true : (stryCov_9fa48("3389", "3390"), date)) {
                if (stryMutAct_9fa48("3391")) {
                  {}
                } else {
                  stryCov_9fa48("3391");
                  return stryMutAct_9fa48("3392") ? {} : (stryCov_9fa48("3392"), {
                    action: stryMutAct_9fa48("3393") ? "" : (stryCov_9fa48("3393"), "schedule"),
                    taskId: task.id,
                    updates: stryMutAct_9fa48("3394") ? {} : (stryCov_9fa48("3394"), {
                      date
                    })
                  });
                }
              }
            }
          }
        }
      }

      // Pattern: "search for [query]" or "find [query]"
      const searchMatch = text.match(stryMutAct_9fa48("3400") ? /(?:search|find)\s+(?:for\s+)?(.)/i : stryMutAct_9fa48("3399") ? /(?:search|find)\s+(?:for\S+)?(.+)/i : stryMutAct_9fa48("3398") ? /(?:search|find)\s+(?:for\s)?(.+)/i : stryMutAct_9fa48("3397") ? /(?:search|find)\s+(?:for\s+)(.+)/i : stryMutAct_9fa48("3396") ? /(?:search|find)\S+(?:for\s+)?(.+)/i : stryMutAct_9fa48("3395") ? /(?:search|find)\s(?:for\s+)?(.+)/i : (stryCov_9fa48("3395", "3396", "3397", "3398", "3399", "3400"), /(?:search|find)\s+(?:for\s+)?(.+)/i));
      if (stryMutAct_9fa48("3402") ? false : stryMutAct_9fa48("3401") ? true : (stryCov_9fa48("3401", "3402"), searchMatch)) {
        if (stryMutAct_9fa48("3403")) {
          {}
        } else {
          stryCov_9fa48("3403");
          const query = stryMutAct_9fa48("3404") ? searchMatch[1] : (stryCov_9fa48("3404"), searchMatch[1].trim());
          return stryMutAct_9fa48("3405") ? {} : (stryCov_9fa48("3405"), {
            action: stryMutAct_9fa48("3406") ? "" : (stryCov_9fa48("3406"), "search"),
            searchQuery: query
          });
        }
      }
      return null;
    }
  }

  /**
   * Parse natural language dates (tomorrow, today, monday, next week, etc.)
   */
  private parseNaturalDate(dateStr: string): string | null {
    if (stryMutAct_9fa48("3407")) {
      {}
    } else {
      stryCov_9fa48("3407");
      const normalized = stryMutAct_9fa48("3409") ? dateStr.toUpperCase().trim() : stryMutAct_9fa48("3408") ? dateStr.toLowerCase() : (stryCov_9fa48("3408", "3409"), dateStr.toLowerCase().trim());
      const today = new Date();
      if (stryMutAct_9fa48("3412") ? normalized !== "today" : stryMutAct_9fa48("3411") ? false : stryMutAct_9fa48("3410") ? true : (stryCov_9fa48("3410", "3411", "3412"), normalized === (stryMutAct_9fa48("3413") ? "" : (stryCov_9fa48("3413"), "today")))) {
        if (stryMutAct_9fa48("3414")) {
          {}
        } else {
          stryCov_9fa48("3414");
          return today.toISOString().split(stryMutAct_9fa48("3415") ? "" : (stryCov_9fa48("3415"), "T"))[0];
        }
      }
      if (stryMutAct_9fa48("3418") ? normalized !== "tomorrow" : stryMutAct_9fa48("3417") ? false : stryMutAct_9fa48("3416") ? true : (stryCov_9fa48("3416", "3417", "3418"), normalized === (stryMutAct_9fa48("3419") ? "" : (stryCov_9fa48("3419"), "tomorrow")))) {
        if (stryMutAct_9fa48("3420")) {
          {}
        } else {
          stryCov_9fa48("3420");
          const tomorrow = new Date(stryMutAct_9fa48("3421") ? today.getTime() - 24 * 60 * 60 * 1000 : (stryCov_9fa48("3421"), today.getTime() + (stryMutAct_9fa48("3422") ? 24 * 60 * 60 / 1000 : (stryCov_9fa48("3422"), (stryMutAct_9fa48("3423") ? 24 * 60 / 60 : (stryCov_9fa48("3423"), (stryMutAct_9fa48("3424") ? 24 / 60 : (stryCov_9fa48("3424"), 24 * 60)) * 60)) * 1000))));
          return tomorrow.toISOString().split(stryMutAct_9fa48("3425") ? "" : (stryCov_9fa48("3425"), "T"))[0];
        }
      }
      if (stryMutAct_9fa48("3428") ? normalized === "next week" && normalized === "weekend" : stryMutAct_9fa48("3427") ? false : stryMutAct_9fa48("3426") ? true : (stryCov_9fa48("3426", "3427", "3428"), (stryMutAct_9fa48("3430") ? normalized !== "next week" : stryMutAct_9fa48("3429") ? false : (stryCov_9fa48("3429", "3430"), normalized === (stryMutAct_9fa48("3431") ? "" : (stryCov_9fa48("3431"), "next week")))) || (stryMutAct_9fa48("3433") ? normalized !== "weekend" : stryMutAct_9fa48("3432") ? false : (stryCov_9fa48("3432", "3433"), normalized === (stryMutAct_9fa48("3434") ? "" : (stryCov_9fa48("3434"), "weekend")))))) {
        if (stryMutAct_9fa48("3435")) {
          {}
        } else {
          stryCov_9fa48("3435");
          const nextWeek = new Date(stryMutAct_9fa48("3436") ? today.getTime() - 7 * 24 * 60 * 60 * 1000 : (stryCov_9fa48("3436"), today.getTime() + (stryMutAct_9fa48("3437") ? 7 * 24 * 60 * 60 / 1000 : (stryCov_9fa48("3437"), (stryMutAct_9fa48("3438") ? 7 * 24 * 60 / 60 : (stryCov_9fa48("3438"), (stryMutAct_9fa48("3439") ? 7 * 24 / 60 : (stryCov_9fa48("3439"), (stryMutAct_9fa48("3440") ? 7 / 24 : (stryCov_9fa48("3440"), 7 * 24)) * 60)) * 60)) * 1000))));
          return nextWeek.toISOString().split(stryMutAct_9fa48("3441") ? "" : (stryCov_9fa48("3441"), "T"))[0];
        }
      }
      const dayMap: Record<string, number> = stryMutAct_9fa48("3442") ? {} : (stryCov_9fa48("3442"), {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6
      });
      if (stryMutAct_9fa48("3445") ? dayMap[normalized] === undefined : stryMutAct_9fa48("3444") ? false : stryMutAct_9fa48("3443") ? true : (stryCov_9fa48("3443", "3444", "3445"), dayMap[normalized] !== undefined)) {
        if (stryMutAct_9fa48("3446")) {
          {}
        } else {
          stryCov_9fa48("3446");
          const targetDay = dayMap[normalized];
          const daysUntil = stryMutAct_9fa48("3449") ? (targetDay - today.getDay() + 7) % 7 && 7 : stryMutAct_9fa48("3448") ? false : stryMutAct_9fa48("3447") ? true : (stryCov_9fa48("3447", "3448", "3449"), (stryMutAct_9fa48("3450") ? (targetDay - today.getDay() + 7) * 7 : (stryCov_9fa48("3450"), (stryMutAct_9fa48("3451") ? targetDay - today.getDay() - 7 : (stryCov_9fa48("3451"), (stryMutAct_9fa48("3452") ? targetDay + today.getDay() : (stryCov_9fa48("3452"), targetDay - today.getDay())) + 7)) % 7)) || 7);
          const targetDate = new Date(stryMutAct_9fa48("3453") ? today.getTime() - daysUntil * 24 * 60 * 60 * 1000 : (stryCov_9fa48("3453"), today.getTime() + (stryMutAct_9fa48("3454") ? daysUntil * 24 * 60 * 60 / 1000 : (stryCov_9fa48("3454"), (stryMutAct_9fa48("3455") ? daysUntil * 24 * 60 / 60 : (stryCov_9fa48("3455"), (stryMutAct_9fa48("3456") ? daysUntil * 24 / 60 : (stryCov_9fa48("3456"), (stryMutAct_9fa48("3457") ? daysUntil / 24 : (stryCov_9fa48("3457"), daysUntil * 24)) * 60)) * 60)) * 1000))));
          return targetDate.toISOString().split(stryMutAct_9fa48("3458") ? "" : (stryCov_9fa48("3458"), "T"))[0];
        }
      }

      // Try YYYY-MM-DD format
      if (stryMutAct_9fa48("3460") ? false : stryMutAct_9fa48("3459") ? true : (stryCov_9fa48("3459", "3460"), (stryMutAct_9fa48("3468") ? /^\d{4}-\d{2}-\D{2}$/ : stryMutAct_9fa48("3467") ? /^\d{4}-\d{2}-\d$/ : stryMutAct_9fa48("3466") ? /^\d{4}-\D{2}-\d{2}$/ : stryMutAct_9fa48("3465") ? /^\d{4}-\d-\d{2}$/ : stryMutAct_9fa48("3464") ? /^\D{4}-\d{2}-\d{2}$/ : stryMutAct_9fa48("3463") ? /^\d-\d{2}-\d{2}$/ : stryMutAct_9fa48("3462") ? /^\d{4}-\d{2}-\d{2}/ : stryMutAct_9fa48("3461") ? /\d{4}-\d{2}-\d{2}$/ : (stryCov_9fa48("3461", "3462", "3463", "3464", "3465", "3466", "3467", "3468"), /^\d{4}-\d{2}-\d{2}$/)).test(normalized))) {
        if (stryMutAct_9fa48("3469")) {
          {}
        } else {
          stryCov_9fa48("3469");
          return normalized;
        }
      }

      // "in X days/weeks"
      const inMatch = normalized.match(stryMutAct_9fa48("3475") ? /in\s+(\d+)\S+(day|week|month)/ : stryMutAct_9fa48("3474") ? /in\s+(\d+)\s(day|week|month)/ : stryMutAct_9fa48("3473") ? /in\s+(\D+)\s+(day|week|month)/ : stryMutAct_9fa48("3472") ? /in\s+(\d)\s+(day|week|month)/ : stryMutAct_9fa48("3471") ? /in\S+(\d+)\s+(day|week|month)/ : stryMutAct_9fa48("3470") ? /in\s(\d+)\s+(day|week|month)/ : (stryCov_9fa48("3470", "3471", "3472", "3473", "3474", "3475"), /in\s+(\d+)\s+(day|week|month)/));
      if (stryMutAct_9fa48("3477") ? false : stryMutAct_9fa48("3476") ? true : (stryCov_9fa48("3476", "3477"), inMatch)) {
        if (stryMutAct_9fa48("3478")) {
          {}
        } else {
          stryCov_9fa48("3478");
          const num = parseInt(inMatch[1]);
          const unit = inMatch[2];
          const multiplier = (stryMutAct_9fa48("3481") ? unit !== "day" : stryMutAct_9fa48("3480") ? false : stryMutAct_9fa48("3479") ? true : (stryCov_9fa48("3479", "3480", "3481"), unit === (stryMutAct_9fa48("3482") ? "" : (stryCov_9fa48("3482"), "day")))) ? 1 : (stryMutAct_9fa48("3485") ? unit !== "week" : stryMutAct_9fa48("3484") ? false : stryMutAct_9fa48("3483") ? true : (stryCov_9fa48("3483", "3484", "3485"), unit === (stryMutAct_9fa48("3486") ? "" : (stryCov_9fa48("3486"), "week")))) ? 7 : 30;
          const targetDate = new Date(stryMutAct_9fa48("3487") ? today.getTime() - num * multiplier * 24 * 60 * 60 * 1000 : (stryCov_9fa48("3487"), today.getTime() + (stryMutAct_9fa48("3488") ? num * multiplier * 24 * 60 * 60 / 1000 : (stryCov_9fa48("3488"), (stryMutAct_9fa48("3489") ? num * multiplier * 24 * 60 / 60 : (stryCov_9fa48("3489"), (stryMutAct_9fa48("3490") ? num * multiplier * 24 / 60 : (stryCov_9fa48("3490"), (stryMutAct_9fa48("3491") ? num * multiplier / 24 : (stryCov_9fa48("3491"), (stryMutAct_9fa48("3492") ? num / multiplier : (stryCov_9fa48("3492"), num * multiplier)) * 24)) * 60)) * 60)) * 1000))));
          return targetDate.toISOString().split(stryMutAct_9fa48("3493") ? "" : (stryCov_9fa48("3493"), "T"))[0];
        }
      }
      return null;
    }
  }
}

// Singleton instance
let aiManager: AIManager | null = null;
export function getAIManager(): AIManager {
  if (stryMutAct_9fa48("3494")) {
    {}
  } else {
    stryCov_9fa48("3494");
    if (stryMutAct_9fa48("3497") ? false : stryMutAct_9fa48("3496") ? true : stryMutAct_9fa48("3495") ? aiManager : (stryCov_9fa48("3495", "3496", "3497"), !aiManager)) {
      if (stryMutAct_9fa48("3498")) {
        {}
      } else {
        stryCov_9fa48("3498");
        aiManager = new AIManager();
      }
    }
    return aiManager;
  }
}