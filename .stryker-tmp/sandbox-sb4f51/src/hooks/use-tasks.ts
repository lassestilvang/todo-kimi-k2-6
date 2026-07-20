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
import { useState, useCallback, useRef, useMemo } from "react";
import type { TaskWithRelations, List, Label, FilterPreset, Priority } from "@/types";

// Priority order for sorting - defined outside hook to avoid dependency issues
const PRIORITY_ORDER: Record<Priority, number> = stryMutAct_9fa48("507") ? {} : (stryCov_9fa48("507"), {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4
});
interface UseTasksOptions {
  initialTasks: TaskWithRelations[];
  initialLists: List[];
  initialLabels: Label[];
}
type SortField = "name" | "date" | "deadline" | "priority" | "created_at" | "updated_at";
type SortDirection = "asc" | "desc";
interface UseTasksResult {
  tasks: TaskWithRelations[];
  lists: List[];
  labels: Label[];
  currentView: string;
  currentListId: number | undefined;
  searchQuery: string;
  currentFilterPreset: FilterPreset | undefined;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  visibleTasks: TaskWithRelations[];
  overdueCount: number;
  sortBy: SortField;
  sortDirection: SortDirection;
  filterListId: number | undefined;
  filterLabelIds: number[];
  filterPriority: Priority | undefined;
  setTasks: (tasks: TaskWithRelations[]) => void;
  setLists: (lists: List[]) => void;
  setLabels: (labels: Label[]) => void;
  setCurrentView: (view: string) => void;
  setCurrentListId: (id: number | undefined) => void;
  setSearchQuery: (query: string) => void;
  setCurrentFilterPreset: (preset: FilterPreset | undefined) => void;
  handleViewChange: (view: string, listId?: number) => void;
  handleSearch: (query: string) => void;
  handleFilterPresetChange: (preset: FilterPreset | undefined) => void;
  handleSort: (field: SortField) => void;
  handleFilterList: (listId: number | undefined) => void;
  handleFilterLabel: (labelId: number) => void;
  handleFilterPriority: (priority: Priority | undefined) => void;
  clearFilters: () => void;
}
export function useTasks({
  initialTasks,
  initialLists,
  initialLabels
}: UseTasksOptions): UseTasksResult {
  if (stryMutAct_9fa48("508")) {
    {}
  } else {
    stryCov_9fa48("508");
    const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks);
    const [lists, setLists] = useState<List[]>(initialLists);
    const [labels, setLabels] = useState<Label[]>(initialLabels);
    const [currentView, setCurrentView] = useState<string>(stryMutAct_9fa48("509") ? "" : (stryCov_9fa48("509"), "today"));
    const [currentListId, setCurrentListId] = useState<number | undefined>();
    const [searchQuery, setSearchQuery] = useState(stryMutAct_9fa48("510") ? "Stryker was here!" : (stryCov_9fa48("510"), ""));
    const [currentFilterPreset, setCurrentFilterPreset] = useState<FilterPreset | undefined>();
    const [sortBy, setSortBy] = useState<SortField>(stryMutAct_9fa48("511") ? "" : (stryCov_9fa48("511"), "date"));
    const [sortDirection, setSortDirection] = useState<SortDirection>(stryMutAct_9fa48("512") ? "" : (stryCov_9fa48("512"), "asc"));
    const [filterListId, setFilterListId] = useState<number | undefined>();
    const [filterLabelIds, setFilterLabelIds] = useState<number[]>(stryMutAct_9fa48("513") ? ["Stryker was here"] : (stryCov_9fa48("513"), []));
    const [filterPriority, setFilterPriority] = useState<Priority | undefined>();
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Cache the Fuse instance to avoid recreating it on every render
    // Use dynamic import for SSR compatibility
    // Note: We only create the instance once and update its collection separately
    const fuseInstance = useMemo(() => {
      if (stryMutAct_9fa48("514")) {
        {}
      } else {
        stryCov_9fa48("514");
        if (stryMutAct_9fa48("517") ? typeof window !== "undefined" : stryMutAct_9fa48("516") ? false : stryMutAct_9fa48("515") ? true : (stryCov_9fa48("515", "516", "517"), typeof window === (stryMutAct_9fa48("518") ? "" : (stryCov_9fa48("518"), "undefined")))) return null;
        try {
          if (stryMutAct_9fa48("519")) {
            {}
          } else {
            stryCov_9fa48("519");
            // Dynamic import for Fuse.js (SSR-safe)
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const FuseModule = require("fuse.js");
            const Fuse = stryMutAct_9fa48("522") ? FuseModule.default && FuseModule : stryMutAct_9fa48("521") ? false : stryMutAct_9fa48("520") ? true : (stryCov_9fa48("520", "521", "522"), FuseModule.default || FuseModule);
            return new Fuse(stryMutAct_9fa48("523") ? ["Stryker was here"] : (stryCov_9fa48("523"), []), stryMutAct_9fa48("524") ? {} : (stryCov_9fa48("524"), {
              keys: stryMutAct_9fa48("525") ? [] : (stryCov_9fa48("525"), [stryMutAct_9fa48("526") ? "" : (stryCov_9fa48("526"), "name"), stryMutAct_9fa48("527") ? "" : (stryCov_9fa48("527"), "description"), stryMutAct_9fa48("528") ? "" : (stryCov_9fa48("528"), "notes")]),
              threshold: 0.4,
              minMatchCharLength: 2,
              shouldSort: stryMutAct_9fa48("529") ? false : (stryCov_9fa48("529"), true)
            }));
          }
        } catch {
          if (stryMutAct_9fa48("530")) {
            {}
          } else {
            stryCov_9fa48("530");
            // Fuse.js not available, will fall back to simple filtering
            return null;
          }
        }
      }
    }, stryMutAct_9fa48("531") ? ["Stryker was here"] : (stryCov_9fa48("531"), [])); // Empty deps - only create once

    // Calculate visible tasks with optimized filtering
    const visibleTasks = useMemo(() => {
      if (stryMutAct_9fa48("532")) {
        {}
      } else {
        stryCov_9fa48("532");
        let result = tasks;

        // Apply search query (fuzzy search)
        if (stryMutAct_9fa48("535") ? searchQuery || fuseInstance : stryMutAct_9fa48("534") ? false : stryMutAct_9fa48("533") ? true : (stryCov_9fa48("533", "534", "535"), searchQuery && fuseInstance)) {
          if (stryMutAct_9fa48("536")) {
            {}
          } else {
            stryCov_9fa48("536");
            // Update the fuse instance with current tasks before searching
            fuseInstance.setCollection(tasks);
            result = fuseInstance.search(searchQuery).map(stryMutAct_9fa48("537") ? () => undefined : (stryCov_9fa48("537"), (r: {
              item: TaskWithRelations;
            }) => r.item));
          }
        } else if (stryMutAct_9fa48("540") ? !currentFilterPreset || !searchQuery : stryMutAct_9fa48("539") ? false : stryMutAct_9fa48("538") ? true : (stryCov_9fa48("538", "539", "540"), (stryMutAct_9fa48("541") ? currentFilterPreset : (stryCov_9fa48("541"), !currentFilterPreset)) && (stryMutAct_9fa48("542") ? searchQuery : (stryCov_9fa48("542"), !searchQuery)))) {
          if (stryMutAct_9fa48("543")) {
            {}
          } else {
            stryCov_9fa48("543");
            const now = new Date();
            const today = now.toISOString().split(stryMutAct_9fa48("544") ? "" : (stryCov_9fa48("544"), "T"))[0];
            const nextWeek = new Date(stryMutAct_9fa48("545") ? now.getTime() - 7 * 24 * 60 * 60 * 1000 : (stryCov_9fa48("545"), now.getTime() + (stryMutAct_9fa48("546") ? 7 * 24 * 60 * 60 / 1000 : (stryCov_9fa48("546"), (stryMutAct_9fa48("547") ? 7 * 24 * 60 / 60 : (stryCov_9fa48("547"), (stryMutAct_9fa48("548") ? 7 * 24 / 60 : (stryCov_9fa48("548"), (stryMutAct_9fa48("549") ? 7 / 24 : (stryCov_9fa48("549"), 7 * 24)) * 60)) * 60)) * 1000)))).toISOString().split(stryMutAct_9fa48("550") ? "" : (stryCov_9fa48("550"), "T"))[0];
            if (stryMutAct_9fa48("553") ? currentView !== "today" : stryMutAct_9fa48("552") ? false : stryMutAct_9fa48("551") ? true : (stryCov_9fa48("551", "552", "553"), currentView === (stryMutAct_9fa48("554") ? "" : (stryCov_9fa48("554"), "today")))) {
              if (stryMutAct_9fa48("555")) {
                {}
              } else {
                stryCov_9fa48("555");
                result = stryMutAct_9fa48("556") ? tasks : (stryCov_9fa48("556"), tasks.filter(stryMutAct_9fa48("557") ? () => undefined : (stryCov_9fa48("557"), t => stryMutAct_9fa48("560") ? t.date !== today : stryMutAct_9fa48("559") ? false : stryMutAct_9fa48("558") ? true : (stryCov_9fa48("558", "559", "560"), t.date === today))));
              }
            } else if (stryMutAct_9fa48("563") ? currentView !== "next7" : stryMutAct_9fa48("562") ? false : stryMutAct_9fa48("561") ? true : (stryCov_9fa48("561", "562", "563"), currentView === (stryMutAct_9fa48("564") ? "" : (stryCov_9fa48("564"), "next7")))) {
              if (stryMutAct_9fa48("565")) {
                {}
              } else {
                stryCov_9fa48("565");
                result = stryMutAct_9fa48("566") ? tasks : (stryCov_9fa48("566"), tasks.filter(stryMutAct_9fa48("567") ? () => undefined : (stryCov_9fa48("567"), t => stryMutAct_9fa48("570") ? t.date && t.date >= today || t.date <= nextWeek : stryMutAct_9fa48("569") ? false : stryMutAct_9fa48("568") ? true : (stryCov_9fa48("568", "569", "570"), (stryMutAct_9fa48("572") ? t.date || t.date >= today : stryMutAct_9fa48("571") ? true : (stryCov_9fa48("571", "572"), t.date && (stryMutAct_9fa48("575") ? t.date < today : stryMutAct_9fa48("574") ? t.date > today : stryMutAct_9fa48("573") ? true : (stryCov_9fa48("573", "574", "575"), t.date >= today)))) && (stryMutAct_9fa48("578") ? t.date > nextWeek : stryMutAct_9fa48("577") ? t.date < nextWeek : stryMutAct_9fa48("576") ? true : (stryCov_9fa48("576", "577", "578"), t.date <= nextWeek))))));
              }
            } else if (stryMutAct_9fa48("581") ? currentView !== "upcoming" : stryMutAct_9fa48("580") ? false : stryMutAct_9fa48("579") ? true : (stryCov_9fa48("579", "580", "581"), currentView === (stryMutAct_9fa48("582") ? "" : (stryCov_9fa48("582"), "upcoming")))) {
              if (stryMutAct_9fa48("583")) {
                {}
              } else {
                stryCov_9fa48("583");
                result = stryMutAct_9fa48("584") ? tasks : (stryCov_9fa48("584"), tasks.filter(stryMutAct_9fa48("585") ? () => undefined : (stryCov_9fa48("585"), t => stryMutAct_9fa48("588") ? t.date || t.date >= today : stryMutAct_9fa48("587") ? false : stryMutAct_9fa48("586") ? true : (stryCov_9fa48("586", "587", "588"), t.date && (stryMutAct_9fa48("591") ? t.date < today : stryMutAct_9fa48("590") ? t.date > today : stryMutAct_9fa48("589") ? true : (stryCov_9fa48("589", "590", "591"), t.date >= today))))));
              }
            } else if (stryMutAct_9fa48("594") ? currentView !== "blocked" : stryMutAct_9fa48("593") ? false : stryMutAct_9fa48("592") ? true : (stryCov_9fa48("592", "593", "594"), currentView === (stryMutAct_9fa48("595") ? "" : (stryCov_9fa48("595"), "blocked")))) {
              if (stryMutAct_9fa48("596")) {
                {}
              } else {
                stryCov_9fa48("596");
                result = stryMutAct_9fa48("597") ? tasks : (stryCov_9fa48("597"), tasks.filter(stryMutAct_9fa48("598") ? () => undefined : (stryCov_9fa48("598"), t => stryMutAct_9fa48("601") ? t.blocked_by || t.blocked_by.length > 0 : stryMutAct_9fa48("600") ? false : stryMutAct_9fa48("599") ? true : (stryCov_9fa48("599", "600", "601"), t.blocked_by && (stryMutAct_9fa48("604") ? t.blocked_by.length <= 0 : stryMutAct_9fa48("603") ? t.blocked_by.length >= 0 : stryMutAct_9fa48("602") ? true : (stryCov_9fa48("602", "603", "604"), t.blocked_by.length > 0))))));
              }
            }
          }
        }

        // Filter out completed tasks
        result = stryMutAct_9fa48("605") ? result : (stryCov_9fa48("605"), result.filter(stryMutAct_9fa48("606") ? () => undefined : (stryCov_9fa48("606"), t => stryMutAct_9fa48("607") ? t.completed : (stryCov_9fa48("607"), !t.completed))));

        // Apply additional filters
        if (stryMutAct_9fa48("610") ? filterListId === undefined : stryMutAct_9fa48("609") ? false : stryMutAct_9fa48("608") ? true : (stryCov_9fa48("608", "609", "610"), filterListId !== undefined)) {
          if (stryMutAct_9fa48("611")) {
            {}
          } else {
            stryCov_9fa48("611");
            result = stryMutAct_9fa48("612") ? result : (stryCov_9fa48("612"), result.filter(stryMutAct_9fa48("613") ? () => undefined : (stryCov_9fa48("613"), t => stryMutAct_9fa48("616") ? t.list_id !== filterListId : stryMutAct_9fa48("615") ? false : stryMutAct_9fa48("614") ? true : (stryCov_9fa48("614", "615", "616"), t.list_id === filterListId))));
          }
        }
        if (stryMutAct_9fa48("620") ? filterLabelIds.length <= 0 : stryMutAct_9fa48("619") ? filterLabelIds.length >= 0 : stryMutAct_9fa48("618") ? false : stryMutAct_9fa48("617") ? true : (stryCov_9fa48("617", "618", "619", "620"), filterLabelIds.length > 0)) {
          if (stryMutAct_9fa48("621")) {
            {}
          } else {
            stryCov_9fa48("621");
            result = stryMutAct_9fa48("622") ? result : (stryCov_9fa48("622"), result.filter(stryMutAct_9fa48("623") ? () => undefined : (stryCov_9fa48("623"), t => stryMutAct_9fa48("624") ? filterLabelIds.some(id => t.labels?.some(l => l.id === id)) : (stryCov_9fa48("624"), filterLabelIds.every(stryMutAct_9fa48("625") ? () => undefined : (stryCov_9fa48("625"), id => stryMutAct_9fa48("627") ? t.labels.some(l => l.id === id) : stryMutAct_9fa48("626") ? t.labels?.every(l => l.id === id) : (stryCov_9fa48("626", "627"), t.labels?.some(stryMutAct_9fa48("628") ? () => undefined : (stryCov_9fa48("628"), l => stryMutAct_9fa48("631") ? l.id !== id : stryMutAct_9fa48("630") ? false : stryMutAct_9fa48("629") ? true : (stryCov_9fa48("629", "630", "631"), l.id === id))))))))));
          }
        }
        if (stryMutAct_9fa48("634") ? filterPriority !== undefined || filterPriority !== "none" : stryMutAct_9fa48("633") ? false : stryMutAct_9fa48("632") ? true : (stryCov_9fa48("632", "633", "634"), (stryMutAct_9fa48("636") ? filterPriority === undefined : stryMutAct_9fa48("635") ? true : (stryCov_9fa48("635", "636"), filterPriority !== undefined)) && (stryMutAct_9fa48("638") ? filterPriority === "none" : stryMutAct_9fa48("637") ? true : (stryCov_9fa48("637", "638"), filterPriority !== (stryMutAct_9fa48("639") ? "" : (stryCov_9fa48("639"), "none")))))) {
          if (stryMutAct_9fa48("640")) {
            {}
          } else {
            stryCov_9fa48("640");
            result = stryMutAct_9fa48("641") ? result : (stryCov_9fa48("641"), result.filter(stryMutAct_9fa48("642") ? () => undefined : (stryCov_9fa48("642"), t => stryMutAct_9fa48("645") ? t.priority !== filterPriority : stryMutAct_9fa48("644") ? false : stryMutAct_9fa48("643") ? true : (stryCov_9fa48("643", "644", "645"), t.priority === filterPriority))));
          }
        }

        // Apply sorting with stable sort
        const sorted = stryMutAct_9fa48("646") ? [...result] : (stryCov_9fa48("646"), (stryMutAct_9fa48("647") ? [] : (stryCov_9fa48("647"), [...result])).sort((a, b) => {
          if (stryMutAct_9fa48("648")) {
            {}
          } else {
            stryCov_9fa48("648");
            let aValue: string | number, bValue: string | number;
            switch (sortBy) {
              case stryMutAct_9fa48("650") ? "" : (stryCov_9fa48("650"), "name"):
                if (stryMutAct_9fa48("649")) {} else {
                  stryCov_9fa48("649");
                  aValue = stryMutAct_9fa48("651") ? a.name.toUpperCase() : (stryCov_9fa48("651"), a.name.toLowerCase());
                  bValue = stryMutAct_9fa48("652") ? b.name.toUpperCase() : (stryCov_9fa48("652"), b.name.toLowerCase());
                  break;
                }
              case stryMutAct_9fa48("654") ? "" : (stryCov_9fa48("654"), "date"):
                if (stryMutAct_9fa48("653")) {} else {
                  stryCov_9fa48("653");
                  aValue = stryMutAct_9fa48("657") ? a.date && "zzz" : stryMutAct_9fa48("656") ? false : stryMutAct_9fa48("655") ? true : (stryCov_9fa48("655", "656", "657"), a.date || (stryMutAct_9fa48("658") ? "" : (stryCov_9fa48("658"), "zzz")));
                  bValue = stryMutAct_9fa48("661") ? b.date && "zzz" : stryMutAct_9fa48("660") ? false : stryMutAct_9fa48("659") ? true : (stryCov_9fa48("659", "660", "661"), b.date || (stryMutAct_9fa48("662") ? "" : (stryCov_9fa48("662"), "zzz")));
                  break;
                }
              case stryMutAct_9fa48("664") ? "" : (stryCov_9fa48("664"), "deadline"):
                if (stryMutAct_9fa48("663")) {} else {
                  stryCov_9fa48("663");
                  aValue = stryMutAct_9fa48("667") ? a.deadline && "zzz" : stryMutAct_9fa48("666") ? false : stryMutAct_9fa48("665") ? true : (stryCov_9fa48("665", "666", "667"), a.deadline || (stryMutAct_9fa48("668") ? "" : (stryCov_9fa48("668"), "zzz")));
                  bValue = stryMutAct_9fa48("671") ? b.deadline && "zzz" : stryMutAct_9fa48("670") ? false : stryMutAct_9fa48("669") ? true : (stryCov_9fa48("669", "670", "671"), b.deadline || (stryMutAct_9fa48("672") ? "" : (stryCov_9fa48("672"), "zzz")));
                  break;
                }
              case stryMutAct_9fa48("674") ? "" : (stryCov_9fa48("674"), "priority"):
                if (stryMutAct_9fa48("673")) {} else {
                  stryCov_9fa48("673");
                  aValue = PRIORITY_ORDER[a.priority];
                  bValue = PRIORITY_ORDER[b.priority];
                  break;
                }
              case stryMutAct_9fa48("676") ? "" : (stryCov_9fa48("676"), "created_at"):
                if (stryMutAct_9fa48("675")) {} else {
                  stryCov_9fa48("675");
                  aValue = a.created_at;
                  bValue = b.created_at;
                  break;
                }
              case stryMutAct_9fa48("678") ? "" : (stryCov_9fa48("678"), "updated_at"):
                if (stryMutAct_9fa48("677")) {} else {
                  stryCov_9fa48("677");
                  aValue = a.updated_at;
                  bValue = b.updated_at;
                  break;
                }
              default:
                if (stryMutAct_9fa48("679")) {} else {
                  stryCov_9fa48("679");
                  aValue = stryMutAct_9fa48("682") ? a.date && "zzz" : stryMutAct_9fa48("681") ? false : stryMutAct_9fa48("680") ? true : (stryCov_9fa48("680", "681", "682"), a.date || (stryMutAct_9fa48("683") ? "" : (stryCov_9fa48("683"), "zzz")));
                  bValue = stryMutAct_9fa48("686") ? b.date && "zzz" : stryMutAct_9fa48("685") ? false : stryMutAct_9fa48("684") ? true : (stryCov_9fa48("684", "685", "686"), b.date || (stryMutAct_9fa48("687") ? "" : (stryCov_9fa48("687"), "zzz")));
                }
            }
            if (stryMutAct_9fa48("691") ? aValue >= bValue : stryMutAct_9fa48("690") ? aValue <= bValue : stryMutAct_9fa48("689") ? false : stryMutAct_9fa48("688") ? true : (stryCov_9fa48("688", "689", "690", "691"), aValue < bValue)) return (stryMutAct_9fa48("694") ? sortDirection !== "asc" : stryMutAct_9fa48("693") ? false : stryMutAct_9fa48("692") ? true : (stryCov_9fa48("692", "693", "694"), sortDirection === (stryMutAct_9fa48("695") ? "" : (stryCov_9fa48("695"), "asc")))) ? stryMutAct_9fa48("696") ? +1 : (stryCov_9fa48("696"), -1) : 1;
            if (stryMutAct_9fa48("700") ? aValue <= bValue : stryMutAct_9fa48("699") ? aValue >= bValue : stryMutAct_9fa48("698") ? false : stryMutAct_9fa48("697") ? true : (stryCov_9fa48("697", "698", "699", "700"), aValue > bValue)) return (stryMutAct_9fa48("703") ? sortDirection !== "asc" : stryMutAct_9fa48("702") ? false : stryMutAct_9fa48("701") ? true : (stryCov_9fa48("701", "702", "703"), sortDirection === (stryMutAct_9fa48("704") ? "" : (stryCov_9fa48("704"), "asc")))) ? 1 : stryMutAct_9fa48("705") ? +1 : (stryCov_9fa48("705"), -1);
            return 0;
          }
        }));
        return sorted;
      }
    }, stryMutAct_9fa48("706") ? [] : (stryCov_9fa48("706"), [tasks, currentView, currentFilterPreset, searchQuery, sortBy, sortDirection, filterListId, filterLabelIds, filterPriority, fuseInstance])); // priorityOrder is a stable constant (no deps)

    // Calculate overdue count
    const overdueCount = useMemo(() => {
      if (stryMutAct_9fa48("707")) {
        {}
      } else {
        stryCov_9fa48("707");
        return stryMutAct_9fa48("708") ? tasks.length : (stryCov_9fa48("708"), tasks.filter(stryMutAct_9fa48("709") ? () => undefined : (stryCov_9fa48("709"), t => stryMutAct_9fa48("712") ? !t.completed && t.date && new Date(t.date) < new Date() || new Date(t.date) < new Date(new Date().setHours(23, 59, 59, 999)) : stryMutAct_9fa48("711") ? false : stryMutAct_9fa48("710") ? true : (stryCov_9fa48("710", "711", "712"), (stryMutAct_9fa48("714") ? !t.completed && t.date || new Date(t.date) < new Date() : stryMutAct_9fa48("713") ? true : (stryCov_9fa48("713", "714"), (stryMutAct_9fa48("716") ? !t.completed || t.date : stryMutAct_9fa48("715") ? true : (stryCov_9fa48("715", "716"), (stryMutAct_9fa48("717") ? t.completed : (stryCov_9fa48("717"), !t.completed)) && t.date)) && (stryMutAct_9fa48("720") ? new Date(t.date) >= new Date() : stryMutAct_9fa48("719") ? new Date(t.date) <= new Date() : stryMutAct_9fa48("718") ? true : (stryCov_9fa48("718", "719", "720"), new Date(t.date) < new Date())))) && (stryMutAct_9fa48("723") ? new Date(t.date) >= new Date(new Date().setHours(23, 59, 59, 999)) : stryMutAct_9fa48("722") ? new Date(t.date) <= new Date(new Date().setHours(23, 59, 59, 999)) : stryMutAct_9fa48("721") ? true : (stryCov_9fa48("721", "722", "723"), new Date(t.date) < new Date(stryMutAct_9fa48("724") ? new Date().setMinutes(23, 59, 59, 999) : (stryCov_9fa48("724"), new Date().setHours(23, 59, 59, 999)))))))).length);
      }
    }, stryMutAct_9fa48("725") ? [] : (stryCov_9fa48("725"), [tasks]));
    const handleViewChange = useCallback((view: string, listId?: number) => {
      if (stryMutAct_9fa48("726")) {
        {}
      } else {
        stryCov_9fa48("726");
        setCurrentView(view);
        setCurrentListId(listId);
        setSearchQuery(stryMutAct_9fa48("727") ? "Stryker was here!" : (stryCov_9fa48("727"), ""));
        setCurrentFilterPreset(undefined);
      }
    }, stryMutAct_9fa48("728") ? ["Stryker was here"] : (stryCov_9fa48("728"), []));
    const handleSearch = useCallback((query: string) => {
      if (stryMutAct_9fa48("729")) {
        {}
      } else {
        stryCov_9fa48("729");
        setSearchQuery(query);
        if (stryMutAct_9fa48("731") ? false : stryMutAct_9fa48("730") ? true : (stryCov_9fa48("730", "731"), query)) {
          if (stryMutAct_9fa48("732")) {
            {}
          } else {
            stryCov_9fa48("732");
            setCurrentView(stryMutAct_9fa48("733") ? "" : (stryCov_9fa48("733"), "search"));
          }
        } else {
          if (stryMutAct_9fa48("734")) {
            {}
          } else {
            stryCov_9fa48("734");
            setCurrentView(stryMutAct_9fa48("735") ? "" : (stryCov_9fa48("735"), "today"));
          }
        }
      }
    }, stryMutAct_9fa48("736") ? ["Stryker was here"] : (stryCov_9fa48("736"), []));
    const handleFilterPresetChange = useCallback((preset?: FilterPreset) => {
      if (stryMutAct_9fa48("737")) {
        {}
      } else {
        stryCov_9fa48("737");
        setCurrentFilterPreset(preset);
        if (stryMutAct_9fa48("739") ? false : stryMutAct_9fa48("738") ? true : (stryCov_9fa48("738", "739"), preset)) {
          if (stryMutAct_9fa48("740")) {
            {}
          } else {
            stryCov_9fa48("740");
            setCurrentView(stryMutAct_9fa48("741") ? "" : (stryCov_9fa48("741"), "all"));
          }
        }
      }
    }, stryMutAct_9fa48("742") ? ["Stryker was here"] : (stryCov_9fa48("742"), []));
    const handleSort = useCallback((field: SortField) => {
      if (stryMutAct_9fa48("743")) {
        {}
      } else {
        stryCov_9fa48("743");
        setSortBy(field);
        // Toggle direction if clicking the same field, otherwise default to asc
        setSortDirection(stryMutAct_9fa48("744") ? () => undefined : (stryCov_9fa48("744"), prev => (stryMutAct_9fa48("747") ? prev !== "asc" : stryMutAct_9fa48("746") ? false : stryMutAct_9fa48("745") ? true : (stryCov_9fa48("745", "746", "747"), prev === (stryMutAct_9fa48("748") ? "" : (stryCov_9fa48("748"), "asc")))) ? stryMutAct_9fa48("749") ? "" : (stryCov_9fa48("749"), "desc") : stryMutAct_9fa48("750") ? "" : (stryCov_9fa48("750"), "asc")));
      }
    }, stryMutAct_9fa48("751") ? ["Stryker was here"] : (stryCov_9fa48("751"), []));
    const handleFilterList = useCallback((listId: number | undefined) => {
      if (stryMutAct_9fa48("752")) {
        {}
      } else {
        stryCov_9fa48("752");
        setFilterListId(listId);
      }
    }, stryMutAct_9fa48("753") ? ["Stryker was here"] : (stryCov_9fa48("753"), []));
    const handleFilterLabel = useCallback((labelId: number) => {
      if (stryMutAct_9fa48("754")) {
        {}
      } else {
        stryCov_9fa48("754");
        setFilterLabelIds(prev => {
          if (stryMutAct_9fa48("755")) {
            {}
          } else {
            stryCov_9fa48("755");
            const next = new Set(prev);
            if (stryMutAct_9fa48("757") ? false : stryMutAct_9fa48("756") ? true : (stryCov_9fa48("756", "757"), next.has(labelId))) {
              if (stryMutAct_9fa48("758")) {
                {}
              } else {
                stryCov_9fa48("758");
                next.delete(labelId);
              }
            } else {
              if (stryMutAct_9fa48("759")) {
                {}
              } else {
                stryCov_9fa48("759");
                next.add(labelId);
              }
            }
            return Array.from(next);
          }
        });
      }
    }, stryMutAct_9fa48("760") ? ["Stryker was here"] : (stryCov_9fa48("760"), []));
    const handleFilterPriority = useCallback((priority: Priority | undefined) => {
      if (stryMutAct_9fa48("761")) {
        {}
      } else {
        stryCov_9fa48("761");
        setFilterPriority(priority);
      }
    }, stryMutAct_9fa48("762") ? ["Stryker was here"] : (stryCov_9fa48("762"), []));
    const clearFilters = useCallback(() => {
      if (stryMutAct_9fa48("763")) {
        {}
      } else {
        stryCov_9fa48("763");
        setFilterListId(undefined);
        setFilterLabelIds(stryMutAct_9fa48("764") ? ["Stryker was here"] : (stryCov_9fa48("764"), []));
        setFilterPriority(undefined);
      }
    }, stryMutAct_9fa48("765") ? ["Stryker was here"] : (stryCov_9fa48("765"), []));
    return stryMutAct_9fa48("766") ? {} : (stryCov_9fa48("766"), {
      tasks,
      lists,
      labels,
      currentView,
      currentListId,
      searchQuery,
      currentFilterPreset,
      searchInputRef,
      visibleTasks,
      overdueCount,
      sortBy,
      sortDirection,
      filterListId,
      filterLabelIds,
      filterPriority,
      setTasks,
      setLists,
      setLabels,
      setCurrentView,
      setCurrentListId,
      setSearchQuery,
      setCurrentFilterPreset,
      handleViewChange,
      handleSearch,
      handleFilterPresetChange,
      handleSort,
      handleFilterList,
      handleFilterLabel,
      handleFilterPriority,
      clearFilters
    });
  }
}