// Known female Chinese voice name patterns across macOS, Windows, iOS, and Android
const FEMALE_VOICE_NAMES = [
  // macOS / iOS
  'ting-ting', 'tingting', 'mei-jia', 'meijia', 'sin-ji', 'sinji',
  // Windows
  'huihui', 'yaoyao', 'xiaoyi', 'xiaoxiao',
  // Android / Google
  'xiaoyan', 'hanhan', 'lili', 'yunxi',
  // Generic
  'female', 'woman', 'girl',
];

// Known male Chinese voice name patterns — used as negative signal
const MALE_VOICE_NAMES = ['male', 'man', 'kangkang', 'zhiyu', 'yunyang', 'yunfeng', 'yunhao', 'yunjian'];

function isChineseVoice(voice) {
  return voice.lang?.toLowerCase().startsWith('zh');
}

function isFemaleVoice(voice) {
  const name = voice.name.toLowerCase();
  if (MALE_VOICE_NAMES.some((p) => name.includes(p))) return false;
  return FEMALE_VOICE_NAMES.some((p) => name.includes(p));
}

function isMaleVoice(voice) {
  const name = voice.name.toLowerCase();
  return MALE_VOICE_NAMES.some((p) => name.includes(p));
}

export function getChineseVoice() {
  if (!("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  const chineseVoices = voices.filter(isChineseVoice);

  return (
    chineseVoices.find((v) => isFemaleVoice(v) && v.lang === 'zh-TW') ||
    chineseVoices.find((v) => isFemaleVoice(v) && v.lang === 'zh-HK') ||
    chineseVoices.find((v) => isFemaleVoice(v) && v.lang === 'zh-CN') ||
    chineseVoices.find((v) => isFemaleVoice(v)) ||
    // Prefer non-male over any zh-TW if no confirmed female found
    chineseVoices.find((v) => !isMaleVoice(v) && v.lang === 'zh-TW') ||
    chineseVoices.find((v) => !isMaleVoice(v) && v.lang === 'zh-HK') ||
    chineseVoices.find((v) => !isMaleVoice(v) && v.lang === 'zh-CN') ||
    chineseVoices.find((v) => !isMaleVoice(v)) ||
    chineseVoices[0] ||
    null
  );
}

export function speakChinese(text, options = {}) {
  if (!text || !("speechSynthesis" in window)) return;

  const { rate = 0.88, pitch = 1, volume = 1, lang = 'zh-TW', onEnd } = options;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getChineseVoice();

  utterance.lang = voice?.lang || lang;
  if (voice) utterance.voice = voice;
  utterance.rate = rate;
  // Slightly raise pitch on confirmed male voices as a last resort
  utterance.pitch = voice && isMaleVoice(voice) ? Math.min(pitch + 0.3, 2) : pitch;
  utterance.volume = volume;
  if (onEnd) utterance.onend = onEnd;

  window.speechSynthesis.speak(utterance);
}
