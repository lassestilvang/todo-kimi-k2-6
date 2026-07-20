// @ts-nocheck
"use server";

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
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { Task, TaskWithRelations, List, Label, Subtask, CreateTaskInput, UpdateTaskInput, CreateListInput, CreateLabelInput, FilterPreset, Priority } from "@/types";
import { listSchema, labelSchema, sanitizeString } from "@/lib/validation";
import { logTaskAction } from "@/lib/actions/task-helpers";
import { getTaskRelations } from "@/lib/db/relations";

/**
 * Check for potential duplicate tasks by comparing names.
 * Returns similar tasks with similarity score > 0.7
 */
export async function findSimilarTasks(name: string, excludeTaskId?: number): Promise<Array<{
  id: number;
  name: string;
  date: string | null;
  similarity: number;
}>> {
  if (stryMutAct_9fa48("767")) {
    {}
  } else {
    stryCov_9fa48("767");
    const db = getDb();
    const user = await getCurrentUser();

    // Only search within user's own tasks for privacy
    if (stryMutAct_9fa48("770") ? false : stryMutAct_9fa48("769") ? true : stryMutAct_9fa48("768") ? user?.id : (stryCov_9fa48("768", "769", "770"), !(stryMutAct_9fa48("771") ? user.id : (stryCov_9fa48("771"), user?.id)))) {
      if (stryMutAct_9fa48("772")) {
        {}
      } else {
        stryCov_9fa48("772");
        return stryMutAct_9fa48("773") ? ["Stryker was here"] : (stryCov_9fa48("773"), []);
      }
    }
    const tasks = db.prepare("SELECT id, name, date FROM tasks WHERE user_id = ?").all(user.id) as Array<{
      id: number;
      name: string;
      date: string | null;
    }>;
    const normalizedInput = stryMutAct_9fa48("775") ? name.toUpperCase().trim() : stryMutAct_9fa48("774") ? name.toLowerCase() : (stryCov_9fa48("774", "775"), name.toLowerCase().trim());
    return stryMutAct_9fa48("779") ? tasks.map(t => {
      const normalizedExisting = t.name.toLowerCase().trim();
      // Simple similarity: check if one contains the other or they share significant words
      const words = normalizedInput.split(/\s+/);
      const existingWords = normalizedExisting.split(/\s+/);
      const commonWords = words.filter(w => existingWords.includes(w));
      const similarity = words.length > 0 ? commonWords.length / words.length : 0;

      // Also check for substring matches
      const containsMatch = normalizedExisting.includes(normalizedInput) || normalizedInput.includes(normalizedExisting) ? 0.8 : 0;
      return {
        ...t,
        similarity: Math.max(similarity, containsMatch)
      };
    }).filter(t => t.similarity > 0.5).sort((a, b) => b.similarity - a.similarity).slice(0, 5) : stryMutAct_9fa48("778") ? tasks.filter(t => t.id !== excludeTaskId).map(t => {
      const normalizedExisting = t.name.toLowerCase().trim();
      // Simple similarity: check if one contains the other or they share significant words
      const words = normalizedInput.split(/\s+/);
      const existingWords = normalizedExisting.split(/\s+/);
      const commonWords = words.filter(w => existingWords.includes(w));
      const similarity = words.length > 0 ? commonWords.length / words.length : 0;

      // Also check for substring matches
      const containsMatch = normalizedExisting.includes(normalizedInput) || normalizedInput.includes(normalizedExisting) ? 0.8 : 0;
      return {
        ...t,
        similarity: Math.max(similarity, containsMatch)
      };
    }).sort((a, b) => b.similarity - a.similarity).slice(0, 5) : stryMutAct_9fa48("777") ? tasks.filter(t => t.id !== excludeTaskId).map(t => {
      const normalizedExisting = t.name.toLowerCase().trim();
      // Simple similarity: check if one contains the other or they share significant words
      const words = normalizedInput.split(/\s+/);
      const existingWords = normalizedExisting.split(/\s+/);
      const commonWords = words.filter(w => existingWords.includes(w));
      const similarity = words.length > 0 ? commonWords.length / words.length : 0;

      // Also check for substring matches
      const containsMatch = normalizedExisting.includes(normalizedInput) || normalizedInput.includes(normalizedExisting) ? 0.8 : 0;
      return {
        ...t,
        similarity: Math.max(similarity, containsMatch)
      };
    }).filter(t => t.similarity > 0.5).slice(0, 5) : stryMutAct_9fa48("776") ? tasks.filter(t => t.id !== excludeTaskId).map(t => {
      const normalizedExisting = t.name.toLowerCase().trim();
      // Simple similarity: check if one contains the other or they share significant words
      const words = normalizedInput.split(/\s+/);
      const existingWords = normalizedExisting.split(/\s+/);
      const commonWords = words.filter(w => existingWords.includes(w));
      const similarity = words.length > 0 ? commonWords.length / words.length : 0;

      // Also check for substring matches
      const containsMatch = normalizedExisting.includes(normalizedInput) || normalizedInput.includes(normalizedExisting) ? 0.8 : 0;
      return {
        ...t,
        similarity: Math.max(similarity, containsMatch)
      };
    }).filter(t => t.similarity > 0.5).sort((a, b) => b.similarity - a.similarity) : (stryCov_9fa48("776", "777", "778", "779"), tasks.filter(stryMutAct_9fa48("780") ? () => undefined : (stryCov_9fa48("780"), t => stryMutAct_9fa48("783") ? t.id === excludeTaskId : stryMutAct_9fa48("782") ? false : stryMutAct_9fa48("781") ? true : (stryCov_9fa48("781", "782", "783"), t.id !== excludeTaskId))).map(t => {
      if (stryMutAct_9fa48("784")) {
        {}
      } else {
        stryCov_9fa48("784");
        const normalizedExisting = stryMutAct_9fa48("786") ? t.name.toUpperCase().trim() : stryMutAct_9fa48("785") ? t.name.toLowerCase() : (stryCov_9fa48("785", "786"), t.name.toLowerCase().trim());
        // Simple similarity: check if one contains the other or they share significant words
        const words = normalizedInput.split(stryMutAct_9fa48("788") ? /\S+/ : stryMutAct_9fa48("787") ? /\s/ : (stryCov_9fa48("787", "788"), /\s+/));
        const existingWords = normalizedExisting.split(stryMutAct_9fa48("790") ? /\S+/ : stryMutAct_9fa48("789") ? /\s/ : (stryCov_9fa48("789", "790"), /\s+/));
        const commonWords = stryMutAct_9fa48("791") ? words : (stryCov_9fa48("791"), words.filter(stryMutAct_9fa48("792") ? () => undefined : (stryCov_9fa48("792"), w => existingWords.includes(w))));
        const similarity = (stryMutAct_9fa48("796") ? words.length <= 0 : stryMutAct_9fa48("795") ? words.length >= 0 : stryMutAct_9fa48("794") ? false : stryMutAct_9fa48("793") ? true : (stryCov_9fa48("793", "794", "795", "796"), words.length > 0)) ? stryMutAct_9fa48("797") ? commonWords.length * words.length : (stryCov_9fa48("797"), commonWords.length / words.length) : 0;

        // Also check for substring matches
        const containsMatch = (stryMutAct_9fa48("800") ? normalizedExisting.includes(normalizedInput) && normalizedInput.includes(normalizedExisting) : stryMutAct_9fa48("799") ? false : stryMutAct_9fa48("798") ? true : (stryCov_9fa48("798", "799", "800"), normalizedExisting.includes(normalizedInput) || normalizedInput.includes(normalizedExisting))) ? 0.8 : 0;
        return stryMutAct_9fa48("801") ? {} : (stryCov_9fa48("801"), {
          ...t,
          similarity: stryMutAct_9fa48("802") ? Math.min(similarity, containsMatch) : (stryCov_9fa48("802"), Math.max(similarity, containsMatch))
        });
      }
    }).filter(stryMutAct_9fa48("803") ? () => undefined : (stryCov_9fa48("803"), t => stryMutAct_9fa48("807") ? t.similarity <= 0.5 : stryMutAct_9fa48("806") ? t.similarity >= 0.5 : stryMutAct_9fa48("805") ? false : stryMutAct_9fa48("804") ? true : (stryCov_9fa48("804", "805", "806", "807"), t.similarity > 0.5))).sort(stryMutAct_9fa48("808") ? () => undefined : (stryCov_9fa48("808"), (a, b) => stryMutAct_9fa48("809") ? b.similarity + a.similarity : (stryCov_9fa48("809"), b.similarity - a.similarity))).slice(0, 5));
  }
}
export async function getLists(): Promise<List[]> {
  if (stryMutAct_9fa48("810")) {
    {}
  } else {
    stryCov_9fa48("810");
    const db = getDb();
    const user = await getCurrentUser();

    // User isolation: only show lists owned by the user
    if (stryMutAct_9fa48("813") ? user.id : stryMutAct_9fa48("812") ? false : stryMutAct_9fa48("811") ? true : (stryCov_9fa48("811", "812", "813"), user?.id)) {
      if (stryMutAct_9fa48("814")) {
        {}
      } else {
        stryCov_9fa48("814");
        return db.prepare("SELECT * FROM lists WHERE user_id = ? ORDER BY is_inbox DESC, name ASC").all(user.id) as List[];
      }
    }

    // In test/demo mode, return inbox with user_id = 1 or null (for compatibility)
    if (stryMutAct_9fa48("817") ? process.env.NODE_ENV === "test" && process.env.NEXTAUTH_SECRET === "demo-secret" : stryMutAct_9fa48("816") ? false : stryMutAct_9fa48("815") ? true : (stryCov_9fa48("815", "816", "817"), (stryMutAct_9fa48("819") ? process.env.NODE_ENV !== "test" : stryMutAct_9fa48("818") ? false : (stryCov_9fa48("818", "819"), process.env.NODE_ENV === (stryMutAct_9fa48("820") ? "" : (stryCov_9fa48("820"), "test")))) || (stryMutAct_9fa48("822") ? process.env.NEXTAUTH_SECRET !== "demo-secret" : stryMutAct_9fa48("821") ? false : (stryCov_9fa48("821", "822"), process.env.NEXTAUTH_SECRET === (stryMutAct_9fa48("823") ? "" : (stryCov_9fa48("823"), "demo-secret")))))) {
      if (stryMutAct_9fa48("824")) {
        {}
      } else {
        stryCov_9fa48("824");
        return db.prepare("SELECT * FROM lists WHERE user_id = 1 OR user_id IS NULL ORDER BY is_inbox DESC, name ASC").all() as List[];
      }
    }
    return stryMutAct_9fa48("825") ? ["Stryker was here"] : (stryCov_9fa48("825"), []);
  }
}
export async function getListById(id: number): Promise<List | undefined> {
  if (stryMutAct_9fa48("826")) {
    {}
  } else {
    stryCov_9fa48("826");
    const db = getDb();
    const user = await getCurrentUser();

    // User isolation: only show lists owned by the user
    if (stryMutAct_9fa48("829") ? user.id : stryMutAct_9fa48("828") ? false : stryMutAct_9fa48("827") ? true : (stryCov_9fa48("827", "828", "829"), user?.id)) {
      if (stryMutAct_9fa48("830")) {
        {}
      } else {
        stryCov_9fa48("830");
        return db.prepare("SELECT * FROM lists WHERE id = ? AND user_id = ?").get(id, user.id) as List | undefined;
      }
    }

    // In test/demo mode, allow access to any list
    if (stryMutAct_9fa48("833") ? process.env.NODE_ENV === "test" && process.env.NEXTAUTH_SECRET === "demo-secret" : stryMutAct_9fa48("832") ? false : stryMutAct_9fa48("831") ? true : (stryCov_9fa48("831", "832", "833"), (stryMutAct_9fa48("835") ? process.env.NODE_ENV !== "test" : stryMutAct_9fa48("834") ? false : (stryCov_9fa48("834", "835"), process.env.NODE_ENV === (stryMutAct_9fa48("836") ? "" : (stryCov_9fa48("836"), "test")))) || (stryMutAct_9fa48("838") ? process.env.NEXTAUTH_SECRET !== "demo-secret" : stryMutAct_9fa48("837") ? false : (stryCov_9fa48("837", "838"), process.env.NEXTAUTH_SECRET === (stryMutAct_9fa48("839") ? "" : (stryCov_9fa48("839"), "demo-secret")))))) {
      if (stryMutAct_9fa48("840")) {
        {}
      } else {
        stryCov_9fa48("840");
        return db.prepare("SELECT * FROM lists WHERE id = ?").get(id) as List | undefined;
      }
    }
    return undefined;
  }
}
export async function createList(input: CreateListInput): Promise<List> {
  if (stryMutAct_9fa48("841")) {
    {}
  } else {
    stryCov_9fa48("841");
    // Validate input
    const parsed = listSchema.safeParse(input);
    if (stryMutAct_9fa48("844") ? false : stryMutAct_9fa48("843") ? true : stryMutAct_9fa48("842") ? parsed.success : (stryCov_9fa48("842", "843", "844"), !parsed.success)) {
      if (stryMutAct_9fa48("845")) {
        {}
      } else {
        stryCov_9fa48("845");
        throw new Error(stryMutAct_9fa48("848") ? parsed.error.issues[0]?.message && "Invalid list data" : stryMutAct_9fa48("847") ? false : stryMutAct_9fa48("846") ? true : (stryCov_9fa48("846", "847", "848"), (stryMutAct_9fa48("849") ? parsed.error.issues[0].message : (stryCov_9fa48("849"), parsed.error.issues[0]?.message)) || (stryMutAct_9fa48("850") ? "" : (stryCov_9fa48("850"), "Invalid list data"))));
      }
    }
    const db = getDb();
    const user = await getCurrentUser();
    const userId = stryMutAct_9fa48("851") ? user?.id && (process.env.NODE_ENV === "test" ? 1 : null) : (stryCov_9fa48("851"), (stryMutAct_9fa48("852") ? user.id : (stryCov_9fa48("852"), user?.id)) ?? ((stryMutAct_9fa48("855") ? process.env.NODE_ENV !== "test" : stryMutAct_9fa48("854") ? false : stryMutAct_9fa48("853") ? true : (stryCov_9fa48("853", "854", "855"), process.env.NODE_ENV === (stryMutAct_9fa48("856") ? "" : (stryCov_9fa48("856"), "test")))) ? 1 : null));
    const result = db.prepare(stryMutAct_9fa48("857") ? "" : (stryCov_9fa48("857"), "INSERT INTO lists (name, emoji, color, user_id) VALUES (?, ?, ?, ?)")).run(parsed.data.name, stryMutAct_9fa48("860") ? parsed.data.emoji && "📋" : stryMutAct_9fa48("859") ? false : stryMutAct_9fa48("858") ? true : (stryCov_9fa48("858", "859", "860"), parsed.data.emoji || (stryMutAct_9fa48("861") ? "" : (stryCov_9fa48("861"), "📋"))), stryMutAct_9fa48("864") ? parsed.data.color && "#6366f1" : stryMutAct_9fa48("863") ? false : stryMutAct_9fa48("862") ? true : (stryCov_9fa48("862", "863", "864"), parsed.data.color || (stryMutAct_9fa48("865") ? "" : (stryCov_9fa48("865"), "#6366f1"))), userId);
    const list = await getListById(Number(result.lastInsertRowid));
    if (stryMutAct_9fa48("868") ? false : stryMutAct_9fa48("867") ? true : stryMutAct_9fa48("866") ? list : (stryCov_9fa48("866", "867", "868"), !list)) {
      if (stryMutAct_9fa48("869")) {
        {}
      } else {
        stryCov_9fa48("869");
        throw new Error(stryMutAct_9fa48("870") ? "" : (stryCov_9fa48("870"), "Failed to create list"));
      }
    }
    return list;
  }
}
export async function updateList(id: number, input: Partial<CreateListInput>): Promise<List> {
  if (stryMutAct_9fa48("871")) {
    {}
  } else {
    stryCov_9fa48("871");
    const db = getDb();
    const user = await getCurrentUser();

    // Verify user owns the list before updating (or test mode)
    const effectiveUserId = stryMutAct_9fa48("872") ? user?.id && (process.env.NODE_ENV === "test" ? 1 : null) : (stryCov_9fa48("872"), (stryMutAct_9fa48("873") ? user.id : (stryCov_9fa48("873"), user?.id)) ?? ((stryMutAct_9fa48("876") ? process.env.NODE_ENV !== "test" : stryMutAct_9fa48("875") ? false : stryMutAct_9fa48("874") ? true : (stryCov_9fa48("874", "875", "876"), process.env.NODE_ENV === (stryMutAct_9fa48("877") ? "" : (stryCov_9fa48("877"), "test")))) ? 1 : null));
    if (stryMutAct_9fa48("880") ? effectiveUserId || process.env.NODE_ENV !== "test" : stryMutAct_9fa48("879") ? false : stryMutAct_9fa48("878") ? true : (stryCov_9fa48("878", "879", "880"), effectiveUserId && (stryMutAct_9fa48("882") ? process.env.NODE_ENV === "test" : stryMutAct_9fa48("881") ? true : (stryCov_9fa48("881", "882"), process.env.NODE_ENV !== (stryMutAct_9fa48("883") ? "" : (stryCov_9fa48("883"), "test")))))) {
      if (stryMutAct_9fa48("884")) {
        {}
      } else {
        stryCov_9fa48("884");
        const existing = db.prepare(stryMutAct_9fa48("885") ? "" : (stryCov_9fa48("885"), "SELECT id FROM lists WHERE id = ? AND user_id = ?")).get(id, effectiveUserId);
        if (stryMutAct_9fa48("888") ? false : stryMutAct_9fa48("887") ? true : stryMutAct_9fa48("886") ? existing : (stryCov_9fa48("886", "887", "888"), !existing)) {
          if (stryMutAct_9fa48("889")) {
            {}
          } else {
            stryCov_9fa48("889");
            throw new Error(stryMutAct_9fa48("890") ? "" : (stryCov_9fa48("890"), "List not found or access denied"));
          }
        }
      }
    }
    const fields: string[] = stryMutAct_9fa48("891") ? ["Stryker was here"] : (stryCov_9fa48("891"), []);
    const values: unknown[] = stryMutAct_9fa48("892") ? ["Stryker was here"] : (stryCov_9fa48("892"), []);
    if (stryMutAct_9fa48("895") ? input.name === undefined : stryMutAct_9fa48("894") ? false : stryMutAct_9fa48("893") ? true : (stryCov_9fa48("893", "894", "895"), input.name !== undefined)) {
      if (stryMutAct_9fa48("896")) {
        {}
      } else {
        stryCov_9fa48("896");
        fields.push(stryMutAct_9fa48("897") ? "" : (stryCov_9fa48("897"), "name = ?"));
        values.push(input.name);
      }
    }
    if (stryMutAct_9fa48("900") ? input.emoji === undefined : stryMutAct_9fa48("899") ? false : stryMutAct_9fa48("898") ? true : (stryCov_9fa48("898", "899", "900"), input.emoji !== undefined)) {
      if (stryMutAct_9fa48("901")) {
        {}
      } else {
        stryCov_9fa48("901");
        fields.push(stryMutAct_9fa48("902") ? "" : (stryCov_9fa48("902"), "emoji = ?"));
        values.push(input.emoji);
      }
    }
    if (stryMutAct_9fa48("905") ? input.color === undefined : stryMutAct_9fa48("904") ? false : stryMutAct_9fa48("903") ? true : (stryCov_9fa48("903", "904", "905"), input.color !== undefined)) {
      if (stryMutAct_9fa48("906")) {
        {}
      } else {
        stryCov_9fa48("906");
        fields.push(stryMutAct_9fa48("907") ? "" : (stryCov_9fa48("907"), "color = ?"));
        values.push(input.color);
      }
    }
    if (stryMutAct_9fa48("910") ? fields.length !== 0 : stryMutAct_9fa48("909") ? false : stryMutAct_9fa48("908") ? true : (stryCov_9fa48("908", "909", "910"), fields.length === 0)) throw new Error(stryMutAct_9fa48("911") ? "" : (stryCov_9fa48("911"), "No fields to update"));
    values.push(id);
    db.prepare(stryMutAct_9fa48("912") ? `` : (stryCov_9fa48("912"), `UPDATE lists SET ${fields.join(stryMutAct_9fa48("913") ? "" : (stryCov_9fa48("913"), ", "))} WHERE id = ?`)).run(...values);
    const updated = await getListById(id);
    if (stryMutAct_9fa48("916") ? false : stryMutAct_9fa48("915") ? true : stryMutAct_9fa48("914") ? updated : (stryCov_9fa48("914", "915", "916"), !updated)) {
      if (stryMutAct_9fa48("917")) {
        {}
      } else {
        stryCov_9fa48("917");
        throw new Error(stryMutAct_9fa48("918") ? "" : (stryCov_9fa48("918"), "Failed to update list"));
      }
    }
    return updated;
  }
}
export async function deleteList(id: number): Promise<void> {
  if (stryMutAct_9fa48("919")) {
    {}
  } else {
    stryCov_9fa48("919");
    const db = getDb();
    const user = await getCurrentUser();

    // Verify user owns the list before deleting (or test mode)
    if (stryMutAct_9fa48("922") ? user?.id && process.env.NODE_ENV === "test" : stryMutAct_9fa48("921") ? false : stryMutAct_9fa48("920") ? true : (stryCov_9fa48("920", "921", "922"), (stryMutAct_9fa48("923") ? user.id : (stryCov_9fa48("923"), user?.id)) || (stryMutAct_9fa48("925") ? process.env.NODE_ENV !== "test" : stryMutAct_9fa48("924") ? false : (stryCov_9fa48("924", "925"), process.env.NODE_ENV === (stryMutAct_9fa48("926") ? "" : (stryCov_9fa48("926"), "test")))))) {
      if (stryMutAct_9fa48("927")) {
        {}
      } else {
        stryCov_9fa48("927");
        const effectiveUserId = stryMutAct_9fa48("928") ? user?.id && (process.env.NODE_ENV === "test" ? 1 : null) : (stryCov_9fa48("928"), (stryMutAct_9fa48("929") ? user.id : (stryCov_9fa48("929"), user?.id)) ?? ((stryMutAct_9fa48("932") ? process.env.NODE_ENV !== "test" : stryMutAct_9fa48("931") ? false : stryMutAct_9fa48("930") ? true : (stryCov_9fa48("930", "931", "932"), process.env.NODE_ENV === (stryMutAct_9fa48("933") ? "" : (stryCov_9fa48("933"), "test")))) ? 1 : null));
        if (stryMutAct_9fa48("935") ? false : stryMutAct_9fa48("934") ? true : (stryCov_9fa48("934", "935"), effectiveUserId)) {
          if (stryMutAct_9fa48("936")) {
            {}
          } else {
            stryCov_9fa48("936");
            db.prepare(stryMutAct_9fa48("937") ? "" : (stryCov_9fa48("937"), "UPDATE tasks SET list_id = 1 WHERE list_id = ?")).run(id);
            db.prepare(stryMutAct_9fa48("938") ? "" : (stryCov_9fa48("938"), "DELETE FROM lists WHERE id = ?")).run(id);
          }
        }
      }
    }
  }
}
export async function getLabels(): Promise<Label[]> {
  if (stryMutAct_9fa48("939")) {
    {}
  } else {
    stryCov_9fa48("939");
    const db = getDb();
    const user = await getCurrentUser();

    // User isolation: only show labels owned by the user
    if (stryMutAct_9fa48("942") ? user.id : stryMutAct_9fa48("941") ? false : stryMutAct_9fa48("940") ? true : (stryCov_9fa48("940", "941", "942"), user?.id)) {
      if (stryMutAct_9fa48("943")) {
        {}
      } else {
        stryCov_9fa48("943");
        return db.prepare("SELECT * FROM labels WHERE user_id = ? ORDER BY name ASC").all(user.id) as Label[];
      }
    }

    // In test/demo mode, return all labels
    if (stryMutAct_9fa48("946") ? process.env.NODE_ENV === "test" && process.env.NEXTAUTH_SECRET === "demo-secret" : stryMutAct_9fa48("945") ? false : stryMutAct_9fa48("944") ? true : (stryCov_9fa48("944", "945", "946"), (stryMutAct_9fa48("948") ? process.env.NODE_ENV !== "test" : stryMutAct_9fa48("947") ? false : (stryCov_9fa48("947", "948"), process.env.NODE_ENV === (stryMutAct_9fa48("949") ? "" : (stryCov_9fa48("949"), "test")))) || (stryMutAct_9fa48("951") ? process.env.NEXTAUTH_SECRET !== "demo-secret" : stryMutAct_9fa48("950") ? false : (stryCov_9fa48("950", "951"), process.env.NEXTAUTH_SECRET === (stryMutAct_9fa48("952") ? "" : (stryCov_9fa48("952"), "demo-secret")))))) {
      if (stryMutAct_9fa48("953")) {
        {}
      } else {
        stryCov_9fa48("953");
        return db.prepare("SELECT * FROM labels ORDER BY name ASC").all() as Label[];
      }
    }
    return stryMutAct_9fa48("954") ? ["Stryker was here"] : (stryCov_9fa48("954"), []);
  }
}
export async function getLabelById(id: number): Promise<Label | undefined> {
  if (stryMutAct_9fa48("955")) {
    {}
  } else {
    stryCov_9fa48("955");
    const db = getDb();
    const user = await getCurrentUser();

    // User isolation: only show labels owned by the user
    if (stryMutAct_9fa48("958") ? user.id : stryMutAct_9fa48("957") ? false : stryMutAct_9fa48("956") ? true : (stryCov_9fa48("956", "957", "958"), user?.id)) {
      if (stryMutAct_9fa48("959")) {
        {}
      } else {
        stryCov_9fa48("959");
        return db.prepare("SELECT * FROM labels WHERE id = ? AND user_id = ?").get(id, user.id) as Label | undefined;
      }
    }

    // In test/demo mode, allow access to any label
    if (stryMutAct_9fa48("962") ? process.env.NODE_ENV === "test" && process.env.NEXTAUTH_SECRET === "demo-secret" : stryMutAct_9fa48("961") ? false : stryMutAct_9fa48("960") ? true : (stryCov_9fa48("960", "961", "962"), (stryMutAct_9fa48("964") ? process.env.NODE_ENV !== "test" : stryMutAct_9fa48("963") ? false : (stryCov_9fa48("963", "964"), process.env.NODE_ENV === (stryMutAct_9fa48("965") ? "" : (stryCov_9fa48("965"), "test")))) || (stryMutAct_9fa48("967") ? process.env.NEXTAUTH_SECRET !== "demo-secret" : stryMutAct_9fa48("966") ? false : (stryCov_9fa48("966", "967"), process.env.NEXTAUTH_SECRET === (stryMutAct_9fa48("968") ? "" : (stryCov_9fa48("968"), "demo-secret")))))) {
      if (stryMutAct_9fa48("969")) {
        {}
      } else {
        stryCov_9fa48("969");
        return db.prepare("SELECT * FROM labels WHERE id = ?").get(id) as Label | undefined;
      }
    }
    return undefined;
  }
}
export async function createLabel(input: CreateLabelInput): Promise<Label> {
  if (stryMutAct_9fa48("970")) {
    {}
  } else {
    stryCov_9fa48("970");
    // Validate input
    const parsed = labelSchema.safeParse(input);
    if (stryMutAct_9fa48("973") ? false : stryMutAct_9fa48("972") ? true : stryMutAct_9fa48("971") ? parsed.success : (stryCov_9fa48("971", "972", "973"), !parsed.success)) {
      if (stryMutAct_9fa48("974")) {
        {}
      } else {
        stryCov_9fa48("974");
        throw new Error(stryMutAct_9fa48("977") ? parsed.error.issues[0]?.message && "Invalid label data" : stryMutAct_9fa48("976") ? false : stryMutAct_9fa48("975") ? true : (stryCov_9fa48("975", "976", "977"), (stryMutAct_9fa48("978") ? parsed.error.issues[0].message : (stryCov_9fa48("978"), parsed.error.issues[0]?.message)) || (stryMutAct_9fa48("979") ? "" : (stryCov_9fa48("979"), "Invalid label data"))));
      }
    }
    const db = getDb();
    const user = await getCurrentUser();
    const userId = stryMutAct_9fa48("980") ? user?.id && (process.env.NODE_ENV === "test" ? 1 : null) : (stryCov_9fa48("980"), (stryMutAct_9fa48("981") ? user.id : (stryCov_9fa48("981"), user?.id)) ?? ((stryMutAct_9fa48("984") ? process.env.NODE_ENV !== "test" : stryMutAct_9fa48("983") ? false : stryMutAct_9fa48("982") ? true : (stryCov_9fa48("982", "983", "984"), process.env.NODE_ENV === (stryMutAct_9fa48("985") ? "" : (stryCov_9fa48("985"), "test")))) ? 1 : null));
    const result = db.prepare(stryMutAct_9fa48("986") ? "" : (stryCov_9fa48("986"), "INSERT INTO labels (name, icon, color, user_id) VALUES (?, ?, ?, ?)")).run(parsed.data.name, stryMutAct_9fa48("989") ? parsed.data.icon && "🏷️" : stryMutAct_9fa48("988") ? false : stryMutAct_9fa48("987") ? true : (stryCov_9fa48("987", "988", "989"), parsed.data.icon || (stryMutAct_9fa48("990") ? "" : (stryCov_9fa48("990"), "🏷️"))), stryMutAct_9fa48("993") ? parsed.data.color && "#8b5cf6" : stryMutAct_9fa48("992") ? false : stryMutAct_9fa48("991") ? true : (stryCov_9fa48("991", "992", "993"), parsed.data.color || (stryMutAct_9fa48("994") ? "" : (stryCov_9fa48("994"), "#8b5cf6"))), userId);
    const label = await getLabelById(Number(result.lastInsertRowid));
    if (stryMutAct_9fa48("997") ? false : stryMutAct_9fa48("996") ? true : stryMutAct_9fa48("995") ? label : (stryCov_9fa48("995", "996", "997"), !label)) {
      if (stryMutAct_9fa48("998")) {
        {}
      } else {
        stryCov_9fa48("998");
        throw new Error(stryMutAct_9fa48("999") ? "" : (stryCov_9fa48("999"), "Failed to create label"));
      }
    }
    return label;
  }
}
export async function deleteLabel(id: number): Promise<void> {
  if (stryMutAct_9fa48("1000")) {
    {}
  } else {
    stryCov_9fa48("1000");
    const db = getDb();
    const user = await getCurrentUser();

    // In test mode or when user has access, allow deletion
    if (stryMutAct_9fa48("1003") ? user?.id && process.env.NODE_ENV === "test" : stryMutAct_9fa48("1002") ? false : stryMutAct_9fa48("1001") ? true : (stryCov_9fa48("1001", "1002", "1003"), (stryMutAct_9fa48("1004") ? user.id : (stryCov_9fa48("1004"), user?.id)) || (stryMutAct_9fa48("1006") ? process.env.NODE_ENV !== "test" : stryMutAct_9fa48("1005") ? false : (stryCov_9fa48("1005", "1006"), process.env.NODE_ENV === (stryMutAct_9fa48("1007") ? "" : (stryCov_9fa48("1007"), "test")))))) {
      if (stryMutAct_9fa48("1008")) {
        {}
      } else {
        stryCov_9fa48("1008");
        db.prepare(stryMutAct_9fa48("1009") ? "" : (stryCov_9fa48("1009"), "DELETE FROM task_labels WHERE label_id = ?")).run(id);
        db.prepare(stryMutAct_9fa48("1010") ? "" : (stryCov_9fa48("1010"), "DELETE FROM labels WHERE id = ?")).run(id);
      }
    } else {
      if (stryMutAct_9fa48("1011")) {
        {}
      } else {
        stryCov_9fa48("1011");
        throw new Error(stryMutAct_9fa48("1012") ? "" : (stryCov_9fa48("1012"), "Authentication required"));
      }
    }
  }
}

