export function getChineseVoice() {
  if (!("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang === 'zh-TW') ||
    voices.find((voice) => voice.lang === 'zh-HK') ||
    voices.find((voice) => voice.lang === 'zh-CN') ||
    voices.find((voice) => voice.lang?.toLowerCase().startsWith('zh')) ||
    null
  );
}

export function speakChinese(text, options = {}) {
  if (!text || !("speechSynthesis" in window)) return;

  const { rate = 0.88, pitch = 1, volume = 1, lang = 'zh-TW' } = options;
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
