'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plug2,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  Download,
  Settings,
  RefreshCw,
  Search,
  Filter,
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface Integration {
  id: number;
  name: string;
  type: string;
  provider: string;
  status: 'active' | 'pending' | 'error' | 'disconnected';
  last_synced_at?: string;
  sync_enabled: boolean;
  config: string;
}

interface MarketplaceIntegration {
  id: string;
  name: string;
  type: string;
  description: string;
  icon: string;
  provider: string;
  featured: boolean;
  auth_methods: string[];
  status: 'available' | 'installed' | 'incompatible';
  ratings?: {
    average: number;
    count: number;
  };
  last_updated: string;
}

interface IntegrationMarketplaceProps {
  userId?: number;
}

export function IntegrationMarketplace({
  userId = 1,
}: IntegrationMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [installedIntegrations, setInstalledIntegrations] = useState<
    Integration[]
  >([]);
  const [marketplaceIntegrations, setMarketplaceIntegrations] = useState<
    MarketplaceIntegration[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>(
    'marketplace'
  );

  useEffect(() => {
    loadData();
  }, [selectedCategory, searchQuery]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [installedRes, marketplaceRes] = await Promise.all([
        fetch(`/api/integrations`).catch(() => ({
          json: () => ({ integrations: [] }),
        })),
        fetch(
          `/api/integrations/marketplace?category=${selectedCategory}${searchQuery ? `&q=${searchQuery}` : ''}`
        ),
      ]);

      if (installedRes) {
        const installedData = await installedRes.json();
        setInstalledIntegrations(installedData.integrations || []);
      }

      if (marketplaceRes) {
        const marketplaceData = await marketplaceRes.json();
        setMarketplaceIntegrations(marketplaceData || []);
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstall = async (integrationId: string) => {
    try {
      await fetch(`/api/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:
            marketplaceIntegrations.find(i => i.id === integrationId)?.name ||
            'Integration',
          type:
            marketplaceIntegrations.find(i => i.id === integrationId)?.type ||
            'other',
          provider:
            marketplaceIntegrations.find(i => i.id === integrationId)
              ?.provider || 'unknown',
        }),
      });
      loadData();
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const handleSync = async (integrationId: number) => {
    await fetch(`/api/integrations/${integrationId}/sync`, { method: 'POST' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Plug2 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRating = (avg: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= avg) {
        stars.push(
          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        );
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />);
      }
    }
    return stars;
  };

  const filteredMarketplace = marketplaceIntegrations.filter(
    i =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Integration Marketplace</h2>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Integrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {installedIntegrations.filter(i => i.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Integrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {installedIntegrations.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {installedIntegrations.find(i => i.last_synced_at)
                ?.last_synced_at || 'Never'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Marketplace</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {marketplaceIntegrations.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab as any}>
        <TabsList>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="installed">Installed</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace">
          {/* Marketplace View */}
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search integrations..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory as any}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="calendar">Calendar</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="project_mgmt">
                    Project Management
                  </SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Integrations Grid */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading marketplace...</p>
              </div>
            ) : filteredMarketplace.length === 0 ? (
              <div className="text-center py-12">
                <Plug2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No integrations found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMarketplace.map(integration => (
                  <motion.div
                    key={integration.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.random() * 0.1 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{integration.name}</CardTitle>
                            <CardDescription>
                              {integration.description}
                            </CardDescription>
                          </div>
                          {integration.ratings && (
                            <div className="flex items-center gap-1">
                              {getRating(integration.ratings.average)}
                              <span className="text-xs text-muted-foreground">
                                ({integration.ratings.count})
                              </span>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              {integration.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {integration.provider}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleInstall(integration.id)}
                            disabled={integration.status !== 'available'}
                          >
                            {integration.status === 'installed'
                              ? 'Installed'
                              : 'Install'}
                            {integration.status !== 'installed' && (
                              <Download className="h-4 w-4 ml-2" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="installed">
          {/* Installed Integrations View */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading integrations...</p>
              </div>
            ) : installedIntegrations.length === 0 ? (
              <div className="text-center py-12">
                <Plug2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  No integrations installed yet
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setActiveTab('marketplace' as any)}
                >
                  Browse Marketplace
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {installedIntegrations.map(integration => (
                  <Card key={integration.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{integration.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {integration.provider} • {integration.type}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(integration.status)}
                              <span className="text-sm">
                                {integration.status.charAt(0).toUpperCase() +
                                  integration.status.slice(1)}
                              </span>
                            </div>
                            {integration.last_synced_at && (
                              <div className="text-xs text-muted-foreground">
                                Last synced:{' '}
                                {new Date(
                                  integration.last_synced_at
                                ).toLocaleString()}
                              </div>
                            )}
                          </div>

                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>

                          {integration.sync_enabled && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSync(integration.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {!integration.sync_enabled && (
                        <div className="mt-3 pt-3 border-t">
                          <Button variant="link" size="sm">
                            Enable automatic sync
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
