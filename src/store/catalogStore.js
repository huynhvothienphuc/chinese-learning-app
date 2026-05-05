import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export const useCatalogStore = create((set, get) => ({
  books: [],
  booksReady: false,
  loadingBooks: false,

  // { [bookId]: section[] } — populated lazily per book
  sectionsByBook: {},
  loadingSections: new Set(),

  async loadBooks() {
    if (get().booksReady || get().loadingBooks) return;
    set({ loadingBooks: true });
    try {
      const { data } = await supabase
        .from('books')
        .select('id,title,short_title,order,enabled')
        .order('order');
      set({ books: data ?? [], booksReady: true });
    } finally {
      set({ loadingBooks: false });
    }
  },

  async ensureSections(bookId) {
    if (!bookId) return;
    if (get().sectionsByBook[bookId] !== undefined) return;
    if (get().loadingSections.has(bookId)) return;

    set((s) => ({ loadingSections: new Set([...s.loadingSections, bookId]) }));
    try {
      const { data } = await supabase
        .from('lessons_preview')
        .select('id,title,order,enabled,is_free')
        .eq('book_id', bookId)
        .order('order');
      set((s) => ({
        sectionsByBook: { ...s.sectionsByBook, [bookId]: data ?? [] },
      }));
    } catch {
      set((s) => ({
        sectionsByBook: { ...s.sectionsByBook, [bookId]: [] },
      }));
    } finally {
      set((s) => {
        const next = new Set(s.loadingSections);
        next.delete(bookId);
        return { loadingSections: next };
      });
    }
  },

  bookName(bookId) {
    const book = get().books.find((b) => b.id === bookId);
    return book?.short_title ?? book?.title ?? bookId;
  },

  sectionLabel(bookId, sectionId) {
    const sections = get().sectionsByBook[bookId] ?? [];
    const s = sections.find((sec) => sec.id === sectionId);
    if (!s) return sectionId;
    return `Lesson ${s.order}: ${s.title}`;
  },
}));
