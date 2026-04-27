import { useState, useEffect } from 'react';
import { Heart, BookOpenText, NotebookTabs, PencilLine, ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function Section({ title, children }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {label && <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>}
      {children}
    </div>
  );
}

const studyTabs = [
  { id: 'review',    label: 'Review',    icon: NotebookTabs },
  { id: 'flashcard', label: 'Flashcard', icon: BookOpenText },
  { id: 'quiz',      label: 'Quiz',      icon: ScrollText },
  { id: 'write',     label: 'Write',     icon: PencilLine },
];

const darkBgMap = {
  green:  '222.2 47% 8%',
  orange: '20 40% 8%',
  teal:   '183 40% 8%',
};

const ctaColors = [
  { label: 'Green',  bg: 'hsl(101 45% 62%)', fg: 'white' },
  { label: 'Orange', bg: 'hsl(0 90% 75%)',   fg: 'white' },
  { label: 'Teal',   bg: 'hsl(183 80% 34%)', fg: 'white' },
];

const semanticTokens = [
  { label: 'primary',       bg: 'bg-primary',       text: 'text-primary-foreground' },
  { label: 'secondary',     bg: 'bg-secondary',     text: 'text-secondary-foreground' },
  { label: 'muted',         bg: 'bg-muted',         text: 'text-muted-foreground' },
  { label: 'accent',        bg: 'bg-accent',        text: 'text-accent-foreground' },
  { label: 'destructive',   bg: 'bg-destructive',   text: 'text-destructive-foreground' },
  { label: 'background',    bg: 'bg-background',    text: 'text-foreground', border: true },
  { label: 'card',          bg: 'bg-card',          text: 'text-card-foreground', border: true },
  { label: 'theme-surface', bg: 'bg-theme-surface', text: 'text-foreground', border: true },
];

