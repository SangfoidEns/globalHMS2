import { Utils } from './utils.js';

export function parseTableData(rawText) {
  if (!rawText || !rawText.trim()) return { deals: [], myTransactions: [] };

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const deals = [];
  const myTransactions = [];

  let currentCategory = 'DEFAULT';
  let currentDatePrefix = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Детекція теми / категорії (рядки перед name, gramm, €)
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1].toLowerCase();
      if (nextLine.includes('name') || nextLine.includes('gramm') || nextLine.includes('€')) {
        currentCategory = line.toUpperCase();
        i += 2; // Перестрибуємо назву категорії та заголовок

        // Перевірка на дату-префікс одразу після заголовка
        if (i < lines.length && /^\d{1,2}\.\d{1,2}(\.\d{2,4})?$/.test(lines[i])) {
          currentDatePrefix = lines[i];
          i++;
        }
        continue;
      }
    }

    // 2. Детекція категорії "МОЇ" (Ручні витрати/доходи)
    if (line.toUpperCase() === 'МОЇ' || line.toUpperCase().startsWith('МОЇ')) {
      currentCategory = 'МОЇ';
      i++;
      continue;
    }

    // Обробка записів для категорії "МОЇ"
    if (currentCategory === 'МОЇ') {
      // Очікуємо опис та суму (наприклад: "- Розхід 50" або "+ Дохід 100")
      const isExpense = line.includes('-') || line.toLowerCase().includes('розхід');
      const isIncome = line.includes('+') || line.toLowerCase().includes('дохід');
      const numbers = Utils.parseAllNumbers(line);

      if (numbers.length > 0 && (isExpense || isIncome)) {
        const val = numbers[0];
        myTransactions.push({
          description: line,
          amount: isExpense ? -Math.abs(val) : Math.abs(val)
        });
        i++;
        continue;
      }
    }

    // 3. Автономна дата-префікс
    if (/^\d{1,2}\.\d{1,2}(\.\d{2,4})?$/.test(line)) {
      currentDatePrefix = line;
      i++;
      continue;
    }

    // 4. Зчитування 4-рядкового блоку угоди
    if (i + 3 < lines.length) {
      const clientName = lines[i];
      const rawGrammStr = lines[i + 1];
      const rawMoneyStr = lines[i + 2];
      const timeStr = lines[i + 3];

      // Перевірка 4-го рядка на формат часу (містить : або ..)
      if (timeStr.includes(':') || timeStr.includes('..')) {
        const grammNumbers = Utils.parseAllNumbers(rawGrammStr);
        const baseGramm = grammNumbers.reduce((a, b) => a + b, 0);
        const moneyInfo = Utils.parseMoneyAndDebt(rawMoneyStr);
        const parsedDateObj = Utils.parseDateWithPrefix(timeStr, currentDatePrefix);

        deals.push({
          id: deals.length + 1,
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

  return { deals, myTransactions };
}
