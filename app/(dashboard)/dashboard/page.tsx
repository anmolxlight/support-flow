'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { LoadingState } from '@/components/LoadingState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Phone, Clock, TrendingUp, RefreshCw, Users, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalCalls: number;
  averageDuration: number;
  totalDuration: number;
  successRate: number;
  callsData: Array<{ date: string; calls: number }>;
  successData: Array<{ date: string; rate: number }>;
  topAgents: Array<{ agentId: string; agentName: string; calls: number }>;
  languages: Array<{ language: string; count: number }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/stats?days=30');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');

      // Set empty stats on error
      setStats({
        totalCalls: 0,
        averageDuration: 0,
        totalDuration: 0,
        successRate: 0,
        callsData: [],
        successData: [],
        topAgents: [],
        languages: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const chartTooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '0.5rem',
    color: 'hsl(var(--foreground))',
  };

  if (loading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-2xl bg-destructive/10 p-4">
            <Phone className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Failed to load dashboard</h3>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={loadStats} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your workspace performance
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Calls"
          value={stats?.totalCalls.toString() || '0'}
          icon={Phone}
          trend={{ value: '12%', positive: true }}
        />
        <MetricCard
          title="Average Duration"
          value={stats ? formatDuration(stats.averageDuration) : '0:00'}
          icon={Clock}
        />
        <MetricCard
          title="Total Duration"
          value={stats ? formatTotalDuration(stats.totalDuration) : '0m'}
          subtitle="all calls"
          icon={TrendingUp}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Call Volume Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Call Volume</CardTitle>
            <span className="text-xs text-muted-foreground">Last 30 days</span>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.callsData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Success Rate Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Success Rate</CardTitle>
            <span className="text-xs text-muted-foreground">Last 30 days</span>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.successData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`${value}%`, 'Rate']} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Agent & Language breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Agents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Agents</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.topAgents.length > 0 ? (
              <div className="space-y-4">
                {stats.topAgents.map((agent, index) => (
                  <div key={agent.agentId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {agent.agentName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{agent.agentName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${(agent.calls / Math.max(...stats.topAgents.map((a) => a.calls))) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
                        {agent.calls}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-xl bg-muted p-3 mb-3">
                  <Users className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-foreground">No agent data collected</p>
                <p className="text-xs text-muted-foreground mt-1">Make some calls to see agent statistics</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Language Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Language Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.languages.length > 0 ? (
              <div className="space-y-4">
                {stats.languages.slice(0, 5).map((lang, index) => {
                  const percentage = stats.totalCalls > 0 ? (lang.count / stats.totalCalls) * 100 : 0;
                  return (
                    <div key={lang.language}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium">{lang.language}</span>
                        <span className="text-sm text-muted-foreground">
                          {lang.count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full rounded-full bg-muted h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: `hsl(${246 - index * 30}, 75%, ${60 - index * 8}%)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-xl bg-muted p-3 mb-3">
                  <Globe className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-foreground">No language data collected</p>
                <p className="text-xs text-muted-foreground mt-1">Language is detected from call transcripts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
