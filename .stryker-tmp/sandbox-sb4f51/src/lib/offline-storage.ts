/**
 * Offline storage utilities for task management
 * Allows tasks to be created/modified while offline and synced later
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
import type { CreateTaskInput } from "../types";
const OFFLINE_TASKS_KEY = stryMutAct_9fa48("3694") ? "" : (stryCov_9fa48("3694"), "taskflow_offline_tasks");
const SYNC_STATUS_KEY = stryMutAct_9fa48("3695") ? "" : (stryCov_9fa48("3695"), "taskflow_sync_status");
export interface OfflineTask {
  id: string;
  action: "create" | "update" | "delete";
  data: CreateTaskInput | Partial<CreateTaskInput> | {
    id: number;
  };
  timestamp: number;
  synced: boolean;
  retryCount?: number;
}
export interface SyncStatus {
  lastSync: number | null;
  pendingCount: number;
  isSyncing: boolean;
  error?: string;
}

/**
 * Get the localStorage object (handles SSR)
 */
function getLocalStorage(): Storage | null {
  if (stryMutAct_9fa48("3696")) {
    {}
  } else {
    stryCov_9fa48("3696");
    if (stryMutAct_9fa48("3699") ? typeof window !== "undefined" : stryMutAct_9fa48("3698") ? false : stryMutAct_9fa48("3697") ? true : (stryCov_9fa48("3697", "3698", "3699"), typeof window === (stryMutAct_9fa48("3700") ? "" : (stryCov_9fa48("3700"), "undefined")))) return null;
    return window.localStorage;
  }
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  if (stryMutAct_9fa48("3701")) {
    {}
  } else {
    stryCov_9fa48("3701");
    const ls = getLocalStorage();
    if (stryMutAct_9fa48("3704") ? false : stryMutAct_9fa48("3703") ? true : stryMutAct_9fa48("3702") ? ls : (stryCov_9fa48("3702", "3703", "3704"), !ls)) {
      if (stryMutAct_9fa48("3705")) {
        {}
      } else {
        stryCov_9fa48("3705");
        return stryMutAct_9fa48("3706") ? {} : (stryCov_9fa48("3706"), {
          lastSync: null,
          pendingCount: 0,
          isSyncing: stryMutAct_9fa48("3707") ? true : (stryCov_9fa48("3707"), false)
        });
      }
    }
    const statusStr = ls.getItem(SYNC_STATUS_KEY);
    const pendingCount = getPendingOfflineTasks().length;
    if (stryMutAct_9fa48("3709") ? false : stryMutAct_9fa48("3708") ? true : (stryCov_9fa48("3708", "3709"), statusStr)) {
      if (stryMutAct_9fa48("3710")) {
        {}
      } else {
        stryCov_9fa48("3710");
        const status: SyncStatus = JSON.parse(statusStr);
        return stryMutAct_9fa48("3711") ? {} : (stryCov_9fa48("3711"), {
          ...status,
          pendingCount
        });
      }
    }
    return stryMutAct_9fa48("3712") ? {} : (stryCov_9fa48("3712"), {
      lastSync: null,
      pendingCount,
      isSyncing: stryMutAct_9fa48("3713") ? true : (stryCov_9fa48("3713"), false)
    });
  }
}

/**
 * Save a pending task operation for later sync
 */
