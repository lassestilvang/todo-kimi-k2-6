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
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { logError } from "@/lib/logger";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";
interface VoteBody {
  task_id: number;
  value: -1 | 1;
}

/**
 * GET /api/task-votes - Get task votes
 * Query params: task_id (optional), user_id (optional)
 */
export async function GET(request: NextRequest) {
  if (stryMutAct_9fa48("0")) {
    {}
  } else {
    stryCov_9fa48("0");
    const middlewareResult = await applyMiddleware(request);
    if (stryMutAct_9fa48("2") ? false : stryMutAct_9fa48("1") ? true : (stryCov_9fa48("1", "2"), middlewareResult.error)) {
      if (stryMutAct_9fa48("3")) {
        {}
      } else {
        stryCov_9fa48("3");
        return middlewareResult.error;
      }
    }
    try {
      if (stryMutAct_9fa48("4")) {
        {}
      } else {
        stryCov_9fa48("4");
        const searchParams = request.nextUrl.searchParams;
        const taskIdParam = searchParams.get(stryMutAct_9fa48("5") ? "" : (stryCov_9fa48("5"), "task_id"));
        const userIdParam = searchParams.get(stryMutAct_9fa48("6") ? "" : (stryCov_9fa48("6"), "user_id"));
        const db = getDb();
        if (stryMutAct_9fa48("9") ? taskIdParam || userIdParam : stryMutAct_9fa48("8") ? false : stryMutAct_9fa48("7") ? true : (stryCov_9fa48("7", "8", "9"), taskIdParam && userIdParam)) {
          if (stryMutAct_9fa48("10")) {
            {}
          } else {
            stryCov_9fa48("10");
            // Get vote for specific user and task
            const vote = await db.prepare(stryMutAct_9fa48("11") ? "" : (stryCov_9fa48("11"), "SELECT * FROM task_votes WHERE task_id = ? AND user_id = ?")).get(parseInt(taskIdParam), parseInt(userIdParam));
            return jsonResponse(stryMutAct_9fa48("12") ? {} : (stryCov_9fa48("12"), {
              vote: stryMutAct_9fa48("15") ? vote && null : stryMutAct_9fa48("14") ? false : stryMutAct_9fa48("13") ? true : (stryCov_9fa48("13", "14", "15"), vote || null)
            }), 200, middlewareResult.headers);
          }
        }
        if (stryMutAct_9fa48("17") ? false : stryMutAct_9fa48("16") ? true : (stryCov_9fa48("16", "17"), taskIdParam)) {
          if (stryMutAct_9fa48("18")) {
            {}
          } else {
            stryCov_9fa48("18");
            // Get all votes for a task with user info
            const votes = await db.prepare(stryMutAct_9fa48("19") ? `` : (stryCov_9fa48("19"), `SELECT tv.*, u.name as user_name, u.avatar_url as user_avatar
         FROM task_votes tv
         JOIN users u ON tv.user_id = u.id
         WHERE tv.task_id = ?`)).all(parseInt(taskIdParam));
            const total = votes.reduce(stryMutAct_9fa48("20") ? () => undefined : (stryCov_9fa48("20"), (sum: number, v: {
              value: number;
            }) => stryMutAct_9fa48("21") ? sum - v.value : (stryCov_9fa48("21"), sum + v.value)), 0);
            const count = votes.length;
            return jsonResponse(stryMutAct_9fa48("22") ? {} : (stryCov_9fa48("22"), {
              votes,
              total,
              count,
              score: (stryMutAct_9fa48("26") ? count <= 0 : stryMutAct_9fa48("25") ? count >= 0 : stryMutAct_9fa48("24") ? false : stryMutAct_9fa48("23") ? true : (stryCov_9fa48("23", "24", "25", "26"), count > 0)) ? stryMutAct_9fa48("27") ? total * count : (stryCov_9fa48("27"), total / count) : 0
            }), 200, middlewareResult.headers);
          }
        }

        // Get all votes (with optional user filter)
        let query = stryMutAct_9fa48("28") ? `` : (stryCov_9fa48("28"), `
      SELECT tv.*, t.name as task_name, u.name as user_name
      FROM task_votes tv
      JOIN tasks t ON tv.task_id = t.id
      JOIN users u ON tv.user_id = u.id
    `);
        const params: number[] = stryMutAct_9fa48("29") ? ["Stryker was here"] : (stryCov_9fa48("29"), []);
        if (stryMutAct_9fa48("31") ? false : stryMutAct_9fa48("30") ? true : (stryCov_9fa48("30", "31"), userIdParam)) {
          if (stryMutAct_9fa48("32")) {
            {}
          } else {
            stryCov_9fa48("32");
            query += stryMutAct_9fa48("33") ? "" : (stryCov_9fa48("33"), " WHERE tv.user_id = ?");
            params.push(parseInt(userIdParam));
          }
        }
        query += stryMutAct_9fa48("34") ? "" : (stryCov_9fa48("34"), " ORDER BY tv.created_at DESC");
        const votes = await db.prepare(query).all(...params);
        return jsonResponse(stryMutAct_9fa48("35") ? {} : (stryCov_9fa48("35"), {
          votes
        }), 200, middlewareResult.headers);
      }
    } catch (error) {
      if (stryMutAct_9fa48("36")) {
        {}
      } else {
        stryCov_9fa48("36");
        logError(stryMutAct_9fa48("37") ? "" : (stryCov_9fa48("37"), "Failed to fetch votes"), undefined, error instanceof Error ? error : new Error(String(error)));
        return errorResponse(stryMutAct_9fa48("38") ? "" : (stryCov_9fa48("38"), "Failed to fetch votes"), 500);
      }
    }
  }
}

