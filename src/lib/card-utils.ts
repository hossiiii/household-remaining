/**
 * カード引き落とし日計算ユーティリティ
 * 
 * 仕様:
 * - 締日: 何日までの利用分を対象とするか (1-31日)
 * - 引き落とし月: 翌月 or 翌々月を選択 (1: 翌月, 2: 翌々月)
 * - 引き落とし日: 実際の引き落とし日 (1-31日) 
 * - 土日祝日の場合: 翌営業日に調整
 * - 31日指定で月末が30日の場合: 30日に調整
 */

export interface CardConfig {
  closingDay: number;        // 1-31 (締日)
  withdrawalDay: number;     // 1-31 (引き落とし日)
  withdrawalMonthOffset: number; // 1: 翌月, 2: 翌々月
}

/**
 * 引き落とし日を計算する
 * @param transactionDate 取引日
 * @param config カード設定
 * @returns 引き落とし日
 */
export function calculateWithdrawalDate(
  transactionDate: Date,
  config: CardConfig
): Date {
  const { closingDay, withdrawalDay, withdrawalMonthOffset } = config;
  
  // 取引日から締日を判定
  const transactionDayOfMonth = transactionDate.getDate();
  
  // 引き落とし月の基準を決定
  let baseMonth: Date;
  
  if (transactionDayOfMonth <= closingDay) {
    // 締日以前の利用 → 当月分として処理
    baseMonth = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), 1);
  } else {
    // 締日以降の利用 → 翌月分として処理
    baseMonth = new Date(transactionDate.getFullYear(), transactionDate.getMonth() + 1, 1);
  }
  
  // withdrawalMonthOffsetを適用して引き落とし月を決定
  const withdrawalMonth = new Date(
    baseMonth.getFullYear(),
    baseMonth.getMonth() + withdrawalMonthOffset,
    1
  );
  
  // 月末調整（31日指定で30日までしかない月の場合）
  const adjustedDay = Math.min(withdrawalDay, new Date(withdrawalMonth.getFullYear(), withdrawalMonth.getMonth() + 1, 0).getDate());
  
  // 引き落とし日を設定
  let withdrawalDate = new Date(
    withdrawalMonth.getFullYear(),
    withdrawalMonth.getMonth(),
    adjustedDay
  );
  
  // 土日祝日調整（翌営業日）
  withdrawalDate = adjustForBusinessDay(withdrawalDate);
  
  return withdrawalDate;
}


/**
 * 営業日調整（土日の場合は翌営業日）
 * 簡易実装：土曜日は+2日、日曜日は+1日
 * TODO: 祝日対応が必要な場合は外部ライブラリを使用
 */
function adjustForBusinessDay(date: Date): Date {
  const dayOfWeek = date.getDay(); // 0: 日曜, 1: 月曜, ..., 6: 土曜
  
  if (dayOfWeek === 0) { // 日曜日
    return new Date(date.getTime() + 24 * 60 * 60 * 1000); // +1日
  } else if (dayOfWeek === 6) { // 土曜日
    return new Date(date.getTime() + 2 * 24 * 60 * 60 * 1000); // +2日
  }
  
  return date; // 平日はそのまま
}

/**
 * 期限切れかどうかを判定
 * @param withdrawalDate 引き落とし予定日
 * @param referenceDate 基準日（省略時は現在日時）
 * @returns 期限切れの場合true
 */
export function isOverdue(
  withdrawalDate: Date,
  referenceDate: Date = new Date()
): boolean {
  // 日付のみで比較（時刻は無視）
  const withdrawal = new Date(withdrawalDate.getFullYear(), withdrawalDate.getMonth(), withdrawalDate.getDate());
  const reference = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  
  return withdrawal <= reference;
}

/**
 * 引き落とし日の情報を取得
 * @param transactionDate 取引日
 * @param config カード設定
 * @returns 引き落とし日情報
 */
export function getWithdrawalInfo(
  transactionDate: Date,
  config: CardConfig
) {
  const withdrawalDate = calculateWithdrawalDate(transactionDate, config);
  const isOverdueResult = isOverdue(withdrawalDate);
  
  return {
    withdrawalDate,
    isOverdue: isOverdueResult,
    daysUntilWithdrawal: Math.ceil(
      (withdrawalDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)
    ),
    config
  };
}