export function saveOfflineTask(action: "create" | "update" | "delete", data: CreateTaskInput | Partial<CreateTaskInput> | {
  id: number;
}): void {
  if (stryMutAct_9fa48("3714")) {
    {}
  } else {
    stryCov_9fa48("3714");
    const ls = getLocalStorage();
    if (stryMutAct_9fa48("3717") ? false : stryMutAct_9fa48("3716") ? true : stryMutAct_9fa48("3715") ? ls : (stryCov_9fa48("3715", "3716", "3717"), !ls)) return;
    const offlineTasks: OfflineTask[] = JSON.parse(stryMutAct_9fa48("3720") ? ls.getItem(OFFLINE_TASKS_KEY) && "[]" : stryMutAct_9fa48("3719") ? false : stryMutAct_9fa48("3718") ? true : (stryCov_9fa48("3718", "3719", "3720"), ls.getItem(OFFLINE_TASKS_KEY) || (stryMutAct_9fa48("3721") ? "" : (stryCov_9fa48("3721"), "[]"))));
    const newTask: OfflineTask = stryMutAct_9fa48("3722") ? {} : (stryCov_9fa48("3722"), {
      id: stryMutAct_9fa48("3723") ? `` : (stryCov_9fa48("3723"), `${Date.now()}-${stryMutAct_9fa48("3724") ? Math.random().toString(36) : (stryCov_9fa48("3724"), Math.random().toString(36).substr(2, 9))}`),
      action,
      data,
      timestamp: Date.now(),
      synced: stryMutAct_9fa48("3725") ? true : (stryCov_9fa48("3725"), false),
      retryCount: 0
    });
    offlineTasks.push(newTask);
    ls.setItem(OFFLINE_TASKS_KEY, JSON.stringify(offlineTasks));
    updateSyncStatus(stryMutAct_9fa48("3726") ? false : (stryCov_9fa48("3726"), true));
  }
}

/**
 * Get all pending offline tasks
 */
export function getOfflineTasks(): OfflineTask[] {
  if (stryMutAct_9fa48("3727")) {
    {}
  } else {
    stryCov_9fa48("3727");
    const ls = getLocalStorage();
    if (stryMutAct_9fa48("3730") ? false : stryMutAct_9fa48("3729") ? true : stryMutAct_9fa48("3728") ? ls : (stryCov_9fa48("3728", "3729", "3730"), !ls)) return stryMutAct_9fa48("3731") ? ["Stryker was here"] : (stryCov_9fa48("3731"), []);
    return JSON.parse(stryMutAct_9fa48("3734") ? ls.getItem(OFFLINE_TASKS_KEY) && "[]" : stryMutAct_9fa48("3733") ? false : stryMutAct_9fa48("3732") ? true : (stryCov_9fa48("3732", "3733", "3734"), ls.getItem(OFFLINE_TASKS_KEY) || (stryMutAct_9fa48("3735") ? "" : (stryCov_9fa48("3735"), "[]"))));
  }
}

/**
 * Mark an offline task as synced
 */
export function markTaskAsSynced(taskId: string): void {
  if (stryMutAct_9fa48("3736")) {
    {}
  } else {
    stryCov_9fa48("3736");
    const ls = getLocalStorage();
    if (stryMutAct_9fa48("3739") ? false : stryMutAct_9fa48("3738") ? true : stryMutAct_9fa48("3737") ? ls : (stryCov_9fa48("3737", "3738", "3739"), !ls)) return;
    const offlineTasks: OfflineTask[] = JSON.parse(stryMutAct_9fa48("3742") ? ls.getItem(OFFLINE_TASKS_KEY) && "[]" : stryMutAct_9fa48("3741") ? false : stryMutAct_9fa48("3740") ? true : (stryCov_9fa48("3740", "3741", "3742"), ls.getItem(OFFLINE_TASKS_KEY) || (stryMutAct_9fa48("3743") ? "" : (stryCov_9fa48("3743"), "[]"))));
    const index = offlineTasks.findIndex(stryMutAct_9fa48("3744") ? () => undefined : (stryCov_9fa48("3744"), t => stryMutAct_9fa48("3747") ? t.id !== taskId : stryMutAct_9fa48("3746") ? false : stryMutAct_9fa48("3745") ? true : (stryCov_9fa48("3745", "3746", "3747"), t.id === taskId)));
    if (stryMutAct_9fa48("3750") ? index === -1 : stryMutAct_9fa48("3749") ? false : stryMutAct_9fa48("3748") ? true : (stryCov_9fa48("3748", "3749", "3750"), index !== (stryMutAct_9fa48("3751") ? +1 : (stryCov_9fa48("3751"), -1)))) {
      if (stryMutAct_9fa48("3752")) {
        {}
      } else {
        stryCov_9fa48("3752");
        offlineTasks[index].synced = stryMutAct_9fa48("3753") ? false : (stryCov_9fa48("3753"), true);
        ls.setItem(OFFLINE_TASKS_KEY, JSON.stringify(offlineTasks));
      }
    }
  }
}