/**
 * POST /api/task-votes - Create or update a vote
 */
export async function POST(request: NextRequest) {
  if (stryMutAct_9fa48("39")) {
    {}
  } else {
    stryCov_9fa48("39");
    const middlewareResult = await applyMiddleware(request);
    if (stryMutAct_9fa48("41") ? false : stryMutAct_9fa48("40") ? true : (stryCov_9fa48("40", "41"), middlewareResult.error)) {
      if (stryMutAct_9fa48("42")) {
        {}
      } else {
        stryCov_9fa48("42");
        return middlewareResult.error;
      }
    }
    try {
      if (stryMutAct_9fa48("43")) {
        {}
      } else {
        stryCov_9fa48("43");
        const body = await request.json();
        const {
          task_id,
          value
        } = body as VoteBody;
        if (stryMutAct_9fa48("46") ? (!task_id || !value) && value !== -1 && value !== 1 : stryMutAct_9fa48("45") ? false : stryMutAct_9fa48("44") ? true : (stryCov_9fa48("44", "45", "46"), (stryMutAct_9fa48("48") ? !task_id && !value : stryMutAct_9fa48("47") ? false : (stryCov_9fa48("47", "48"), (stryMutAct_9fa48("49") ? task_id : (stryCov_9fa48("49"), !task_id)) || (stryMutAct_9fa48("50") ? value : (stryCov_9fa48("50"), !value)))) || (stryMutAct_9fa48("52") ? value !== -1 || value !== 1 : stryMutAct_9fa48("51") ? false : (stryCov_9fa48("51", "52"), (stryMutAct_9fa48("54") ? value === -1 : stryMutAct_9fa48("53") ? true : (stryCov_9fa48("53", "54"), value !== (stryMutAct_9fa48("55") ? +1 : (stryCov_9fa48("55"), -1)))) && (stryMutAct_9fa48("57") ? value === 1 : stryMutAct_9fa48("56") ? true : (stryCov_9fa48("56", "57"), value !== 1)))))) {
          if (stryMutAct_9fa48("58")) {
            {}
          } else {
            stryCov_9fa48("58");
            return errorResponse(stryMutAct_9fa48("59") ? "" : (stryCov_9fa48("59"), "Invalid vote data. value must be -1 or 1"), 400);
          }
        }
        const db = getDb();

        // Check if task exists
        const task = await db.prepare(stryMutAct_9fa48("60") ? "" : (stryCov_9fa48("60"), "SELECT id FROM tasks WHERE id = ?")).get(task_id);
        if (stryMutAct_9fa48("63") ? false : stryMutAct_9fa48("62") ? true : stryMutAct_9fa48("61") ? task : (stryCov_9fa48("61", "62", "63"), !task)) {
          if (stryMutAct_9fa48("64")) {
            {}
          } else {
            stryCov_9fa48("64");
            return errorResponse(stryMutAct_9fa48("65") ? "" : (stryCov_9fa48("65"), "Task not found"), 404);
          }
        }

        // Get user from auth
        const userId = stryMutAct_9fa48("68") ? middlewareResult.auth?.userId && 1 : stryMutAct_9fa48("67") ? false : stryMutAct_9fa48("66") ? true : (stryCov_9fa48("66", "67", "68"), (stryMutAct_9fa48("69") ? middlewareResult.auth.userId : (stryCov_9fa48("69"), middlewareResult.auth?.userId)) || 1);

        // Upsert vote
        const existingVote = await db.prepare(stryMutAct_9fa48("70") ? "" : (stryCov_9fa48("70"), "SELECT id FROM task_votes WHERE task_id = ? AND user_id = ?")).get(task_id, userId);
        if (stryMutAct_9fa48("72") ? false : stryMutAct_9fa48("71") ? true : (stryCov_9fa48("71", "72"), existingVote)) {
          if (stryMutAct_9fa48("73")) {
            {}
          } else {
            stryCov_9fa48("73");
            // Update existing vote
            db.prepare(stryMutAct_9fa48("74") ? "" : (stryCov_9fa48("74"), "UPDATE task_votes SET value = ? WHERE task_id = ? AND user_id = ?")).run(value, task_id, userId);
          }
        } else {
          if (stryMutAct_9fa48("75")) {
            {}
          } else {
            stryCov_9fa48("75");
            // Create new vote
            db.prepare(stryMutAct_9fa48("76") ? "" : (stryCov_9fa48("76"), "INSERT INTO task_votes (task_id, user_id, value) VALUES (?, ?, ?)")).run(task_id, userId, value);
          }
        }

        // Get updated vote count
        const voteStats = (await db.prepare(`SELECT SUM(value) as total, COUNT(*) as count
       FROM task_votes WHERE task_id = ?`).get(task_id)) as {
          total: number;
          count: number;
        };
        return jsonResponse(stryMutAct_9fa48("77") ? {} : (stryCov_9fa48("77"), {
          success: stryMutAct_9fa48("78") ? false : (stryCov_9fa48("78"), true),
          vote: stryMutAct_9fa48("79") ? {} : (stryCov_9fa48("79"), {
            task_id,
            user_id: userId,
            value
          }),
          stats: stryMutAct_9fa48("80") ? {} : (stryCov_9fa48("80"), {
            total: voteStats.total,
            count: voteStats.count,
            score: (stryMutAct_9fa48("84") ? voteStats.count <= 0 : stryMutAct_9fa48("83") ? voteStats.count >= 0 : stryMutAct_9fa48("82") ? false : stryMutAct_9fa48("81") ? true : (stryCov_9fa48("81", "82", "83", "84"), voteStats.count > 0)) ? stryMutAct_9fa48("85") ? voteStats.total * voteStats.count : (stryCov_9fa48("85"), voteStats.total / voteStats.count) : 0
          })
        }), 200, middlewareResult.headers);
      }
    } catch (error) {
      if (stryMutAct_9fa48("86")) {
        {}
      } else {
        stryCov_9fa48("86");
        logError(stryMutAct_9fa48("87") ? "" : (stryCov_9fa48("87"), "Failed to create vote"), undefined, error instanceof Error ? error : new Error(String(error)));
        return errorResponse(stryMutAct_9fa48("88") ? "" : (stryCov_9fa48("88"), "Failed to create vote"), 500);
      }
    }
  }
}