export default function DesignSystemPage() {
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'green'
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'green');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const darkBg = `hsl(${darkBgMap[theme] ?? darkBgMap.green})`;

  return (
    <div className="mx-auto max-w-3xl space-y-12 px-4 py-10">

      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Design System</h1>
        <p className="mt-1 text-sm text-muted-foreground">Internal reference — standard components and styles.</p>
      </div>

      {/* ── Colors ── */}
      <Section title="Colors">
        <p className="text-xs font-semibold text-foreground">CTA — all themes</p>
        <div className="grid grid-cols-3 gap-3">
          {ctaColors.map(({ label, bg, fg }) => (
            <div
              key={label}
              className="flex h-16 flex-col items-center justify-center rounded-2xl text-xs font-semibold"
              style={{ background: bg, color: fg }}
            >
              <span>{label}</span>
              <span className="mt-0.5 opacity-70">{bg}</span>
            </div>
          ))}
        </div>

        <p className="text-xs font-semibold text-foreground">Semantic tokens</p>
        <div className="flex flex-wrap gap-3">
          {semanticTokens.map(({ label, bg, text, border }) => (
            <div key={label} className={cn('flex h-16 w-32 flex-col items-center justify-center rounded-2xl text-xs font-semibold', bg, text, border && 'border border-border')}>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Badge ── */}
      <Section title="Badge / Tag">
        <p className="text-xs font-semibold text-foreground">Soft — all themes</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Green',  bg: 'hsl(101 47% 74% / 0.2)', fg: 'hsl(101 47% 44%)' },
            { label: 'Orange', bg: 'hsl(0 90% 72% / 0.2)',   fg: 'hsl(0 65% 45%)' },
            { label: 'Teal',   bg: 'hsl(183 80% 34% / 0.2)', fg: 'hsl(183 80% 28%)' },
          ].map(({ label, bg, fg }) => (
            <div
              key={label}
              className="flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: bg, color: fg }}
            >
              {label}
            </div>
          ))}
        </div>

        <p className="text-xs font-semibold text-foreground">Solid (CTA) — all themes</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Green',  bg: 'hsl(101 45% 62%)', fg: 'white' },
            { label: 'Orange', bg: 'hsl(0 90% 75%)',   fg: 'white' },
            { label: 'Teal',   bg: 'hsl(183 80% 34%)', fg: 'white' },
          ].map(({ label, bg, fg }) => (
            <div
              key={label}
              className="flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: bg, color: fg }}
            >
              {label}
            </div>
          ))}
        </div>

        <p className="text-xs font-semibold text-foreground">Variants</p>
        <Row label="badge-01">
          <Badge variant="badge-01">Phồn thể</Badge>
          <Badge variant="badge-01">Traditional</Badge>
        </Row>
        <Row label="default (subtle)">
          <Badge variant="default">Phồn thể</Badge>
          <Badge variant="default">Traditional</Badge>
        </Row>
        <Row label="secondary">
          <Badge variant="secondary">Secondary</Badge>
        </Row>
        <Row label="outline">
          <Badge variant="outline">Outline</Badge>
        </Row>
        <Row label="muted">
          <Badge variant="muted">Muted</Badge>
        </Row>
        <Row label="destructive">
          <Badge variant="destructive">Destructive</Badge>
        </Row>
      </Section>

      {/* ── Buttons ── */}
      <Section title="Button">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">primary</span> is light (74% lightness) — so "default" looks soft.
          Use <span className="font-semibold text-foreground">solid</span> (inverted) for strong CTAs.
        </p>

        <Row label="default">
          <Button variant="default">Default</Button>
          <Button variant="default" disabled>Disabled</Button>
          <span className="text-xs text-muted-foreground">bg-primary — soft, badge-level weight</span>
        </Row>

        <Row label="solid (strong CTA)">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-200 active:scale-[0.98] bg-cta text-cta-foreground hover:brightness-110 disabled:pointer-events-none disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-200 active:scale-[0.98] bg-cta text-cta-foreground hover:brightness-110 disabled:pointer-events-none disabled:opacity-50"
            disabled
          >
            Disabled
          </button>
          <span className="text-xs text-muted-foreground">bg-cta text-cta-foreground — bold, CTA weight</span>
        </Row>

        <Row label="secondary">
          <Button variant="secondary">Secondary</Button>
        </Row>
        <Row label="outline">
          <Button variant="outline">Outline</Button>
        </Row>
        <Row label="ghost">
          <Button variant="ghost">Ghost</Button>
        </Row>
        <Row label="destructive">
          <Button variant="destructive">Destructive</Button>
        </Row>
        <Row label="sizes">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </Row>
      </Section>

      {/* ── CTA Theme Preview ── */}
      <Section title="CTA — Theme & Mode Preview">
        <p className="text-xs text-muted-foreground">Hardcoded values — review all themes without switching.</p>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">Light mode</p>
          <div className="grid grid-cols-3 gap-3 rounded-2xl px-3" style={{ paddingTop: '50px', paddingBottom: '50px' }}>
            {[
              { label: 'Green',  bg: 'hsl(101 45% 62%)', fg: 'hsl(0 0% 98%)' },
              { label: 'Orange', bg: 'hsl(0 90% 75%)',   fg: 'hsl(0 0% 98%)' },
              { label: 'Teal',   bg: 'hsl(183 80% 34%)', fg: 'hsl(0 0% 100%)' },
            ].map(({ label, bg, fg }) => (
              <button
                key={label}
                type="button"
                className="inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-semibold shadow-sm transition-all duration-200 active:scale-[0.98] hover:brightness-110"
                style={{ background: bg, color: fg }}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-xs font-semibold text-foreground">Dark mode</p>
          <div className="grid grid-cols-3 gap-3 rounded-2xl px-3" style={{ background: darkBg, paddingTop: '50px', paddingBottom: '50px' }}>
            {[
              { label: 'Green',  bg: 'hsl(101 45% 62%)', fg: 'white' },
              { label: 'Orange', bg: 'hsl(0 90% 75%)',   fg: 'white' },
              { label: 'Teal',   bg: 'hsl(183 80% 34%)', fg: 'white' },
            ].map(({ label, bg, fg }) => (
              <button
                key={label}
                type="button"
                className="inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-semibold shadow-sm transition-all duration-200 active:scale-[0.98] hover:brightness-110"
                style={{ background: bg, color: fg }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Study Tabs ── */}
      <Section title="Study Mode Tabs">
        <p className="text-xs text-muted-foreground">Active state (solid), inactive (ghost), disabled (opacity-40)</p>
        <div className="rounded-3xl border border-theme-border bg-theme-surface p-2">
          <div className="grid grid-cols-4 gap-2">
            {studyTabs.map(({ id, label, icon: Icon }, i) => {
              const active = i === 0;
              const disabled = i === 3;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={disabled}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-sm font-semibold transition-all duration-200 sm:flex-row sm:gap-2 sm:px-4 sm:py-3',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground',
                    disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs sm:text-sm">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ── Filter Buttons ── */}
      <Section title="Filter Buttons">
        <p className="text-xs text-muted-foreground">Active (solid primary / rose), inactive (bg-background)</p>
        <Row>
          <button type="button" className="rounded-2xl bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors">
            All Words — active
          </button>
          <button type="button" className="rounded-2xl bg-background px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/10">
            All Words — inactive
          </button>
        </Row>
        <Row>
          <button type="button" className="flex items-center gap-1.5 rounded-2xl bg-rose-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors">
            <Heart className="h-3.5 w-3.5 fill-current" />
            Favorites — active
          </button>
          <button type="button" className="flex items-center gap-1.5 rounded-2xl bg-background px-4 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20">
            <Heart className="h-3.5 w-3.5" />
            Favorites — inactive
          </button>
        </Row>
      </Section>

      {/* ── Card ── */}
      <Section title="Card">
        <Row>
          <Card className="w-64 border-theme-border bg-theme-surface shadow-soft">
            <CardContent className="p-4 text-sm text-foreground">
              Theme surface card — used in lesson panels, word lists.
            </CardContent>
          </Card>
          <Card className="w-64">
            <CardContent className="p-4 text-sm text-foreground">
              Default card — bg-card border-border.
            </CardContent>
          </Card>
        </Row>
      </Section>

      {/* ── Input ── */}
      <Section title="Input">
        <Row label="default">
          <Input className="w-60" placeholder="Search words..." />
        </Row>
        <Row label="search">
          <Input type="search" className="w-60" placeholder="Search..." />
        </Row>
      </Section>

    </div>
  );
}