/**
 * Remove a synced task from offline storage
 */
export function removeOfflineTask(taskId: string): void {
  if (stryMutAct_9fa48("3754")) {
    {}
  } else {
    stryCov_9fa48("3754");
    const ls = getLocalStorage();
    if (stryMutAct_9fa48("3757") ? false : stryMutAct_9fa48("3756") ? true : stryMutAct_9fa48("3755") ? ls : (stryCov_9fa48("3755", "3756", "3757"), !ls)) return;
    const offlineTasks: OfflineTask[] = JSON.parse(stryMutAct_9fa48("3760") ? ls.getItem(OFFLINE_TASKS_KEY) && "[]" : stryMutAct_9fa48("3759") ? false : stryMutAct_9fa48("3758") ? true : (stryCov_9fa48("3758", "3759", "3760"), ls.getItem(OFFLINE_TASKS_KEY) || (stryMutAct_9fa48("3761") ? "" : (stryCov_9fa48("3761"), "[]"))));
    const filtered = stryMutAct_9fa48("3762") ? offlineTasks : (stryCov_9fa48("3762"), offlineTasks.filter(stryMutAct_9fa48("3763") ? () => undefined : (stryCov_9fa48("3763"), t => stryMutAct_9fa48("3766") ? t.id === taskId : stryMutAct_9fa48("3765") ? false : stryMutAct_9fa48("3764") ? true : (stryCov_9fa48("3764", "3765", "3766"), t.id !== taskId))));
    ls.setItem(OFFLINE_TASKS_KEY, JSON.stringify(filtered));
  }
}

/**
 * Increment retry count for a failed task
 */
function retryOfflineTask(taskId: string): void {
  if (stryMutAct_9fa48("3767")) {
    {}
  } else {
    stryCov_9fa48("3767");
    const ls = getLocalStorage();
    if (stryMutAct_9fa48("3770") ? false : stryMutAct_9fa48("3769") ? true : stryMutAct_9fa48("3768") ? ls : (stryCov_9fa48("3768", "3769", "3770"), !ls)) return;
    const offlineTasks: OfflineTask[] = JSON.parse(stryMutAct_9fa48("3773") ? ls.getItem(OFFLINE_TASKS_KEY) && "[]" : stryMutAct_9fa48("3772") ? false : stryMutAct_9fa48("3771") ? true : (stryCov_9fa48("3771", "3772", "3773"), ls.getItem(OFFLINE_TASKS_KEY) || (stryMutAct_9fa48("3774") ? "" : (stryCov_9fa48("3774"), "[]"))));
    const index = offlineTasks.findIndex(stryMutAct_9fa48("3775") ? () => undefined : (stryCov_9fa48("3775"), t => stryMutAct_9fa48("3778") ? t.id !== taskId : stryMutAct_9fa48("3777") ? false : stryMutAct_9fa48("3776") ? true : (stryCov_9fa48("3776", "3777", "3778"), t.id === taskId)));
    if (stryMutAct_9fa48("3781") ? index === -1 : stryMutAct_9fa48("3780") ? false : stryMutAct_9fa48("3779") ? true : (stryCov_9fa48("3779", "3780", "3781"), index !== (stryMutAct_9fa48("3782") ? +1 : (stryCov_9fa48("3782"), -1)))) {
      if (stryMutAct_9fa48("3783")) {
        {}
      } else {
        stryCov_9fa48("3783");
        offlineTasks[index].retryCount = stryMutAct_9fa48("3784") ? (offlineTasks[index].retryCount || 0) - 1 : (stryCov_9fa48("3784"), (stryMutAct_9fa48("3787") ? offlineTasks[index].retryCount && 0 : stryMutAct_9fa48("3786") ? false : stryMutAct_9fa48("3785") ? true : (stryCov_9fa48("3785", "3786", "3787"), offlineTasks[index].retryCount || 0)) + 1);
        ls.setItem(OFFLINE_TASKS_KEY, JSON.stringify(offlineTasks));
      }
    }
  }
}

