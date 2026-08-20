import { parseWeight, parseMoneyAndDebt } from '../utils/helpers.js';

export class ParserEngine {
  static parseLogs(rawText) {
    if (!rawText) return { detectedVariety: 'UNKNOWN', records: [] };
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l !== '');
    let currentCategory = 'UNKNOWN';
    let currentDatePrefix = '';
    const records = [];
    const detectedCategories = new Set();
    const techHeaders = ['name', 'gramm', '€', 'time'];

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (i + 3 < lines.length && 
          lines[i+1].toLowerCase() === 'name' && 
          lines[i+2].toLowerCase() === 'gramm' && 
          lines[i+3] === '€') {
        currentCategory = line.toUpperCase();
        detectedCategories.add(currentCategory);

        if (i + 4 < lines.length && (lines[i+4].includes('.') || lines[i+4].includes('/'))) {
          currentDatePrefix = lines[i+4];
          i += 5;
        } else {
          i += 4;
        }
        continue;
      }

      if (techHeaders.includes(line.toLowerCase())) {
        i++;
        continue;
      }

      if (i + 3 < lines.length) {
        const clientName = lines[i];
        const rawGramm = lines[i+1];
        const rawMoney = lines[i+2];
        const timeStr = lines[i+3];

        if (timeStr.includes('.') || timeStr.includes(':')) {
          const grammBonusMatch = rawGramm.match(/!(\d*\.?\d+)/);
          const moneyData = parseMoneyAndDebt(rawMoney);

          if (grammBonusMatch && moneyData.bonusGrams === 0) {
            moneyData.bonusGrams = parseFloat(grammBonusMatch[1]);
          }

          const baseGramm = parseWeight(rawGramm);
          const fullTimeStr = (currentDatePrefix && !timeStr.includes('.')) ? `${currentDatePrefix} ${timeStr}` : timeStr;

          records.push({
            id: `${currentCategory}_${clientName}_${fullTimeStr}`.replace(/\s+/g, ''),
            category: currentCategory,
            clientName,
            rawGramm,
            baseGramm,
            rawMoney,
            ...moneyData,
            timeStr: fullTimeStr
          });

          i += 4;
          continue;
        }
      }
      i++;
    }

    const categoriesArray = Array.from(detectedCategories);
    const combinedVariety = categoriesArray.length > 0 ? categoriesArray.join(' & ') : 'UNKNOWN';

    return { detectedVariety: combinedVariety, records };
  }
}