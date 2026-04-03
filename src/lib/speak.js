// Known female Chinese voice name patterns across macOS, Windows, iOS, and Android
const FEMALE_VOICE_NAMES = ['ting-ting', 'sin-ji', 'mei-jia', 'yaoyao', 'hanhan', 'xiaoxiao', 'female', 'yunxi'];

function isChineseVoice(voice) {
  return voice.lang?.toLowerCase().startsWith('zh');
}

function isFemaleVoice(voice) {
  const name = voice.name.toLowerCase();
  return FEMALE_VOICE_NAMES.some((pattern) => name.includes(pattern));
}

export function getChineseVoice() {
  if (!("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  const chineseVoices = voices.filter(isChineseVoice);

  return (
    chineseVoices.find((v) => isFemaleVoice(v) && v.lang === 'zh-TW') ||
    chineseVoices.find((v) => isFemaleVoice(v) && v.lang === 'zh-CN') ||
    chineseVoices.find((v) => isFemaleVoice(v)) ||
    chineseVoices.find((v) => v.lang === 'zh-TW') ||
    chineseVoices.find((v) => v.lang === 'zh-HK') ||
    chineseVoices.find((v) => v.lang === 'zh-CN') ||
    chineseVoices[0] ||
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