/**
 * Get pending (unsynced) tasks
 */
export function getPendingOfflineTasks(): OfflineTask[] {
  if (stryMutAct_9fa48("3788")) {
    {}
  } else {
    stryCov_9fa48("3788");
    const offlineTasks = getOfflineTasks();
    return stryMutAct_9fa48("3789") ? offlineTasks : (stryCov_9fa48("3789"), offlineTasks.filter(stryMutAct_9fa48("3790") ? () => undefined : (stryCov_9fa48("3790"), t => stryMutAct_9fa48("3791") ? t.synced : (stryCov_9fa48("3791"), !t.synced))));
  }
}

/**
 * Clear all synced tasks from offline storage
 */
export function clearSyncedTasks(): void {
  if (stryMutAct_9fa48("3792")) {
    {}
  } else {
    stryCov_9fa48("3792");
    const ls = getLocalStorage();
    if (stryMutAct_9fa48("3795") ? false : stryMutAct_9fa48("3794") ? true : stryMutAct_9fa48("3793") ? ls : (stryCov_9fa48("3793", "3794", "3795"), !ls)) return;
    const offlineTasks: OfflineTask[] = JSON.parse(stryMutAct_9fa48("3798") ? ls.getItem(OFFLINE_TASKS_KEY) && "[]" : stryMutAct_9fa48("3797") ? false : stryMutAct_9fa48("3796") ? true : (stryCov_9fa48("3796", "3797", "3798"), ls.getItem(OFFLINE_TASKS_KEY) || (stryMutAct_9fa48("3799") ? "" : (stryCov_9fa48("3799"), "[]"))));
    const filtered = stryMutAct_9fa48("3800") ? offlineTasks : (stryCov_9fa48("3800"), offlineTasks.filter(stryMutAct_9fa48("3801") ? () => undefined : (stryCov_9fa48("3801"), t => stryMutAct_9fa48("3802") ? t.synced : (stryCov_9fa48("3802"), !t.synced))));
    ls.setItem(OFFLINE_TASKS_KEY, JSON.stringify(filtered));
  }
}

/**
 * Sync pending offline tasks with the server
 */
