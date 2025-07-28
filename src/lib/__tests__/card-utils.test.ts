/**
 * カード引き落とし日計算ユーティリティのテスト
 */

import { describe, test, expect } from '@jest/globals';
import { 
  calculateWithdrawalDate, 
  isOverdue, 
  getWithdrawalInfo,
  type CardConfig 
} from '../card-utils';

describe('card-utils', () => {
  const defaultConfig: CardConfig = {
    closingDay: 15,
    withdrawalDay: 27,
    withdrawalMonthOffset: 1 // 翌月
  };

  describe('calculateWithdrawalDate', () => {
    describe('基本的な計算パターン', () => {
      test('締日以前の利用 - 翌月引き落とし', () => {
        // 1月10日利用（15日締め、翌月27日引き落とし）
        const transactionDate = new Date('2024-01-10');
        const result = calculateWithdrawalDate(transactionDate, defaultConfig);
        
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(1); // 2月 (0-indexed)
        expect(result.getDate()).toBe(27);
      });

      test('締日当日の利用 - 翌月引き落とし', () => {
        // 1月15日利用（15日締め、翌月27日引き落とし）
        const transactionDate = new Date('2024-01-15');
        const result = calculateWithdrawalDate(transactionDate, defaultConfig);
        
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(1); // 2月
        expect(result.getDate()).toBe(27);
      });

      test('締日以降の利用 - さらに翌月引き落とし', () => {
        // 1月20日利用（15日締め、翌月27日引き落とし）
        // → 2月分として処理 → 3月引き落とし
        const transactionDate = new Date('2024-01-20');
        const result = calculateWithdrawalDate(transactionDate, defaultConfig);
        
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(2); // 3月
        expect(result.getDate()).toBe(27);
      });
    });

    describe('翌々月引き落としパターン', () => {
      const nextNextMonthConfig: CardConfig = {
        closingDay: 15,
        withdrawalDay: 27,
        withdrawalMonthOffset: 2 // 翌々月
      };

      test('締日以前の利用 - 翌々月引き落とし', () => {
        // 1月10日利用（15日締め、翌々月27日引き落とし）
        const transactionDate = new Date('2024-01-10');
        const result = calculateWithdrawalDate(transactionDate, nextNextMonthConfig);
        
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(2); // 3月
        expect(result.getDate()).toBe(27);
      });

      test('締日以降の利用 - さらに翌々月引き落とし', () => {
        // 1月20日利用（15日締め、翌々月27日引き落とし） 
        // → 2月分として処理 → 4月引き落とし
        const transactionDate = new Date('2024-01-20');
        const result = calculateWithdrawalDate(transactionDate, nextNextMonthConfig);
        
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(3); // 4月
        expect(result.getDate()).toBe(29); // 4月27日(土) → 4月29日(月)
      });
    });

    describe('月末日調整', () => {
      test('31日指定だが2月（28日）の場合 - 28日に調整', () => {
        const config: CardConfig = {
          closingDay: 15,
          withdrawalDay: 31,
          withdrawalMonthOffset: 1
        };
        
        // 1月10日利用 → 2月31日 → 2月28日に調整（2024年は平年）
        const transactionDate = new Date('2024-01-10');
        const result = calculateWithdrawalDate(transactionDate, config);
        
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(1); // 2月
        expect(result.getDate()).toBe(28);
      });

      test('31日指定だが2月（29日）の場合 - 29日に調整（うるう年）', () => {
        const config: CardConfig = {
          closingDay: 15,
          withdrawalDay: 31,
          withdrawalMonthOffset: 1
        };
        
        // うるう年のテスト
        const transactionDate = new Date('2020-01-10');
        const result = calculateWithdrawalDate(transactionDate, config);
        
        expect(result.getFullYear()).toBe(2020);
        expect(result.getMonth()).toBe(1); // 2月
        expect(result.getDate()).toBe(29);
      });

      test('31日指定だが4月（30日）の場合 - 30日に調整', () => {
        const config: CardConfig = {
          closingDay: 15,
          withdrawalDay: 31,
          withdrawalMonthOffset: 1
        };
        
        // 3月10日利用 → 4月31日 → 4月30日に調整
        const transactionDate = new Date('2024-03-10');
        const result = calculateWithdrawalDate(transactionDate, config);
        
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(3); // 4月
        expect(result.getDate()).toBe(30);
      });
    });

    describe('土日祝日調整', () => {
      test('土曜日の場合 - 月曜日に調整', () => {
        const config: CardConfig = {
          closingDay: 15,
          withdrawalDay: 2, // 2024年3月2日は土曜日
          withdrawalMonthOffset: 1
        };
        
        const transactionDate = new Date('2024-02-10');
        const result = calculateWithdrawalDate(transactionDate, config);
        
        // 3月2日(土) → 3月4日(月)
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(2); // 3月
        expect(result.getDate()).toBe(4);
      });

      test('日曜日の場合 - 月曜日に調整', () => {
        const config: CardConfig = {
          closingDay: 15,
          withdrawalDay: 3, // 2024年3月3日は日曜日
          withdrawalMonthOffset: 1
        };
        
        const transactionDate = new Date('2024-02-10');
        const result = calculateWithdrawalDate(transactionDate, config);
        
        // 3月3日(日) → 3月4日(月)
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(2); // 3月
        expect(result.getDate()).toBe(4);
      });

      test('平日の場合 - 調整なし', () => {
        const config: CardConfig = {
          closingDay: 15,
          withdrawalDay: 4, // 2024年3月4日は月曜日
          withdrawalMonthOffset: 1
        };
        
        const transactionDate = new Date('2024-02-10');
        const result = calculateWithdrawalDate(transactionDate, config);
        
        // 3月4日(月) → そのまま
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(2); // 3月
        expect(result.getDate()).toBe(4);
      });
    });

    describe('境界値テスト', () => {
      test('1日締め、1日引き落とし', () => {
        const config: CardConfig = {
          closingDay: 1,
          withdrawalDay: 1,
          withdrawalMonthOffset: 1
        };
        
        // 1月1日利用
        const transactionDate = new Date('2024-01-01');
        const result = calculateWithdrawalDate(transactionDate, config);
        
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(1); // 2月
        expect(result.getDate()).toBe(1);
      });

      test('31日締め、31日引き落とし', () => {
        const config: CardConfig = {
          closingDay: 31,
          withdrawalDay: 31,
          withdrawalMonthOffset: 1
        };
        
        // 1月31日利用
        const transactionDate = new Date('2024-01-31');
        const result = calculateWithdrawalDate(transactionDate, config);
        
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(1); // 2月（28日に調整される）
        expect(result.getDate()).toBe(28);
      });
    });

    describe('年越しパターン', () => {
      test('12月利用、翌年1月引き落とし', () => {
        const transactionDate = new Date('2023-12-10');
        const result = calculateWithdrawalDate(transactionDate, defaultConfig);
        
        expect(result.getFullYear()).toBe(2024); // 年越し
        expect(result.getMonth()).toBe(0); // 1月
        expect(result.getDate()).toBe(29); // 1月27日(土) → 1月29日(月)
      });

      test('12月利用、翌年2月引き落とし（翌々月）', () => {
        const config: CardConfig = {
          closingDay: 15,
          withdrawalDay: 27,
          withdrawalMonthOffset: 2
        };
        
        const transactionDate = new Date('2023-12-10');
        const result = calculateWithdrawalDate(transactionDate, config);
        
        expect(result.getFullYear()).toBe(2024); // 年越し
        expect(result.getMonth()).toBe(1); // 2月
        expect(result.getDate()).toBe(27);
      });
    });
  });

  describe('isOverdue', () => {
    test('期限切れの場合 - true', () => {
      const withdrawalDate = new Date('2024-01-01');
      const referenceDate = new Date('2024-01-02');
      
      expect(isOverdue(withdrawalDate, referenceDate)).toBe(true);
    });

    test('期限当日の場合 - true', () => {
      const withdrawalDate = new Date('2024-01-01');
      const referenceDate = new Date('2024-01-01');
      
      expect(isOverdue(withdrawalDate, referenceDate)).toBe(true);
    });

    test('期限前の場合 - false', () => {
      const withdrawalDate = new Date('2024-01-02');
      const referenceDate = new Date('2024-01-01');
      
      expect(isOverdue(withdrawalDate, referenceDate)).toBe(false);
    });

    test('デフォルト（現在日時）との比較', () => {
      const pastDate = new Date('2020-01-01');
      const futureDate = new Date('2030-01-01');
      
      expect(isOverdue(pastDate)).toBe(true);
      expect(isOverdue(futureDate)).toBe(false);
    });

    test('時刻は無視して日付のみで比較', () => {
      const withdrawalDate = new Date('2024-01-01 23:59:59');
      const referenceDate = new Date('2024-01-01 00:00:01');
      
      expect(isOverdue(withdrawalDate, referenceDate)).toBe(true);
    });
  });

  describe('getWithdrawalInfo', () => {
    test('引き落とし情報の包括的な取得', () => {
      const transactionDate = new Date('2024-01-10');
      const result = getWithdrawalInfo(transactionDate, defaultConfig);
      
      expect(result.withdrawalDate).toEqual(new Date('2024-02-27'));
      expect(result.config).toEqual(defaultConfig);
      expect(typeof result.isOverdue).toBe('boolean');
      expect(typeof result.daysUntilWithdrawal).toBe('number');
    });

    test('期限切れの場合の情報', () => {
      // 過去の取引日を設定
      const transactionDate = new Date('2020-01-10');
      const result = getWithdrawalInfo(transactionDate, defaultConfig);
      
      expect(result.isOverdue).toBe(true);
      expect(result.daysUntilWithdrawal).toBeLessThan(0);
    });
  });
});