/**
 * DELETE /api/task-votes - Remove a vote
 */
export async function DELETE(request: NextRequest) {
  if (stryMutAct_9fa48("89")) {
    {}
  } else {
    stryCov_9fa48("89");
    const middlewareResult = await applyMiddleware(request);
    if (stryMutAct_9fa48("91") ? false : stryMutAct_9fa48("90") ? true : (stryCov_9fa48("90", "91"), middlewareResult.error)) {
      if (stryMutAct_9fa48("92")) {
        {}
      } else {
        stryCov_9fa48("92");
        return middlewareResult.error;
      }
    }
    try {
      if (stryMutAct_9fa48("93")) {
        {}
      } else {
        stryCov_9fa48("93");
        const searchParams = request.nextUrl.searchParams;
        const taskIdParam = searchParams.get(stryMutAct_9fa48("94") ? "" : (stryCov_9fa48("94"), "task_id"));
        if (stryMutAct_9fa48("97") ? false : stryMutAct_9fa48("96") ? true : stryMutAct_9fa48("95") ? taskIdParam : (stryCov_9fa48("95", "96", "97"), !taskIdParam)) {
          if (stryMutAct_9fa48("98")) {
            {}
          } else {
            stryCov_9fa48("98");
            return errorResponse(stryMutAct_9fa48("99") ? "" : (stryCov_9fa48("99"), "task_id is required"), 400);
          }
        }
        const db = getDb();
        const userId = stryMutAct_9fa48("102") ? middlewareResult.auth?.userId && 1 : stryMutAct_9fa48("101") ? false : stryMutAct_9fa48("100") ? true : (stryCov_9fa48("100", "101", "102"), (stryMutAct_9fa48("103") ? middlewareResult.auth.userId : (stryCov_9fa48("103"), middlewareResult.auth?.userId)) || 1);
        await db.prepare(stryMutAct_9fa48("104") ? "" : (stryCov_9fa48("104"), "DELETE FROM task_votes WHERE task_id = ? AND user_id = ?")).run(parseInt(taskIdParam), userId);
        return jsonResponse(stryMutAct_9fa48("105") ? {} : (stryCov_9fa48("105"), {
          success: stryMutAct_9fa48("106") ? false : (stryCov_9fa48("106"), true)
        }), 200, middlewareResult.headers);
      }
    } catch (error) {
      if (stryMutAct_9fa48("107")) {
        {}
      } else {
        stryCov_9fa48("107");
        logError(stryMutAct_9fa48("108") ? "" : (stryCov_9fa48("108"), "Failed to delete vote"), undefined, error instanceof Error ? error : new Error(String(error)));
        return errorResponse(stryMutAct_9fa48("109") ? "" : (stryCov_9fa48("109"), "Failed to delete vote"), 500);
      }
    }
  }
}