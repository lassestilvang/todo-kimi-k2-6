import { createTestDb } from "./lib/db/test-db";
import { setDb, resetDb } from "./lib/db";
import { getLists } from "./lib/actions/lists";

async function debug() {
  resetDb();
  const testDb = createTestDb();
  setDb(testDb);

  const lists = await getLists();
  console.log('Lists length:', lists.length);
  console.log('Lists:', JSON.stringify(lists, null, 2));
  if (lists.length > 0) {
    console.log('First list:', lists[0]);
    console.log('First list keys:', Object.keys(lists[0]));
    console.log('First list is_inbox:', lists[0].is_inbox);
  }
}

debug().catch(console.error);