'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  Coins,
  Clock,
  CheckCircle2,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getMarketplaceListings,
  claimMarketplaceListing,
  completeMarketplaceListing,
  getUserListings,
} from '@/lib/actions/task-marketplace';
import { fetchTasks } from '@/lib/actions/api-wrappers';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface MarketplaceListing {
  id: number;
  task_id: number;
  task_name: string;
  task_description: string;
  seller_id: number;
  seller_name: string;
  price_xp: number;
  estimated_hours: number;
  required_skills: string[];
  status: 'available' | 'claimed' | 'completed' | 'cancelled';
  claimed_by: number | null;
  category: string;
}

const CATEGORIES = [
  'all',
  'development',
  'design',
  'writing',
  'research',
  'marketing',
  'admin',
  'other',
];

export function TaskMarketplace() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  interface TaskBasic {
  id: number;
  name: string;
  completed?: boolean;
  archived?: boolean;
}

  const [myTasks, setMyTasks] = useState<TaskBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const { user } = useAuth();

  // Create listing form
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [priceXp, setPriceXp] = useState('50');
  const [estimatedHours, setEstimatedHours] = useState('2');
  const [requiredSkills, setRequiredSkills] = useState('');

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [list, mine, tasks] = await Promise.all([
        getMarketplaceListings({
          category: category === 'all' ? undefined : category,
          limit: 50,
        }),
        getUserListings(user.id),
        fetchTasks({ limit: 100 }),
      ]);
      setListings(list);
      setMyListings(mine);
      // Filter out completed/archived tasks
      setMyTasks(tasks.filter(t => !t.completed && !t.archived));
    } catch (error) {
      console.error('Failed to load marketplace:', error);
    } finally {
      setLoading(false);
    }
  }, [user, category]);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id, category, loadData]);

  const handleClaim = async (listingId: number) => {
    try {
      const success = await claimMarketplaceListing(listingId);
      if (success) {
        toast.success('Task claimed! You can now work on it.');
        await loadData();
      } else {
        toast.error('Failed to claim task');
      }
    } catch (error) {
      console.error('Failed to claim:', error);
      toast.error('Failed to claim task');
    }
  };

  const handleComplete = async (listingId: number) => {
    try {
      const success = await completeMarketplaceListing(listingId);
      if (success) {
        toast.success('Task completed! XP transferred.');
        await loadData();
      } else {
        toast.error('Failed to complete task');
      }
    } catch (error) {
      console.error('Failed to complete:', error);
      toast.error('Failed to complete task');
    }
  };

  const handleCreateListing = async () => {
    if (!selectedTaskId || !priceXp) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: Number(selectedTaskId),
          price_xp: Number(priceXp),
          estimated_hours: Number(estimatedHours),
          required_skills: requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
          category: category === 'all' ? 'other' : category,
        }),
      });

      if (response.ok) {
        toast.success('Listing created!');
        setShowCreate(false);
        setSelectedTaskId('');
        setRequiredSkills('');
        await loadData();
      }
    } catch (error) {
      console.error('Failed to create listing:', error);
      toast.error('Failed to create listing');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="browse" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="mine">My Listings</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Select value={category} onValueChange={(v) => setCategory(v ?? 'all')}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger>
                <Button size="sm">
                  <ShoppingBag className="h-4 w-4 mr-1" />
                  Create Listing
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>List Task on Marketplace</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="task-select">Task to Delegate</Label>
                    <Select value={selectedTaskId} onValueChange={(v) => setSelectedTaskId(v ?? '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a task..." />
                      </SelectTrigger>
                      <SelectContent>
                        {myTasks.map(task => (
                          <SelectItem key={task.id} value={String(task.id)}>
                            {task.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="price">Price (XP)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={priceXp}
                        onChange={e => setPriceXp(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="hours">Est. Hours</Label>
                      <Input
                        id="hours"
                        type="number"
                        value={estimatedHours}
                        onChange={e => setEstimatedHours(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="skills">Required Skills (comma-separated)</Label>
                    <Input
                      id="skills"
                      value={requiredSkills}
                      onChange={e => setRequiredSkills(e.target.value)}
                      placeholder="e.g., development, design"
                    />
                  </div>

                  <Button onClick={handleCreateListing} className="w-full">
                    Create Listing
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="browse">
          {listings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No listings available in this category</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {listings.map(listing => (
                <Card key={listing.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {listing.task_name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <User className="h-3 w-3 inline mr-1" />
                          {listing.seller_name}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        <Coins className="h-3 w-3 mr-1" />
                        {listing.price_xp} XP
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {listing.task_description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {listing.task_description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {listing.estimated_hours}h
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {listing.category}
                        </Badge>
                      </div>

                      {listing.required_skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {listing.required_skills.map((skill: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {listing.seller_id !== user?.id && (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleClaim(listing.id)}
                        >
                          Claim Task
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine">
          {myListings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>You haven&apos;t created or claimed any listings yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myListings.map(listing => (
                <Card key={listing.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{listing.task_name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={
                            listing.status === 'completed' ? 'default' :
                            listing.status === 'claimed' ? 'secondary' : 'outline'
                          }>
                            {listing.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {listing.price_xp} XP
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {listing.status === 'available' && listing.seller_id === user?.id && (
                          <Badge variant="outline">Waiting for claim</Badge>
                        )}
                        {listing.status === 'claimed' && listing.claimed_by === user?.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleComplete(listing.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}