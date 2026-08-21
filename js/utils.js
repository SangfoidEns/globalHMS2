export class Utils {
  // Безпечний переклад у число
  static parseFloatSafe(val, fallback = 0) {
    if (typeof val === 'number') return isNaN(val) ? fallback : val;
    if (!val) return fallback;
    const clean = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? fallback : parsed;
  }

  // Витягуємо сплачені гроші та борги з тексту суми
  static parseMoneyAndDebt(moneyStr) {
    if (!moneyStr) return { eurPaid: 0, debtNew: 0 };
    
    const str = String(moneyStr).toLowerCase().trim();
    let eurPaid = 0;
    let debtNew = 0;

    // Шукаємо маркери боргу (-20долг, -50 борг тощо)
    const debtMatch = str.match(/-?\s*(\d+(?:[.,]\d+)?)\s*(?:долг|борг|debt)/);
    if (debtMatch) {
      debtNew = this.parseFloatSafe(debtMatch[1]);
    }

    // Перше число ряду вважаємо за чисту оплату
    const mainMatch = str.match(/^(\d+(?:[.,]\d+)?)/);
    if (mainMatch) {
      eurPaid = this.parseFloatSafe(mainMatch[1]);
    }

    return { eurPaid, debtNew };
  }

  // Парсер дат для теплової карти та часового графіка
  static parseDate(dateStr) {
    if (!dateStr) return new Date();
    
    const now = new Date();
    const str = String(dateStr).trim();

    // Формат 14:30 / 14:30:00
    const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      const d = new Date(now);
      d.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
      return d;
    }

    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? now : parsed;
  }
}
