// So'kinishlar va haqoratli so'zlar ro'yxati (senzura uchun)
const badWords = [
  "jaql",
  "jaqllab",
  "jalab",
  "jallab",
  "qanjiq",
  "haromi",
  "xaromi",
  "dalbayob",
  "dalbayop",
  "daxxuyya",
  "qotoq",
  "qo'toq",
  "qotoqcha",
  "kotta",
  "kot",
  "ko't",
  "chumo",
  "pidar",
  "pidaraz",
  "pidarz",
  "suka",
  "blyat",
  "blat",
  "nahuy",
  "naxuy",
  "xuy",
  "eblan",
  "gandon",
  "yiban",
  "yibaniy",
  "chort",
  "skatina",
  "shlyuxa",
  "shluha"
];

// Matndagi yomon so'zlarni *** ga almashtiruvchi funksiya
export const censorText = (text: string): string => {
  if (!text) return "";
  
  let censoredText = text;
  
  badWords.forEach(word => {
    // Katta-kichik harflarni farqlamaslik uchun RegExp va i bayrog'i (ignoreCase) qo'llaniladi.
    // So'zning qayerida kelishidan qat'iy nazar ushlash uchun regex.
    const regex = new RegExp(word, 'gi');
    // So'zning uzunligiga qarab yulduzchalar qo'yish
    const replacement = '*'.repeat(word.length);
    censoredText = censoredText.replace(regex, replacement);
  });
  
  return censoredText;
};
