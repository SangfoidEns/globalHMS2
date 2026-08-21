import { Utils } from './utils.js';

export function parseTableData(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const records = [];

  let currentCategory = 'DEFAULT';
  let currentDatePrefix = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Детекція теми/категорії (рядки перед name, gramm, €)
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1].toLowerCase();
      if (nextLine.includes('name') && nextLine.includes('gramm')) {
        currentCategory = line.toUpperCase();
        i += 2; // пропускаємо категорію і заголовок
        
        // Перевіряємо, чи наступний рядок є датою-префіксом
        if (i < lines.length && /^\d{1,2}\.\d{1,2}(\.\d{2,4})?$/.test(lines[i])) {
          currentDatePrefix = lines[i];
          i++;
        }
        continue;
      }
    }

    // Перевірка на автономну дату-префікс у поточній категорії
    if (/^\d{1,2}\.\d{1,2}(\.\d{2,4})?$/.test(line)) {
      currentDatePrefix = line;
      i++;
      continue;
    }

    // 2. Зчитування угоди (4 рядки)
    if (i + 3 < lines.length) {
      const clientName = lines[i];
      const rawGrammStr = lines[i + 1];
      const rawMoneyStr = lines[i + 2];
      const timeStr = lines[i + 3];

      // Перевірка, чи 4-й рядок є часом (містить : або ..)
      if (timeStr.includes(':') || timeStr.includes('..')) {
        const grammNumbers = Utils.parseAllNumbers(rawGrammStr);
        const baseGramm = grammNumbers.reduce((a, b) => a + b, 0);
        const moneyInfo = Utils.parseMoneyAndDebt(rawMoneyStr);
        const parsedDateObj = Utils.parseDateWithPrefix(timeStr, currentDatePrefix);

        records.push({
          id: records.length + 1,
          category: currentCategory,
          clientName,
          baseGramm,
          rawMoneyStr,
          eurPaid: moneyInfo.eurPaid,
          debtNew: moneyInfo.debtNew,
          debtRepaid: moneyInfo.debtRepaid,
          timeStr,
          parsedDateObj
        });

        i += 4;
        continue;
      }
    }

    i++;
  }

  return records;
}
