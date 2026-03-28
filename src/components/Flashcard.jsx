import SpeakButton from "@/components/SpeakButton";

export default function Flashcard({ item, flipped, onFlip }) {
  if (!item) {
    return (
      <div className="rounded-2xl border bg-white p-10 text-center shadow-md">
        <p className="text-muted-foreground">No card available.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        className="flashcard-scene h-[420px] w-full cursor-pointer"
        onClick={onFlip}
      >
        <div className={`flashcard-inner ${flipped ? "is-flipped" : ""}`}>
          {/* Front */}
          <div className="flashcard-face flashcard-front rounded-3xl border bg-white shadow-xl">
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="animate-pulse text-7xl font-bold md:text-8xl">
                {item.chinese}
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                Click to flip
              </p>

              <div className="mt-6">
                <SpeakButton
                  text={item.chinese}
                  label="Speak word"
                  variant="outline"
                />
              </div>
            </div>
          </div>

          {/* Back */}
          <div className="flashcard-face flashcard-back rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-xl">
            <div className="flex h-full flex-col justify-between p-6 md:p-8">
              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-4xl font-bold md:text-5xl">
                      {item.chinese}
                    </div>
                    <div className="mt-2 text-2xl text-blue-100 md:text-3xl">
                      {item.pinyin}
                    </div>
                  </div>

                  <SpeakButton
                    text={item.chinese}
                    label="Speak word"
                    variant="secondary"
                  />
                </div>

                <div className="mb-6 text-lg md:text-xl">{item.english}</div>

                <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-semibold">Example sentence</h3>
                    <SpeakButton
                      text={item.sentenceChinese}
                      label="Speak sentence"
                      variant="secondary"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-lg">{item.sentenceChinese}</p>
                    <p className="text-blue-100">{item.sentencePinyin}</p>
                    <p className="border-t border-white/20 pt-3 text-sm text-blue-50/90">
                      {item.sentenceEnglish}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-center text-xs text-blue-100/90">
                Click card to flip back
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}