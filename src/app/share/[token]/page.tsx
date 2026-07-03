import { getShareByToken } from "@/lib/actions/sharing";
import { getTaskById } from "@/lib/actions";
import { notFound } from "next/navigation";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  const share = await getShareByToken(token);
  if (!share) {
    notFound();
  }

  const task = await getTaskById(share.task_id);
  if (!task) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Shared Task</h1>
          <p className="text-slate-500 mt-2">
            {share.permission === "edit" ? "Editor" : "Viewer"} access
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{task.name}</h2>
              {task.description && (
                <p className="text-slate-600 mt-2">{task.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {task.date && (
                <div>
                  <span className="text-slate-500">Date</span>
                  <p className="font-medium">{new Date(task.date).toLocaleDateString()}</p>
                </div>
              )}
              {task.priority !== "none" && (
                <div>
                  <span className="text-slate-500">Priority</span>
                  <p className="font-medium capitalize">{task.priority}</p>
                </div>
              )}
              {task.estimate && (
                <div>
                  <span className="text-slate-500">Estimate</span>
                  <p className="font-medium">{task.estimate}</p>
                </div>
              )}
            </div>

            {task.subtasks && task.subtasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Subtasks</h3>
                <ul className="space-y-1">
                  {task.subtasks.map((subtask) => (
                    <li key={subtask.id} className="text-sm text-slate-600">
                      • {subtask.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {task.labels && task.labels.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Labels</h3>
                <div className="flex flex-wrap gap-2">
                  {task.labels.map((label) => (
                    <span
                      key={label.id}
                      className="text-xs px-2 py-1 rounded-full"
                      style={{ backgroundColor: label.color, color: "white" }}
                    >
                      {label.icon} {label.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Shared via TaskFlow
        </div>
      </div>
    </div>
  );
}