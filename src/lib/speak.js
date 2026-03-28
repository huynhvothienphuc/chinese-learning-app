export function getChineseVoice() {
  const voices = window.speechSynthesis.getVoices();

  return (
    voices.find((v) => v.lang === "zh-TW") ||
    voices.find((v) => v.lang === "zh-HK") ||
    voices.find((v) => v.lang === "zh-CN") ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("zh")) ||
    null
  );
}

export function speakChinese(text, options = {}) {
  if (!text || !("speechSynthesis" in window)) return;

  const {
    rate = 0.9,
    pitch = 1,
    volume = 1,
    lang = "zh-TW",
  } = options;

  // stop previous speech so repeated taps feel responsive
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getChineseVoice();

  utterance.lang = voice?.lang || lang;
  if (voice) utterance.voice = voice;
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = volume;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}