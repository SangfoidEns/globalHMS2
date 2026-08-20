/**
 * Safe String Escaper (Захист від XSS)
 */
export function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, match => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[match]);
}

/**
 * Парсер Ваги
 */
export function parseWeight(str) {
  if (!str) return 0;
  let clean = str.toString().toLowerCase().replace(',', '.');
  clean = clean.replace(/!\s*\d*\.?\d+\s*(?:бонус[а-я]*|bonus)?/gi, '');
  const matches = clean.match(/\d*\.?\d+/g);
  return matches ? matches.reduce((acc, curr) => acc + parseFloat(curr), 0) : 0;
}

/**
 * Парсер Грошей, Картки та Боргів
 */
export function parseMoneyAndDebt(str) {
  if (!str) return { eurPaid: 0, debtNew: 0, debtRepaid: 0, bonusGrams: 0, cardAmount: 0, rawDebtText: '' };

  const clean = str.toString().toLowerCase().replace(',', '.').trim();
  let eurPaid = 0, debtNew = 0, debtRepaid = 0, bonusGrams = 0, cardAmount = 0;

  const bonusMatch = clean.match(/!(\d*\.?\d+)|(?:бонус[а-я]*|bonus)\s*[:=\-+]?\s*(\d*\.?\d+)|(\d*\.?\d+)\s*(?:бонус[а-я]*|bonus)/i);
  if (bonusMatch) {
    bonusGrams = parseFloat(bonusMatch[1] || bonusMatch[2] || bonusMatch[3] || 0);
  }

  const tokens = clean.split(/[\s,]+/);
  tokens.forEach(token => {
    if (token.includes('!') || token.includes('бонус') || token.includes('bonus')) return;

    if (token.includes('карта') || token.includes('карту')) {
      const num = token.match(/\d*\.?\d+/);
      if (num && num[0]) cardAmount += parseFloat(num[0]);
    } else if (token.includes('долг') || token.includes('борг')) {
      const num = token.match(/[-+]?\d*\.?\d+/);
      if (num && num[0]) {
        const val = parseFloat(num[0]);
        val < 0 ? debtNew += Math.abs(val) : debtRepaid += val;
      }
    } else {
      const num = parseFloat(token);
      if (!isNaN(num) && num > 0) eurPaid += num;
    }
  });

  return { eurPaid, debtNew, debtRepaid, bonusGrams, cardAmount, rawDebtText: clean };
}

/**
 * Парсер Дати та Часу
 */
export function parseRecordDateTime(timeStr) {
  const now = new Date();
  let year = now.getFullYear(), month = now.getMonth(), day = now.getDate(), hour = 12, minute = 0;

  if (!timeStr) return new Date();

  timeStr.trim().split(/\s+/).forEach(p => {
    if (p.includes(':')) {
      const hm = p.split(':');
      hour = parseInt(hm[0], 10) || 0;
      minute = parseInt(hm[1], 10) || 0;
    } else if (p.includes('.')) {
      const dmp = p.split('.');
      if (dmp[0]) day = parseInt(dmp[0], 10);
      if (dmp[1]) month = parseInt(dmp[1], 10) - 1;
      if (dmp[2]) year = parseInt(dmp[2], 10);
      if (year < 100) year += 2000;
    }
  });

  return new Date(year, month, day, hour, minute);
}