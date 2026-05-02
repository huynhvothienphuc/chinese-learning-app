import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, XCircle, ArrowLeft, Upload } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { saveStudentSet, deleteStudentSet } from '@/lib/supabase';
import { parseVocabularyWorkbook } from '@/lib/excel';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  USER_UPLOAD_BOOK_ID,
  SESSION_SELECTED_BOOK_KEY,
  SESSION_SELECTED_SECTION_KEY,
  MAX_UPLOAD_BYTES,
} from '@/lib/constants';
import UploadGuide from '@/components/UploadGuide';

const UPLOAD_COOLDOWN_MS = 30 * 1000;
const UPLOAD_COOLDOWN_KEY = 'upload-cooldown-until';
const MAX_WORDS = 100;

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function UploadPreview({ preview, onConfirm, onCancel, saving }) {
  const { title, items, skipped, total } = preview;
  const truncated = total - skipped.length - items.length;
  const willSave = items.length;

  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto py-6">
      <button type="button" onClick={onCancel} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h2 className="text-xl font-black tracking-tight">{title}</h2>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-black text-green-600">{willSave}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ready to save</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-black text-amber-500">{skipped.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Skipped</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-black text-muted-foreground">{total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total rows</p>
          </CardContent>
        </Card>
      </div>

      {truncated > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{truncated} word{truncated > 1 ? 's' : ''} cut — only the first {MAX_WORDS} are saved per set.</span>
        </div>
      )}

      {skipped.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">SKIPPED ROWS</p>
          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
            {skipped.map((s) => (
              <div key={s.rowNum} className="flex items-center gap-2 text-xs">
                <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                <span className="text-muted-foreground">Row {s.rowNum}</span>
                <span className="font-medium truncate">{s.preview}</span>
                <span className="text-rose-500 shrink-0">— {s.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/40 p-3">
        <p className="text-xs font-semibold text-muted-foreground mb-2">PREVIEW ({willSave} WORDS)</p>
        <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
              <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
              <span className="font-bold">{item.chinese}</span>
              <span className="text-muted-foreground">{item.pinyin}</span>
              <span className="truncate text-xs text-muted-foreground">{item.vietnamese || item.english}</span>
            </div>
          ))}
        </div>
      </div>

      {willSave === 0 ? (
        <p className="text-sm text-center text-rose-500">No valid words to save. Fix the file and try again.</p>
      ) : (
        <Button onClick={onConfirm} disabled={saving} className="gap-2">
          <Upload className="h-4 w-4" />
          {saving ? 'Saving…' : `Save ${willSave} words`}
        </Button>
      )}
    </div>
  );
}

export default function UploadPage() {
  const { t, supabaseSets } = useOutletContext();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [uploadError, setUploadError] = useState('');
  const [uploadParsing, setUploadParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(0);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    function computeLeft() {
      const until = Number(localStorage.getItem(UPLOAD_COOLDOWN_KEY) || 0);
      return Math.max(0, Math.ceil((until - Date.now()) / 1000));
    }
    setCooldownSecondsLeft(computeLeft());
    const id = setInterval(() => {
      const left = computeLeft();
      setCooldownSecondsLeft(left);
      if (left === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  function startCooldown() {
    const until = Date.now() + UPLOAD_COOLDOWN_MS;
    localStorage.setItem(UPLOAD_COOLDOWN_KEY, String(until));
    setCooldownSecondsLeft(Math.ceil(UPLOAD_COOLDOWN_MS / 1000));
  }

  async function handleUploadFile(e) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    try {
      setUploadError('');
      if (!file) return;
      if (!user) { setUploadError(t.feedbackLoginRequired ?? 'Please sign in to upload a word bank.'); return; }
      if (supabaseSets.length >= 3) { setUploadError(t.uploadLimitReached ?? 'Word Bank limit reached (3/3). Delete one to upload a new set.'); return; }
      if (cooldownSecondsLeft > 0) { setUploadError(`Please wait ${cooldownSecondsLeft}s before uploading again.`); return; }
      if (!file.name.toLowerCase().endsWith('.xlsx')) { setUploadError(t.xlsxOnly); return; }
      if (file.size > MAX_UPLOAD_BYTES) { setUploadError(`${t.maxSize}: ${formatFileSize(MAX_UPLOAD_BYTES)}.`); return; }

      setUploadParsing(true);
      const { items: allItems, skipped, total } = await parseVocabularyWorkbook(file);

      if (total === 0) { setUploadError(t.uploadNeedsRows); return; }

      const items = allItems.slice(0, MAX_WORDS);
      const title = `Word Bank ${supabaseSets.length + 1}`;

      setPreview({ title, items, skipped, total, file });
    } catch {
      setUploadError(t.uploadReadError);
    } finally {
      setUploadParsing(false);
    }
  }

  async function handleConfirm() {
    if (!preview || preview.items.length === 0) return;
    const { title, items, file } = preview;
    setSaving(true);
    try {
      const saved = await saveStudentSet(user.id, { title, items });
      queryClient.invalidateQueries({ queryKey: ['studentSets', user.id] });
      trackEvent('upload_lesson', { file_name: file.name, size: file.size, rows: items.length });
      startCooldown();
      setPreview(null);
      sessionStorage.setItem(SESSION_SELECTED_BOOK_KEY, USER_UPLOAD_BOOK_ID);
      sessionStorage.setItem(SESSION_SELECTED_SECTION_KEY, JSON.stringify({ [USER_UPLOAD_BOOK_ID]: saved.id }));
      navigate('/', { state: { selectBook: USER_UPLOAD_BOOK_ID, selectSection: saved.id } });
    } catch (err) {
      if (err?.message?.includes('RATE_LIMIT_EXCEEDED') || err?.message?.includes('SET_LIMIT_REACHED')) {
        setUploadError(t.uploadRateLimitError ?? 'Please wait a few minutes before uploading again.');
      } else {
        setUploadError(t.uploadReadError);
      }
      setPreview(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSupabaseSet(id) {
    await deleteStudentSet(id);
    queryClient.invalidateQueries({ queryKey: ['studentSets', user?.id] });
  }

  const isUploadDisabled = uploadParsing || cooldownSecondsLeft > 0 || !user || supabaseSets.length >= 3;

  if (preview) {
    return (
      <UploadPreview
        preview={preview}
        onConfirm={handleConfirm}
        onCancel={() => setPreview(null)}
        saving={saving}
      />
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={handleUploadFile}
        disabled={isUploadDisabled}
      />
      <UploadGuide
        onBackToLearn={() => navigate('/')}
        onOpenPicker={() => { if (!isUploadDisabled) fileInputRef.current?.click(); }}
        maxUploadLabel={formatFileSize(MAX_UPLOAD_BYTES)}
        uploadError={uploadError}
        uploadDisabled={isUploadDisabled}
        cooldownSecondsLeft={cooldownSecondsLeft}
        supabaseSets={supabaseSets}
        supabaseSlotsUsed={supabaseSets.length}
        onDeleteSupabaseSet={handleDeleteSupabaseSet}
        t={t}
      />
    </>
  );
}
