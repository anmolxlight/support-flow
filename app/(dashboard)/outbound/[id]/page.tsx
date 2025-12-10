'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Phone, RefreshCw, X } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface Recipient {
  id: string;
  phone_number: string | null;
  whatsapp_user_id: string | null;
  status: 'pending' | 'initiated' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'voicemail';
  conversation_id: string | null;
  created_at_unix: number;
  updated_at_unix: number;
  conversation_initiation_client_data?: any;
}

interface BatchCallDetails {
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
  recipients: Recipient[];
}

export default function BatchCallDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter();
  const [batchCall, setBatchCall] = useState<BatchCallDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [batchId, setBatchId] = useState<string>('');

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await Promise.resolve(params);
      setBatchId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (batchId) {
      loadBatchCall();
    }
  }, [batchId]);

  const loadBatchCall = async () => {
    if (!batchId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/batch-calls/${batchId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch batch call');
      }
      const data = await response.json();
      setBatchCall(data);
    } catch (error) {
      console.error('Error loading batch call:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!batchId) return;
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

      router.push('/outbound');
    } catch (error: any) {
      console.error('Error cancelling batch call:', error);
      alert(error.message || 'Failed to cancel batch call');
    }
  };

  const handleRetry = async () => {
    if (!batchId) return;
    try {
      const response = await fetch(`/api/batch-calls/${batchId}/retry`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to retry batch call');
      }

      loadBatchCall();
    } catch (error: any) {
      console.error('Error retrying batch call:', error);
      alert(error.message || 'Failed to retry batch call');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      initiated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
      voicemail: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!batchCall) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground mb-4">Batch call not found</p>
        <Link href="/outbound">
          <Button variant="outline">Back to Batch Calls</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/outbound">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{batchCall.name}</h1>
            <p className="text-sm text-muted-foreground">
              {batchCall.agent_name || batchCall.agent_id}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {(batchCall.status === 'failed' || batchCall.status === 'completed') && (
            <Button variant="outline" onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
          {(batchCall.status === 'pending' || batchCall.status === 'in_progress') && (
            <Button variant="destructive" onClick={handleCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getStatusBadge(batchCall.status)}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{batchCall.total_calls_scheduled}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dispatched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{batchCall.total_calls_dispatched}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {format(new Date(batchCall.created_at_unix * 1000), 'MMM d, yyyy')}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(batchCall.created_at_unix * 1000), 'h:mm a')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recipients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recipients ({batchCall.recipients?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Conversation ID</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!batchCall.recipients || batchCall.recipients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No recipients found.
                    </TableCell>
                  </TableRow>
                ) : (
                  batchCall.recipients.map((recipient) => (
                    <TableRow key={recipient.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {recipient.phone_number || recipient.whatsapp_user_id || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(recipient.status)}</TableCell>
                      <TableCell>
                        {recipient.conversation_id ? (
                          <Link
                            href={`/conversations/${recipient.conversation_id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {recipient.conversation_id.substring(0, 8)}...
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(recipient.updated_at_unix * 1000), 'MMM d, h:mm a')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