export async function syncOfflineTasks(): Promise<{
  success: number;
  failed: number;
}> {
  if (stryMutAct_9fa48("3803")) {
    {}
  } else {
    stryCov_9fa48("3803");
    const pendingTasks = getPendingOfflineTasks();
    let success = 0;
    let failed = 0;
    updateSyncStatus(stryMutAct_9fa48("3804") ? false : (stryCov_9fa48("3804"), true));
    for (const task of pendingTasks) {
      if (stryMutAct_9fa48("3805")) {
        {}
      } else {
        stryCov_9fa48("3805");
        try {
          if (stryMutAct_9fa48("3806")) {
            {}
          } else {
            stryCov_9fa48("3806");
            if (stryMutAct_9fa48("3809") ? task.action !== "create" : stryMutAct_9fa48("3808") ? false : stryMutAct_9fa48("3807") ? true : (stryCov_9fa48("3807", "3808", "3809"), task.action === (stryMutAct_9fa48("3810") ? "" : (stryCov_9fa48("3810"), "create")))) {
              if (stryMutAct_9fa48("3811")) {
                {}
              } else {
                stryCov_9fa48("3811");
                const response = await fetch(stryMutAct_9fa48("3812") ? "" : (stryCov_9fa48("3812"), "/api/tasks"), stryMutAct_9fa48("3813") ? {} : (stryCov_9fa48("3813"), {
                  method: stryMutAct_9fa48("3814") ? "" : (stryCov_9fa48("3814"), "POST"),
                  headers: stryMutAct_9fa48("3815") ? {} : (stryCov_9fa48("3815"), {
                    "Content-Type": stryMutAct_9fa48("3816") ? "" : (stryCov_9fa48("3816"), "application/json")
                  }),
                  body: JSON.stringify(task.data)
                }));
                if (stryMutAct_9fa48("3818") ? false : stryMutAct_9fa48("3817") ? true : (stryCov_9fa48("3817", "3818"), response.ok)) {
                  if (stryMutAct_9fa48("3819")) {
                    {}
                  } else {
                    stryCov_9fa48("3819");
                    markTaskAsSynced(task.id);
                    stryMutAct_9fa48("3820") ? success-- : (stryCov_9fa48("3820"), success++);
                  }
                } else {
                  if (stryMutAct_9fa48("3821")) {
                    {}
                  } else {
                    stryCov_9fa48("3821");
                    stryMutAct_9fa48("3822") ? failed-- : (stryCov_9fa48("3822"), failed++);
                    if (stryMutAct_9fa48("3826") ? (task.retryCount || 0) >= 3 : stryMutAct_9fa48("3825") ? (task.retryCount || 0) <= 3 : stryMutAct_9fa48("3824") ? false : stryMutAct_9fa48("3823") ? true : (stryCov_9fa48("3823", "3824", "3825", "3826"), (stryMutAct_9fa48("3829") ? task.retryCount && 0 : stryMutAct_9fa48("3828") ? false : stryMutAct_9fa48("3827") ? true : (stryCov_9fa48("3827", "3828", "3829"), task.retryCount || 0)) < 3)) {
                      if (stryMutAct_9fa48("3830")) {
                        {}
                      } else {
                        stryCov_9fa48("3830");
                        retryOfflineTask(task.id);
                      }
                    }
                  }
                }
              }
            } else if (stryMutAct_9fa48("3833") ? task.action !== "update" : stryMutAct_9fa48("3832") ? false : stryMutAct_9fa48("3831") ? true : (stryCov_9fa48("3831", "3832", "3833"), task.action === (stryMutAct_9fa48("3834") ? "" : (stryCov_9fa48("3834"), "update")))) {
              if (stryMutAct_9fa48("3835")) {
                {}
              } else {
                stryCov_9fa48("3835");
                const {
                  id,
                  ...updates
                } = task.data as {
                  id: number;
                };
                const response = await fetch(stryMutAct_9fa48("3836") ? `` : (stryCov_9fa48("3836"), `/api/tasks/${id}`), stryMutAct_9fa48("3837") ? {} : (stryCov_9fa48("3837"), {
                  method: stryMutAct_9fa48("3838") ? "" : (stryCov_9fa48("3838"), "PATCH"),
                  headers: stryMutAct_9fa48("3839") ? {} : (stryCov_9fa48("3839"), {
                    "Content-Type": stryMutAct_9fa48("3840") ? "" : (stryCov_9fa48("3840"), "application/json")
                  }),
                  body: JSON.stringify(updates)
                }));
                if (stryMutAct_9fa48("3842") ? false : stryMutAct_9fa48("3841") ? true : (stryCov_9fa48("3841", "3842"), response.ok)) {
                  if (stryMutAct_9fa48("3843")) {
                    {}
                  } else {
                    stryCov_9fa48("3843");
                    markTaskAsSynced(task.id);
                    stryMutAct_9fa48("3844") ? success-- : (stryCov_9fa48("3844"), success++);
                  }
                } else {
                  if (stryMutAct_9fa48("3845")) {
                    {}
                  } else {
                    stryCov_9fa48("3845");
                    stryMutAct_9fa48("3846") ? failed-- : (stryCov_9fa48("3846"), failed++);
                    if (stryMutAct_9fa48("3850") ? (task.retryCount || 0) >= 3 : stryMutAct_9fa48("3849") ? (task.retryCount || 0) <= 3 : stryMutAct_9fa48("3848") ? false : stryMutAct_9fa48("3847") ? true : (stryCov_9fa48("3847", "3848", "3849", "3850"), (stryMutAct_9fa48("3853") ? task.retryCount && 0 : stryMutAct_9fa48("3852") ? false : stryMutAct_9fa48("3851") ? true : (stryCov_9fa48("3851", "3852", "3853"), task.retryCount || 0)) < 3)) {
                      if (stryMutAct_9fa48("3854")) {
                        {}
                      } else {
                        stryCov_9fa48("3854");
                        retryOfflineTask(task.id);
                      }
                    }
                  }
                }
              }
            } else if (stryMutAct_9fa48("3857") ? task.action !== "delete" : stryMutAct_9fa48("3856") ? false : stryMutAct_9fa48("3855") ? true : (stryCov_9fa48("3855", "3856", "3857"), task.action === (stryMutAct_9fa48("3858") ? "" : (stryCov_9fa48("3858"), "delete")))) {
              if (stryMutAct_9fa48("3859")) {
                {}
              } else {
                stryCov_9fa48("3859");
                const {
                  id
                } = task.data as {
                  id: number;
                };
                const response = await fetch(stryMutAct_9fa48("3860") ? `` : (stryCov_9fa48("3860"), `/api/tasks/${id}`), stryMutAct_9fa48("3861") ? {} : (stryCov_9fa48("3861"), {
                  method: stryMutAct_9fa48("3862") ? "" : (stryCov_9fa48("3862"), "DELETE")
                }));
                if (stryMutAct_9fa48("3864") ? false : stryMutAct_9fa48("3863") ? true : (stryCov_9fa48("3863", "3864"), response.ok)) {
                  if (stryMutAct_9fa48("3865")) {
                    {}
                  } else {
                    stryCov_9fa48("3865");
                    markTaskAsSynced(task.id);
                    stryMutAct_9fa48("3866") ? success-- : (stryCov_9fa48("3866"), success++);
                  }
                } else {
                  if (stryMutAct_9fa48("3867")) {
                    {}
                  } else {
                    stryCov_9fa48("3867");
                    stryMutAct_9fa48("3868") ? failed-- : (stryCov_9fa48("3868"), failed++);
                    if (stryMutAct_9fa48("3872") ? (task.retryCount || 0) >= 3 : stryMutAct_9fa48("3871") ? (task.retryCount || 0) <= 3 : stryMutAct_9fa48("3870") ? false : stryMutAct_9fa48("3869") ? true : (stryCov_9fa48("3869", "3870", "3871", "3872"), (stryMutAct_9fa48("3875") ? task.retryCount && 0 : stryMutAct_9fa48("3874") ? false : stryMutAct_9fa48("3873") ? true : (stryCov_9fa48("3873", "3874", "3875"), task.retryCount || 0)) < 3)) {
                      if (stryMutAct_9fa48("3876")) {
                        {}
                      } else {
                        stryCov_9fa48("3876");
                        retryOfflineTask(task.id);
                      }
                    }
                  }
                }
              }
            }
          }
        } catch {
          if (stryMutAct_9fa48("3877")) {
            {}
          } else {
            stryCov_9fa48("3877");
            stryMutAct_9fa48("3878") ? failed-- : (stryCov_9fa48("3878"), failed++);
            if (stryMutAct_9fa48("3882") ? (task.retryCount || 0) >= 3 : stryMutAct_9fa48("3881") ? (task.retryCount || 0) <= 3 : stryMutAct_9fa48("3880") ? false : stryMutAct_9fa48("3879") ? true : (stryCov_9fa48("3879", "3880", "3881", "3882"), (stryMutAct_9fa48("3885") ? task.retryCount && 0 : stryMutAct_9fa48("3884") ? false : stryMutAct_9fa48("3883") ? true : (stryCov_9fa48("3883", "3884", "3885"), task.retryCount || 0)) < 3)) {
              if (stryMutAct_9fa48("3886")) {
                {}
              } else {
                stryCov_9fa48("3886");
                retryOfflineTask(task.id);
              }
            }
          }
        }
      }
    }
    updateSyncStatus(stryMutAct_9fa48("3887") ? true : (stryCov_9fa48("3887"), false));
    return stryMutAct_9fa48("3888") ? {} : (stryCov_9fa48("3888"), {
      success,
      failed
    });
  }
}

