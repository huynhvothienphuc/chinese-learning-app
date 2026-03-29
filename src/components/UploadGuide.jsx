import { Download, FileText, Upload, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const steps = [
  {
    icon: Download,
    title: '1. Download the template',
    description: 'Start with the template so the file structure always matches what the app expects.',
  },
  {
    icon: WandSparkles,
    title: '2. Replace the sample rows',
    description: 'Keep one vocabulary item per line using the 5-part pipe format shown below.',
  },
  {
    icon: FileText,
    title: '3. Save as .txt',
    description: 'Use UTF-8 plain text if possible so Traditional Chinese characters stay correct.',
  },
  {
    icon: Upload,
    title: '4. Upload and start learning',
    description: 'The uploaded lesson appears inside the User upload book for the current browser session.',
  },
];

const sampleRows = [
  '你好 | nǐ hǎo (hello) | 你好，很高興認識你。 | Nǐ hǎo, hěn gāoxìng rènshi nǐ. | Hello, nice to meet you.',
  '謝謝 | xièxie (thank you) | 謝謝你的幫助。 | Xièxie nǐ de bāngzhù. | Thank you for your help.',
  '再見 | zàijiàn (goodbye) | 我們明天再見。 | Wǒmen míngtiān zàijiàn. | See you tomorrow.',
];

export default function UploadGuide({ onBackToLearn, onOpenPicker, maxUploadLabel, lastUploadedName, uploadError }) {
  return (
    <div className="space-y-6 animate-float-in">
      <Card className="overflow-hidden border-white/60 bg-white/90 shadow-lg">
        <CardHeader className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-500">Upload lesson</p>
          <CardTitle className="text-3xl font-black text-slate-900">Import a custom vocabulary file</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">
            Download the template, replace the sample rows with your own lesson, then upload the finished <code>.txt</code>{' '}
            file to study it right away.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 inline-flex rounded-2xl bg-blue-100 p-3 text-blue-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/60 bg-white/90 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-black">Template format</CardTitle>
            <CardDescription>
              Every line must have exactly 5 parts separated by the <code>|</code> symbol.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl bg-slate-950 p-4 text-sm text-slate-100 sm:p-5">
              <p className="break-words font-mono text-blue-200">
                Chinese | pinyin (english) | Sentence Chinese | Sentence Pinyin | Sentence English
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Sample rows</p>
              <div className="space-y-3 text-sm text-slate-700">
                {sampleRows.map((row) => (
                  <p key={row} className="break-words rounded-2xl bg-white p-3 font-mono leading-6">
                    {row}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/60 bg-white/90 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-black">Download and upload</CardTitle>
              <CardDescription>Template + upload tools for this browser session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <a
                href="/data/sections/upload-template-section.txt"
                download="upload-template-section.txt"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Download Template
              </a>

              <Button type="button" className="h-11 w-full gap-2" onClick={onOpenPicker}>
                <Upload className="h-4 w-4" />
                Upload Lesson File
              </Button>

              <div className="rounded-3xl bg-blue-50 p-4 text-sm text-blue-800">
                <p className="font-semibold">Upload rules</p>
                <ul className="mt-2 space-y-2 text-blue-700">
                  <li>• Only <code>.txt</code> files are allowed</li>
                  <li>• Max size: {maxUploadLabel}</li>
                  <li>• Uploaded lessons stay until the browser tab/session ends</li>
                </ul>
              </div>

              {lastUploadedName ? (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  Current uploaded section: <span className="font-semibold">{lastUploadedName}</span> <span className="text-emerald-700">in User upload</span>
                </div>
              ) : null}

              {uploadError ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{uploadError}</div>
              ) : null}

              <Button type="button" variant="secondary" className="w-full" onClick={onBackToLearn}>
                Back to Learning Page
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/60 bg-white/90 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-black">Helpful note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-slate-600">
              <p>
                You can also send screenshots or lesson pages later. The app workflow can convert them into this upload
                format for you.
              </p>
              <p>
                If your file has no valid vocabulary rows, the app will show <span className="font-semibold">No data found</span>{' '}
                instead of crashing.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
