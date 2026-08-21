export class CalculationEngine {
  static calculateDeal(deal, pricingMap) {
    const baseGramm = deal.baseGramm || 0;
    
    // Нестандартний коефіцієнт переваги/втрат 10%
    const exactGramm = baseGramm * 1.1;

    // Базова вартість закупівлі за 100г
    const costPer100g = pricingMap[deal.category] || pricingMap['DEFAULT'] || 500;
    let costPer1g = costPer100g / 100;

    // Volume Bonus (Промпт 3): Base_Gramm >= 50g -> знижка 5% на собівартість
    if (baseGramm >= 50) {
      costPer1g *= 0.95;
    }

    const dealCost = exactGramm * costPer1g;
    const estimatedRevenue = baseGramm * 10; // 10€ за 1г базової ваги
    const dealProfit = estimatedRevenue - dealCost;

    return {
      ...deal,
      exactGramm,
      dealCost,
      estimatedRevenue,
      dealProfit
    };
  }

  static calculateKPIs(parsedData, pricingMap, manualTransactions = []) {
    const { deals, myTransactions } = parsedData;

    const calculatedDeals = deals.map(d => this.calculateDeal(d, pricingMap));

    let sumEurPaid = 0;
    let sumEstimatedRevenue = 0;
    let sumDealProfit = 0;

    calculatedDeals.forEach(d => {
      sumEurPaid += d.eurPaid;
      sumEstimatedRevenue += d.estimatedRevenue;
      sumDealProfit += d.dealProfit;
    });

    // Об'єднуємо транзакції з журналу та вручну введені
    const allMyTransactions = [...myTransactions, ...manualTransactions];

    let totalMyExpenses = 0; // "- Розхід"
    let totalMyIncomes = 0;  // "+ Дохід"

    allMyTransactions.forEach(t => {
      if (t.amount < 0) totalMyExpenses += Math.abs(t.amount);
      if (t.amount > 0) totalMyIncomes += t.amount;
    });

    // Формули KPI (Промпт 2)
    const kpiRevenue = sumEurPaid - totalMyExpenses;
    const kpiExpectedRevenue = sumEstimatedRevenue;
    const kpiNetProfit = sumDealProfit + totalMyIncomes - totalMyExpenses;

    // Активний борг розраховується індивідуально по клієнтах
    const clientBalances = {};
    calculatedDeals.forEach(d => {
      if (!clientBalances[d.clientName]) clientBalances[d.clientName] = 0;
      clientBalances[d.clientName] += (d.debtNew - d.debtRepaid);
    });

    const kpiActiveDebt = Object.values(clientBalances).reduce((acc, debt) => {
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