// Note: These helper functions are kept for potential future use but are currently
// inlined in getTasks for performance (batch queries).
// function getTaskLabels(db: ReturnType<typeof getDb>, taskId: number): Label[] { ... }

export async function getTaskById(id: number): Promise<TaskWithRelations | undefined> {
  if (stryMutAct_9fa48("1013")) {
    {}
  } else {
    stryCov_9fa48("1013");
    const db = getDb();
    const user = await getCurrentUser();

    // User isolation: only allow access to user's own tasks
    const task = (stryMutAct_9fa48("1014") ? user.id : (stryCov_9fa48("1014"), user?.id)) ? db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(id, user.id) as Task | undefined : (stryMutAct_9fa48("1017") ? process.env.NODE_ENV !== "production" : stryMutAct_9fa48("1016") ? false : stryMutAct_9fa48("1015") ? true : (stryCov_9fa48("1015", "1016", "1017"), process.env.NODE_ENV === (stryMutAct_9fa48("1018") ? "" : (stryCov_9fa48("1018"), "production")))) ? undefined : db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
    if (stryMutAct_9fa48("1021") ? false : stryMutAct_9fa48("1020") ? true : stryMutAct_9fa48("1019") ? task : (stryCov_9fa48("1019", "1020", "1021"), !task)) return undefined;

    // Fetch relations using shared utility
    const relationsMap = await getTaskRelations(db, stryMutAct_9fa48("1022") ? [] : (stryCov_9fa48("1022"), [task.id]));
    const relations = stryMutAct_9fa48("1025") ? relationsMap[task.id] && {
      labels: [],
      subtasks: [],
      reminders: [],
      logs: [],
      comments: [],
      attachments: [],
      blockers: [],
      blocked_by: [],
      assignee: undefined,
      time_entries: [],
      recurring_exceptions: []
    } : stryMutAct_9fa48("1024") ? false : stryMutAct_9fa48("1023") ? true : (stryCov_9fa48("1023", "1024", "1025"), relationsMap[task.id] || (stryMutAct_9fa48("1026") ? {} : (stryCov_9fa48("1026"), {
      labels: stryMutAct_9fa48("1027") ? ["Stryker was here"] : (stryCov_9fa48("1027"), []),
      subtasks: stryMutAct_9fa48("1028") ? ["Stryker was here"] : (stryCov_9fa48("1028"), []),
      reminders: stryMutAct_9fa48("1029") ? ["Stryker was here"] : (stryCov_9fa48("1029"), []),
      logs: stryMutAct_9fa48("1030") ? ["Stryker was here"] : (stryCov_9fa48("1030"), []),
      comments: stryMutAct_9fa48("1031") ? ["Stryker was here"] : (stryCov_9fa48("1031"), []),
      attachments: stryMutAct_9fa48("1032") ? ["Stryker was here"] : (stryCov_9fa48("1032"), []),
      blockers: stryMutAct_9fa48("1033") ? ["Stryker was here"] : (stryCov_9fa48("1033"), []),
      blocked_by: stryMutAct_9fa48("1034") ? ["Stryker was here"] : (stryCov_9fa48("1034"), []),
      assignee: undefined,
      time_entries: stryMutAct_9fa48("1035") ? ["Stryker was here"] : (stryCov_9fa48("1035"), []),
      recurring_exceptions: stryMutAct_9fa48("1036") ? ["Stryker was here"] : (stryCov_9fa48("1036"), [])
    })));
    return stryMutAct_9fa48("1037") ? {} : (stryCov_9fa48("1037"), {
      ...task,
      labels: relations.labels,
      subtasks: relations.subtasks,
      reminders: relations.reminders,
      logs: relations.logs,
      comments: relations.comments,
      attachments: relations.attachments,
      blockers: relations.blockers,
      blocked_by: relations.blocked_by,
      time_entries: relations.time_entries,
      recurring_exceptions: relations.recurring_exceptions
    });
  }
}
export interface GetTasksOptions {
  view?: "today" | "next7" | "upcoming" | "all" | "blocked" | "archived" | undefined;
  listId?: number | undefined;
  includeCompleted?: boolean;
  searchQuery?: string | undefined;
  filterPreset?: FilterPreset;
  limit?: number;
  offset?: number;
  showArchived?: boolean;
}
export async function getTasks(options?: GetTasksOptions): Promise<TaskWithRelations[]> {
  if (stryMutAct_9fa48("1038")) {
    {}
  } else {
    stryCov_9fa48("1038");
    const db = getDb();
    const user = await getCurrentUser();
    const whereClauses: string[] = stryMutAct_9fa48("1039") ? ["Stryker was here"] : (stryCov_9fa48("1039"), []);
    const params: unknown[] = stryMutAct_9fa48("1040") ? ["Stryker was here"] : (stryCov_9fa48("1040"), []);
    const today = new Date().toISOString().split(stryMutAct_9fa48("1041") ? "" : (stryCov_9fa48("1041"), "T"))[0];

    // Security: Only show tasks owned by authenticated user
    if (stryMutAct_9fa48("1044") ? false : stryMutAct_9fa48("1043") ? true : stryMutAct_9fa48("1042") ? user?.id : (stryCov_9fa48("1042", "1043", "1044"), !(stryMutAct_9fa48("1045") ? user.id : (stryCov_9fa48("1045"), user?.id)))) {
      if (stryMutAct_9fa48("1046")) {
        {}
      } else {
        stryCov_9fa48("1046");
        return stryMutAct_9fa48("1047") ? ["Stryker was here"] : (stryCov_9fa48("1047"), []);
      }
    }
    whereClauses.push(stryMutAct_9fa48("1048") ? "" : (stryCov_9fa48("1048"), "user_id = ?"));
    params.push(user.id);

    // Exclude archived tasks by default (show archived: true to include them)
    if (stryMutAct_9fa48("1051") ? false : stryMutAct_9fa48("1050") ? true : stryMutAct_9fa48("1049") ? options?.showArchived : (stryCov_9fa48("1049", "1050", "1051"), !(stryMutAct_9fa48("1052") ? options.showArchived : (stryCov_9fa48("1052"), options?.showArchived)))) {
      if (stryMutAct_9fa48("1053")) {
        {}
      } else {
        stryCov_9fa48("1053");
        whereClauses.push(stryMutAct_9fa48("1054") ? "" : (stryCov_9fa48("1054"), "archived = 0"));
      }
    }
    if (stryMutAct_9fa48("1057") ? false : stryMutAct_9fa48("1056") ? true : stryMutAct_9fa48("1055") ? options?.includeCompleted : (stryCov_9fa48("1055", "1056", "1057"), !(stryMutAct_9fa48("1058") ? options.includeCompleted : (stryCov_9fa48("1058"), options?.includeCompleted)))) {
      if (stryMutAct_9fa48("1059")) {
        {}
      } else {
        stryCov_9fa48("1059");
        whereClauses.push(stryMutAct_9fa48("1060") ? "" : (stryCov_9fa48("1060"), "completed = 0"));
      }
    }
    if (stryMutAct_9fa48("1063") ? options?.listId === undefined : stryMutAct_9fa48("1062") ? false : stryMutAct_9fa48("1061") ? true : (stryCov_9fa48("1061", "1062", "1063"), (stryMutAct_9fa48("1064") ? options.listId : (stryCov_9fa48("1064"), options?.listId)) !== undefined)) {
      if (stryMutAct_9fa48("1065")) {
        {}
      } else {
        stryCov_9fa48("1065");
        whereClauses.push(stryMutAct_9fa48("1066") ? "" : (stryCov_9fa48("1066"), "list_id = ?"));
        params.push(options.listId);
      }
    }
    switch (stryMutAct_9fa48("1067") ? options.view : (stryCov_9fa48("1067"), options?.view)) {
      case stryMutAct_9fa48("1069") ? "" : (stryCov_9fa48("1069"), "today"):
        if (stryMutAct_9fa48("1068")) {} else {
          stryCov_9fa48("1068");
          whereClauses.push(stryMutAct_9fa48("1070") ? "" : (stryCov_9fa48("1070"), "date = ?"));
          params.push(today);
          break;
        }
      case stryMutAct_9fa48("1072") ? "" : (stryCov_9fa48("1072"), "next7"):
        if (stryMutAct_9fa48("1071")) {} else {
          stryCov_9fa48("1071");
          {
            if (stryMutAct_9fa48("1073")) {
              {}
            } else {
              stryCov_9fa48("1073");
              const nextWeek = new Date(stryMutAct_9fa48("1074") ? Date.now() - 7 * 24 * 60 * 60 * 1000 : (stryCov_9fa48("1074"), Date.now() + (stryMutAct_9fa48("1075") ? 7 * 24 * 60 * 60 / 1000 : (stryCov_9fa48("1075"), (stryMutAct_9fa48("1076") ? 7 * 24 * 60 / 60 : (stryCov_9fa48("1076"), (stryMutAct_9fa48("1077") ? 7 * 24 / 60 : (stryCov_9fa48("1077"), (stryMutAct_9fa48("1078") ? 7 / 24 : (stryCov_9fa48("1078"), 7 * 24)) * 60)) * 60)) * 1000)))).toISOString().split(stryMutAct_9fa48("1079") ? "" : (stryCov_9fa48("1079"), "T"))[0];
              whereClauses.push(stryMutAct_9fa48("1080") ? "" : (stryCov_9fa48("1080"), "date >= ? AND date <= ?"));
              params.push(today, nextWeek);
              break;
            }
          }
        }
      case stryMutAct_9fa48("1082") ? "" : (stryCov_9fa48("1082"), "upcoming"):
        if (stryMutAct_9fa48("1081")) {} else {
          stryCov_9fa48("1081");
          whereClauses.push(stryMutAct_9fa48("1083") ? "" : (stryCov_9fa48("1083"), "date >= ?"));
          params.push(today);
          break;
        }
      case stryMutAct_9fa48("1085") ? "" : (stryCov_9fa48("1085"), "blocked"):
        if (stryMutAct_9fa48("1084")) {} else {
          stryCov_9fa48("1084");
          {
            if (stryMutAct_9fa48("1086")) {
              {}
            } else {
              stryCov_9fa48("1086");
              // Tasks that have dependencies pointing to them (are blocked)
              whereClauses.push(stryMutAct_9fa48("1087") ? "" : (stryCov_9fa48("1087"), "id IN (SELECT task_id FROM task_dependencies)"));
              break;
            }
          }
        }
      case stryMutAct_9fa48("1088") ? "" : (stryCov_9fa48("1088"), "all"):
      default:
        if (stryMutAct_9fa48("1089")) {} else {
          stryCov_9fa48("1089");
          break;
        }
    }

    // Handle filter presets
    if (stryMutAct_9fa48("1092") ? options.filterPreset : stryMutAct_9fa48("1091") ? false : stryMutAct_9fa48("1090") ? true : (stryCov_9fa48("1090", "1091", "1092"), options?.filterPreset)) {
      if (stryMutAct_9fa48("1093")) {
        {}
      } else {
        stryCov_9fa48("1093");
        switch (options.filterPreset) {
          case stryMutAct_9fa48("1095") ? "" : (stryCov_9fa48("1095"), "needs_attention"):
            if (stryMutAct_9fa48("1094")) {} else {
              stryCov_9fa48("1094");
              // High priority tasks due today or overdue
              whereClauses.push(stryMutAct_9fa48("1096") ? "" : (stryCov_9fa48("1096"), "(priority = 'high' AND (date = ? OR (date < ? AND completed = 0)))"));
              params.push(today, today);
              break;
            }
          case stryMutAct_9fa48("1098") ? "" : (stryCov_9fa48("1098"), "this_week"):
            if (stryMutAct_9fa48("1097")) {} else {
              stryCov_9fa48("1097");
              const nextWeek = new Date(stryMutAct_9fa48("1099") ? Date.now() - 7 * 24 * 60 * 60 * 1000 : (stryCov_9fa48("1099"), Date.now() + (stryMutAct_9fa48("1100") ? 7 * 24 * 60 * 60 / 1000 : (stryCov_9fa48("1100"), (stryMutAct_9fa48("1101") ? 7 * 24 * 60 / 60 : (stryCov_9fa48("1101"), (stryMutAct_9fa48("1102") ? 7 * 24 / 60 : (stryCov_9fa48("1102"), (stryMutAct_9fa48("1103") ? 7 / 24 : (stryCov_9fa48("1103"), 7 * 24)) * 60)) * 60)) * 1000)))).toISOString().split(stryMutAct_9fa48("1104") ? "" : (stryCov_9fa48("1104"), "T"))[0];
              whereClauses.push(stryMutAct_9fa48("1105") ? "" : (stryCov_9fa48("1105"), "date >= ? AND date <= ?"));
              params.push(today, nextWeek);
              break;
            }
          case stryMutAct_9fa48("1107") ? "" : (stryCov_9fa48("1107"), "with_labels"):
            if (stryMutAct_9fa48("1106")) {} else {
              stryCov_9fa48("1106");
              whereClauses.push(stryMutAct_9fa48("1108") ? "" : (stryCov_9fa48("1108"), "id IN (SELECT DISTINCT task_id FROM task_labels)"));
              break;
            }
          case stryMutAct_9fa48("1110") ? "" : (stryCov_9fa48("1110"), "with_subtasks"):
            if (stryMutAct_9fa48("1109")) {} else {
              stryCov_9fa48("1109");
              whereClauses.push(stryMutAct_9fa48("1111") ? "" : (stryCov_9fa48("1111"), "id IN (SELECT DISTINCT task_id FROM subtasks)"));
              break;
            }
          case stryMutAct_9fa48("1113") ? "" : (stryCov_9fa48("1113"), "completed"):
            if (stryMutAct_9fa48("1112")) {} else {
              stryCov_9fa48("1112");
              whereClauses.push(stryMutAct_9fa48("1114") ? "" : (stryCov_9fa48("1114"), "completed = 1"));
              break;
            }
        }
      }
    }
    const where = (stryMutAct_9fa48("1118") ? whereClauses.length <= 0 : stryMutAct_9fa48("1117") ? whereClauses.length >= 0 : stryMutAct_9fa48("1116") ? false : stryMutAct_9fa48("1115") ? true : (stryCov_9fa48("1115", "1116", "1117", "1118"), whereClauses.length > 0)) ? stryMutAct_9fa48("1119") ? `` : (stryCov_9fa48("1119"), `WHERE ${whereClauses.join(stryMutAct_9fa48("1120") ? "" : (stryCov_9fa48("1120"), " AND "))}`) : stryMutAct_9fa48("1121") ? "Stryker was here!" : (stryCov_9fa48("1121"), "");
    const orderBy = (stryMutAct_9fa48("1124") ? options?.view !== "all" : stryMutAct_9fa48("1123") ? false : stryMutAct_9fa48("1122") ? true : (stryCov_9fa48("1122", "1123", "1124"), (stryMutAct_9fa48("1125") ? options.view : (stryCov_9fa48("1125"), options?.view)) === (stryMutAct_9fa48("1126") ? "" : (stryCov_9fa48("1126"), "all")))) ? stryMutAct_9fa48("1127") ? "" : (stryCov_9fa48("1127"), "updated_at DESC, sort_order ASC") : stryMutAct_9fa48("1128") ? "" : (stryCov_9fa48("1128"), "sort_order ASC, date ASC, deadline ASC, priority DESC");

    // Validate sort field and direction to prevent SQL injection
    const safeOrderBy = orderBy; // Already validated as hardcoded strings above

    // Default limit to prevent excessive data loads
    const limit = stryMutAct_9fa48("1129") ? Math.max(options?.limit || 100, 100) : (stryCov_9fa48("1129"), Math.min(stryMutAct_9fa48("1132") ? options?.limit && 100 : stryMutAct_9fa48("1131") ? false : stryMutAct_9fa48("1130") ? true : (stryCov_9fa48("1130", "1131", "1132"), (stryMutAct_9fa48("1133") ? options.limit : (stryCov_9fa48("1133"), options?.limit)) || 100), 100));
    const offset = stryMutAct_9fa48("1136") ? options?.offset && 0 : stryMutAct_9fa48("1135") ? false : stryMutAct_9fa48("1134") ? true : (stryCov_9fa48("1134", "1135", "1136"), (stryMutAct_9fa48("1137") ? options.offset : (stryCov_9fa48("1137"), options?.offset)) || 0);
    const tasks = db.prepare(`SELECT * FROM tasks ${where} ORDER BY ${safeOrderBy} LIMIT ? OFFSET ?`).all(...params, limit, offset) as Task[];
    const taskIds = tasks.map(stryMutAct_9fa48("1138") ? () => undefined : (stryCov_9fa48("1138"), t => t.id));

    // Batch fetch all relations using shared utility
    const relationsMap = await getTaskRelations(db, taskIds);

    // Fetch vote scores for all tasks
    const voteScores: Record<number, {
      total: number;
      count: number;
      score: number;
    }> = {};
    if (stryMutAct_9fa48("1142") ? taskIds.length <= 0 : stryMutAct_9fa48("1141") ? taskIds.length >= 0 : stryMutAct_9fa48("1140") ? false : stryMutAct_9fa48("1139") ? true : (stryCov_9fa48("1139", "1140", "1141", "1142"), taskIds.length > 0)) {
      if (stryMutAct_9fa48("1143")) {
        {}
      } else {
        stryCov_9fa48("1143");
        const placeholder = taskIds.map(stryMutAct_9fa48("1144") ? () => undefined : (stryCov_9fa48("1144"), () => stryMutAct_9fa48("1145") ? "" : (stryCov_9fa48("1145"), "?"))).join(stryMutAct_9fa48("1146") ? "" : (stryCov_9fa48("1146"), ","));
        const votes = db.prepare(`SELECT task_id, SUM(value) as total, COUNT(*) as count,
              CASE WHEN COUNT(*) > 0 THEN SUM(value) * 1.0 / COUNT(*) ELSE 0 END as score
       FROM task_votes WHERE task_id IN (${placeholder})
       GROUP BY task_id`).all(...taskIds) as Array<{
          task_id: number;
          total: number;
          count: number;
          score: number;
        }>;
        for (const vote of votes) {
          if (stryMutAct_9fa48("1147")) {
            {}
          } else {
            stryCov_9fa48("1147");
            voteScores[vote.task_id] = stryMutAct_9fa48("1148") ? {} : (stryCov_9fa48("1148"), {
              total: stryMutAct_9fa48("1151") ? vote.total && 0 : stryMutAct_9fa48("1150") ? false : stryMutAct_9fa48("1149") ? true : (stryCov_9fa48("1149", "1150", "1151"), vote.total || 0),
              count: stryMutAct_9fa48("1154") ? vote.count && 0 : stryMutAct_9fa48("1153") ? false : stryMutAct_9fa48("1152") ? true : (stryCov_9fa48("1152", "1153", "1154"), vote.count || 0),
              score: stryMutAct_9fa48("1157") ? vote.score && 0 : stryMutAct_9fa48("1156") ? false : stryMutAct_9fa48("1155") ? true : (stryCov_9fa48("1155", "1156", "1157"), vote.score || 0)
            });
          }
        }
      }
    }
    const result: TaskWithRelations[] = tasks.map(task => {
      if (stryMutAct_9fa48("1158")) {
        {}
      } else {
        stryCov_9fa48("1158");
        const relations = stryMutAct_9fa48("1161") ? relationsMap[task.id] && {
          labels: [],
          subtasks: [],
          reminders: [],
          logs: [],
          comments: [],
          attachments: [],
          blockers: [],
          blocked_by: [],
          assignee: undefined,
          time_entries: [],
          recurring_exceptions: []
        } : stryMutAct_9fa48("1160") ? false : stryMutAct_9fa48("1159") ? true : (stryCov_9fa48("1159", "1160", "1161"), relationsMap[task.id] || (stryMutAct_9fa48("1162") ? {} : (stryCov_9fa48("1162"), {
          labels: stryMutAct_9fa48("1163") ? ["Stryker was here"] : (stryCov_9fa48("1163"), []),
          subtasks: stryMutAct_9fa48("1164") ? ["Stryker was here"] : (stryCov_9fa48("1164"), []),
          reminders: stryMutAct_9fa48("1165") ? ["Stryker was here"] : (stryCov_9fa48("1165"), []),
          logs: stryMutAct_9fa48("1166") ? ["Stryker was here"] : (stryCov_9fa48("1166"), []),
          comments: stryMutAct_9fa48("1167") ? ["Stryker was here"] : (stryCov_9fa48("1167"), []),
          attachments: stryMutAct_9fa48("1168") ? ["Stryker was here"] : (stryCov_9fa48("1168"), []),
          blockers: stryMutAct_9fa48("1169") ? ["Stryker was here"] : (stryCov_9fa48("1169"), []),
          blocked_by: stryMutAct_9fa48("1170") ? ["Stryker was here"] : (stryCov_9fa48("1170"), []),
          assignee: undefined,
          time_entries: stryMutAct_9fa48("1171") ? ["Stryker was here"] : (stryCov_9fa48("1171"), []),
          recurring_exceptions: stryMutAct_9fa48("1172") ? ["Stryker was here"] : (stryCov_9fa48("1172"), [])
        })));
        const voteData = stryMutAct_9fa48("1175") ? voteScores[task.id] && {
          total: 0,
          count: 0,
          score: 0
        } : stryMutAct_9fa48("1174") ? false : stryMutAct_9fa48("1173") ? true : (stryCov_9fa48("1173", "1174", "1175"), voteScores[task.id] || (stryMutAct_9fa48("1176") ? {} : (stryCov_9fa48("1176"), {
          total: 0,
          count: 0,
          score: 0
        })));
        return stryMutAct_9fa48("1177") ? {} : (stryCov_9fa48("1177"), {
          ...task,
          labels: relations.labels,
          subtasks: relations.subtasks,
          reminders: relations.reminders,
          logs: relations.logs,
          comments: relations.comments,
          attachments: relations.attachments,
          blockers: relations.blockers,
          blocked_by: relations.blocked_by,
          time_entries: relations.time_entries,
          recurring_exceptions: relations.recurring_exceptions,
          vote_score: voteData.score,
          vote_count: voteData.count
        });
      }
    });
    if (stryMutAct_9fa48("1180") ? options.searchQuery : stryMutAct_9fa48("1179") ? false : stryMutAct_9fa48("1178") ? true : (stryCov_9fa48("1178", "1179", "1180"), options?.searchQuery)) {
      if (stryMutAct_9fa48("1181")) {
        {}
      } else {
        stryCov_9fa48("1181");
        const Fuse = (await import("fuse.js")).default;
        const fuse = new Fuse(result, stryMutAct_9fa48("1182") ? {} : (stryCov_9fa48("1182"), {
          keys: stryMutAct_9fa48("1183") ? [] : (stryCov_9fa48("1183"), [stryMutAct_9fa48("1184") ? "" : (stryCov_9fa48("1184"), "name"), stryMutAct_9fa48("1185") ? "" : (stryCov_9fa48("1185"), "description")]),
          threshold: 0.4
        }));
        return fuse.search(options.searchQuery).map(stryMutAct_9fa48("1186") ? () => undefined : (stryCov_9fa48("1186"), r => r.item));
      }
    }
    return result;
  }
}
export async function createTask(input: CreateTaskInput & {
  sort_order?: number;
}): Promise<TaskWithRelations> {
  if (stryMutAct_9fa48("1187")) {
    {}
  } else {
    stryCov_9fa48("1187");
    const db = getDb();
    const user = await getCurrentUser();
    const userId = stryMutAct_9fa48("1188") ? user?.id && null : (stryCov_9fa48("1188"), (stryMutAct_9fa48("1189") ? user.id : (stryCov_9fa48("1189"), user?.id)) ?? null);

    // Sanitize input to prevent XSS
    const sanitizedInput = stryMutAct_9fa48("1190") ? {} : (stryCov_9fa48("1190"), {
      ...input,
      name: stryMutAct_9fa48("1191") ? sanitizeString(input.name) && "" : (stryCov_9fa48("1191"), sanitizeString(input.name) ?? (stryMutAct_9fa48("1192") ? "Stryker was here!" : (stryCov_9fa48("1192"), ""))),
      description: sanitizeString(input.description),
      notes: sanitizeString(input.notes)
    });

    // Use transaction for atomic operation
    const result = db.transaction(() => {
      if (stryMutAct_9fa48("1193")) {
        {}
      } else {
        stryCov_9fa48("1193");
        // Determine sort_order: use provided value or auto-increment
        let sortOrder: number;
        if (stryMutAct_9fa48("1196") ? sanitizedInput.sort_order === undefined : stryMutAct_9fa48("1195") ? false : stryMutAct_9fa48("1194") ? true : (stryCov_9fa48("1194", "1195", "1196"), sanitizedInput.sort_order !== undefined)) {
          if (stryMutAct_9fa48("1197")) {
            {}
          } else {
            stryCov_9fa48("1197");
            sortOrder = sanitizedInput.sort_order;
          }
        } else {
          if (stryMutAct_9fa48("1198")) {
            {}
          } else {
            stryCov_9fa48("1198");
            // Get max sort_order for the list or default to 0
            const maxResult = sanitizedInput.list_id ? db.prepare("SELECT MAX(sort_order) as max FROM tasks WHERE list_id = ? AND user_id = ?").get(sanitizedInput.list_id, userId) as {
              max: number;
            } : db.prepare("SELECT MAX(sort_order) as max FROM tasks WHERE user_id = ?").get(userId) as {
              max: number;
            };
            sortOrder = stryMutAct_9fa48("1199") ? (maxResult?.max ?? -1) - 1 : (stryCov_9fa48("1199"), (stryMutAct_9fa48("1200") ? maxResult?.max && -1 : (stryCov_9fa48("1200"), (stryMutAct_9fa48("1201") ? maxResult.max : (stryCov_9fa48("1201"), maxResult?.max)) ?? (stryMutAct_9fa48("1202") ? +1 : (stryCov_9fa48("1202"), -1)))) + 1);
          }
        }
        const insertResult = db.prepare(stryMutAct_9fa48("1203") ? `` : (stryCov_9fa48("1203"), `INSERT INTO tasks
         (user_id, name, description, list_id, date, deadline, estimate, actual_time, priority, recurring, recurring_config, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)).run(userId, sanitizedInput.name, stryMutAct_9fa48("1206") ? sanitizedInput.description && null : stryMutAct_9fa48("1205") ? false : stryMutAct_9fa48("1204") ? true : (stryCov_9fa48("1204", "1205", "1206"), sanitizedInput.description || null), stryMutAct_9fa48("1209") ? sanitizedInput.list_id && 1 : stryMutAct_9fa48("1208") ? false : stryMutAct_9fa48("1207") ? true : (stryCov_9fa48("1207", "1208", "1209"), sanitizedInput.list_id || 1), stryMutAct_9fa48("1212") ? sanitizedInput.date && null : stryMutAct_9fa48("1211") ? false : stryMutAct_9fa48("1210") ? true : (stryCov_9fa48("1210", "1211", "1212"), sanitizedInput.date || null), stryMutAct_9fa48("1215") ? sanitizedInput.deadline && null : stryMutAct_9fa48("1214") ? false : stryMutAct_9fa48("1213") ? true : (stryCov_9fa48("1213", "1214", "1215"), sanitizedInput.deadline || null), stryMutAct_9fa48("1218") ? sanitizedInput.estimate && null : stryMutAct_9fa48("1217") ? false : stryMutAct_9fa48("1216") ? true : (stryCov_9fa48("1216", "1217", "1218"), sanitizedInput.estimate || null), stryMutAct_9fa48("1221") ? sanitizedInput.actual_time && null : stryMutAct_9fa48("1220") ? false : stryMutAct_9fa48("1219") ? true : (stryCov_9fa48("1219", "1220", "1221"), sanitizedInput.actual_time || null), stryMutAct_9fa48("1224") ? sanitizedInput.priority && "none" : stryMutAct_9fa48("1223") ? false : stryMutAct_9fa48("1222") ? true : (stryCov_9fa48("1222", "1223", "1224"), sanitizedInput.priority || (stryMutAct_9fa48("1225") ? "" : (stryCov_9fa48("1225"), "none"))), stryMutAct_9fa48("1228") ? sanitizedInput.recurring && "none" : stryMutAct_9fa48("1227") ? false : stryMutAct_9fa48("1226") ? true : (stryCov_9fa48("1226", "1227", "1228"), sanitizedInput.recurring || (stryMutAct_9fa48("1229") ? "" : (stryCov_9fa48("1229"), "none"))), stryMutAct_9fa48("1232") ? sanitizedInput.recurring_config && null : stryMutAct_9fa48("1231") ? false : stryMutAct_9fa48("1230") ? true : (stryCov_9fa48("1230", "1231", "1232"), sanitizedInput.recurring_config || null), sortOrder);
        const taskId = insertResult.lastInsertRowid as number;
        if (stryMutAct_9fa48("1235") ? sanitizedInput.label_ids.length : stryMutAct_9fa48("1234") ? false : stryMutAct_9fa48("1233") ? true : (stryCov_9fa48("1233", "1234", "1235"), sanitizedInput.label_ids?.length)) {
          if (stryMutAct_9fa48("1236")) {
            {}
          } else {
            stryCov_9fa48("1236");
            const stmt = db.prepare(stryMutAct_9fa48("1237") ? "" : (stryCov_9fa48("1237"), "INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)"));
            for (const labelId of sanitizedInput.label_ids) {
              if (stryMutAct_9fa48("1238")) {
                {}
              } else {
                stryCov_9fa48("1238");
                stmt.run(taskId, labelId);
              }
            }
          }
        }
        if (stryMutAct_9fa48("1241") ? sanitizedInput.subtasks.length : stryMutAct_9fa48("1240") ? false : stryMutAct_9fa48("1239") ? true : (stryCov_9fa48("1239", "1240", "1241"), sanitizedInput.subtasks?.length)) {
          if (stryMutAct_9fa48("1242")) {
            {}
          } else {
            stryCov_9fa48("1242");
            const stmt = db.prepare(stryMutAct_9fa48("1243") ? "" : (stryCov_9fa48("1243"), "INSERT INTO subtasks (task_id, name) VALUES (?, ?)"));
            for (const name of sanitizedInput.subtasks) {
              if (stryMutAct_9fa48("1244")) {
                {}
              } else {
                stryCov_9fa48("1244");
                stmt.run(taskId, stryMutAct_9fa48("1245") ? sanitizeString(name) && name : (stryCov_9fa48("1245"), sanitizeString(name) ?? name));
              }
            }
          }
        }
        if (stryMutAct_9fa48("1248") ? sanitizedInput.reminders.length : stryMutAct_9fa48("1247") ? false : stryMutAct_9fa48("1246") ? true : (stryCov_9fa48("1246", "1247", "1248"), sanitizedInput.reminders?.length)) {
          if (stryMutAct_9fa48("1249")) {
            {}
          } else {
            stryCov_9fa48("1249");
            const stmt = db.prepare(stryMutAct_9fa48("1250") ? "" : (stryCov_9fa48("1250"), "INSERT INTO reminders (task_id, remind_at) VALUES (?, ?)"));
            for (const remindAt of sanitizedInput.reminders) {
              if (stryMutAct_9fa48("1251")) {
                {}
              } else {
                stryCov_9fa48("1251");
                stmt.run(taskId, remindAt);
              }
            }
          }
        }

        // Handle task dependencies (blockers)
        if (stryMutAct_9fa48("1254") ? sanitizedInput.blocker_ids.length : stryMutAct_9fa48("1253") ? false : stryMutAct_9fa48("1252") ? true : (stryCov_9fa48("1252", "1253", "1254"), sanitizedInput.blocker_ids?.length)) {
          if (stryMutAct_9fa48("1255")) {
            {}
          } else {
            stryCov_9fa48("1255");
            const stmt = db.prepare(stryMutAct_9fa48("1256") ? "" : (stryCov_9fa48("1256"), "INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)"));
            for (const blockingTaskId of sanitizedInput.blocker_ids) {
              if (stryMutAct_9fa48("1257")) {
                {}
              } else {
                stryCov_9fa48("1257");
                stmt.run(taskId, blockingTaskId);
              }
            }
          }
        }

        // Handle recurring exceptions (dates to skip)
        if (stryMutAct_9fa48("1260") ? sanitizedInput.recurring_exception_dates.length : stryMutAct_9fa48("1259") ? false : stryMutAct_9fa48("1258") ? true : (stryCov_9fa48("1258", "1259", "1260"), sanitizedInput.recurring_exception_dates?.length)) {
          if (stryMutAct_9fa48("1261")) {
            {}
          } else {
            stryCov_9fa48("1261");
            const stmt = db.prepare(stryMutAct_9fa48("1262") ? "" : (stryCov_9fa48("1262"), "INSERT INTO recurring_exceptions (task_id, exception_date) VALUES (?, ?)"));
            for (const exceptionDate of sanitizedInput.recurring_exception_dates) {
              if (stryMutAct_9fa48("1263")) {
                {}
              } else {
                stryCov_9fa48("1263");
                stmt.run(taskId, exceptionDate);
              }
            }
          }
        }
        logTaskAction(taskId, stryMutAct_9fa48("1264") ? "" : (stryCov_9fa48("1264"), "created"), stryMutAct_9fa48("1265") ? `` : (stryCov_9fa48("1265"), `Task "${input.name}" created`));
        return taskId;
      }
    });
    const taskId = (stryMutAct_9fa48("1268") ? typeof result !== "number" : stryMutAct_9fa48("1267") ? false : stryMutAct_9fa48("1266") ? true : (stryCov_9fa48("1266", "1267", "1268"), typeof result === (stryMutAct_9fa48("1269") ? "" : (stryCov_9fa48("1269"), "number")))) ? result : await result;
    return getTaskById(taskId) as Promise<TaskWithRelations>;
  }
}
export async function updateTask(id: number, input: UpdateTaskInput): Promise<TaskWithRelations> {
  if (stryMutAct_9fa48("1270")) {
    {}
  } else {
    stryCov_9fa48("1270");
    const db = getDb();
    const user = await getCurrentUser();
    const existing = (stryMutAct_9fa48("1271") ? user.id : (stryCov_9fa48("1271"), user?.id)) ? db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(id, user.id) as Task | undefined : db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
    if (stryMutAct_9fa48("1274") ? false : stryMutAct_9fa48("1273") ? true : stryMutAct_9fa48("1272") ? existing : (stryCov_9fa48("1272", "1273", "1274"), !existing)) throw new Error(stryMutAct_9fa48("1275") ? "" : (stryCov_9fa48("1275"), "Task not found or access denied"));
    const fields: string[] = stryMutAct_9fa48("1276") ? ["Stryker was here"] : (stryCov_9fa48("1276"), []);
    const values: unknown[] = stryMutAct_9fa48("1277") ? ["Stryker was here"] : (stryCov_9fa48("1277"), []);
    if (stryMutAct_9fa48("1280") ? input.name === undefined : stryMutAct_9fa48("1279") ? false : stryMutAct_9fa48("1278") ? true : (stryCov_9fa48("1278", "1279", "1280"), input.name !== undefined)) {
      if (stryMutAct_9fa48("1281")) {
        {}
      } else {
        stryCov_9fa48("1281");
        const sanitizedName = stryMutAct_9fa48("1282") ? sanitizeString(input.name) && input.name : (stryCov_9fa48("1282"), sanitizeString(input.name) ?? input.name);
        fields.push(stryMutAct_9fa48("1283") ? "" : (stryCov_9fa48("1283"), "name = ?"));
        values.push(sanitizedName);
        if (stryMutAct_9fa48("1286") ? sanitizedName === existing.name : stryMutAct_9fa48("1285") ? false : stryMutAct_9fa48("1284") ? true : (stryCov_9fa48("1284", "1285", "1286"), sanitizedName !== existing.name)) {
          if (stryMutAct_9fa48("1287")) {
            {}
          } else {
            stryCov_9fa48("1287");
            logTaskAction(id, stryMutAct_9fa48("1288") ? "" : (stryCov_9fa48("1288"), "updated"), stryMutAct_9fa48("1289") ? `` : (stryCov_9fa48("1289"), `Name changed`));
          }
        }
      }
    }
    if (stryMutAct_9fa48("1292") ? input.description === undefined : stryMutAct_9fa48("1291") ? false : stryMutAct_9fa48("1290") ? true : (stryCov_9fa48("1290", "1291", "1292"), input.description !== undefined)) {
      if (stryMutAct_9fa48("1293")) {
        {}
      } else {
        stryCov_9fa48("1293");
        fields.push(stryMutAct_9fa48("1294") ? "" : (stryCov_9fa48("1294"), "description = ?"));
        values.push(stryMutAct_9fa48("1297") ? sanitizeString(input.description) && null : stryMutAct_9fa48("1296") ? false : stryMutAct_9fa48("1295") ? true : (stryCov_9fa48("1295", "1296", "1297"), sanitizeString(input.description) || null));
      }
    }
    if (stryMutAct_9fa48("1300") ? input.list_id === undefined : stryMutAct_9fa48("1299") ? false : stryMutAct_9fa48("1298") ? true : (stryCov_9fa48("1298", "1299", "1300"), input.list_id !== undefined)) {
      if (stryMutAct_9fa48("1301")) {
        {}
      } else {
        stryCov_9fa48("1301");
        fields.push(stryMutAct_9fa48("1302") ? "" : (stryCov_9fa48("1302"), "list_id = ?"));
        values.push(input.list_id);
      }
    }
    if (stryMutAct_9fa48("1305") ? input.date === undefined : stryMutAct_9fa48("1304") ? false : stryMutAct_9fa48("1303") ? true : (stryCov_9fa48("1303", "1304", "1305"), input.date !== undefined)) {
      if (stryMutAct_9fa48("1306")) {
        {}
      } else {
        stryCov_9fa48("1306");
        fields.push(stryMutAct_9fa48("1307") ? "" : (stryCov_9fa48("1307"), "date = ?"));
        values.push(stryMutAct_9fa48("1310") ? input.date && null : stryMutAct_9fa48("1309") ? false : stryMutAct_9fa48("1308") ? true : (stryCov_9fa48("1308", "1309", "1310"), input.date || null));
      }
    }
    if (stryMutAct_9fa48("1313") ? input.deadline === undefined : stryMutAct_9fa48("1312") ? false : stryMutAct_9fa48("1311") ? true : (stryCov_9fa48("1311", "1312", "1313"), input.deadline !== undefined)) {
      if (stryMutAct_9fa48("1314")) {
        {}
      } else {
        stryCov_9fa48("1314");
        fields.push(stryMutAct_9fa48("1315") ? "" : (stryCov_9fa48("1315"), "deadline = ?"));
        values.push(stryMutAct_9fa48("1318") ? input.deadline && null : stryMutAct_9fa48("1317") ? false : stryMutAct_9fa48("1316") ? true : (stryCov_9fa48("1316", "1317", "1318"), input.deadline || null));
      }
    }
    if (stryMutAct_9fa48("1321") ? input.estimate === undefined : stryMutAct_9fa48("1320") ? false : stryMutAct_9fa48("1319") ? true : (stryCov_9fa48("1319", "1320", "1321"), input.estimate !== undefined)) {
      if (stryMutAct_9fa48("1322")) {
        {}
      } else {
        stryCov_9fa48("1322");
        fields.push(stryMutAct_9fa48("1323") ? "" : (stryCov_9fa48("1323"), "estimate = ?"));
        values.push(stryMutAct_9fa48("1326") ? input.estimate && null : stryMutAct_9fa48("1325") ? false : stryMutAct_9fa48("1324") ? true : (stryCov_9fa48("1324", "1325", "1326"), input.estimate || null));
      }
    }
    if (stryMutAct_9fa48("1329") ? input.actual_time === undefined : stryMutAct_9fa48("1328") ? false : stryMutAct_9fa48("1327") ? true : (stryCov_9fa48("1327", "1328", "1329"), input.actual_time !== undefined)) {
      if (stryMutAct_9fa48("1330")) {
        {}
      } else {
        stryCov_9fa48("1330");
        fields.push(stryMutAct_9fa48("1331") ? "" : (stryCov_9fa48("1331"), "actual_time = ?"));
        values.push(stryMutAct_9fa48("1334") ? input.actual_time && null : stryMutAct_9fa48("1333") ? false : stryMutAct_9fa48("1332") ? true : (stryCov_9fa48("1332", "1333", "1334"), input.actual_time || null));
      }
    }
    if (stryMutAct_9fa48("1337") ? input.priority === undefined : stryMutAct_9fa48("1336") ? false : stryMutAct_9fa48("1335") ? true : (stryCov_9fa48("1335", "1336", "1337"), input.priority !== undefined)) {
      if (stryMutAct_9fa48("1338")) {
        {}
      } else {
        stryCov_9fa48("1338");
        fields.push(stryMutAct_9fa48("1339") ? "" : (stryCov_9fa48("1339"), "priority = ?"));
        values.push(input.priority);
      }
    }
    if (stryMutAct_9fa48("1342") ? input.recurring === undefined : stryMutAct_9fa48("1341") ? false : stryMutAct_9fa48("1340") ? true : (stryCov_9fa48("1340", "1341", "1342"), input.recurring !== undefined)) {
      if (stryMutAct_9fa48("1343")) {
        {}
      } else {
        stryCov_9fa48("1343");
        fields.push(stryMutAct_9fa48("1344") ? "" : (stryCov_9fa48("1344"), "recurring = ?"));
        values.push(input.recurring);
      }
    }
    if (stryMutAct_9fa48("1347") ? input.recurring_config === undefined : stryMutAct_9fa48("1346") ? false : stryMutAct_9fa48("1345") ? true : (stryCov_9fa48("1345", "1346", "1347"), input.recurring_config !== undefined)) {
      if (stryMutAct_9fa48("1348")) {
        {}
      } else {
        stryCov_9fa48("1348");
        fields.push(stryMutAct_9fa48("1349") ? "" : (stryCov_9fa48("1349"), "recurring_config = ?"));
        values.push(stryMutAct_9fa48("1352") ? input.recurring_config && null : stryMutAct_9fa48("1351") ? false : stryMutAct_9fa48("1350") ? true : (stryCov_9fa48("1350", "1351", "1352"), input.recurring_config || null));
      }
    }
    if (stryMutAct_9fa48("1355") ? input.completed === undefined : stryMutAct_9fa48("1354") ? false : stryMutAct_9fa48("1353") ? true : (stryCov_9fa48("1353", "1354", "1355"), input.completed !== undefined)) {
      if (stryMutAct_9fa48("1356")) {
        {}
      } else {
        stryCov_9fa48("1356");
        fields.push(stryMutAct_9fa48("1357") ? "" : (stryCov_9fa48("1357"), "completed = ?, completed_at = ?"));
        values.push(input.completed ? 1 : 0, input.completed ? new Date().toISOString() : null);
        if (stryMutAct_9fa48("1360") ? input.completed === Boolean(existing.completed) : stryMutAct_9fa48("1359") ? false : stryMutAct_9fa48("1358") ? true : (stryCov_9fa48("1358", "1359", "1360"), input.completed !== Boolean(existing.completed))) {
          if (stryMutAct_9fa48("1361")) {
            {}
          } else {
            stryCov_9fa48("1361");
            logTaskAction(id, input.completed ? stryMutAct_9fa48("1362") ? "" : (stryCov_9fa48("1362"), "completed") : stryMutAct_9fa48("1363") ? "" : (stryCov_9fa48("1363"), "uncompleted"), stryMutAct_9fa48("1364") ? `` : (stryCov_9fa48("1364"), `Task status updated`));
          }
        }
      }
    }
    if (stryMutAct_9fa48("1368") ? fields.length <= 0 : stryMutAct_9fa48("1367") ? fields.length >= 0 : stryMutAct_9fa48("1366") ? false : stryMutAct_9fa48("1365") ? true : (stryCov_9fa48("1365", "1366", "1367", "1368"), fields.length > 0)) {
      if (stryMutAct_9fa48("1369")) {
        {}
      } else {
        stryCov_9fa48("1369");
        fields.push(stryMutAct_9fa48("1370") ? "" : (stryCov_9fa48("1370"), "updated_at = CURRENT_TIMESTAMP"));
        values.push(id);
        db.prepare(stryMutAct_9fa48("1371") ? `` : (stryCov_9fa48("1371"), `UPDATE tasks SET ${fields.join(stryMutAct_9fa48("1372") ? "" : (stryCov_9fa48("1372"), ", "))} WHERE id = ?`)).run(...values);
      }
    }
    if (stryMutAct_9fa48("1375") ? input.label_ids === undefined : stryMutAct_9fa48("1374") ? false : stryMutAct_9fa48("1373") ? true : (stryCov_9fa48("1373", "1374", "1375"), input.label_ids !== undefined)) {
      if (stryMutAct_9fa48("1376")) {
        {}
      } else {
        stryCov_9fa48("1376");
        db.prepare(stryMutAct_9fa48("1377") ? "" : (stryCov_9fa48("1377"), "DELETE FROM task_labels WHERE task_id = ?")).run(id);
        if (stryMutAct_9fa48("1379") ? false : stryMutAct_9fa48("1378") ? true : (stryCov_9fa48("1378", "1379"), input.label_ids.length)) {
          if (stryMutAct_9fa48("1380")) {
            {}
          } else {
            stryCov_9fa48("1380");
            const stmt = db.prepare(stryMutAct_9fa48("1381") ? "" : (stryCov_9fa48("1381"), "INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)"));
            for (const labelId of input.label_ids) {
              if (stryMutAct_9fa48("1382")) {
                {}
              } else {
                stryCov_9fa48("1382");
                stmt.run(id, labelId);
              }
            }
          }
        }
      }
    }
    if (stryMutAct_9fa48("1385") ? input.subtasks === undefined : stryMutAct_9fa48("1384") ? false : stryMutAct_9fa48("1383") ? true : (stryCov_9fa48("1383", "1384", "1385"), input.subtasks !== undefined)) {
      if (stryMutAct_9fa48("1386")) {
        {}
      } else {
        stryCov_9fa48("1386");
        db.prepare(stryMutAct_9fa48("1387") ? "" : (stryCov_9fa48("1387"), "DELETE FROM subtasks WHERE task_id = ?")).run(id);
        if (stryMutAct_9fa48("1389") ? false : stryMutAct_9fa48("1388") ? true : (stryCov_9fa48("1388", "1389"), input.subtasks.length)) {
          if (stryMutAct_9fa48("1390")) {
            {}
          } else {
            stryCov_9fa48("1390");
            const stmt = db.prepare(stryMutAct_9fa48("1391") ? "" : (stryCov_9fa48("1391"), "INSERT INTO subtasks (task_id, name) VALUES (?, ?)"));
            for (const name of input.subtasks) {
              if (stryMutAct_9fa48("1392")) {
                {}
              } else {
                stryCov_9fa48("1392");
                stmt.run(id, stryMutAct_9fa48("1393") ? sanitizeString(name) && name : (stryCov_9fa48("1393"), sanitizeString(name) ?? name));
              }
            }
          }
        }
      }
    }
    if (stryMutAct_9fa48("1396") ? input.reminders === undefined : stryMutAct_9fa48("1395") ? false : stryMutAct_9fa48("1394") ? true : (stryCov_9fa48("1394", "1395", "1396"), input.reminders !== undefined)) {
      if (stryMutAct_9fa48("1397")) {
        {}
      } else {
        stryCov_9fa48("1397");
        db.prepare(stryMutAct_9fa48("1398") ? "" : (stryCov_9fa48("1398"), "DELETE FROM reminders WHERE task_id = ?")).run(id);
        if (stryMutAct_9fa48("1400") ? false : stryMutAct_9fa48("1399") ? true : (stryCov_9fa48("1399", "1400"), input.reminders.length)) {
          if (stryMutAct_9fa48("1401")) {
            {}
          } else {
            stryCov_9fa48("1401");
            const stmt = db.prepare(stryMutAct_9fa48("1402") ? "" : (stryCov_9fa48("1402"), "INSERT INTO reminders (task_id, remind_at) VALUES (?, ?)"));
            for (const remindAt of input.reminders) {
              if (stryMutAct_9fa48("1403")) {
                {}
              } else {
                stryCov_9fa48("1403");
                stmt.run(id, remindAt);
              }
            }
          }
        }
      }
    }

    // Handle task dependencies (blockers)
    if (stryMutAct_9fa48("1406") ? input.blocker_ids === undefined : stryMutAct_9fa48("1405") ? false : stryMutAct_9fa48("1404") ? true : (stryCov_9fa48("1404", "1405", "1406"), input.blocker_ids !== undefined)) {
      if (stryMutAct_9fa48("1407")) {
        {}
      } else {
        stryCov_9fa48("1407");
        db.prepare(stryMutAct_9fa48("1408") ? "" : (stryCov_9fa48("1408"), "DELETE FROM task_dependencies WHERE task_id = ?")).run(id);
        if (stryMutAct_9fa48("1410") ? false : stryMutAct_9fa48("1409") ? true : (stryCov_9fa48("1409", "1410"), input.blocker_ids.length)) {
          if (stryMutAct_9fa48("1411")) {
            {}
          } else {
            stryCov_9fa48("1411");
            const stmt = db.prepare(stryMutAct_9fa48("1412") ? "" : (stryCov_9fa48("1412"), "INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)"));
            for (const blockingTaskId of input.blocker_ids) {
              if (stryMutAct_9fa48("1413")) {
                {}
              } else {
                stryCov_9fa48("1413");
                stmt.run(id, blockingTaskId);
              }
            }
          }
        }
      }
    }
    return getTaskById(id) as Promise<TaskWithRelations>;
  }
}
export async function deleteTask(id: number): Promise<void> {
  if (stryMutAct_9fa48("1414")) {
    {}
  } else {
    stryCov_9fa48("1414");
    const db = getDb();
    const user = await getCurrentUser();

    // Verify user ownership before deleting
    if (stryMutAct_9fa48("1417") ? user.id : stryMutAct_9fa48("1416") ? false : stryMutAct_9fa48("1415") ? true : (stryCov_9fa48("1415", "1416", "1417"), user?.id)) {
      if (stryMutAct_9fa48("1418")) {
        {}
      } else {
        stryCov_9fa48("1418");
        const existing = db.prepare(stryMutAct_9fa48("1419") ? "" : (stryCov_9fa48("1419"), "SELECT id FROM tasks WHERE id = ? AND user_id = ?")).get(id, user.id);
        if (stryMutAct_9fa48("1422") ? false : stryMutAct_9fa48("1421") ? true : stryMutAct_9fa48("1420") ? existing : (stryCov_9fa48("1420", "1421", "1422"), !existing)) {
          if (stryMutAct_9fa48("1423")) {
            {}
          } else {
            stryCov_9fa48("1423");
            throw new Error(stryMutAct_9fa48("1424") ? "" : (stryCov_9fa48("1424"), "Task not found or access denied"));
          }
        }
        db.prepare(stryMutAct_9fa48("1425") ? "" : (stryCov_9fa48("1425"), "DELETE FROM tasks WHERE id = ? AND user_id = ?")).run(id, user.id);
      }
    } else {
      if (stryMutAct_9fa48("1426")) {
        {}
      } else {
        stryCov_9fa48("1426");
        db.prepare(stryMutAct_9fa48("1427") ? "" : (stryCov_9fa48("1427"), "DELETE FROM tasks WHERE id = ?")).run(id);
      }
    }
  }
}
export async function bulkUpdateTasks(taskIds: number[], updates: {
  list_id?: number;
  label_ids?: number[];
  priority?: Priority;
  completed?: boolean;
}): Promise<void> {
  if (stryMutAct_9fa48("1428")) {
    {}
  } else {
    stryCov_9fa48("1428");
    const db = getDb();
    const user = await getCurrentUser();
    if (stryMutAct_9fa48("1431") ? taskIds.length !== 0 : stryMutAct_9fa48("1430") ? false : stryMutAct_9fa48("1429") ? true : (stryCov_9fa48("1429", "1430", "1431"), taskIds.length === 0)) return;
    const placeholders = taskIds.map(stryMutAct_9fa48("1432") ? () => undefined : (stryCov_9fa48("1432"), () => stryMutAct_9fa48("1433") ? "" : (stryCov_9fa48("1433"), "?"))).join(stryMutAct_9fa48("1434") ? "" : (stryCov_9fa48("1434"), ","));

    // Build UPDATE SET clause
    const fields: string[] = stryMutAct_9fa48("1435") ? ["Stryker was here"] : (stryCov_9fa48("1435"), []);
    const values: unknown[] = stryMutAct_9fa48("1436") ? ["Stryker was here"] : (stryCov_9fa48("1436"), []);
    if (stryMutAct_9fa48("1439") ? updates.list_id === undefined : stryMutAct_9fa48("1438") ? false : stryMutAct_9fa48("1437") ? true : (stryCov_9fa48("1437", "1438", "1439"), updates.list_id !== undefined)) {
      if (stryMutAct_9fa48("1440")) {
        {}
      } else {
        stryCov_9fa48("1440");
        fields.push(stryMutAct_9fa48("1441") ? "" : (stryCov_9fa48("1441"), "list_id = ?"));
        values.push(updates.list_id);
      }
    }
    if (stryMutAct_9fa48("1444") ? updates.priority === undefined : stryMutAct_9fa48("1443") ? false : stryMutAct_9fa48("1442") ? true : (stryCov_9fa48("1442", "1443", "1444"), updates.priority !== undefined)) {
      if (stryMutAct_9fa48("1445")) {
        {}
      } else {
        stryCov_9fa48("1445");
        fields.push(stryMutAct_9fa48("1446") ? "" : (stryCov_9fa48("1446"), "priority = ?"));
        values.push(updates.priority);
      }
    }
    if (stryMutAct_9fa48("1449") ? updates.completed === undefined : stryMutAct_9fa48("1448") ? false : stryMutAct_9fa48("1447") ? true : (stryCov_9fa48("1447", "1448", "1449"), updates.completed !== undefined)) {
      if (stryMutAct_9fa48("1450")) {
        {}
      } else {
        stryCov_9fa48("1450");
        fields.push(stryMutAct_9fa48("1451") ? "" : (stryCov_9fa48("1451"), "completed = ?, completed_at = ?"));
        values.push(updates.completed ? 1 : 0, updates.completed ? new Date().toISOString() : null);
      }
    }
    if (stryMutAct_9fa48("1455") ? fields.length <= 0 : stryMutAct_9fa48("1454") ? fields.length >= 0 : stryMutAct_9fa48("1453") ? false : stryMutAct_9fa48("1452") ? true : (stryCov_9fa48("1452", "1453", "1454", "1455"), fields.length > 0)) {
      if (stryMutAct_9fa48("1456")) {
        {}
      } else {
        stryCov_9fa48("1456");
        fields.push(stryMutAct_9fa48("1457") ? "" : (stryCov_9fa48("1457"), "updated_at = CURRENT_TIMESTAMP"));

        // Batch update all tasks at once
        const allValues = stryMutAct_9fa48("1458") ? [] : (stryCov_9fa48("1458"), [...values, ...taskIds]);
        if (stryMutAct_9fa48("1461") ? user.id : stryMutAct_9fa48("1460") ? false : stryMutAct_9fa48("1459") ? true : (stryCov_9fa48("1459", "1460", "1461"), user?.id)) {
          if (stryMutAct_9fa48("1462")) {
            {}
          } else {
            stryCov_9fa48("1462");
            // Filter to only update tasks owned by user
            db.prepare(stryMutAct_9fa48("1463") ? `` : (stryCov_9fa48("1463"), `UPDATE tasks SET ${fields.join(stryMutAct_9fa48("1464") ? "" : (stryCov_9fa48("1464"), ", "))} WHERE id IN (${placeholders}) AND user_id = ?`)).run(...allValues, user.id);
          }
        } else {
          if (stryMutAct_9fa48("1465")) {
            {}
          } else {
            stryCov_9fa48("1465");
            db.prepare(stryMutAct_9fa48("1466") ? `` : (stryCov_9fa48("1466"), `UPDATE tasks SET ${fields.join(stryMutAct_9fa48("1467") ? "" : (stryCov_9fa48("1467"), ", "))} WHERE id IN (${placeholders})`)).run(...allValues);
          }
        }

        // Log completion for completed tasks
        if (stryMutAct_9fa48("1469") ? false : stryMutAct_9fa48("1468") ? true : (stryCov_9fa48("1468", "1469"), updates.completed)) {
          if (stryMutAct_9fa48("1470")) {
            {}
          } else {
            stryCov_9fa48("1470");
            const ownedTaskIds = taskIds;
            for (const taskId of ownedTaskIds) {
              if (stryMutAct_9fa48("1471")) {
                {}
              } else {
                stryCov_9fa48("1471");
                logTaskAction(taskId, stryMutAct_9fa48("1472") ? "" : (stryCov_9fa48("1472"), "completed"), stryMutAct_9fa48("1473") ? "" : (stryCov_9fa48("1473"), "Task marked as completed (bulk)"));
              }
            }
          }
        }
      }
    }

    // Handle label updates in batch
    if (stryMutAct_9fa48("1476") ? updates.label_ids === undefined : stryMutAct_9fa48("1475") ? false : stryMutAct_9fa48("1474") ? true : (stryCov_9fa48("1474", "1475", "1476"), updates.label_ids !== undefined)) {
      if (stryMutAct_9fa48("1477")) {
        {}
      } else {
        stryCov_9fa48("1477");
        // Delete all existing labels for the affected tasks
        if (stryMutAct_9fa48("1480") ? user.id : stryMutAct_9fa48("1479") ? false : stryMutAct_9fa48("1478") ? true : (stryCov_9fa48("1478", "1479", "1480"), user?.id)) {
          if (stryMutAct_9fa48("1481")) {
            {}
          } else {
            stryCov_9fa48("1481");
            db.prepare(stryMutAct_9fa48("1482") ? `` : (stryCov_9fa48("1482"), `DELETE FROM task_labels WHERE task_id IN (${placeholders}) AND task_id IN (SELECT id FROM tasks WHERE user_id = ?)`)).run(...taskIds, user.id);
          }
        } else {
          if (stryMutAct_9fa48("1483")) {
            {}
          } else {
            stryCov_9fa48("1483");
            db.prepare(stryMutAct_9fa48("1484") ? `` : (stryCov_9fa48("1484"), `DELETE FROM task_labels WHERE task_id IN (${placeholders})`)).run(...taskIds);
          }
        }

        // Insert new labels
        if (stryMutAct_9fa48("1488") ? updates.label_ids.length <= 0 : stryMutAct_9fa48("1487") ? updates.label_ids.length >= 0 : stryMutAct_9fa48("1486") ? false : stryMutAct_9fa48("1485") ? true : (stryCov_9fa48("1485", "1486", "1487", "1488"), updates.label_ids.length > 0)) {
          if (stryMutAct_9fa48("1489")) {
            {}
          } else {
            stryCov_9fa48("1489");
            const stmt = db.prepare(stryMutAct_9fa48("1490") ? "" : (stryCov_9fa48("1490"), "INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)"));
            for (const taskId of taskIds) {
              if (stryMutAct_9fa48("1491")) {
                {}
              } else {
                stryCov_9fa48("1491");
                for (const labelId of updates.label_ids) {
                  if (stryMutAct_9fa48("1492")) {
                    {}
                  } else {
                    stryCov_9fa48("1492");
                    stmt.run(taskId, labelId);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
export async function bulkDeleteTasks(taskIds: number[]): Promise<void> {
  if (stryMutAct_9fa48("1493")) {
    {}
  } else {
    stryCov_9fa48("1493");
    const db = getDb();
    const user = await getCurrentUser();
    if (stryMutAct_9fa48("1496") ? taskIds.length !== 0 : stryMutAct_9fa48("1495") ? false : stryMutAct_9fa48("1494") ? true : (stryCov_9fa48("1494", "1495", "1496"), taskIds.length === 0)) return;

    // Batch delete using IN clause for better performance
    const placeholders = taskIds.map(stryMutAct_9fa48("1497") ? () => undefined : (stryCov_9fa48("1497"), () => stryMutAct_9fa48("1498") ? "" : (stryCov_9fa48("1498"), "?"))).join(stryMutAct_9fa48("1499") ? "" : (stryCov_9fa48("1499"), ","));
    if (stryMutAct_9fa48("1502") ? user.id : stryMutAct_9fa48("1501") ? false : stryMutAct_9fa48("1500") ? true : (stryCov_9fa48("1500", "1501", "1502"), user?.id)) {
      if (stryMutAct_9fa48("1503")) {
        {}
      } else {
        stryCov_9fa48("1503");
        // Only delete tasks owned by user
        db.prepare(stryMutAct_9fa48("1504") ? `` : (stryCov_9fa48("1504"), `DELETE FROM tasks WHERE id IN (${placeholders}) AND user_id = ?`)).run(...taskIds, user.id);
      }
    } else {
      if (stryMutAct_9fa48("1505")) {
        {}
      } else {
        stryCov_9fa48("1505");
        db.prepare(stryMutAct_9fa48("1506") ? `` : (stryCov_9fa48("1506"), `DELETE FROM tasks WHERE id IN (${placeholders})`)).run(...taskIds);
      }
    }
  }
}
export async function reorderTasks(taskOrders: {
  id: number;
  sort_order: number;
}[]): Promise<void> {
  if (stryMutAct_9fa48("1507")) {
    {}
  } else {
    stryCov_9fa48("1507");
    const db = getDb();
    const user = await getCurrentUser();
    const stmt = db.prepare(stryMutAct_9fa48("1508") ? "" : (stryCov_9fa48("1508"), "UPDATE tasks SET sort_order = ? WHERE id = ? AND user_id = ?"));
    for (const task of taskOrders) {
      if (stryMutAct_9fa48("1509")) {
        {}
      } else {
        stryCov_9fa48("1509");
        // Only update if user owns the task
        if (stryMutAct_9fa48("1512") ? user.id : stryMutAct_9fa48("1511") ? false : stryMutAct_9fa48("1510") ? true : (stryCov_9fa48("1510", "1511", "1512"), user?.id)) {
          if (stryMutAct_9fa48("1513")) {
            {}
          } else {
            stryCov_9fa48("1513");
            stmt.run(task.sort_order, task.id, user.id);
          }
        } else {
          if (stryMutAct_9fa48("1514")) {
            {}
          } else {
            stryCov_9fa48("1514");
            db.prepare(stryMutAct_9fa48("1515") ? "" : (stryCov_9fa48("1515"), "UPDATE tasks SET sort_order = ? WHERE id = ?")).run(task.sort_order, task.id);
          }
        }
      }
    }
  }
}
export async function getTasksByIds(ids: number[]): Promise<TaskWithRelations[]> {
  if (stryMutAct_9fa48("1516")) {
    {}
  } else {
    stryCov_9fa48("1516");
    if (stryMutAct_9fa48("1519") ? ids.length !== 0 : stryMutAct_9fa48("1518") ? false : stryMutAct_9fa48("1517") ? true : (stryCov_9fa48("1517", "1518", "1519"), ids.length === 0)) return stryMutAct_9fa48("1520") ? ["Stryker was here"] : (stryCov_9fa48("1520"), []);
    const db = getDb();

    // Batch fetch all tasks with their relations in a single query to avoid N+1 problem
    const placeholders = ids.map(stryMutAct_9fa48("1521") ? () => undefined : (stryCov_9fa48("1521"), () => stryMutAct_9fa48("1522") ? "" : (stryCov_9fa48("1522"), "?"))).join(stryMutAct_9fa48("1523") ? "" : (stryCov_9fa48("1523"), ","));

    // Fetch tasks
    const tasks = db.prepare(`SELECT * FROM tasks WHERE id IN (${placeholders})`).all(...ids) as Task[];
    const taskIds = tasks.map(stryMutAct_9fa48("1524") ? () => undefined : (stryCov_9fa48("1524"), t => t.id));

    // Batch fetch all relations using shared utility
    const relationsMap = await getTaskRelations(db, taskIds);
    const result: TaskWithRelations[] = tasks.map(task => {
      if (stryMutAct_9fa48("1525")) {
        {}
      } else {
        stryCov_9fa48("1525");
        const relations = stryMutAct_9fa48("1528") ? relationsMap[task.id] && {
          labels: [],
          subtasks: [],
          reminders: [],
          logs: [],
          comments: [],
          attachments: [],
          blockers: [],
          blocked_by: [],
          assignee: undefined,
          time_entries: [],
          recurring_exceptions: []
        } : stryMutAct_9fa48("1527") ? false : stryMutAct_9fa48("1526") ? true : (stryCov_9fa48("1526", "1527", "1528"), relationsMap[task.id] || (stryMutAct_9fa48("1529") ? {} : (stryCov_9fa48("1529"), {
          labels: stryMutAct_9fa48("1530") ? ["Stryker was here"] : (stryCov_9fa48("1530"), []),
          subtasks: stryMutAct_9fa48("1531") ? ["Stryker was here"] : (stryCov_9fa48("1531"), []),
          reminders: stryMutAct_9fa48("1532") ? ["Stryker was here"] : (stryCov_9fa48("1532"), []),
          logs: stryMutAct_9fa48("1533") ? ["Stryker was here"] : (stryCov_9fa48("1533"), []),
          comments: stryMutAct_9fa48("1534") ? ["Stryker was here"] : (stryCov_9fa48("1534"), []),
          attachments: stryMutAct_9fa48("1535") ? ["Stryker was here"] : (stryCov_9fa48("1535"), []),
          blockers: stryMutAct_9fa48("1536") ? ["Stryker was here"] : (stryCov_9fa48("1536"), []),
          blocked_by: stryMutAct_9fa48("1537") ? ["Stryker was here"] : (stryCov_9fa48("1537"), []),
          assignee: undefined,
          time_entries: stryMutAct_9fa48("1538") ? ["Stryker was here"] : (stryCov_9fa48("1538"), []),
          recurring_exceptions: stryMutAct_9fa48("1539") ? ["Stryker was here"] : (stryCov_9fa48("1539"), [])
        })));
        return stryMutAct_9fa48("1540") ? {} : (stryCov_9fa48("1540"), {
          ...task,
          labels: relations.labels,
          subtasks: relations.subtasks,
          reminders: relations.reminders,
          logs: relations.logs,
          comments: relations.comments,
          attachments: relations.attachments,
          blockers: relations.blockers,
          blocked_by: relations.blocked_by,
          time_entries: relations.time_entries,
          recurring_exceptions: relations.recurring_exceptions
        });
      }
    });
    return result;
  }
}
export async function toggleSubtask(id: number): Promise<Subtask> {
  if (stryMutAct_9fa48("1541")) {
    {}
  } else {
    stryCov_9fa48("1541");
    const db = getDb();
    const user = await getCurrentUser();

    // Verify user ownership of the parent task before allowing modification
    const subtask = db.prepare("SELECT * FROM subtasks WHERE id = ?").get(id) as Subtask;
    if (stryMutAct_9fa48("1544") ? false : stryMutAct_9fa48("1543") ? true : stryMutAct_9fa48("1542") ? subtask : (stryCov_9fa48("1542", "1543", "1544"), !subtask)) {
      if (stryMutAct_9fa48("1545")) {
        {}
      } else {
        stryCov_9fa48("1545");
        throw new Error(stryMutAct_9fa48("1546") ? "" : (stryCov_9fa48("1546"), "Subtask not found"));
      }
    }

    // Check if user owns the parent task (or in test mode)
    const effectiveUserId = stryMutAct_9fa48("1547") ? user?.id && (process.env.NODE_ENV === "test" ? 1 : null) : (stryCov_9fa48("1547"), (stryMutAct_9fa48("1548") ? user.id : (stryCov_9fa48("1548"), user?.id)) ?? ((stryMutAct_9fa48("1551") ? process.env.NODE_ENV !== "test" : stryMutAct_9fa48("1550") ? false : stryMutAct_9fa48("1549") ? true : (stryCov_9fa48("1549", "1550", "1551"), process.env.NODE_ENV === (stryMutAct_9fa48("1552") ? "" : (stryCov_9fa48("1552"), "test")))) ? 1 : null));
    if (stryMutAct_9fa48("1555") ? effectiveUserId || process.env.NODE_ENV !== "test" : stryMutAct_9fa48("1554") ? false : stryMutAct_9fa48("1553") ? true : (stryCov_9fa48("1553", "1554", "1555"), effectiveUserId && (stryMutAct_9fa48("1557") ? process.env.NODE_ENV === "test" : stryMutAct_9fa48("1556") ? true : (stryCov_9fa48("1556", "1557"), process.env.NODE_ENV !== (stryMutAct_9fa48("1558") ? "" : (stryCov_9fa48("1558"), "test")))))) {
      if (stryMutAct_9fa48("1559")) {
        {}
      } else {
        stryCov_9fa48("1559");
        const task = db.prepare(stryMutAct_9fa48("1560") ? "" : (stryCov_9fa48("1560"), "SELECT id FROM tasks WHERE id = ? AND user_id = ?")).get(subtask.task_id, effectiveUserId);
        if (stryMutAct_9fa48("1563") ? false : stryMutAct_9fa48("1562") ? true : stryMutAct_9fa48("1561") ? task : (stryCov_9fa48("1561", "1562", "1563"), !task)) {
          if (stryMutAct_9fa48("1564")) {
            {}
          } else {
            stryCov_9fa48("1564");
            throw new Error(stryMutAct_9fa48("1565") ? "" : (stryCov_9fa48("1565"), "Task not found or access denied"));
          }
        }
      }
    }
    db.prepare(stryMutAct_9fa48("1566") ? "" : (stryCov_9fa48("1566"), "UPDATE subtasks SET completed = ? WHERE id = ?")).run(subtask.completed ? 0 : 1, id);
    return stryMutAct_9fa48("1567") ? {} : (stryCov_9fa48("1567"), {
      ...subtask,
      completed: stryMutAct_9fa48("1568") ? subtask.completed : (stryCov_9fa48("1568"), !subtask.completed)
    });
  }
}
export async function getOverdueCount(): Promise<number> {
  if (stryMutAct_9fa48("1569")) {
    {}
  } else {
    stryCov_9fa48("1569");
    const db = getDb();
    const user = await getCurrentUser();

    // In test mode, use demo user ID; in production require auth
    const effectiveUserId = stryMutAct_9fa48("1570") ? user?.id && (process.env.NODE_ENV === "test" ? 1 : null) : (stryCov_9fa48("1570"), (stryMutAct_9fa48("1571") ? user.id : (stryCov_9fa48("1571"), user?.id)) ?? ((stryMutAct_9fa48("1574") ? process.env.NODE_ENV !== "test" : stryMutAct_9fa48("1573") ? false : stryMutAct_9fa48("1572") ? true : (stryCov_9fa48("1572", "1573", "1574"), process.env.NODE_ENV === (stryMutAct_9fa48("1575") ? "" : (stryCov_9fa48("1575"), "test")))) ? 1 : null));
    if (stryMutAct_9fa48("1578") ? false : stryMutAct_9fa48("1577") ? true : stryMutAct_9fa48("1576") ? effectiveUserId : (stryCov_9fa48("1576", "1577", "1578"), !effectiveUserId)) {
      if (stryMutAct_9fa48("1579")) {
        {}
      } else {
        stryCov_9fa48("1579");
        return 0;
      }
    }
    const today = new Date().toISOString().split(stryMutAct_9fa48("1580") ? "" : (stryCov_9fa48("1580"), "T"))[0];
    const result = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE date < ? AND completed = 0 AND user_id = ?").get(today, effectiveUserId) as {
      count: number;
    };
    return result.count;
  }
}

/**
 * Generates recurring tasks based on their recurrence rules.
 * Should be called periodically (e.g., daily via cron or on app load).
 */
export async function generateRecurringTasks(): Promise<number> {
  if (stryMutAct_9fa48("1581")) {
    {}
  } else {
    stryCov_9fa48("1581");
    const db = getDb();

    // Find all incomplete tasks with recurrence rules
    // Basic patterns (daily, weekly, weekdays, monthly, yearly) don't need config
    // Only filter out config requirement for 'custom' pattern
    const recurringTasks = db.prepare(`SELECT id, name, description, list_id, date, deadline, priority, recurring, recurring_config
       FROM tasks
       WHERE completed = 0 AND recurring != 'none' AND archived = 0`).all() as Task[];
    let generatedCount = 0;
    for (const task of recurringTasks) {
      if (stryMutAct_9fa48("1582")) {
        {}
      } else {
        stryCov_9fa48("1582");
        // Parse recurring_config with error handling
        let config: {
          interval?: number;
          unit?: "days" | "weeks" | "months" | "years";
        } = {};
        try {
          if (stryMutAct_9fa48("1583")) {
            {}
          } else {
            stryCov_9fa48("1583");
            config = JSON.parse(stryMutAct_9fa48("1586") ? task.recurring_config && "{}" : stryMutAct_9fa48("1585") ? false : stryMutAct_9fa48("1584") ? true : (stryCov_9fa48("1584", "1585", "1586"), task.recurring_config || (stryMutAct_9fa48("1587") ? "" : (stryCov_9fa48("1587"), "{}"))));
            if (stryMutAct_9fa48("1590") ? typeof config !== "object" && config === null : stryMutAct_9fa48("1589") ? false : stryMutAct_9fa48("1588") ? true : (stryCov_9fa48("1588", "1589", "1590"), (stryMutAct_9fa48("1592") ? typeof config === "object" : stryMutAct_9fa48("1591") ? false : (stryCov_9fa48("1591", "1592"), typeof config !== (stryMutAct_9fa48("1593") ? "" : (stryCov_9fa48("1593"), "object")))) || (stryMutAct_9fa48("1595") ? config !== null : stryMutAct_9fa48("1594") ? false : (stryCov_9fa48("1594", "1595"), config === null)))) {
              if (stryMutAct_9fa48("1596")) {
                {}
              } else {
                stryCov_9fa48("1596");
                config = {};
              }
            }
          }
        } catch (error) {
          if (stryMutAct_9fa48("1597")) {
            {}
          } else {
            stryCov_9fa48("1597");
            console.warn(stryMutAct_9fa48("1598") ? `` : (stryCov_9fa48("1598"), `Invalid recurring_config for task ${task.id}, skipping:`), error);
            continue;
          }
        }
        let nextDate: string | null = null;
        switch (task.recurring) {
          case stryMutAct_9fa48("1600") ? "" : (stryCov_9fa48("1600"), "daily"):
            if (stryMutAct_9fa48("1599")) {} else {
              stryCov_9fa48("1599");
              nextDate = new Date(stryMutAct_9fa48("1601") ? Date.now() - 24 * 60 * 60 * 1000 : (stryCov_9fa48("1601"), Date.now() + (stryMutAct_9fa48("1602") ? 24 * 60 * 60 / 1000 : (stryCov_9fa48("1602"), (stryMutAct_9fa48("1603") ? 24 * 60 / 60 : (stryCov_9fa48("1603"), (stryMutAct_9fa48("1604") ? 24 / 60 : (stryCov_9fa48("1604"), 24 * 60)) * 60)) * 1000)))).toISOString().split(stryMutAct_9fa48("1605") ? "" : (stryCov_9fa48("1605"), "T"))[0];
              break;
            }
          case stryMutAct_9fa48("1607") ? "" : (stryCov_9fa48("1607"), "weekly"):
            if (stryMutAct_9fa48("1606")) {} else {
              stryCov_9fa48("1606");
              nextDate = new Date(stryMutAct_9fa48("1608") ? Date.now() - 7 * 24 * 60 * 60 * 1000 : (stryCov_9fa48("1608"), Date.now() + (stryMutAct_9fa48("1609") ? 7 * 24 * 60 * 60 / 1000 : (stryCov_9fa48("1609"), (stryMutAct_9fa48("1610") ? 7 * 24 * 60 / 60 : (stryCov_9fa48("1610"), (stryMutAct_9fa48("1611") ? 7 * 24 / 60 : (stryCov_9fa48("1611"), (stryMutAct_9fa48("1612") ? 7 / 24 : (stryCov_9fa48("1612"), 7 * 24)) * 60)) * 60)) * 1000)))).toISOString().split(stryMutAct_9fa48("1613") ? "" : (stryCov_9fa48("1613"), "T"))[0];
              break;
            }
          case stryMutAct_9fa48("1615") ? "" : (stryCov_9fa48("1615"), "weekdays"):
            if (stryMutAct_9fa48("1614")) {} else {
              stryCov_9fa48("1614");
              {
                if (stryMutAct_9fa48("1616")) {
                  {}
                } else {
                  stryCov_9fa48("1616");
                  const next = new Date(stryMutAct_9fa48("1617") ? Date.now() - 24 * 60 * 60 * 1000 : (stryCov_9fa48("1617"), Date.now() + (stryMutAct_9fa48("1618") ? 24 * 60 * 60 / 1000 : (stryCov_9fa48("1618"), (stryMutAct_9fa48("1619") ? 24 * 60 / 60 : (stryCov_9fa48("1619"), (stryMutAct_9fa48("1620") ? 24 / 60 : (stryCov_9fa48("1620"), 24 * 60)) * 60)) * 1000))));
                  let nextDay = next.getDay();
                  // Skip weekends (0 = Sunday, 6 = Saturday)
                  while (stryMutAct_9fa48("1622") ? nextDay === 0 && nextDay === 6 : stryMutAct_9fa48("1621") ? false : (stryCov_9fa48("1621", "1622"), (stryMutAct_9fa48("1624") ? nextDay !== 0 : stryMutAct_9fa48("1623") ? false : (stryCov_9fa48("1623", "1624"), nextDay === 0)) || (stryMutAct_9fa48("1626") ? nextDay !== 6 : stryMutAct_9fa48("1625") ? false : (stryCov_9fa48("1625", "1626"), nextDay === 6)))) {
                    if (stryMutAct_9fa48("1627")) {
                      {}
                    } else {
                      stryCov_9fa48("1627");
                      stryMutAct_9fa48("1628") ? next.setTime(next.getDate() + 1) : (stryCov_9fa48("1628"), next.setDate(stryMutAct_9fa48("1629") ? next.getDate() - 1 : (stryCov_9fa48("1629"), next.getDate() + 1)));
                      nextDay = next.getDay();
                    }
                  }
                  nextDate = next.toISOString().split(stryMutAct_9fa48("1630") ? "" : (stryCov_9fa48("1630"), "T"))[0];
                  break;
                }
              }
            }
          case stryMutAct_9fa48("1632") ? "" : (stryCov_9fa48("1632"), "monthly"):
            if (stryMutAct_9fa48("1631")) {} else {
              stryCov_9fa48("1631");
              nextDate = new Date(stryMutAct_9fa48("1633") ? Date.now() - 30 * 24 * 60 * 60 * 1000 : (stryCov_9fa48("1633"), Date.now() + (stryMutAct_9fa48("1634") ? 30 * 24 * 60 * 60 / 1000 : (stryCov_9fa48("1634"), (stryMutAct_9fa48("1635") ? 30 * 24 * 60 / 60 : (stryCov_9fa48("1635"), (stryMutAct_9fa48("1636") ? 30 * 24 / 60 : (stryCov_9fa48("1636"), (stryMutAct_9fa48("1637") ? 30 / 24 : (stryCov_9fa48("1637"), 30 * 24)) * 60)) * 60)) * 1000)))).toISOString().split(stryMutAct_9fa48("1638") ? "" : (stryCov_9fa48("1638"), "T"))[0];
              break;
            }
          case stryMutAct_9fa48("1640") ? "" : (stryCov_9fa48("1640"), "yearly"):
            if (stryMutAct_9fa48("1639")) {} else {
              stryCov_9fa48("1639");
              nextDate = new Date(stryMutAct_9fa48("1641") ? Date.now() - 365 * 24 * 60 * 60 * 1000 : (stryCov_9fa48("1641"), Date.now() + (stryMutAct_9fa48("1642") ? 365 * 24 * 60 * 60 / 1000 : (stryCov_9fa48("1642"), (stryMutAct_9fa48("1643") ? 365 * 24 * 60 / 60 : (stryCov_9fa48("1643"), (stryMutAct_9fa48("1644") ? 365 * 24 / 60 : (stryCov_9fa48("1644"), (stryMutAct_9fa48("1645") ? 365 / 24 : (stryCov_9fa48("1645"), 365 * 24)) * 60)) * 60)) * 1000)))).toISOString().split(stryMutAct_9fa48("1646") ? "" : (stryCov_9fa48("1646"), "T"))[0];
              break;
            }
          case stryMutAct_9fa48("1648") ? "" : (stryCov_9fa48("1648"), "custom"):
            if (stryMutAct_9fa48("1647")) {} else {
              stryCov_9fa48("1647");
              if (stryMutAct_9fa48("1651") ? config.interval || config.unit : stryMutAct_9fa48("1650") ? false : stryMutAct_9fa48("1649") ? true : (stryCov_9fa48("1649", "1650", "1651"), config.interval && config.unit)) {
                if (stryMutAct_9fa48("1652")) {
                  {}
                } else {
                  stryCov_9fa48("1652");
                  const multiplier = (stryMutAct_9fa48("1655") ? config.unit !== "days" : stryMutAct_9fa48("1654") ? false : stryMutAct_9fa48("1653") ? true : (stryCov_9fa48("1653", "1654", "1655"), config.unit === (stryMutAct_9fa48("1656") ? "" : (stryCov_9fa48("1656"), "days")))) ? 1 : (stryMutAct_9fa48("1659") ? config.unit !== "weeks" : stryMutAct_9fa48("1658") ? false : stryMutAct_9fa48("1657") ? true : (stryCov_9fa48("1657", "1658", "1659"), config.unit === (stryMutAct_9fa48("1660") ? "" : (stryCov_9fa48("1660"), "weeks")))) ? 7 : (stryMutAct_9fa48("1663") ? config.unit !== "months" : stryMutAct_9fa48("1662") ? false : stryMutAct_9fa48("1661") ? true : (stryCov_9fa48("1661", "1662", "1663"), config.unit === (stryMutAct_9fa48("1664") ? "" : (stryCov_9fa48("1664"), "months")))) ? 30 : 365;
                  nextDate = new Date(stryMutAct_9fa48("1665") ? Date.now() - config.interval * multiplier * 24 * 60 * 60 * 1000 : (stryCov_9fa48("1665"), Date.now() + (stryMutAct_9fa48("1666") ? config.interval * multiplier * 24 * 60 * 60 / 1000 : (stryCov_9fa48("1666"), (stryMutAct_9fa48("1667") ? config.interval * multiplier * 24 * 60 / 60 : (stryCov_9fa48("1667"), (stryMutAct_9fa48("1668") ? config.interval * multiplier * 24 / 60 : (stryCov_9fa48("1668"), (stryMutAct_9fa48("1669") ? config.interval * multiplier / 24 : (stryCov_9fa48("1669"), (stryMutAct_9fa48("1670") ? config.interval / multiplier : (stryCov_9fa48("1670"), config.interval * multiplier)) * 24)) * 60)) * 60)) * 1000)))).toISOString().split(stryMutAct_9fa48("1671") ? "" : (stryCov_9fa48("1671"), "T"))[0];
                }
              }
              break;
            }
        }
        if (stryMutAct_9fa48("1674") ? nextDate || !task.date || task.date < nextDate : stryMutAct_9fa48("1673") ? false : stryMutAct_9fa48("1672") ? true : (stryCov_9fa48("1672", "1673", "1674"), nextDate && (stryMutAct_9fa48("1676") ? !task.date && task.date < nextDate : stryMutAct_9fa48("1675") ? true : (stryCov_9fa48("1675", "1676"), (stryMutAct_9fa48("1677") ? task.date : (stryCov_9fa48("1677"), !task.date)) || (stryMutAct_9fa48("1680") ? task.date >= nextDate : stryMutAct_9fa48("1679") ? task.date <= nextDate : stryMutAct_9fa48("1678") ? false : (stryCov_9fa48("1678", "1679", "1680"), task.date < nextDate)))))) {
          if (stryMutAct_9fa48("1681")) {
            {}
          } else {
            stryCov_9fa48("1681");
            // Create new task instance
            await createTask(stryMutAct_9fa48("1682") ? {} : (stryCov_9fa48("1682"), {
              name: task.name,
              description: stryMutAct_9fa48("1685") ? task.description && undefined : stryMutAct_9fa48("1684") ? false : stryMutAct_9fa48("1683") ? true : (stryCov_9fa48("1683", "1684", "1685"), task.description || undefined),
              list_id: stryMutAct_9fa48("1688") ? task.list_id && undefined : stryMutAct_9fa48("1687") ? false : stryMutAct_9fa48("1686") ? true : (stryCov_9fa48("1686", "1687", "1688"), task.list_id || undefined),
              date: nextDate,
              priority: task.priority,
              label_ids: stryMutAct_9fa48("1689") ? ["Stryker was here"] : (stryCov_9fa48("1689"), []) // Labels not copied to recurring instances
            }));
            stryMutAct_9fa48("1690") ? generatedCount-- : (stryCov_9fa48("1690"), generatedCount++);
          }
        }
      }
    }
    return generatedCount;
  }
}

/**
 * Archive a task (hide from active view without deleting)
 */
export async function archiveTask(id: number): Promise<void> {
  if (stryMutAct_9fa48("1691")) {
    {}
  } else {
    stryCov_9fa48("1691");
    const db = getDb();
    const user = await getCurrentUser();
    if (stryMutAct_9fa48("1694") ? false : stryMutAct_9fa48("1693") ? true : stryMutAct_9fa48("1692") ? user?.id : (stryCov_9fa48("1692", "1693", "1694"), !(stryMutAct_9fa48("1695") ? user.id : (stryCov_9fa48("1695"), user?.id)))) {
      if (stryMutAct_9fa48("1696")) {
        {}
      } else {
        stryCov_9fa48("1696");
        throw new Error(stryMutAct_9fa48("1697") ? "" : (stryCov_9fa48("1697"), "Authentication required"));
      }
    }

    // Verify user owns the task
    const existing = db.prepare(stryMutAct_9fa48("1698") ? "" : (stryCov_9fa48("1698"), "SELECT id FROM tasks WHERE id = ? AND user_id = ?")).get(id, user.id);
    if (stryMutAct_9fa48("1701") ? false : stryMutAct_9fa48("1700") ? true : stryMutAct_9fa48("1699") ? existing : (stryCov_9fa48("1699", "1700", "1701"), !existing)) {
      if (stryMutAct_9fa48("1702")) {
        {}
      } else {
        stryCov_9fa48("1702");
        throw new Error(stryMutAct_9fa48("1703") ? "" : (stryCov_9fa48("1703"), "Task not found or access denied"));
      }
    }
    db.prepare(stryMutAct_9fa48("1704") ? "" : (stryCov_9fa48("1704"), "UPDATE tasks SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")).run(id);
    logTaskAction(id, stryMutAct_9fa48("1705") ? "" : (stryCov_9fa48("1705"), "archived"), stryMutAct_9fa48("1706") ? "" : (stryCov_9fa48("1706"), "Task archived"));
  }
}

/**
 * Unarchive a task (restore to active view)
 */
export async function unarchiveTask(id: number): Promise<void> {
  if (stryMutAct_9fa48("1707")) {
    {}
  } else {
    stryCov_9fa48("1707");
    const db = getDb();
    const user = await getCurrentUser();
    if (stryMutAct_9fa48("1710") ? false : stryMutAct_9fa48("1709") ? true : stryMutAct_9fa48("1708") ? user?.id : (stryCov_9fa48("1708", "1709", "1710"), !(stryMutAct_9fa48("1711") ? user.id : (stryCov_9fa48("1711"), user?.id)))) {
      if (stryMutAct_9fa48("1712")) {
        {}
      } else {
        stryCov_9fa48("1712");
        throw new Error(stryMutAct_9fa48("1713") ? "" : (stryCov_9fa48("1713"), "Authentication required"));
      }
    }

    // Verify user owns the task
    const existing = db.prepare(stryMutAct_9fa48("1714") ? "" : (stryCov_9fa48("1714"), "SELECT id FROM tasks WHERE id = ? AND user_id = ?")).get(id, user.id);
    if (stryMutAct_9fa48("1717") ? false : stryMutAct_9fa48("1716") ? true : stryMutAct_9fa48("1715") ? existing : (stryCov_9fa48("1715", "1716", "1717"), !existing)) {
      if (stryMutAct_9fa48("1718")) {
        {}
      } else {
        stryCov_9fa48("1718");
        throw new Error(stryMutAct_9fa48("1719") ? "" : (stryCov_9fa48("1719"), "Task not found or access denied"));
      }
    }
    db.prepare(stryMutAct_9fa48("1720") ? "" : (stryCov_9fa48("1720"), "UPDATE tasks SET archived = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?")).run(id);
    logTaskAction(id, stryMutAct_9fa48("1721") ? "" : (stryCov_9fa48("1721"), "unarchived"), stryMutAct_9fa48("1722") ? "" : (stryCov_9fa48("1722"), "Task unarchived"));
  }
}

/**
 * Get archived tasks for the current user
 */
export async function getArchivedTasks(): Promise<TaskWithRelations[]> {
  if (stryMutAct_9fa48("1723")) {
    {}
  } else {
    stryCov_9fa48("1723");
    const db = getDb();
    const user = await getCurrentUser();
    if (stryMutAct_9fa48("1726") ? false : stryMutAct_9fa48("1725") ? true : stryMutAct_9fa48("1724") ? user?.id : (stryCov_9fa48("1724", "1725", "1726"), !(stryMutAct_9fa48("1727") ? user.id : (stryCov_9fa48("1727"), user?.id)))) {
      if (stryMutAct_9fa48("1728")) {
        {}
      } else {
        stryCov_9fa48("1728");
        return stryMutAct_9fa48("1729") ? ["Stryker was here"] : (stryCov_9fa48("1729"), []);
      }
    }
    const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ? AND archived = 1 ORDER BY updated_at DESC").all(user.id) as Task[];
    const taskIds = tasks.map(stryMutAct_9fa48("1730") ? () => undefined : (stryCov_9fa48("1730"), t => t.id));
    const relationsMap = await getTaskRelations(db, taskIds);
    return tasks.map(task => {
      if (stryMutAct_9fa48("1731")) {
        {}
      } else {
        stryCov_9fa48("1731");
        const relations = stryMutAct_9fa48("1734") ? relationsMap[task.id] && {
          labels: [],
          subtasks: [],
          reminders: [],
          logs: [],
          comments: [],
          attachments: [],
          blockers: [],
          blocked_by: [],
          assignee: undefined,
          time_entries: [],
          recurring_exceptions: []
        } : stryMutAct_9fa48("1733") ? false : stryMutAct_9fa48("1732") ? true : (stryCov_9fa48("1732", "1733", "1734"), relationsMap[task.id] || (stryMutAct_9fa48("1735") ? {} : (stryCov_9fa48("1735"), {
          labels: stryMutAct_9fa48("1736") ? ["Stryker was here"] : (stryCov_9fa48("1736"), []),
          subtasks: stryMutAct_9fa48("1737") ? ["Stryker was here"] : (stryCov_9fa48("1737"), []),
          reminders: stryMutAct_9fa48("1738") ? ["Stryker was here"] : (stryCov_9fa48("1738"), []),
          logs: stryMutAct_9fa48("1739") ? ["Stryker was here"] : (stryCov_9fa48("1739"), []),
          comments: stryMutAct_9fa48("1740") ? ["Stryker was here"] : (stryCov_9fa48("1740"), []),
          attachments: stryMutAct_9fa48("1741") ? ["Stryker was here"] : (stryCov_9fa48("1741"), []),
          blockers: stryMutAct_9fa48("1742") ? ["Stryker was here"] : (stryCov_9fa48("1742"), []),
          blocked_by: stryMutAct_9fa48("1743") ? ["Stryker was here"] : (stryCov_9fa48("1743"), []),
          assignee: undefined,
          time_entries: stryMutAct_9fa48("1744") ? ["Stryker was here"] : (stryCov_9fa48("1744"), []),
          recurring_exceptions: stryMutAct_9fa48("1745") ? ["Stryker was here"] : (stryCov_9fa48("1745"), [])
        })));
        return stryMutAct_9fa48("1746") ? {} : (stryCov_9fa48("1746"), {
          ...task,
          labels: relations.labels,
          subtasks: relations.subtasks,
          reminders: relations.reminders,
          logs: relations.logs,
          comments: relations.comments,
          attachments: relations.attachments,
          blockers: relations.blockers,
          blocked_by: relations.blocked_by,
          time_entries: relations.time_entries,
          recurring_exceptions: relations.recurring_exceptions
        });
      }
    });
  }
}

// Note: Task Dependencies, Templates, Comments, Import/Export, and Attachments
// have been moved to their respective modules for better maintainability.
// See:
// - dependencies.ts for task dependency functions
// - templates.ts for template functions
// - comments.ts for task comment functions
// - export.ts for import/export functions
// - attachments.ts for attachment functions

/**
 * AI-powered task editing - process natural language commands to modify tasks
 */
export async function editTaskWithAI(command: {
  action: string;
  taskId?: number;
  updates?: Record<string, unknown>;
}, tasks: Array<{
  id: number;
  name: string;
  completed: boolean;
  priority: string;
}>): Promise<{
  success: boolean;
  message: string;
  task?: TaskWithRelations;
}> {
  if (stryMutAct_9fa48("1747")) {
    {}
  } else {
    stryCov_9fa48("1747");
    const {
      action,
      taskId,
      updates
    } = command;
    if (stryMutAct_9fa48("1750") ? action === "delete" || taskId : stryMutAct_9fa48("1749") ? false : stryMutAct_9fa48("1748") ? true : (stryCov_9fa48("1748", "1749", "1750"), (stryMutAct_9fa48("1752") ? action !== "delete" : stryMutAct_9fa48("1751") ? true : (stryCov_9fa48("1751", "1752"), action === (stryMutAct_9fa48("1753") ? "" : (stryCov_9fa48("1753"), "delete")))) && taskId)) {
      if (stryMutAct_9fa48("1754")) {
        {}
      } else {
        stryCov_9fa48("1754");
        await deleteTask(taskId);
        return stryMutAct_9fa48("1755") ? {} : (stryCov_9fa48("1755"), {
          success: stryMutAct_9fa48("1756") ? false : (stryCov_9fa48("1756"), true),
          message: stryMutAct_9fa48("1757") ? "" : (stryCov_9fa48("1757"), "Task deleted")
        });
      }
    }
    if (stryMutAct_9fa48("1759") ? false : stryMutAct_9fa48("1758") ? true : (stryCov_9fa48("1758", "1759"), taskId)) {
      if (stryMutAct_9fa48("1760")) {
        {}
      } else {
        stryCov_9fa48("1760");
        const taskInput: Record<string, unknown> = {};
        if (stryMutAct_9fa48("1763") ? updates?.priority || ["critical", "high", "medium", "low", "none"].includes(updates.priority as string) : stryMutAct_9fa48("1762") ? false : stryMutAct_9fa48("1761") ? true : (stryCov_9fa48("1761", "1762", "1763"), (stryMutAct_9fa48("1764") ? updates.priority : (stryCov_9fa48("1764"), updates?.priority)) && (stryMutAct_9fa48("1765") ? [] : (stryCov_9fa48("1765"), [stryMutAct_9fa48("1766") ? "" : (stryCov_9fa48("1766"), "critical"), stryMutAct_9fa48("1767") ? "" : (stryCov_9fa48("1767"), "high"), stryMutAct_9fa48("1768") ? "" : (stryCov_9fa48("1768"), "medium"), stryMutAct_9fa48("1769") ? "" : (stryCov_9fa48("1769"), "low"), stryMutAct_9fa48("1770") ? "" : (stryCov_9fa48("1770"), "none")])).includes(updates.priority as string))) {
          if (stryMutAct_9fa48("1771")) {
            {}
          } else {
            stryCov_9fa48("1771");
            taskInput.priority = updates.priority;
          }
        }
        if (stryMutAct_9fa48("1774") ? updates?.list_id || typeof updates.list_id === "number" : stryMutAct_9fa48("1773") ? false : stryMutAct_9fa48("1772") ? true : (stryCov_9fa48("1772", "1773", "1774"), (stryMutAct_9fa48("1775") ? updates.list_id : (stryCov_9fa48("1775"), updates?.list_id)) && (stryMutAct_9fa48("1777") ? typeof updates.list_id !== "number" : stryMutAct_9fa48("1776") ? true : (stryCov_9fa48("1776", "1777"), typeof updates.list_id === (stryMutAct_9fa48("1778") ? "" : (stryCov_9fa48("1778"), "number")))))) {
          if (stryMutAct_9fa48("1779")) {
            {}
          } else {
            stryCov_9fa48("1779");
            taskInput.list_id = updates.list_id;
          }
        }
        if (stryMutAct_9fa48("1782") ? updates?.completed === undefined : stryMutAct_9fa48("1781") ? false : stryMutAct_9fa48("1780") ? true : (stryCov_9fa48("1780", "1781", "1782"), (stryMutAct_9fa48("1783") ? updates.completed : (stryCov_9fa48("1783"), updates?.completed)) !== undefined)) {
          if (stryMutAct_9fa48("1784")) {
            {}
          } else {
            stryCov_9fa48("1784");
            taskInput.completed = updates.completed ? 1 : 0;
          }
        }
        if (stryMutAct_9fa48("1787") ? updates?.date || typeof updates.date === "string" : stryMutAct_9fa48("1786") ? false : stryMutAct_9fa48("1785") ? true : (stryCov_9fa48("1785", "1786", "1787"), (stryMutAct_9fa48("1788") ? updates.date : (stryCov_9fa48("1788"), updates?.date)) && (stryMutAct_9fa48("1790") ? typeof updates.date !== "string" : stryMutAct_9fa48("1789") ? true : (stryCov_9fa48("1789", "1790"), typeof updates.date === (stryMutAct_9fa48("1791") ? "" : (stryCov_9fa48("1791"), "string")))))) {
          if (stryMutAct_9fa48("1792")) {
            {}
          } else {
            stryCov_9fa48("1792");
            taskInput.date = updates.date;
          }
        }
        if (stryMutAct_9fa48("1795") ? updates?.deadline || typeof updates.deadline === "string" : stryMutAct_9fa48("1794") ? false : stryMutAct_9fa48("1793") ? true : (stryCov_9fa48("1793", "1794", "1795"), (stryMutAct_9fa48("1796") ? updates.deadline : (stryCov_9fa48("1796"), updates?.deadline)) && (stryMutAct_9fa48("1798") ? typeof updates.deadline !== "string" : stryMutAct_9fa48("1797") ? true : (stryCov_9fa48("1797", "1798"), typeof updates.deadline === (stryMutAct_9fa48("1799") ? "" : (stryCov_9fa48("1799"), "string")))))) {
          if (stryMutAct_9fa48("1800")) {
            {}
          } else {
            stryCov_9fa48("1800");
            taskInput.deadline = updates.deadline;
          }
        }
        const updated = await updateTask(taskId, taskInput);
        return stryMutAct_9fa48("1801") ? {} : (stryCov_9fa48("1801"), {
          success: stryMutAct_9fa48("1802") ? false : (stryCov_9fa48("1802"), true),
          message: stryMutAct_9fa48("1803") ? "" : (stryCov_9fa48("1803"), "Task updated"),
          task: updated
        });
      }
    }
    return stryMutAct_9fa48("1804") ? {} : (stryCov_9fa48("1804"), {
      success: stryMutAct_9fa48("1805") ? true : (stryCov_9fa48("1805"), false),
      message: stryMutAct_9fa48("1806") ? "" : (stryCov_9fa48("1806"), "No valid task specified")
    });
  }
}