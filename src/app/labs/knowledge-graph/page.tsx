'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain,
  Network,
  Lightbulb,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSession } from 'next-auth/react';

interface TaskConnection {
  id: number;
  source_task_id: number;
  target_task_id: number;
  connection_type: string;
  strength: number;
  notes: string | null;
  source_name?: string;
  target_name?: string;
}

interface DecisionEntry {
  id: number;
  task_id?: number | null;
  decision_type: string;
  question: string;
  outcome?: string | null;
  outcome_rating?: number | null;
  created_at: string;
}

interface ConnectionNode {
  id: number;
  name: string;
  type: 'task' | 'decision';
  priority?: string;
  strength: number;
}

export default function KnowledgeGraphPage() {
  const { status } = useSession();
  const router = useRouter();

  const [connections, setConnections] = useState<TaskConnection[]>([]);
  const [decisions, setDecisions] = useState<DecisionEntry[]>([]);
  const [nodes, setNodes] = useState<ConnectionNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const loadKnowledgeGraph = async () => {
    setLoading(true);
    try {
      const [connectionsRes, decisionsRes] = await Promise.all([
        fetch('/api/task-connections'),
        fetch('/api/decisions'),
      ]);

      const connectionsData = await connectionsRes.json();
      const decisionsData = await decisionsRes.json();

      setConnections(connectionsData.connections || []);
      setDecisions(decisionsData.decisions || []);

      // Build nodes from connections and decisions
      const nodeMap = new Map<number, ConnectionNode>();

      // Add connection nodes
      for (const conn of (connectionsData.connections || [])) {
        // Source task
        if (!nodeMap.has(conn.source_task_id)) {
          nodeMap.set(conn.source_task_id, {
            id: conn.source_task_id,
            name: conn.source_name || `Task ${conn.source_task_id}`,
            type: 'task',
            strength: 0,
          });
        }

        // Target task
        if (!nodeMap.has(conn.target_task_id)) {
          nodeMap.set(conn.target_task_id, {
            id: conn.target_task_id,
            name: conn.target_name || `Task ${conn.target_task_id}`,
            type: 'task',
            strength: 0,
          });
        }
      }

      // Add decision nodes
      for (const dec of (decisionsData.decisions || [])) {
        if (!nodeMap.has(dec.id)) {
          nodeMap.set(dec.id, {
            id: dec.id,
            name: dec.question.substring(0, 40) + '...',
            type: 'decision',
            strength: dec.outcome_rating !== null ? Math.abs(dec.outcome_rating) : 0,
          });
        }
      }

      setNodes(Array.from(nodeMap.values()));
    } catch (error) {
      console.error('Failed to load knowledge graph:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    loadKnowledgeGraph();
  }, []);

  const filteredNodes = nodes.filter(node =>
    node.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Knowledge Graph
          </h1>
          <p className="text-muted-foreground">
            Visualize connections between tasks, decisions, and outcomes
          </p>
        </div>
        <Button variant="outline" onClick={loadKnowledgeGraph}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{connections.length}</p>
            <p className="text-xs text-muted-foreground">task relationships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Decisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{decisions.length}</p>
            <p className="text-xs text-muted-foreground">recorded decisions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Avg Strength
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {connections.length > 0
                ? (connections.reduce((sum, c) => sum + c.strength, 0) / connections.length).toFixed(2)
                : '0.00'}
            </p>
            <p className="text-xs text-muted-foreground">relationship strength</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Nodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{filteredNodes.length}</p>
            <p className="text-xs text-muted-foreground">graph nodes</p>
          </CardContent>
        </Card>
      </div>

      {/* Graph View */}
      <Card>
        <CardHeader>
          <CardTitle>Graph Visualization</CardTitle>
          <CardDescription>
            Click and drag to explore connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading knowledge graph...</p>
              </div>
            </div>
          ) : filteredNodes.length > 0 ? (
            <div className="h-96 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg overflow-hidden relative p-4">
              {/* Simple visualization placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8">
                  <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <h3 className="font-medium mb-2">Interactive Graph View</h3>
                  <p className="text-muted-foreground mb-4">
                    Connect decisions to tasks and visualize relationships
                  </p>
                  <Button variant="outline" onClick={() => router.push('/labs/decision-journal')}>
                    View Decisions
                  </Button>
                </div>
              </div>

              {/* Render nodes */}
              {filteredNodes.slice(0, 12).map((node, index) => (
                <div
                  key={node.id}
                  className="absolute bg-background border rounded-lg p-3 shadow-sm max-w-xs
                    hover:shadow-md transition-shadow"
                  style={{
                    top: `${20 + (index * 12) % 70}%`,
                    left: `${10 + (Math.floor(index / 6) * 14)}%`,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {node.type === 'task' ? (
                        <Brain className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {node.type === 'task' ? 'TASK' : 'DECISION'}
                        </span>
                        {node.strength > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {node.strength.toFixed(2)} strength
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{node.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center p-8">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="font-medium mb-2">No connections yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create task connections and decisions to build your knowledge graph
                </p>
                <Button variant="outline" onClick={() => router.push('/labs/decision-journal')}>
                  Start Making Decisions
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full" variant="outline" onClick={() => router.push('/labs/decision-journal')}>
                Record Decision
              </Button>
              <Button variant="outline" className="w-full">
                Link Tasks
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                Analyze Patterns
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Learning Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Connection Strength</h4>
                <p className="text-sm text-muted-foreground">
                  {connections.length > 0
                    ? `Your average connection strength is ${(connections.reduce((sum, c) => sum + c.strength, 0) / connections.length).toFixed(2)}. ` +
                      (connections.some(c => c.strength > 0.7)
                        ? 'Strong connections suggest meaningful relationships.'
                        : 'Focus on recording more decision outcomes.')
                    : 'No connection data yet. Start recording decisions and linking tasks.'}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Pattern Detection</h4>
                <p className="text-sm text-muted-foreground">
                  {connections.length > 0
                    ? 'Identifying recurring patterns in your task relationships...'
                    : 'Complete more tasks to identify patterns'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}