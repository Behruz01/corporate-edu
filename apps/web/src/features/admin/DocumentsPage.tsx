import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileUp, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/cn';
import {
  type AdminDocument,
  type DocumentStatus,
  deleteDocument,
  fetchDocuments,
  reprocessDocument,
  uploadDocument,
} from './admin-api';

const STATUS_STYLES: Record<DocumentStatus, string> = {
  PROCESSING: 'border-amber-200 bg-amber-50 text-amber-700',
  READY: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  FAILED: 'border-red-200 bg-red-50 text-red-700',
  OUTDATED: 'border-slate-200 bg-slate-50 text-slate-700',
};

export function DocumentsPage(): JSX.Element {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [progress, setProgress] = useState(0);

  const documentsQuery = useQuery({ queryKey: ['admin', 'documents'], queryFn: fetchDocuments });
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDocument({
      file,
      lang: 'UZ',
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(category.trim() ? { category: category.trim() } : {}),
      onProgress: setProgress,
    }),
    onSuccess: async () => {
      setSelectedFile(null);
      setTitle('');
      setCategory('');
      setProgress(0);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'documents'] });
      toast.success(t('messages.uploaded'));
    },
    onError: () => toast.error(t('messages.failed')),
  });
  const reprocessMutation = useMutation({
    mutationFn: reprocessDocument,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'documents'] });
      toast.success(t('messages.saved'));
    },
    onError: () => toast.error(t('messages.failed')),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'documents'] });
      toast.success(t('messages.deleted'));
    },
    onError: () => toast.error(t('messages.failed')),
  });

  function onFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.item(0);
    if (file) setSelectedFile(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files.item(0);
    if (file) setSelectedFile(file);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t('documents.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('documents.subtitle')}</p>
      </header>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>{t('documents.upload')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            <div
              role="button"
              tabIndex={0}
              className={cn(
                'flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed p-6 text-center transition-colors',
                dragging ? 'border-primary bg-primary/5' : 'border-input bg-muted/20',
              )}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <FileUp className="mb-2 h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <div className="font-medium">{selectedFile?.name ?? t('documents.drop')}</div>
              <div className="text-sm text-muted-foreground">{t('documents.dropHint')}</div>
              <input ref={fileInputRef} className="hidden" type="file" onChange={onFileChange} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('fields.title')} htmlFor="document-title">
                <Input id="document-title" value={title} onChange={(event) => setTitle(event.target.value)} />
              </Field>
              <Field label={t('fields.category')} htmlFor="document-category">
                <Input id="document-category" value={category} onChange={(event) => setCategory(event.target.value)} />
              </Field>
            </div>
            {uploadMutation.isPending ? (
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            ) : null}
            <Button type="submit" disabled={!selectedFile || uploadMutation.isPending}>
              <FileUp className="h-4 w-4" aria-hidden="true" />
              {uploadMutation.isPending ? t('actions.uploading') : t('actions.upload')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardContent className="p-0">
          {documentsQuery.isLoading ? <StateText>{t('states.loading')}</StateText> : null}
          {documentsQuery.isError ? <StateText danger>{t('states.error')}</StateText> : null}
          {documentsQuery.data ? <DocumentsTable documents={documentsQuery.data} onReprocess={reprocessMutation.mutate} onDelete={deleteMutation.mutate} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentsTable({
  documents,
  onReprocess,
  onDelete,
}: {
  documents: AdminDocument[];
  onReprocess: (id: string) => void;
  onDelete: (id: string) => void;
}): JSX.Element {
  const { t } = useTranslation('admin');
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">{t('fields.title')}</th>
            <th className="px-4 py-3">{t('fields.file')}</th>
            <th className="px-4 py-3">{t('fields.status')}</th>
            <th className="px-4 py-3">{t('fields.category')}</th>
            <th className="px-4 py-3">{t('fields.chunks')}</th>
            <th className="px-4 py-3 text-right">{t('actions.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium">{document.title}</td>
              <td className="px-4 py-3 text-muted-foreground">{document.filename}</td>
              <td className="px-4 py-3"><StatusBadge status={document.status} /></td>
              <td className="px-4 py-3">{document.category ?? '-'}</td>
              <td className="px-4 py-3 tabular-nums">{document.chunkCount}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => onReprocess(document.id)}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {t('actions.reprocess')}
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(document.id)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {t('actions.delete')}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: DocumentStatus }): JSX.Element {
  return <span className={cn('inline-flex rounded-full border px-2 py-1 text-xs font-medium', STATUS_STYLES[status])}>{status}</span>;
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: JSX.Element }): JSX.Element {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function StateText({ children, danger = false }: { children: string; danger?: boolean }): JSX.Element {
  return <div className={danger ? 'p-6 text-sm text-destructive' : 'p-6 text-sm text-muted-foreground'}>{children}</div>;
}
