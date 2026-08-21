import { CONFIG } from './config.js';

export class Store {
  static getRawData() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.RAW_DATA) || '';
  }

  static setRawData(text) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.RAW_DATA, text);
  }

  static getPricing() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.PRICING);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return { ...CONFIG.DEFAULT_PRICING };
  }

  static setPricing(pricingMap) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.PRICING, JSON.stringify(pricingMap));
  }

  static getManualTransactions() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.MANUAL_TRANSACTIONS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [];
  }

  static setManualTransactions(transactions) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.MANUAL_TRANSACTIONS, JSON.stringify(transactions));
  }
}
