import { Utils } from './utils.js';

export function parseTableData(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split('\n');
  const records = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Підтримка роздільників Tab або двопробілів/кома
    const cols = trimmed.includes('\t') ? trimmed.split('\t') : trimmed.split(/\s{2,}/);

    if (cols.length < 2) return;

    // Типова структура таблиці: [Час/Дата, Категорія/Товар, Сума/Гроші, ...]
    const rawTime = cols[0] ? cols[0].trim() : '';
    const category = cols[1] ? cols[1].trim() : 'Загальне';
    const rawMoney = cols[2] ? cols[2].trim() : cols[1];

    const moneyInfo = Utils.parseMoneyAndDebt(rawMoney);
    const parsedDateObj = Utils.parseDate(rawTime);

    // Валовий виторг = оплата + борг
    const totalPrice = moneyInfo.eurPaid + moneyInfo.debtNew;

    records.push({
      id: index + 1,
      rawTime,
      category,
      eurPaid: moneyInfo.eurPaid, // Готівка за угодою
      debtNew: moneyInfo.debtNew, // Новий борг
      totalPrice,                 // Валовий виторг
      parsedDateObj
    });
  });

  return records;
}
