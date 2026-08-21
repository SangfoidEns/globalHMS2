import { CONFIG } from './config.js';

export class Store {
  static getRawData() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.RAW_DATA) || '';
  }

  static setRawData(text) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.RAW_DATA, text);
  }

  static getExpenses() {
    return parseFloat(localStorage.getItem(CONFIG.STORAGE_KEYS.MANUAL_EXPENSES)) || 0;
  }

  static setExpenses(val) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.MANUAL_EXPENSES, val.toString());
  }
}
