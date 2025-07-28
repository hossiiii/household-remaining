/**
 * カード引き落とし日計算ユーティリティ
 * 
 * 仕様:
 * - 31日指定で月末が30日の場合 → 30日に調整
 * - 土日祝日の場合の営業日調整 → 翌営業日
 * - 複数カードの同日引き落とし → 個別取引として処理
 */

/**
 * その月の最終日を取得
 */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * 指定した日付が土日かどうかを判定
 */
function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // 0 = 日曜日, 6 = 土曜日
}

/**
 * 次の営業日を取得（土日をスキップ）
 * 
 * 注意: 日本の祝日は考慮していません。
 * 今後必要に応じて祝日対応を追加してください。
 */
function getNextBusinessDay(date: Date): Date {
  const nextDay = new Date(date);
  
  while (isWeekend(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}

/**
 * カードの引き落とし日を計算
 * 
 * @param transactionDate 取引日
 * @param withdrawalDay カードの引き落とし日設定（1-31）
 * @returns 実際の引き落とし日
 */
export function calculateWithdrawalDate(transactionDate: Date, withdrawalDay: number): Date {
  // 取引日の翌月を基準とする
  const baseDate = new Date(transactionDate);
  baseDate.setMonth(baseDate.getMonth() + 1);
  
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const lastDayOfMonth = getLastDayOfMonth(year, month + 1); // month は 0-indexed
  
  // 31日指定で月末が30日の場合は月末日に調整
  const adjustedDay = Math.min(withdrawalDay, lastDayOfMonth);
  
  // 引き落とし日の日付を作成
  const withdrawalDate = new Date(year, month, adjustedDay);
  
  // 土日の場合は翌営業日に調整
  return getNextBusinessDay(withdrawalDate);
}

/**
 * 現在日付が引き落とし日を過ぎているかどうかを判定
 * 
 * @param withdrawalDate 引き落とし日
 * @returns 過ぎている場合は true
 */
export function isWithdrawalDatePassed(withdrawalDate: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const withdrawal = new Date(withdrawalDate);
  withdrawal.setHours(0, 0, 0, 0);
  
  return today >= withdrawal;
}

/**
 * カード取引に引き落とし日を設定する際のヘルパー関数
 * 
 * @param transactionDate 取引日
 * @param cardWithdrawalDay カードの引き落とし日設定
 * @returns 計算された引き落とし日（ISO文字列）
 */
export function formatWithdrawalDateForTransaction(transactionDate: Date, cardWithdrawalDay: number): string {
  const withdrawalDate = calculateWithdrawalDate(transactionDate, cardWithdrawalDay);
  return withdrawalDate.toISOString();
}

/**
 * 日付を日本語形式でフォーマット（表示用）
 * 
 * @param date 日付
 * @returns 日本語形式の日付文字列 (例: "2024年1月15日 (月)")
 */
export function formatDateJapanese(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
}