/**
 * Update sync status
 */
function updateSyncStatus(isSyncing: boolean, error?: string): void {
  if (stryMutAct_9fa48("3889")) {
    {}
  } else {
    stryCov_9fa48("3889");
    const ls = getLocalStorage();
    if (stryMutAct_9fa48("3892") ? false : stryMutAct_9fa48("3891") ? true : stryMutAct_9fa48("3890") ? ls : (stryCov_9fa48("3890", "3891", "3892"), !ls)) return;
    const status: SyncStatus = stryMutAct_9fa48("3893") ? {} : (stryCov_9fa48("3893"), {
      lastSync: error ? null : Date.now(),
      pendingCount: getPendingOfflineTasks().length,
      isSyncing,
      error
    });
    ls.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
  }
}

/**
 * Check if there are pending offline tasks
 */
export function hasPendingOfflineTasks(): boolean {
  if (stryMutAct_9fa48("3894")) {
    {}
  } else {
    stryCov_9fa48("3894");
    return stryMutAct_9fa48("3898") ? getPendingOfflineTasks().length <= 0 : stryMutAct_9fa48("3897") ? getPendingOfflineTasks().length >= 0 : stryMutAct_9fa48("3896") ? false : stryMutAct_9fa48("3895") ? true : (stryCov_9fa48("3895", "3896", "3897", "3898"), getPendingOfflineTasks().length > 0);
  }
}

