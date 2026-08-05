"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Network,
  Target,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  TrendingDown,
  Plus,
  Settings,
  Download,
  Upload,
  RefreshCw,
  Filter,
  Search,
  Zap,
  Brain,
  Link2,
  MousePointer,
  Maximize2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import type { TaskWithRelations } from "@/types";
import type { TaskConnection, TaskInsight, UserSkill, HabitContext, TaskConnectionType } from "@/types";
import { toast } from "sonner";

// TypeScript fallback for react-forcegraph
// Since react-forcegraph might not be installed, we'll create a simplified version
// that provides the necessary interface without requiring the package

// Type definitions for fallback
interface ForceGraphInstance {
  zoomToFit(): void;
  zoom: (level: number) => void;
  centerAt(): void;
}

interface ForceGraphProps {
  graphData: any;
  onNodeClick?: (node: any) => void;
  onLinkClick?: (link: any) => void;
  nodeRelSize?: number;
  nodeAutoColorBy?: string;
  nodeLabel?: string;
  linkLabel?: string;
  linkColor?: (link: any) => string;
  onNodeDragEnd?: (node: any) => void;
}

// Fallback component when react-forcegraph is not available
const FallbackForceGraph: React.FC<ForceGraphProps> = ({
  graphData,
  onNodeClick,
  onLinkClick,
  nodeAutoColorBy = "group",
  nodeLabel = "name",
  linkColor
}) => {
  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg">
      <div className="text-center max-w-md p-6">
        <Network className="h-16 w-16 mx-auto mb-4 text-purple-500/50" />
        <h3 className="text-lg font-semibold mb-2">Interactive Knowledge Graph</h3>
        <p className="text-muted-foreground mb-4">
          Advanced force-directed graph visualization showing task relationships,
          skill connections, and habit patterns.
        </p>
        <div className="text-sm space-y-2">
          <div className="flex items-center justify-between p-2 bg-background/50 rounded">
            <span>Nodes:</span>
            <Badge variant="secondary">{graphData.nodes?.length || 0}</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-background/50 rounded">
            <span>Connections:</span>
            <Badge variant="secondary">{graphData.links?.length || 0}</Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-background/50 rounded">
            <span>Task Types:</span>
            <Badge variant="secondary">{graphData.groups?.length || 0}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

interface KnowledgeGraphProps {
  tasks: TaskWithRelations[];
  userId: number;
  onConnectionChange?: () => void;
  className?: string;
}

interface GraphNode {
  id: number;
  name: string;
  type: "task" | "skill" | "insight" | "context";
  group: "completed" | "in_progress" | "planned";
  labels: string[];
  priority: string;
  date?: string;
  skill_level?: number;
  connection_strength?: number;
  x?: number;
  y?: number;
  // Additional properties for the graph
  val?: number; // Node size
  color?: string; // Node color
}

interface GraphLink {
  source: number;
  target: number;
  type: TaskConnectionType;
  strength: number;
  bidir: boolean;
}

interface ConnectionFormData {
  source_task_id: number;
  target_task_id: number;
  connection_type: TaskConnectionType;
  strength: number;
  notes: string;
}

const connectionTypes: { value: TaskConnectionType; label: string; icon: React.ReactNode }[] = [
  { value: "prerequisite", label: "Prerequisite", icon: <Target className="h-3 w-3" /> },
  { value: "inspiration", label: "Inspiration", icon: <Lightbulb className="h-3 w-3" /> },
  { value: "similar", label: "Similar", icon: <TrendingUp className="h-3 w-3" /> },
  { value: "contrast", label: "Contrast", icon: <TrendingDown className="h-3 w-3" /> },
  { value: "related", label: "Related", icon: <Link2 className="h-3 w-3" /> },
  { value: "learned_from", label: "Learned From", icon: <Brain className="h-3 w-3" /> },
];

export function KnowledgeGraph({ tasks, userId, onConnectionChange, className }: KnowledgeGraphProps) {
  const [graphData, setGraphData] = useState<any>({ nodes: [], links: [] });
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [connections, setConnections] = useState<TaskConnection[]>([]);
  const [insights, setInsights] = useState<TaskInsight[]>([]);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [habitContexts, setHabitContexts] = useState<HabitContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<TaskConnection | null>(null);
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [viewMode, setViewMode] = useState("graph"); // "graph", "connections", "insights", "skills"
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoLayout, setAutoLayout] = useState(true);

  const graphContainerRef = useRef<HTMLDivElement>(null);

  // Fetch knowledge graph data
  useEffect(() => {
    loadKnowledgeGraphData();
  }, [userId]);

  const loadKnowledgeGraphData = async () => {
    try {
      setLoading(true);
      // This will be connected to real API endpoints in a real implementation
      // For now, generate mock data based on available tasks

      const mockNodes: GraphNode[] = [];
      const mockConnections: TaskConnection[] = [];
      const mockInsights: TaskInsight[] = [];
      const mockSkills: UserSkill[] = [];
      const mockHabitContexts: HabitContext[] = [];

      // Generate nodes from tasks
      tasks.forEach(task => {
        const node: GraphNode = {
          id: task.id,
          name: task.name,
          type: "task",
          group: task.completed ? "completed" : (task.date && new Date(task.date) < new Date() ? "in_progress" : "planned"),
          labels: task.labels?.map(l => l.name) || [],
          priority: task.priority,
          date: task.date || undefined,
          skill_level: task.completed ? Math.min(5, Math.floor(Math.random() * 3) + 1) : undefined,
          connection_strength: task.blockers?.length ? 1 / Math.max(task.blockers.length, 1) : 0.5,
          val: task.labels?.length || 3,
          color: getPriorityColor(task.priority),
        };
        mockNodes.push(node);
      });

      // Generate insights from tasks
      const completedTasks = tasks.filter(t => t.completed);
      if (completedTasks.length > 0) {
        mockInsights.push({
          id: 1,
          task_id: completedTasks[0].id,
          user_id: userId,
          insight_type: "pattern_observed",
          content: "You tend to complete high-priority tasks most frequently",
          context_tags: JSON.stringify(["priority", "completion"]),
          confidence: 0.8,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Generate skills from task patterns
      if (completedTasks.length > 0) {
        const taskPatterns = generateTaskPatterns(completedTasks);
        mockSkills.push(...taskPatterns.map((skill, index) => ({
          id: index + 1,
          user_id: userId,
          skill_name: skill.name,
          proficiency_level: skill.level,
          evidence_task_ids: skill.examples,
          last_used_at: completedTasks[0]?.completed_at || null,
          created_at: new Date().toISOString(),
        })));
      }

      // Set the state
      setNodes(mockNodes);
      setConnections(mockConnections);
      setInsights(mockInsights);
      setSkills(mockSkills);
      setHabitContexts(mockHabitContexts);

      // Update graph data
      updateGraphData(mockNodes, mockConnections);

    } catch (error) {
      console.error('Failed to load knowledge graph data:', error);
      toast.error('Failed to load knowledge graph data');
    } finally {
      setLoading(false);
    }
  };

  const generateTaskPatterns = (completedTasks: TaskWithRelations[]): any[] => {
    const skillMap = new Map<string, { count: number; examples: number[] }>();

    completedTasks.forEach(task => {
      const taskName = task.name.toLowerCase();
      const taskDesc = (task.description || '').toLowerCase();
      const combined = taskName + ' ' + taskDesc;

      // Simple skill pattern matching
      const keywords = {
        'design': ['design', 'ui', 'ux', 'interface'],
        'development': ['code', 'develop', 'implement', 'software'],
        'research': ['research', 'analyze', 'study'],
        'writing': ['write', 'document', 'content'],
        'leadership': ['lead', 'manage', 'team'],
        'planning': ['plan', 'schedule', 'organize'],
      };

      Object.entries(keywords).forEach(([skill, words]) => {
        if (words.some(word => combined.includes(word))) {
          if (!skillMap.has(skill)) {
            skillMap.set(skill, { count: 0, examples: [] });
          }
          skillMap.get(skill)!.count++;
          skillMap.get(skill)!.examples.push(task.id);
        }
      });
    });

    return Array.from(skillMap.entries()).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1) + ' Work',
      level: Math.min(5, Math.floor(data.count / 2) + 1),
      examples: data.examples,
    }));
  };

  const updateGraphData = (nodes: GraphNode[], connections: TaskConnection[]) => {
    // Transform nodes for visualization
    const visNodes = nodes.map(node => ({
      id: node.id,
      name: node.name,
      group: node.group,
      type: node.type,
      color: getNodeColor(node),
      size: getNodeSize(node),
      labels: node.labels,
      priority: node.priority,
    }));

    // Transform connections for visualization
    const visLinks = connections.map(conn => ({
      source: conn.source_task_id,
      target: conn.target_task_id,
      type: conn.connection_type,
      strength: conn.strength,
      bidir: false,
      color: getConnectionColor(conn.connection_type),
    }));

    setGraphData({
      nodes: visNodes,
      links: visLinks,
      groups: [...new Set(nodes.map(n => n.group))],
    });
  };

  const getPriorityColor = (priority: string): string => {
    const colors = {
      'critical': '#ef4444',
      'high': '#f97316',
      'medium': '#eab308',
      'low': '#22c55e',
      'none': '#6b7280',
    };
    return colors[priority as keyof typeof colors] || '#6b7280';
  };

  const getInsightIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      'lesson_learned': <Lightbulb className="h-4 w-4" />,
      'pattern_observed': <TrendingUp className="h-4 w-4" />,
      'success_factor': <CheckCircle className="h-4 w-4" />,
      'failure_reason': <AlertCircle className="h-4 w-4" />,
    };
    return icons[type] || <Brain className="h-4 w-4" />;
  };

  const getInsightColor = (type: string): string => {
    const colors: Record<string, string> = {
      'lesson_learned': 'bg-blue-500/10 border-blue-500/20',
      'pattern_observed': 'bg-green-500/10 border-green-500/20',
      'success_factor': 'bg-emerald-500/10 border-emerald-500/20',
      'failure_reason': 'bg-orange-500/10 border-orange-500/20',
    };
    return colors[type] || 'bg-purple-500/10 border-purple-500/20';
  };

  const getNodeColor = (node: GraphNode): string => {
    if (node.type === "task") {
      return getPriorityColor(node.priority);
    } else if (node.type === "skill") {
      return node.skill_level && node.skill_level >= 4 ? '#10b981' : '#3b82f6';
    } else if (node.type === "insight") {
      return '#8b5cf6';
    } else {
      return '#f59e0b';
    }
  };

  const getNodeSize = (node: GraphNode): number => {
    if (node.type === "skill") {
      return node.skill_level && node.skill_level >= 4 ? 15 : 10;
    }
    return 8;
  };

  const getConnectionColor = (type: TaskConnectionType): string => {
    const colors = {
      'prerequisite': '#ef4444',
      'inspiration': '#10b981',
      'similar': '#3b82f6',
      'contrast': '#f59e0b',
      'related': '#8b5cf6',
      'learned_from': '#ec4899',
    };
    return colors[type] || '#6b7280';
  };

  const handleNodeClick = (node: any) => {
    const selectedNodeData = nodes.find(n => n.id === node.id);
    if (selectedNodeData) {
      setSelectedNode(selectedNodeData);
      setSelectedLink(null);
    }
  };

  const handleLinkClick = (link: any) => {
    const connection = connections.find(c =>
      (c.source_task_id === link.source && c.target_task_id === link.target) ||
      (c.source_task_id === link.target && c.target_task_id === link.source)
    );
    if (connection) {
      setSelectedLink(connection);
      setSelectedNode(null);
      setShowConnectionForm(false);
    }
  };

  const handleNodeDragEnd = (node: any) => {
    // Node position update is handled by the graph component internally
    // This callback can be used for side effects if needed
    console.log("Node dragged:", node.id, node.name);
  };

  const openConnectionForm = () => {
    if (tasks.length < 2) {
      toast.error('Need at least 2 tasks to create a connection');
      return;
    }
    setShowConnectionForm(true);
  };

  const createConnection = async (data: ConnectionFormData) => {
    try {
      // Simulate API call
      const newConnection: TaskConnection = {
        id: Date.now(),
        source_task_id: data.source_task_id,
        target_task_id: data.target_task_id,
        connection_type: data.connection_type,
        strength: data.strength,
        notes: data.notes,
        created_at: new Date().toISOString(),
      };

      setConnections(prev => [...prev, newConnection]);
      updateGraphData(nodes, [...connections, newConnection]);

      toast.success('Task connection created successfully');
      setShowConnectionForm(false);
      onConnectionChange && onConnectionChange();
    } catch (error) {
      console.error('Failed to create connection:', error);
      toast.error('Failed to create task connection');
    }
  };

  const deleteConnection = async (connectionId: number) => {
    try {
      const updatedConnections = connections.filter(c => c.id !== connectionId);
      setConnections(updatedConnections);
      updateGraphData(nodes, updatedConnections);

      toast.success('Task connection deleted');
    } catch (error) {
      console.error('Failed to delete connection:', error);
      toast.error('Failed to delete task connection');
    }
  };

  const exportGraph = () => {
    const dataStr = JSON.stringify(graphData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportName = `knowledge-graph-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();

    toast.success('Graph exported successfully');
  };

  const filteredData = () => {
    let filteredNodes = nodes;

    // Filter by type
    if (filterType !== 'all') {
      filteredNodes = nodes.filter(n => {
        if (filterType === 'tasks' && n.type === 'task') return true;
        if (filterType === 'skills' && n.type === 'skill') return true;
        if (filterType === 'insights' && n.type === 'insight') return true;
        if (filterType === 'contexts' && n.type === 'context') return true;
        if (filterType === 'completed' && n.group === 'completed') return true;
        if (filterType === 'in_progress' && n.group === 'in_progress') return true;
        if (filterType === 'planned' && n.group === 'planned') return true;
        return false;
      });
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(n => n.name.toLowerCase().includes(query) || n.labels.some(l => l.toLowerCase().includes(query)));
    }

    return { nodes: filteredNodes, links: connections }; // Return with connections included
  };

  const renderGraph = () => {
    const filtered = filteredData();

    return (
      <div ref={graphContainerRef} className="relative w-full h-96 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
        <FallbackForceGraph
          graphData={filtered}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          nodeRelSize={12}
          nodeAutoColorBy="group"
          nodeLabel="name"
          linkLabel="type"
          linkColor={(link) => getConnectionColor(link.type)}
          onNodeDragEnd={handleNodeDragEnd}
        />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg p-3 border">
          <h4 className="text-sm font-semibold mb-2">Legend</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" /> <span>Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" /> <span>High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" /> <span>Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" /> <span>Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" /> <span>Skill</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderConnectionsPanel = () => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Task Connections</h3>
          <Dialog open={showConnectionForm} onOpenChange={setShowConnectionForm}>
            <DialogTrigger>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Task Connection</DialogTitle>
                <DialogDescription>
                  Create a semantic relationship between two tasks to show how they relate to each other.
                </DialogDescription>
              </DialogHeader>
              <ConnectionForm onSubmit={createConnection} onCancel={() => setShowConnectionForm(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {connections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No task connections yet.</p>
            <p className="text-sm">Create connections to visualize relationships between tasks</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {connections.map((conn) => {
              const sourceTask = tasks.find(t => t.id === conn.source_task_id);
              const targetTask = tasks.find(t => t.id === conn.target_task_id);

              return (
                <Card key={conn.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {connectionTypes.find(t => t.value === conn.connection_type)?.label || conn.connection_type}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          Strength: {Math.round(conn.strength * 100)}%
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteConnection(conn.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium mb-1">
                        {sourceTask?.name} → {targetTask?.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {connectionTypes.find(t => t.value === conn.connection_type)?.icon} {conn.connection_type.replace('_', ' ')}
                      </div>
                      {conn.notes && (
                        <div className="text-xs mt-1 italic">
                          "{conn.notes}"
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const ConnectionForm = ({ onSubmit, onCancel }: { onSubmit: (data: ConnectionFormData) => void; onCancel: () => void }) => {
    const [formData, setFormData] = useState<ConnectionFormData>({
      source_task_id: tasks[0]?.id || 0,
      target_task_id: tasks[1]?.id || 0,
      connection_type: "prerequisite",
      strength: 0.5,
      notes: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.source_task_id === formData.target_task_id) {
        toast.error('Source and target tasks cannot be the same');
        return;
      }
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="source">Source Task</Label>
          <Select
            value={formData.source_task_id.toString()}
            onValueChange={(value) => { if (value !== null) setFormData(prev => ({ ...prev, source_task_id: parseInt(value) })); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source task" />
            </SelectTrigger>
            <SelectContent>
              {tasks.map(task => (
                <SelectItem key={task.id} value={task.id.toString()}>
                  {task.name} {task.completed ? '(completed)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target">Target Task</Label>
          <Select
            value={formData.target_task_id.toString()}
            onValueChange={(value) => { if (value !== null) setFormData(prev => ({ ...prev, target_task_id: parseInt(value) })); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select target task" />
            </SelectTrigger>
            <SelectContent>
              {tasks.map(task => (
                <SelectItem key={task.id} value={task.id.toString()}>
                  {task.name} {task.completed ? '(completed)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Connection Type</Label>
          <Select
            value={formData.connection_type}
            onValueChange={(value) => { if (value !== null) setFormData(prev => ({ ...prev, connection_type: value })); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select connection type" />
            </SelectTrigger>
            <SelectContent>
              {connectionTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    {type.icon}
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Connection Strength: {Math.round(formData.strength * 100)}%</Label>
          <Slider
            min={0}
            max={1}
            step={0.1}
            value={[formData.strength]}
            onValueChange={(value) => setFormData(prev => ({ ...prev, strength: value[0] }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Add any additional context about this connection..."
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Create Connection
          </Button>
        </div>
      </form>
    );
  };

  const renderInsightsPanel = () => {
    return (
      <div className="space-y-4">
        {insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No insights available yet.</p>
            <p className="text-sm">Insights will appear as you complete more tasks</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {insights.map((insight) => (
              <Card key={insight.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3 mb-3">
                    {getInsightIcon(insight.insight_type)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">{insight.content}</h3>
                      <p className="text-sm text-muted-foreground">Context: {insight.context_tags}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(insight.confidence * 100)}%
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {insight.context_tags && JSON.parse(insight.context_tags).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSkillsPanel = () => {
    return (
      <div className="space-y-4">
        {skills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No skills tracked yet.</p>
            <p className="text-sm">Complete tasks to build your skills profile</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {skills.map((skill) => (
              <Card key={skill.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{skill.skill_name}</h3>
                    <Badge variant="secondary">
                      Level {skill.proficiency_level}/5
                    </Badge>
                  </div>
                  <Progress value={(skill.proficiency_level / 5) * 100} className="h-2 mb-2" />
                  <div className="text-sm text-muted-foreground">
                    Based on {skill.evidence_task_ids ? JSON.parse(skill.evidence_task_ids).length : 0} task{skill.evidence_task_ids && JSON.parse(skill.evidence_task_ids).length !== 1 ? 's' : ''}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Knowledge Graph Controls
          </CardTitle>
          <CardDescription>
            Navigate and configure your task knowledge graph
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterType} onValueChange={(value) => setFilterType(value ?? "all")}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="tasks">Tasks Only</SelectItem>
                <SelectItem value="skills">Skills Only</SelectItem>
                <SelectItem value="insights">Insights Only</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
              </SelectContent>
            </Select>

            <Switch
              id="auto-layout"
              checked={autoLayout}
              onCheckedChange={setAutoLayout}
            />
            <Label htmlFor="auto-layout" className="text-sm">
              Auto layout
            </Label>

            <Button
              variant="outline"
              size="sm"
              onClick={exportGraph}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={openConnectionForm}
              className="flex items-center gap-2"
            >
              <Link2 className="h-4 w-4" />
              Add Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {viewMode === "graph" && renderGraph()}
          {viewMode === "connections" && renderConnectionsPanel()}
          {viewMode === "insights" && renderInsightsPanel()}
          {viewMode === "skills" && renderSkillsPanel()}
        </div>

        {/* Right Panel - Details */}
        <div className="space-y-4">
          {selectedNode && (
            <Card>
              <CardHeader>
                <CardTitle>Node Details</CardTitle>
                <CardDescription>
                  Information about the selected node
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Name:</Label>
                    <p className="text-sm">{selectedNode.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Type:</Label>
                    <Badge variant="outline" className="text-xs mt-1">
                      {selectedNode.type}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status:</Label>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {selectedNode.group}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Priority:</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(selectedNode.priority)}`} />
                      <span className="text-sm">{selectedNode.priority}</span>
                    </div>
                  </div>
                  {selectedNode.labels && selectedNode.labels.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Labels:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedNode.labels.map((label, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedLink && (
            <Card>
              <CardHeader>
                <CardTitle>Connection Details</CardTitle>
                <CardDescription>
                  Information about the selected connection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">From:</Label>
                    <p className="text-sm">{tasks.find(t => t.id === selectedLink.source_task_id)?.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">To:</Label>
                    <p className="text-sm">{tasks.find(t => t.id === selectedLink.target_task_id)?.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Type:</Label>
                    <Badge variant="outline" className="text-xs mt-1">
                      {connectionTypes.find(t => t.value === selectedLink.connection_type)?.label || selectedLink.connection_type}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Strength:</Label>
                    <p className="text-sm">{Math.round(selectedLink.strength * 100)}%</p>
                  </div>
                  {selectedLink.notes && (
                    <div>
                      <Label className="text-sm font-medium">Notes:</Label>
                      <p className="text-sm italic">{selectedLink.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {(selectedNode === null && selectedLink === null) && (
            <Card>
              <CardHeader>
                <CardTitle>Graph Statistics</CardTitle>
                <CardDescription>
                  Overview of your knowledge graph
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Nodes:</span>
                    <Badge variant="secondary">{nodes.length}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Connections:</span>
                    <Badge variant="secondary">{connections.length}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Insights:</span>
                    <Badge variant="secondary">{insights.length}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Skills:</span>
                    <Badge variant="secondary">{skills.length}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Completed Tasks:</span>
                    <Badge variant="secondary">{tasks.filter(t => t.completed).length}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Active Connections:</span>
                    <Badge variant="secondary">{connections.filter(c => c.strength > 0.7).length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}