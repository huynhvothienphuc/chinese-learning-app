import { FlipHorizontal, Upload, Users, Zap } from 'lucide-react';

const ABOUT_QUOTES = ['每天进步一点点。', '千里之行，始于足下。', '学而时习之，不亦说乎？'];

const getFeatures = (t) => [
  {
    icon: FlipHorizontal,
    title: t.aboutFeatureCardsTitle,
    desc: t.aboutFeatureCardsDesc,
  },
  {
    icon: Zap,
    title: t.aboutFeatureQuizTitle,
    desc: t.aboutFeatureQuizDesc,
  },
  {
    icon: Upload,
    title: t.aboutFeatureUploadTitle,
    desc: t.aboutFeatureUploadDesc,
  },
  {
    icon: Users,
    title: t.aboutFeatureSaveTitle,
    desc: t.aboutFeatureSaveDesc,
  },
];

export default function InfoPage({ t }) {
  const features = getFeatures(t);
  const activeQuote = ABOUT_QUOTES[0];

  return (
    <div className="mx-auto w-full max-w-5xl animate-float-in space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-theme-border bg-theme-surface shadow-soft">
        <div className="px-5 py-4 sm:px-6 sm:py-5 lg:px-8">
          <div className="space-y-2.5">
            <div className="flex flex-col gap-3">
              <h1 className="min-w-0 flex-1 text-[1.55rem] font-black tracking-tight text-slate-900 dark:text-white sm:text-[1.85rem]">
                {t.aboutTitle}
              </h1>
            </div>
            <p className="w-full text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-[15px]">
              {t.aboutSubtitle} {t.aboutBasedOnLabel}: {t.bookSeriesName}
            </p>
          </div>
        </div>
      </section>

      <section className="px-2 py-1 text-center">
        <blockquote className="relative mx-auto inline-block max-w-3xl px-5 text-center">
          <span className="absolute left-1 top-[-0.35rem] text-3xl leading-none text-primary/60">
            “
          </span>
          <p className="text-lg font-medium italic leading-8 text-slate-800 dark:text-slate-100 sm:text-[1.12rem]">
            {activeQuote}
          </p>
          <span className="absolute bottom-[-0.7rem] right-1 text-3xl leading-none text-primary/60">
            ”
          </span>
        </blockquote>
      </section>

      <section className="grid grid-cols-1 gap-4 pt-1 md:grid-cols-2">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-3xl border border-theme-border bg-white p-5 shadow-soft dark:bg-card"
          >
            <div className="mb-3 inline-flex rounded-2xl bg-primary/20 p-2.5 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{desc}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-theme-border bg-theme-surface px-5 py-4 text-sm leading-6 text-slate-700 shadow-soft dark:text-slate-200">
        <p className="font-semibold text-slate-900 dark:text-white">{t.madeBy}</p>
        <p className="mt-1">{t.contributor}</p>
        <p className="mt-2">
          {t.feedbackContact}{' '}
          <a
            href="mailto:huynhphucit95@gmail.com"
            className="font-medium text-primary underline decoration-primary/50 underline-offset-4"
          >
            huynhphucit95@gmail.com
          </a>
        </p>
      </section>
    </div>
  );
}