/**
 * Offline conflict resolution strategies
 */
export type ConflictResolution = "server-wins" | "client-wins" | "merge" | "prompt";

/**
 * Resolve conflicts when syncing offline changes
 */
export async function resolveConflicts(serverTask: Record<string, unknown>, offlineTask: OfflineTask, resolution: ConflictResolution = stryMutAct_9fa48("3899") ? "" : (stryCov_9fa48("3899"), "server-wins")): Promise<Record<string, unknown>> {
  if (stryMutAct_9fa48("3900")) {
    {}
  } else {
    stryCov_9fa48("3900");
    switch (resolution) {
      case stryMutAct_9fa48("3902") ? "" : (stryCov_9fa48("3902"), "server-wins"):
        if (stryMutAct_9fa48("3901")) {} else {
          stryCov_9fa48("3901");
          return serverTask;
        }
      case stryMutAct_9fa48("3904") ? "" : (stryCov_9fa48("3904"), "client-wins"):
        if (stryMutAct_9fa48("3903")) {} else {
          stryCov_9fa48("3903");
          return stryMutAct_9fa48("3905") ? {} : (stryCov_9fa48("3905"), {
            ...serverTask,
            ...offlineTask.data
          });
        }
      case stryMutAct_9fa48("3907") ? "" : (stryCov_9fa48("3907"), "merge"):
        if (stryMutAct_9fa48("3906")) {} else {
          stryCov_9fa48("3906");
          {
            if (stryMutAct_9fa48("3908")) {
              {}
            } else {
              stryCov_9fa48("3908");
              // Merge strategy: prefer offline changes for non-conflicting fields
              const merged = stryMutAct_9fa48("3909") ? {} : (stryCov_9fa48("3909"), {
                ...serverTask
              });
              if (stryMutAct_9fa48("3912") ? typeof offlineTask.data === "object" || offlineTask.data !== null : stryMutAct_9fa48("3911") ? false : stryMutAct_9fa48("3910") ? true : (stryCov_9fa48("3910", "3911", "3912"), (stryMutAct_9fa48("3914") ? typeof offlineTask.data !== "object" : stryMutAct_9fa48("3913") ? true : (stryCov_9fa48("3913", "3914"), typeof offlineTask.data === (stryMutAct_9fa48("3915") ? "" : (stryCov_9fa48("3915"), "object")))) && (stryMutAct_9fa48("3917") ? offlineTask.data === null : stryMutAct_9fa48("3916") ? true : (stryCov_9fa48("3916", "3917"), offlineTask.data !== null)))) {
                if (stryMutAct_9fa48("3918")) {
                  {}
                } else {
                  stryCov_9fa48("3918");
                  for (const [key, value] of Object.entries(offlineTask.data)) {
                    if (stryMutAct_9fa48("3919")) {
                      {}
                    } else {
                      stryCov_9fa48("3919");
                      if (stryMutAct_9fa48("3922") ? key !== "id" || value !== undefined : stryMutAct_9fa48("3921") ? false : stryMutAct_9fa48("3920") ? true : (stryCov_9fa48("3920", "3921", "3922"), (stryMutAct_9fa48("3924") ? key === "id" : stryMutAct_9fa48("3923") ? true : (stryCov_9fa48("3923", "3924"), key !== (stryMutAct_9fa48("3925") ? "" : (stryCov_9fa48("3925"), "id")))) && (stryMutAct_9fa48("3927") ? value === undefined : stryMutAct_9fa48("3926") ? true : (stryCov_9fa48("3926", "3927"), value !== undefined)))) {
                        if (stryMutAct_9fa48("3928")) {
                          {}
                        } else {
                          stryCov_9fa48("3928");
                          merged[key] = value;
                        }
                      }
                    }
                  }
                }
              }
              return merged;
            }
          }
        }
      case stryMutAct_9fa48("3930") ? "" : (stryCov_9fa48("3930"), "prompt"):
        if (stryMutAct_9fa48("3929")) {} else {
          stryCov_9fa48("3929");
          // In a real implementation, this would trigger a UI prompt
          // For now, default to merge
          return stryMutAct_9fa48("3931") ? {} : (stryCov_9fa48("3931"), {
            ...serverTask,
            ...offlineTask.data
          });
        }
      default:
        if (stryMutAct_9fa48("3932")) {} else {
          stryCov_9fa48("3932");
          return serverTask;
        }
    }
  }
}

