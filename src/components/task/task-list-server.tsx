// Server Component - fetches data on the server
import { getTasks } from "@/lib/actions/tasks";
import { getLists } from "@/lib/actions/lists";
import { getLabels } from "@/lib/actions/labels";

interface TaskListServerProps {
  view?: "today" | "next7" | "upcoming" | "all" | "blocked";
  listId?: number;
  searchQuery?: string;
}

// This component fetches tasks on the server
// Reduces client-side data fetching and improves SEO
export async function TaskListServer({ view, listId, searchQuery }: TaskListServerProps) {
  const tasks = await getTasks({ view, listId, searchQuery });
  // Note: lists and labels can be fetched if needed in the future
  await getLists();
  await getLabels();

  return (
    <div>
      <h2>Tasks ({tasks.length})</h2>
      {/* Render tasks */}
    </div>
  );
}