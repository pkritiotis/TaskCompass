import { useDroppable } from "@dnd-kit/core";
import { BrushCleaning, CalendarDays, HandHelping, Target } from "lucide-react";
import type { ClassifiedTask, Quadrant } from "../../domain/classification";
import { DraggableTaskCard } from "./DraggableTaskCard";

export function MatrixQuadrant({
  quadrant,
  tasks,
  busyTaskId,
  onComplete
}: {
  quadrant: Quadrant;
  tasks: ClassifiedTask[];
  busyTaskId: string | null;
  onComplete: (task: ClassifiedTask) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: quadrant.id
  });
  const Icon = getQuadrantIcon(quadrant.id);

  return (
    <section
      ref={setNodeRef}
      className={`quadrant quadrant-${quadrant.id}${isOver ? " over" : ""}`}
    >
      <header className="quadrant-header">
        <div>
          <h2>
            <Icon aria-hidden="true" size={16} />
            <span>{quadrant.title}</span>
          </h2>
        </div>
        <span>{tasks.length}</span>
      </header>
      <div className="task-stack">
        {tasks.map((task) => (
          <DraggableTaskCard
            key={task.task.id}
            task={task}
            busy={busyTaskId === task.task.id}
            onComplete={onComplete}
          />
        ))}
      </div>
    </section>
  );
}

function getQuadrantIcon(quadrantId: Quadrant["id"]) {
  switch (quadrantId) {
    case "not-urgent-important":
      return CalendarDays;
    case "urgent-important":
      return Target;
    case "not-urgent-not-important":
      return BrushCleaning;
    case "urgent-not-important":
      return HandHelping;
  }
}
