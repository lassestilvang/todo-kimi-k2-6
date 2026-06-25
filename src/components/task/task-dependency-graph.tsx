"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { TaskWithRelations } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import type { TaskDependency } from "@/types";

interface TaskDependencyGraphProps {
  tasks: TaskWithRelations[];
  onTaskClick: (task: TaskWithRelations) => void;
}

interface Node {
  id: number;
  name: string;
  completed: boolean;
  priority: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}

interface Edge {
  from: number;
  to: number;
}

// Simple force-directed layout implementation
function useForceLayout(nodes: Node[], edges: Edge[], width: number, height: number, isPlaying: boolean) {
  const [positions, setPositions] = useState<Node[]>(() =>
    nodes.map(n => ({ ...n, x: n.x, y: n.y, vx: 0, vy: 0, fx: null, fy: null }))
  );
  const animationRef = useRef<number | null>(null);
  const iterationsRef = useRef(0);

  // Initialize positions in a circular layout
  const initializePositions = useMemo(() => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    return nodes.map((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      };
    });
  }, [nodes, width, height]);

  useEffect(() => {
    setPositions(initializePositions);
  }, [initializePositions]);

  useEffect(() => {
    if (!isPlaying) return;

    const animate = () => {
      iterationsRef.current++;

      setPositions(prev => {
        let newNodes = prev.map(n => ({ ...n }));

        // Apply forces
        newNodes.forEach(node => {
          // Skip fixed nodes (they're being dragged)
          if (node.fx !== null && node.fy !== null) return;

          // Repulsion between all nodes
          newNodes.forEach(other => {
            if (other.id === node.id) return;
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 500 / (dist * dist);
            node.vx -= (dx / dist) * force;
            node.vy -= (dy / dist) * force;
          });
        });

        // Apply edge forces (attraction)
        edges.forEach(edge => {
          const from = newNodes.find(n => n.id === edge.from);
          const to = newNodes.find(n => n.id === edge.to);
          if (!from || !to) return;

          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 0.1 * (dist - 150);
          from.vx += (dx / dist) * force;
          from.vy += (dy / dist) * force;
          to.vx -= (dx / dist) * force;
          to.vy -= (dy / dist) * force;
        });

        // Update positions with velocity
        const newPositions = newNodes.map(node => {
          node.vx *= 0.8; // Damping
          node.vy *= 0.8;
          node.x += node.vx;
          node.y += node.vy;

          // Keep within bounds
          node.x = Math.max(30, Math.min(width - 30, node.x));
          node.y = Math.max(30, Math.min(height - 30, node.y));

          return node;
        });

        return newPositions;
      });

      if (isPlaying && iterationsRef.current < 500) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, edges, width, height]);

  const resetPositions = () => {
    setPositions(initializePositions);
    iterationsRef.current = 0;
  };

  return { positions, resetPositions };
}

export function TaskDependencyGraph({ tasks, onTaskClick }: TaskDependencyGraphProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 400 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Generate deterministic starting positions based on task ID
  const getInitialPosition = (id: number) => ({
    x: (id * 0.13734) % dimensions.width,
    y: (id * 0.27468) % dimensions.height,
  });

  const { positions, resetPositions } = useForceLayout(
    tasks.map((task) => ({
      id: task.id,
      name: task.name,
      completed: task.completed,
      priority: task.priority,
      ...getInitialPosition(task.id),
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    })),
    tasks.flatMap(task =>
      (task.blocked_by || []).map(d => ({ from: d.depends_on_task_id, to: task.id }))
    ),
    dimensions.width,
    dimensions.height,
    isPlaying
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "#dc2626";
      case "high": return "#ea580c";
      case "medium": return "#ca8a04";
      case "low": return "#2563eb";
      default: return "#6b7280";
    }
  };

  const blockedTasks = tasks.filter(t => t.blocked_by && t.blocked_by.length > 0);

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No tasks to display
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium">Task Dependencies</h3>
          <p className="text-sm text-muted-foreground">
            Showing {blockedTasks.length} blocked task{blockedTasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetPositions}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="border rounded-lg p-4 bg-muted/20 relative overflow-hidden">
        <svg width="100%" height={dimensions.height} viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}>
          {/* Render edges */}
          <svg>
            {tasks.flatMap(task =>
              (task.blocked_by || []).map(d => ({ from: d.depends_on_task_id, to: task.id }))
            ).map((edge, i) => {
              const from = positions.find(n => n.id === edge.from);
              const to = positions.find(n => n.id === edge.to);
              if (!from || !to) return null;

              return (
                <line
                  key={i}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.6"
                />
              );
            })}
          </svg>

          {/* Render nodes */}
          {positions.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.completed ? 15 : 20}
                fill={node.completed ? "#10b981" : getPriorityColor(node.priority)}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer hover:opacity-80"
                onClick={() => {
                  const task = tasks.find(t => t.id === node.id);
                  if (task) onTaskClick(task);
                }}
              />
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                fontSize="10"
                fill="white"
                fontWeight="bold"
                className="pointer-events-none"
              >
                {node.name.substring(0, 3).toUpperCase()}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-medium">Blocked Tasks</h4>
        {blockedTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">No blocked tasks</p>
        ) : (
          blockedTasks.map(task => (
            <div
              key={task.id}
              className="text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded flex items-center gap-2"
            >
              <span className="w-2 h-2 bg-red-500 rounded-full" />
              <span
                className="flex-1 cursor-pointer hover:underline"
                onClick={() => onTaskClick(task)}
              >
                {task.name}
              </span>
              <span className="text-xs text-muted-foreground">
                blocked by {task.blocked_by!.length} task{task.blocked_by!.length > 1 ? 's' : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}