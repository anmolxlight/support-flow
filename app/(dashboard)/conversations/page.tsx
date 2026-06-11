'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, MessageSquare, ChevronDown, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    dateAfter: '',
    dateBefore: '',
    status: 'all',
    agent: 'all',
  });
  const afterInputRef = useRef<HTMLInputElement | null>(null);
  const beforeInputRef = useRef<HTMLInputElement | null>(null);

  const openDatePicker = (ref: React.RefObject<HTMLInputElement>) => {
    if (ref.current) {
      if (typeof (ref.current as any).showPicker === 'function') {
        (ref.current as any).showPicker();
      } else {
        ref.current.click();
      }
    }
  };

  const formatDateLabel = (value: string) => {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    return format(date, 'MMM d, h:mm a');
  };

  const clearDate = (key: 'dateAfter' | 'dateBefore') => (e: React.MouseEvent) => {
    e.stopPropagation();
    setFilters((prev) => ({ ...prev, [key]: '' }));
  };

  const hasActiveFilters = filters.dateAfter || filters.dateBefore || filters.status !== 'all' || filters.agent !== 'all';

  const loadConversations = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page_size', '100');
      queryParams.append('summary_mode', 'exclude');

      if (searchQuery) queryParams.append('search', searchQuery);
      if (filters.agent !== 'all') queryParams.append('agent_id', filters.agent);
      if (filters.status !== 'all') {
        const statusMap: Record<string, string> = {
          successful: 'success',
          failed: 'failure',
          unknown: 'unknown',
        };
        queryParams.append('call_successful', statusMap[filters.status]);
      }

      const response = await fetch(`/api/conversations?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const filteredConversations = conversations.filter((conv) => {
    const startDate = conv.start_time_unix_secs
      ? new Date(conv.start_time_unix_secs * 1000)
      : null;

    if (filters.dateAfter) {
      const after = new Date(filters.dateAfter);
      after.setHours(0, 0, 0, 0);
      if (!startDate || startDate < after) return false;
    }

    if (filters.dateBefore) {
      const before = new Date(filters.dateBefore);
      before.setHours(23, 59, 59, 999);
      if (!startDate || startDate > before) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setFilters({ dateAfter: '', dateBefore: '', status: 'all', agent: 'all' });
  };

  if (loading) {
    return <LoadingState message="Loading conversations..." />;
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conversations</h1>
        <p className="text-sm text-muted-foreground">View and manage all conversations</p>
      </div>

      {conversations.length === 0 && !searchQuery && !hasActiveFilters ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Conversations will appear here once agents start handling calls"
        />
      ) : (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Hidden date inputs */}
            <input
              ref={afterInputRef}
              type="date"
              value={filters.dateAfter}
              onChange={(e) => setFilters({ ...filters, dateAfter: e.target.value })}
              className="sr-only"
              tabIndex={-1}
            />
            <input
              ref={beforeInputRef}
              type="date"
              value={filters.dateBefore}
              onChange={(e) => setFilters({ ...filters, dateBefore: e.target.value })}
              className="sr-only"
              tabIndex={-1}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => openDatePicker(afterInputRef)}
              className="whitespace-nowrap"
            >
              {filters.dateAfter ? (
                <>
                  <span onClick={clearDate('dateAfter')} role="button" className="mr-1 hover:text-foreground">
                    ×
                  </span>
                  After {formatDateLabel(filters.dateAfter)}
                </>
              ) : (
                'Date After'
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => openDatePicker(beforeInputRef)}
              className="whitespace-nowrap"
            >
              {filters.dateBefore ? (
                <>
                  <span onClick={clearDate('dateBefore')} role="button" className="mr-1 hover:text-foreground">
                    ×
                  </span>
                  Before {formatDateLabel(filters.dateBefore)}
                </>
              ) : (
                'Date Before'
              )}
            </Button>

            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="successful">Successful</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>

          {/* Conversations Table */}
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer">
                    <div className="flex items-center gap-1">
                      Date
                      <ChevronDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConversations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <MessageSquare className="mb-2 h-6 w-6 text-muted-foreground/50" />
                        <p className="font-medium text-foreground">No results</p>
                        <p className="text-sm text-muted-foreground">No conversations match your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConversations.map((conv) => {
                    const duration = conv.call_duration_secs || 0;
                    const minutes = Math.floor(duration / 60);
                    const seconds = duration % 60;
                    const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    const messageCount = conv.message_count || 0;
                    const startDate = conv.start_time_unix_secs
                      ? new Date(conv.start_time_unix_secs * 1000)
                      : null;

                    const isSuccessful = conv.call_successful === 'success';
                    const isFailed = conv.call_successful === 'failure';

                    return (
                      <TableRow
                        key={conv.conversation_id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/conversations/${conv.conversation_id}`)}
                      >
                        <TableCell className="text-muted-foreground">
                          {startDate ? format(startDate, 'MMM d, yyyy, h:mm a') : 'N/A'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {conv.agent_name || conv.agent_id || 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formattedDuration}</TableCell>
                        <TableCell className="text-muted-foreground">{messageCount}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                              isSuccessful
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                                : isFailed
                                  ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                            )}
                          >
                            <span
                              className={cn(
                                'mr-1.5 h-1.5 w-1.5 rounded-full',
                                isSuccessful
                                  ? 'bg-emerald-500'
                                  : isFailed
                                    ? 'bg-red-500'
                                    : 'bg-amber-500'
                              )}
                            />
                            {isSuccessful
                              ? 'Successful'
                              : isFailed
                                ? 'Failed'
                                : conv.status || 'Unknown'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
