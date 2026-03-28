# Chinese Learning App

A local-first Chinese vocabulary learning app built with React + Vite + Tailwind CSS v3 and shadcn-style UI components.

## Features

- Flashcard mode with 3D flip animation
- Multiple-choice quiz mode
- Shuffle / reset order
- Traditional Chinese vocabulary content stored in local text files
- Keyboard shortcuts in flashcard mode
- Quiz summary with wrong-answer review

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Data files

Vocabulary files live in:

```text
public/data/sections/
```

Each line uses this format:

```text
Chinese | pinyin (english) | Sentence Chinese | Sentence Pinyin | Sentence English
```

Sections are listed in:

```text
public/data/sections.json
```
# chinese-learning-app
