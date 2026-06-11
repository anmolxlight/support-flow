'use client';

import { useState, useEffect } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import {
  Globe,
  Upload,
  FileText,
  Search,
  MoreVertical,
  BookOpen,
  Plus,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addUrlKnowledge, addTextKnowledge, getKnowledgeBase, removeKnowledge, getKnowledge, addFileKnowledge } from '@/app/actions/knowledge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  // Dialog states
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [urlInput, setUrlInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');

  const stripHtml = (html: string) => {
    if (!html) return '';
    let text = html.replace(/<\/(p|div|h[1-6]|li|br)>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<[^>]*>?/gm, '');
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    return text.trim();
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const result = await getKnowledgeBase();
      if (result.success) {
        setDocuments(result.data.documents || []);
      } else {
        console.error('Error loading documents:', result.error);
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (doc: any) => {
    setSelectedDoc(doc);
    try {
      const result = await getKnowledge(doc.id);
      if (result.success) {
        setSelectedDoc(result.data);
      } else {
        console.error('Error fetching document details:', result.error);
      }
    } catch (error) {
      console.error('Error fetching document details:', error);
    }
  };

  const handleDelete = async (docId: string) => {
    const previousDocuments = [...documents];
    setDocuments(prev => prev.filter(doc => doc.id !== docId));

    if (selectedDoc?.id === docId) {
      setSelectedDoc(null);
    }

    try {
      const result = await removeKnowledge(docId);
      if (!result.success) {
        setDocuments(previousDocuments);
        alert('Failed to delete document: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setDocuments(previousDocuments);
      alert('Error deleting document');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setActionLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);

      try {
        const result = await addFileKnowledge(formData);
        if (result.success) successCount++;
        else failCount++;
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        failCount++;
      }
    }

    setActionLoading(false);

    if (successCount > 0) {
      loadDocuments();
      event.target.value = '';
    }

    if (failCount > 0) {
      alert(`Failed to upload ${failCount} file(s). Check console for details.`);
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput) return;
    setActionLoading(true);
    try {
      const result = await addUrlKnowledge(urlInput);
      if (result.success) {
        setIsUrlDialogOpen(false);
        setUrlInput('');
        loadDocuments();
      } else {
        alert('Failed to add URL: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding URL:', error);
      alert('An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddText = async () => {
    if (!textTitle || !textContent) return;
    setActionLoading(true);
    try {
      const result = await addTextKnowledge(textTitle, textContent);
      if (result.success) {
        setIsTextDialogOpen(false);
        setTextTitle('');
        setTextContent('');
        loadDocuments();
      } else {
        alert('Failed to add text: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding text:', error);
      alert('An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingState message="Loading knowledge base..." />;
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground">Manage information that agents can access</p>
      </div>

      {documents.length === 0 && !searchQuery ? (
        <>
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Globe className="mr-2 h-4 w-4" />
                  Add URL
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Knowledge from URL</DialogTitle>
                  <DialogDescription>
                    Enter a URL to fetch content from. The text will be extracted and added to the knowledge base.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="url">URL</Label>
                    <Input
                      id="url"
                      placeholder="https://example.com/article"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUrlDialogOpen(false)} disabled={actionLoading}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddUrl} disabled={actionLoading || !urlInput}>
                    {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add URL
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <label>
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Add Files
                </span>
              </Button>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.txt"
              />
            </label>

            <Dialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Create Text
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Text Knowledge</DialogTitle>
                  <DialogDescription>
                    Manually enter text content to add to the knowledge base.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Document Title"
                      value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      placeholder="Enter the text content here..."
                      className="min-h-[200px]"
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTextDialogOpen(false)} disabled={actionLoading}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddText} disabled={actionLoading || !textTitle || !textContent}>
                    {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Text
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <EmptyState
            icon={BookOpen}
            title="No documents yet"
            description="Upload documents to provide knowledge to your agents"
            actionLabel="Add Files"
            onAction={() => {
              const input = document.querySelector<HTMLInputElement>('input[type=file]');
              input?.click();
            }}
          />
        </>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <div className={`${selectedDoc ? 'col-span-12 lg:col-span-4' : 'col-span-12'} space-y-4`}>
            {/* Action Buttons + Search */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search Knowledge Base..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Globe className="mr-2 h-4 w-4" />
                    URL
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Knowledge from URL</DialogTitle>
                    <DialogDescription>
                      Enter a URL to fetch content from.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="url2">URL</Label>
                      <Input
                        id="url2"
                        placeholder="https://example.com/article"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsUrlDialogOpen(false)} disabled={actionLoading}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddUrl} disabled={actionLoading || !urlInput}>
                      {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add URL
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <label>
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Files
                  </span>
                </Button>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.txt"
                />
              </label>
              <Dialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Text
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Text Knowledge</DialogTitle>
                    <DialogDescription>
                      Manually enter text content to add to the knowledge base.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title2">Title</Label>
                      <Input
                        id="title2"
                        placeholder="Document Title"
                        value={textTitle}
                        onChange={(e) => setTextTitle(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="content2">Content</Label>
                      <Textarea
                        id="content2"
                        placeholder="Enter the text content here..."
                        className="min-h-[200px]"
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTextDialogOpen(false)} disabled={actionLoading}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddText} disabled={actionLoading || !textTitle || !textContent}>
                      {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Text
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    {!selectedDoc && <TableHead>Last updated</TableHead>}
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={selectedDoc ? 2 : 3} className="h-24 text-center text-muted-foreground">
                        No documents found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <TableRow
                        key={doc.id}
                        onClick={() => handleRowClick(doc)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          selectedDoc?.id === doc.id ? 'bg-muted/50' : 'hover:bg-muted/50'
                        )}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">{doc.file_size} kB</p>
                            </div>
                          </div>
                        </TableCell>
                        {!selectedDoc && (
                          <TableCell className="text-muted-foreground text-sm">
                            {doc.created_at ? format(new Date(doc.created_at), 'MMM d, yyyy') : 'N/A'}
                          </TableCell>
                        )}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(doc.id);
                                }}
                              >
                                Delete
                              </DropdownMenuItem>
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

          {selectedDoc && (
            <div className="col-span-12 lg:col-span-8">
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{selectedDoc.name}</h3>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(null)} className="text-muted-foreground">
                      ×
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap max-w-3xl leading-relaxed">
                    {stripHtml(selectedDoc.extracted_inner_html || selectedDoc.name)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

}
