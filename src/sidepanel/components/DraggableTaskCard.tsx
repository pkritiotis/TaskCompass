import { CSS } from "@dnd-kit/utilities";
import { useDraggable } from "@dnd-kit/core";
import { Check } from "lucide-react";
import type { ClassifiedTask } from "../../domain/classification";

export function DraggableTaskCard({
  task,
  busy,
  onComplete
}: {
  task: ClassifiedTask;
  busy: boolean;
  onComplete: (task: ClassifiedTask) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.task.id
  });

  const style = {
    transform: CSS.Translate.toString(transform)
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={isDragging ? "task-card dragging" : "task-card"}
      {...listeners}
      {...attributes}
    >
      <div className="task-content">
        <h3>{task.task.title || "Untitled task"}</h3>
        {task.task.due ? <p>Due {formatDueDate(task.task.due)}</p> : null}
      </div>
      <button
        className="complete-button"
        title="Mark complete"
        disabled={busy}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onComplete(task);
        }}
      >
        <Check size={16} />
      </button>
    </article>
  );
}

function formatDueDate(due: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(new Date(`${due.slice(0, 10)}T00:00:00`));
}