/**
 * Clear all offline tasks (use with caution)
 */
export function clearAllOfflineTasks(): void {
  if (stryMutAct_9fa48("3933")) {
    {}
  } else {
    stryCov_9fa48("3933");
    const ls = getLocalStorage();
    if (stryMutAct_9fa48("3936") ? false : stryMutAct_9fa48("3935") ? true : stryMutAct_9fa48("3934") ? ls : (stryCov_9fa48("3934", "3935", "3936"), !ls)) return;
    ls.removeItem(OFFLINE_TASKS_KEY);
    ls.removeItem(SYNC_STATUS_KEY);
  }
}

/**
 * Get offline task count by action type
 */
export function getOfflineTaskCounts(): {
  create: number;
  update: number;
  delete: number;
} {
  if (stryMutAct_9fa48("3937")) {
    {}
  } else {
    stryCov_9fa48("3937");
    const pending = getPendingOfflineTasks();
    return pending.reduce((acc, task) => {
      if (stryMutAct_9fa48("3938")) {
        {}
      } else {
        stryCov_9fa48("3938");
        acc[task.action] = stryMutAct_9fa48("3939") ? (acc[task.action] || 0) - 1 : (stryCov_9fa48("3939"), (stryMutAct_9fa48("3942") ? acc[task.action] && 0 : stryMutAct_9fa48("3941") ? false : stryMutAct_9fa48("3940") ? true : (stryCov_9fa48("3940", "3941", "3942"), acc[task.action] || 0)) + 1);
        return acc;
      }
    }, stryMutAct_9fa48("3943") ? {} : (stryCov_9fa48("3943"), {
      create: 0,
      update: 0,
      delete: 0
    }));
  }
}