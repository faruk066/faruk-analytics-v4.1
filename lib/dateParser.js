export function parseReviewDate(dateString) {
  const formats = [
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/,           // DD.MM.YYYY
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,           // DD/MM/YYYY
    /(\d{4})-(\d{2})-(\d{2})/,                 // YYYY-MM-DD
    /(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)\s+(\d{4})/i
  ];
  
  const months = {
    'ocak': 0, 'şubat': 1, 'mart': 2, 'nisan': 3, 'mayıs': 4, 'haziran': 5,
    'temmuz': 6, 'ağustos': 7, 'eylül': 8, 'ekim': 9, 'kasım': 10, 'aralık': 11
  };
  
  for (const format of formats) {
    const match = dateString.match(format);
    if (match) {
      if (match.length === 4 && months[match[2].toLowerCase()] !== undefined) {
        return new Date(match[3], months[match[2].toLowerCase()], match[1]);
      }
      // Diğer formatlar için...
      return new Date(match[0]);
    }
  }
  
  return new Date();
}