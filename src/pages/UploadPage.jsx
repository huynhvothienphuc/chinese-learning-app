import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { saveStudentSet, deleteStudentSet } from '@/lib/supabase';
import { parseVocabularyWorkbook } from '@/lib/excel';
import { normalizeVocabularyItems, formatSectionName } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import {
  USER_UPLOAD_BOOK_ID,
  SESSION_SELECTED_BOOK_KEY,
  SESSION_SELECTED_SECTION_KEY,
  UPLOADED_LESSONS_KEY,
  MAX_UPLOAD_BYTES,
} from '@/lib/constants';
import UploadGuide from '@/components/UploadGuide';

const UPLOAD_COOLDOWN_MS = 30 * 1000;
const UPLOAD_COOLDOWN_KEY = 'upload-cooldown-until';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function UploadPage() {
  const { t, uploadedLessons, setUploadedLessons, supabaseSets } = useOutletContext();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [uploadError, setUploadError] = useState('');
  const [uploadParsing, setUploadParsing] = useState(false);
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(0);

  // Tick down the cooldown from localStorage so it survives reloads
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
    try {
      setUploadError('');
      if (!file) return;
      if (cooldownSecondsLeft > 0) {
        setUploadError(`Please wait ${cooldownSecondsLeft}s before uploading again.`);
        return;
      }
      if (!file.name.toLowerCase().endsWith('.xlsx')) { setUploadError(t.xlsxOnly); return; }
      if (file.size > MAX_UPLOAD_BYTES) { setUploadError(`${t.maxSize}: ${formatFileSize(MAX_UPLOAD_BYTES)}.`); return; }

      setUploadParsing(true);
      const rawItems = await parseVocabularyWorkbook(file);
      if (!rawItems.length) { setUploadError(t.uploadNeedsRows); return; }

      const MAX_WORDS = 100;
      const items = normalizeVocabularyItems(rawItems.slice(0, MAX_WORDS));
      const wasTrimmed = rawItems.length > MAX_WORDS;
      const title = formatSectionName(file.name);

      // Logged-in student with free Supabase slot
      if (user && supabaseSets.length < 3) {
        try {
          await saveStudentSet(user.id, { title, items });
          queryClient.invalidateQueries({ queryKey: ['studentSets', user.id] });
          trackEvent('upload_lesson', { file_name: file.name, size: file.size, rows: items.length, storage: 'supabase' });
          startCooldown();
          if (wasTrimmed) {
            setUploadError(t.uploadTrimmedWarning.replace('{max}', MAX_WORDS).replace('{total}', rawItems.length));
            return;
          }
          navigate('/');
          return;
        } catch (err) {
          if (err?.message?.includes('RATE_LIMIT_EXCEEDED')) {
            setUploadError(t.uploadRateLimitError ?? 'Please wait a few minutes before uploading again.');
            return;
          }
          // fall through to localStorage
        }
      }

      // Guest or Supabase full/failed → localStorage
      const nextLesson = {
        id: `user-upload-${Date.now()}`,
        fileName: file.name,
        title,
        items,
        uploadedAt: new Date().toISOString(),
      };
      const next = [nextLesson, ...uploadedLessons];
      setUploadedLessons(next);
      localStorage.setItem(UPLOADED_LESSONS_KEY, JSON.stringify(next));

      trackEvent('upload_lesson', { file_name: file.name, size: file.size, rows: items.length, storage: 'localstorage' });
      startCooldown();

      if (wasTrimmed) {
        setUploadError(t.uploadTrimmedWarning.replace('{max}', MAX_WORDS).replace('{total}', rawItems.length));
        return;
      }

      // Navigate to LearnPage selecting the new upload
      sessionStorage.setItem(SESSION_SELECTED_BOOK_KEY, USER_UPLOAD_BOOK_ID);
      sessionStorage.setItem(SESSION_SELECTED_SECTION_KEY, JSON.stringify({ [USER_UPLOAD_BOOK_ID]: nextLesson.id }));
      navigate('/', { state: { selectBook: USER_UPLOAD_BOOK_ID, selectSection: nextLesson.id } });
    } catch {
      setUploadError(t.uploadReadError);
    } finally {
      setUploadParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleDeleteLocalLesson(id) {
    const next = uploadedLessons.filter((l) => l.id !== id);
    setUploadedLessons(next);
    localStorage.setItem(UPLOADED_LESSONS_KEY, JSON.stringify(next));
  }

  async function handleDeleteSupabaseSet(id) {
    await deleteStudentSet(id);
    queryClient.invalidateQueries({ queryKey: ['studentSets', user?.id] });
  }

  const isUploadDisabled = uploadParsing || cooldownSecondsLeft > 0;

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
        uploadedLessons={uploadedLessons}
        onDeleteLesson={handleDeleteLocalLesson}
        supabaseSets={supabaseSets}
        supabaseSlotsUsed={supabaseSets.length}
        onDeleteSupabaseSet={handleDeleteSupabaseSet}
        t={t}
      />
    </>
  );
}
