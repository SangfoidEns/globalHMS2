export class Utils {
  static parseFloatSafe(val, fallback = 0) {
    if (typeof val === 'number') return isNaN(val) ? fallback : val;
    if (!val) return fallback;
    const clean = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? fallback : parsed;
  }

  static parseAllNumbers(str) {
    if (!str) return [];
    const matches = String(str).match(/-?\d+(?:[.,]\d+)?/g);
    return matches ? matches.map(m => this.parseFloatSafe(m)) : [];
  }

  // Детальний парсер боргу та оплат за Промптом 1
  static parseMoneyAndDebt(rawMoney) {
    let debtNew = 0;
    let debtRepaid = 0;
    let eurPaid = 0;

    if (!rawMoney) return { debtNew, debtRepaid, eurPaid };

    const str = String(rawMoney).toLowerCase().trim();
    const hasDebtWord = str.includes('долг') || str.includes('борг');

    if (hasDebtWord) {
      const debtMatch = str.match(/(?:долг|борг)\s*([+-]?\d+(?:[.,]\d+)?)|([+-]?\d+(?:[.,]\d+)?)\s*(?:долг|борг)/);
      
      if (debtMatch) {
        const debtValStr = debtMatch[1] || debtMatch[2];
        const debtVal = this.parseFloatSafe(debtValStr);

        if (debtVal < 0 || str.includes('-')) {
          debtNew = Math.abs(debtVal);
        } else {
          debtRepaid = Math.abs(debtVal);
        }
      }

      const numbers = this.parseAllNumbers(str);
      numbers.forEach(num => {
        const absNum = Math.abs(num);
        if (num > 0 && absNum !== debtNew && absNum !== debtRepaid) {
          eurPaid += num;
        }
      });
    } else {
      const numbers = this.parseAllNumbers(str);
      eurPaid = numbers.reduce((acc, num) => acc + (num > 0 ? num : 0), 0);
    }

    return { debtNew, debtRepaid, eurPaid };
  }

  static parseDateWithPrefix(timeStr, datePrefix) {
    const now = new Date();
    if (!timeStr) return now;

    const trimmed = String(timeStr).replace('..', ':').trim();
    const timeMatch = trimmed.match(/(\d{1,2}):(\d{2})/);
    
    let hours = now.getHours();
    let minutes = now.getMinutes();

    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
    }

    if (datePrefix) {
      const parts = datePrefix.split('.');
      const day = parseInt(parts[0], 10) || now.getDate();
      const month = (parseInt(parts[1], 10) || (now.getMonth() + 1)) - 1;
      const year = parts[2] ? parseInt(parts[2], 10) : now.getFullYear();
      return new Date(year, month, day, hours, minutes);
    }

    const d = new Date(now);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }
}
