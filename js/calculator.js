export class CalculationEngine {
  static calculateDeal(record, pricingMap) {
    const baseGramm = record.baseGramm || 0;
    const exactGramm = baseGramm * 1.1; // Нестандартний коефіцієнт 1.1

    const costPer100g = pricingMap[record.category] || pricingMap['DEFAULT'] || 500;
    let costPer1g = costPer100g / 100;

    // Бонус за об'єм (Base_Gramm >= 50g -> -5% на собівартість)
    if (baseGramm >= 50) {
      costPer1g *= 0.95;
    }

    const dealCost = exactGramm * costPer1g;
    const estimatedRevenue = baseGramm * 10; // Фіксована ціна 10€/г
    const dealProfit = estimatedRevenue - dealCost;

    return {
      ...record,
      exactGramm,
      dealCost,
      estimatedRevenue,
      dealProfit
    };
  }

  static calculateKPIs(records, pricingMap, myTransactions = []) {
    const calculatedDeals = records.map(r => this.calculateDeal(r, pricingMap));

    let sumEurPaid = 0;
    let sumEstimatedRevenue = 0;
    let sumDealProfit = 0;

    calculatedDeals.forEach(d => {
      sumEurPaid += d.eurPaid;
      sumEstimatedRevenue += d.estimatedRevenue;
      sumDealProfit += d.dealProfit;
    });

    let myExpenses = 0; // "- Розхід"
    let myIncomes = 0;  // "+ Дохід"

    myTransactions.forEach(t => {
      if (t.amount < 0) myExpenses += Math.abs(t.amount);
      if (t.amount > 0) myIncomes += t.amount;
    });

    // Підсумкові KPI
    const kpiRevenue = sumEurPaid - myExpenses;
    const kpiExpectedRevenue = sumEstimatedRevenue;
    const kpiNetProfit = sumDealProfit + myIncomes - myExpenses;

    // Розрахунок активних боргів по клієнтах
    const clientDebts = {};
    calculatedDeals.forEach(d => {
      if (!clientDebts[d.clientName]) clientDebts[d.clientName] = 0;
      clientDebts[d.clientName] += (d.debtNew - d.debtRepaid);
    });

    const kpiActiveDebt = Object.values(clientDebts).reduce((acc, debt) => {
      return debt > 0 ? acc + debt : acc;
    }, 0);

    return {
      deals: calculatedDeals,
      kpiRevenue,
      kpiExpectedRevenue,
      kpiNetProfit,
      kpiActiveDebt,
      totalDeals: calculatedDeals.length
    };
  }
}