'use client';

import * as React from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ImageIcon, ImagePlus, Star, Trash2 } from 'lucide-react';
import { api, fetcher } from '@/lib/fetcher';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SmartImage } from '@/components/ui/smart-image';

interface Photo {
  id: string;
  url: string;
  isMain: boolean;
}

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_EDGE = 2000;
// Request bodies on Vercel Functions top out at 4.5 MB; stay well under it.
const MAX_UPLOAD_CHARS = 4_000_000;

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** Downscale to ≤2000px and re-encode as JPEG — sharp on any screen, a few hundred KB. */
async function toUploadDataUrl(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    // A format this browser can't decode: send the original.
    return toDataUrl(file);
  }
}

/**
 * Upload, reorder (cover photo) and delete photos for a property or room
 * type. Works against `/api/admin/{properties|room-types}/{id}/photos`.
 */
export function PhotoManager({ endpoint, editable = true }: { endpoint: string; editable?: boolean }) {
  const { data: photos, mutate } = useSWR<Photo[]>(endpoint, fetcher);
  const { data: config } = useSWR<{ uploadsEnabled: boolean }>('/api/config', fetcher);
  const [busy, setBusy] = React.useState<string | null>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const uploads = !!config?.uploadsEnabled;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    const tooBig = list.find((f) => f.size > MAX_SOURCE_BYTES);
    if (tooBig) {
      toast.error(`${tooBig.name} is larger than 25 MB.`);
      return;
    }
    setBusy('upload');
    try {
      // One photo per request keeps every upload under the body limit.
      let done = 0;
      for (const file of list) {
        const image = await toUploadDataUrl(file);
        if (image.length > MAX_UPLOAD_CHARS) throw new Error(`${file.name} is too large to upload — try a JPEG or a smaller photo.`);
        await api(endpoint, { method: 'POST', json: { images: [image] } });
        done += 1;
        await mutate();
      }
      toast.success(`Uploaded ${done} photo${done > 1 ? 's' : ''}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
      if (input.current) input.current.value = '';
    }
  }

  async function makeMain(id: string) {
    setBusy(id);
    try {
      await api(endpoint, { method: 'PATCH', json: { photoId: id } });
      await mutate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      await api(`${endpoint}?photoId=${encodeURIComponent(id)}`, { method: 'DELETE' });
      await mutate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {(photos ?? []).map((p) => (
          <div key={p.id} className={cn('group relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted', busy === p.id && 'opacity-60')}>
            <SmartImage src={p.url} icon={ImageIcon} className="h-full w-full" />
            {p.isMain && <span className="absolute left-2 top-2 rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-medium text-background">Cover</span>}
            {editable && (
              <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                {!p.isMain && (
                  <Button size="icon-sm" variant="outline" className="h-7 w-7 bg-card/90" onClick={() => makeMain(p.id)} aria-label="Use as cover photo">
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button size="icon-sm" variant="outline" className="h-7 w-7 bg-card/90 text-destructive" onClick={() => remove(p.id)} aria-label="Delete photo">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
        {editable && (
          <button
            type="button"
            disabled={!uploads || busy === 'upload'}
            onClick={() => input.current?.click()}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:text-muted-foreground"
          >
            <ImagePlus className={cn('h-5 w-5', busy === 'upload' && 'animate-pulse')} />
            {busy === 'upload' ? 'Uploading…' : 'Add photos'}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
      {editable && config && !uploads && (
        <p className="mt-3 text-xs text-muted-foreground">Photo uploads need file storage — connect a Vercel Blob store (BLOB_READ_WRITE_TOKEN) to turn them on.</p>
      )}
    </div>
  );
}
