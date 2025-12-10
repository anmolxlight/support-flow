'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Phone, Plus, Search, MoreVertical, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface BatchCall {
  id: string;
  name: string;
  agent_id: string;
  agent_name: string;
  created_at_unix: number;
  scheduled_time_unix: number;
  total_calls_dispatched: number;
  total_calls_scheduled: number;
  last_updated_at_unix: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  phone_number_id: string | null;
  phone_provider: 'twilio' | 'sip_trunk' | null;
}

export default function OutboundPage() {
  const router = useRouter();
  const [batchCalls, setBatchCalls] = useState<BatchCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadBatchCalls();
  }, []);

  const loadBatchCalls = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/batch-calls');
      if (!response.ok) {
        throw new Error('Failed to fetch batch calls');
      }
      const data = await response.json();
      setBatchCalls(data.batch_calls || []);
    } catch (error) {
      console.error('Error loading batch calls:', error);
      setBatchCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (batchId: string) => {
    if (!confirm('Are you sure you want to cancel this batch call?')) {
      return;
    }

    try {
      const response = await fetch(`/api/batch-calls/${batchId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel batch call');
      }

      loadBatchCalls();
    } catch (error: any) {
      console.error('Error cancelling batch call:', error);
      alert(error.message || 'Failed to cancel batch call');
    }
  };

  const handleRetry = async (batchId: string) => {
    try {
      const response = await fetch(`/api/batch-calls/${batchId}/retry`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to retry batch call');
      }

      loadBatchCalls();
    } catch (error: any) {
      console.error('Error retrying batch call:', error);
      alert(error.message || 'Failed to retry batch call');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    };

    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
          statusColors[status as keyof typeof statusColors] || statusColors.pending
        }`}
      >
        {status.replace('_', ' ')}
      </span>
    );
  };

  const filteredBatchCalls = batchCalls.filter((batch) =>
    batch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Batch Calling</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage batch calling campaigns
          </p>
        </div>
        <Link href="/outbound/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create a batch call
          </Button>
        </Link>
      </div>

      {batchCalls.length === 0 && !searchQuery ? (
        <EmptyState
          icon={Phone}
          title="No batch calls found"
          description="You have not created any batch calls yet."
          actionLabel="Create a batch call"
          onAction={() => router.push('/outbound/create')}
        />
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search Batch Calls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border bg-card text-card-foreground border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Calls</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatchCalls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No batch calls found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBatchCalls.map((batch) => (
                    <TableRow key={batch.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{batch.name}</TableCell>
                      <TableCell>{batch.agent_name || batch.agent_id}</TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell>
                        {batch.total_calls_dispatched} / {batch.total_calls_scheduled}
                      </TableCell>
                      <TableCell>
                        {format(new Date(batch.created_at_unix * 1000), 'MMM d, yyyy, h:mm a')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/outbound/${batch.id}`)}
                            >
                              View Details
                            </DropdownMenuItem>
                            {(batch.status === 'failed' || batch.status === 'completed') && (
                              <DropdownMenuItem onClick={() => handleRetry(batch.id)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Retry
                              </DropdownMenuItem>
                            )}
                            {(batch.status === 'pending' || batch.status === 'in_progress') && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleCancel(batch.id)}
                              >
                                Cancel
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
