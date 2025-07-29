import { prisma } from './prisma';
import { BalanceService } from './balance';
import type { APIResponse } from '@/types';

// 待機関数
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface CardWithdrawalResult {
  processedWithdrawals: number;
  updatedWithdrawals: number;
  errors: string[];
}

export class CardWithdrawalService {
  /**
   * カードの自動引き落とし処理を実行（トランザクション内で一括処理）
   * @param userId ユーザーID
   * @returns 処理結果
   */
  static async processCardWithdrawals(userId: string): Promise<APIResponse<CardWithdrawalResult>> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 引き落とし処理開始 (試行 ${attempt}/${maxRetries})`);
        
        // トランザクション開始前に待機（DB負荷軽減）
        if (attempt > 1) {
          const waitTime = attempt * 2000; // 2秒、4秒と増加
          console.log(`⏰ ${waitTime}ms待機してからリトライ...`);
          await wait(waitTime);
        } else {
          // 初回でも少し待機
          await wait(1000);
        }

        // データベーストランザクション内で全ての処理を実行
        const result = await prisma.$transaction(async (tx) => {
        const result: CardWithdrawalResult = {
          processedWithdrawals: 0,
          updatedWithdrawals: 0,
          errors: []
        };

        // アクティブなカードを取得
        const activeCards = await tx.card.findMany({
          where: {
            userId,
            isActive: true,
          },
          include: {
            withdrawalBank: true,
            paymentMethods: true,
          },
        });

        console.log(`🔄 ${activeCards.length}枚のカードの引き落とし処理を開始`);

        // 各カードについて引き落とし処理を実行
        for (let i = 0; i < activeCards.length; i++) {
          const card = activeCards[i];
          console.log(`  📝 カード処理中: ${card.name} (${i + 1}/${activeCards.length})`);
          
          await this.processCardWithdrawal(userId, card, result, tx);
          
          // カード間の処理で少し待機（トランザクション内なので短時間）
          if (i < activeCards.length - 1) {
            await wait(100); // 0.1秒待機
          }
        }

        return result;
        }, {
          timeout: 60000, // 60秒タイムアウトに延長
          maxWait: 10000, // トランザクション開始待機時間を10秒に設定
        });

        console.log(`✅ カード引き落とし処理完了: 新規${result.processedWithdrawals}件, 更新${result.updatedWithdrawals}件`);

        // トランザクション完了後に残高を再計算
        if (result.processedWithdrawals > 0 || result.updatedWithdrawals > 0) {
          console.log('🔄 残高再計算を開始...');
          await wait(500); // 残高再計算前に待機時間を延長
          await BalanceService.recalculateBalances(userId);
          console.log('✅ 残高再計算完了');
        }

        return { 
          success: true, 
          data: result 
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`❌ 引き落とし処理失敗 (試行 ${attempt}/${maxRetries}):`, lastError.message);
        
        // 最後の試行でない場合は次の試行へ
        if (attempt < maxRetries) {
          continue;
        }
        
        // 全ての試行が失敗した場合
        console.error('🚨 全ての試行が失敗しました');
        break;
      }
    }

    // リトライが全て失敗した場合
    return { 
      success: false, 
      error: `カード引き落とし処理に失敗しました (${maxRetries}回試行): ${lastError?.message || '不明なエラー'}` 
    };
  }

  /**
   * 個別カードの引き落とし処理
   */
  private static async processCardWithdrawal(
    userId: string, 
    card: any, 
    result: CardWithdrawalResult,
    tx: any
  ): Promise<void> {
    const paymentMethodIds = card.paymentMethods.map((pm: any) => pm.id);
    
    if (paymentMethodIds.length === 0) {
      return; // このカードに関連する支払い方法がない
    }

    // カード取引を月別にグループ化して取得（収入・支出両方）
    const cardTransactions = await tx.transaction.findMany({
      where: {
        userId,
        paymentMethodId: { in: paymentMethodIds },
        // typeの制限を削除して収入・支出両方を取得
      },
      orderBy: { date: 'asc' },
    });

    await wait(50); // 取引データ取得後に短時間待機

    // 月別にグループ化
    const monthlyGroups = this.groupTransactionsByMonth(cardTransactions, card);

    console.log(`    💰 ${Object.keys(monthlyGroups).length}件の月別引き落としを処理`);

    // 各月の引き落とし処理
    let monthCount = 0;
    for (const [monthKey, transactions] of Object.entries(monthlyGroups)) {
      monthCount++;
      
      // 支出と収入を分けて計算（支出 - 収入 = 引き落とし金額）
      const expenses = transactions.filter(t => t.type === 'EXPENSE');
      const incomes = transactions.filter(t => t.type === 'INCOME');
      
      const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalIncome = incomes.reduce((sum, t) => sum + Number(t.amount), 0);
      const withdrawalAmount = totalExpense - totalIncome;
      
      const withdrawalDate = this.calculateWithdrawalDate(transactions[0].date, card);
      
      console.log(`      🗓️  ${monthKey}: 支出${totalExpense.toLocaleString()}円 - 収入${totalIncome.toLocaleString()}円 = ${withdrawalAmount.toLocaleString()}円 (${monthCount}/${Object.keys(monthlyGroups).length})`);
      
      // 引き落とし金額が0以下の場合はスキップ
      if (withdrawalAmount <= 0) {
        console.log(`        ⏭️  引き落とし不要（残高プラス）`);
        continue;
      }
      
      // 引き落とし取引を作成または更新（upsert）
      // createWithdrawalは内部でupsert処理を行うため、常に呼び出す
      await this.createWithdrawal(userId, card, withdrawalAmount, withdrawalDate, tx);
      result.processedWithdrawals++;
      console.log(`        ✅ 引き落とし処理完了 (${withdrawalAmount.toLocaleString()}円)`);

      await wait(50); // 各月の処理後に短時間待機
    }
  }

  /**
   * 取引を月別にグループ化
   */
  private static groupTransactionsByMonth(transactions: any[], card: any): Record<string, any[]> {
    const groups: Record<string, any[]> = {};

    for (const transaction of transactions) {
      const transactionDate = new Date(transaction.date);
      const closingDate = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), card.closingDay);
      
      // 締日を過ぎている場合は翌月の引き落とし
      let targetMonth: Date;
      if (transactionDate >= closingDate) {
        targetMonth = new Date(transactionDate.getFullYear(), transactionDate.getMonth() + card.withdrawalMonthOffset, 1);
      } else {
        targetMonth = new Date(transactionDate.getFullYear(), transactionDate.getMonth() + card.withdrawalMonthOffset - 1, 1);
      }

      const monthKey = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(transaction);
    }

    return groups;
  }

  /**
   * 引き落とし日を計算
   */
  private static calculateWithdrawalDate(transactionDate: Date, card: any): Date {
    const date = new Date(transactionDate);
    const closingDate = new Date(date.getFullYear(), date.getMonth(), card.closingDay);
    
    let withdrawalDate: Date;
    if (date >= closingDate) {
      withdrawalDate = new Date(date.getFullYear(), date.getMonth() + card.withdrawalMonthOffset, card.withdrawalDay);
    } else {
      withdrawalDate = new Date(date.getFullYear(), date.getMonth() + card.withdrawalMonthOffset - 1, card.withdrawalDay);
    }

    return withdrawalDate;
  }

  /**
   * より厳密な既存引き落とし取引検索（金額も含めて完全一致を確認）
   * @deprecated upsert処理に変更したため不要
   */
  private static async findExistingWithdrawalStrict(
    userId: string, 
    card: any, 
    withdrawalDate: Date,
    amount: number,
    tx: any
  ): Promise<any | null> {
    console.log(`        🔍 重複チェック開始: ${card.name}、日付: ${withdrawalDate.toISOString().split('T')[0]}、金額: ${amount.toLocaleString()}円`);
    
    // 引き落とし銀行の支払い方法を取得
    const withdrawalPaymentMethod = await tx.paymentMethod.findFirst({
      where: {
        userId,
        bankId: card.withdrawalBankId,
        type: 'BANK',
      },
    });

    await wait(30); // 支払い方法取得後に短時間待機

    if (!withdrawalPaymentMethod) {
      console.log(`        ❌ 引き落とし銀行の支払い方法が見つからない: ${card.withdrawalBank?.name || 'unknown'}`);
      return null;
    }

    console.log(`        💳 支払い方法ID: ${withdrawalPaymentMethod.id}、銀行: ${withdrawalPaymentMethod.name || 'unknown'}`);

    // 日付の範囲を設定（±2日の範囲で検索してタイムゾーンや計算誤差を考慮）
    const searchStartDate = new Date(withdrawalDate);
    searchStartDate.setDate(searchStartDate.getDate() - 2);
    searchStartDate.setHours(0, 0, 0, 0);
    
    const searchEndDate = new Date(withdrawalDate);
    searchEndDate.setDate(searchEndDate.getDate() + 2);
    searchEndDate.setHours(23, 59, 59, 999);

    console.log(`        📅 検索日付範囲: ${searchStartDate.toISOString()} ～ ${searchEndDate.toISOString()}`);
    console.log(`        🔎 検索条件: userId=${userId}, paymentMethodId=${withdrawalPaymentMethod.id}, purpose contains "${card.name}引き落とし"`);

    // 同じ銀行・同じカードの引き落としを検索（日付範囲を広く取る）
    const result = await tx.transaction.findFirst({
      where: {
        userId,
        paymentMethodId: withdrawalPaymentMethod.id,
        date: {
          gte: searchStartDate,
          lte: searchEndDate,
        },
        type: 'EXPENSE',
        isAutoGenerated: true,
        purpose: {
          contains: `${card.name}引き落とし`, // 部分一致で検索
        },
      },
      orderBy: {
        createdAt: 'desc', // 最新のものを優先
      },
    });

    if (result) {
      console.log(`        ✅ 既存取引発見: ID=${result.id}, 日付=${result.date}, 金額=${Number(result.amount).toLocaleString()}円, purpose="${result.purpose}"`);
    } else {
      console.log(`        ❌ 既存取引なし - 新規作成予定`);
      
      // デバッグ用：広範囲で同じ条件の取引を検索してみる
      const allMatches = await tx.transaction.findMany({
        where: {
          userId,
          paymentMethodId: withdrawalPaymentMethod.id,
          date: {
            gte: searchStartDate,
            lte: searchEndDate,
          },
          type: 'EXPENSE',
          isAutoGenerated: true,
        },
        select: {
          id: true,
          date: true,
          amount: true,
          purpose: true,
          isAutoGenerated: true,
        },
        orderBy: {
          date: 'desc'
        }
      });
      
      console.log(`        🔍 検索範囲内の同銀行の全EXPENSE取引: ${allMatches.length}件`);
      allMatches.forEach((t, i) => {
        const matches = t.purpose.includes(`${card.name}引き落とし`);
        console.log(`          ${i + 1}. ID=${t.id}, date=${t.date.toISOString()}, purpose="${t.purpose}", amount=${Number(t.amount).toLocaleString()}円, matches=${matches}`);
      });
    }

    await wait(30); // 検索処理後に短時間待機

    return result;
  }

  /**
   * 既存の引き落とし取引を検索（旧版・下位互換のため残す）
   */
  private static async findExistingWithdrawal(
    userId: string, 
    card: any, 
    withdrawalDate: Date,
    tx: any
  ): Promise<any | null> {
    // 引き落とし銀行の支払い方法を取得
    const withdrawalPaymentMethod = await tx.paymentMethod.findFirst({
      where: {
        userId,
        bankId: card.withdrawalBankId,
        type: 'BANK',
      },
    });

    await wait(30); // 支払い方法取得後に短時間待機

    if (!withdrawalPaymentMethod) {
      return null;
    }

    // 同じ日付、同じ支払い方法、自動生成された取引を検索
    const result = await tx.transaction.findFirst({
      where: {
        userId,
        paymentMethodId: withdrawalPaymentMethod.id,
        date: withdrawalDate,
        type: 'EXPENSE',
        isAutoGenerated: true,
        purpose: `${card.name}引き落とし`,
      },
    });

    await wait(30); // 検索処理後に短時間待機

    return result;
  }

  /**
   * 既存の引き落とし取引を更新
   * @deprecated upsert処理に変更したため不要
   */
  private static async updateWithdrawal(transactionId: string, amount: number, tx: any): Promise<void> {
    await tx.transaction.update({
      where: { id: transactionId },
      data: { 
        amount,
        updatedAt: new Date(),
      },
    });

    await wait(30); // 更新処理後に短時間待機

    // 残高再計算はトランザクション完了後に行う
    // トランザクション内では個別の残高更新は行わない
  }

  /**
   * 引き落とし取引を作成または更新（upsert）
   */
  private static async createWithdrawal(
    userId: string, 
    card: any, 
    amount: number, 
    withdrawalDate: Date,
    tx: any
  ): Promise<void> {
    // 引き落とし銀行の支払い方法を取得
    const withdrawalPaymentMethod = await tx.paymentMethod.findFirst({
      where: {
        userId,
        bankId: card.withdrawalBankId,
        type: 'BANK',
      },
    });

    await wait(30); // 支払い方法取得後に短時間待機

    if (!withdrawalPaymentMethod) {
      throw new Error(`引き落とし銀行の支払い方法が見つかりません: ${card.withdrawalBank.name}`);
    }

    const dayOfWeek = withdrawalDate.toLocaleDateString('ja-JP', { weekday: 'short' });
    const store = card.withdrawalBank.name;
    const purpose = `${card.name}引き落とし`;

    // 日付の範囲を設定（同一日付での検索を確実にするため）
    const startOfDay = new Date(withdrawalDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(withdrawalDate);
    endOfDay.setHours(23, 59, 59, 999);

    // upsert: 日付・支払い方法・店舗・用途が一致する場合は更新、そうでなければ作成
    await tx.transaction.upsert({
      where: {
        // ユニーク制約を利用
        userId_date_paymentMethodId_store_purpose: {
          userId,
          date: withdrawalDate,
          paymentMethodId: withdrawalPaymentMethod.id,
          store: store,
          purpose: purpose,
        },
      },
      update: {
        // 既存のレコードがある場合は金額と用途のみ更新
        amount,
        purpose,
        dayOfWeek,
        updatedAt: new Date(),
      },
      create: {
        // 新規作成の場合
        userId,
        date: withdrawalDate,
        dayOfWeek,
        paymentMethodId: withdrawalPaymentMethod.id,
        store,
        purpose,
        type: 'EXPENSE',
        amount,
        isAutoGenerated: true,
      },
    }).catch(async (error) => {
      // 複合ユニークキーがない場合のフォールバック処理
      // 既存のレコードを手動で検索
      const existing = await tx.transaction.findFirst({
        where: {
          userId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
          paymentMethodId: withdrawalPaymentMethod.id,
          store: store,
          purpose: purpose, // 用途も一致条件に追加
          type: 'EXPENSE',
          isAutoGenerated: true,
        },
      });

      if (existing) {
        // 既存のレコードを更新
        await tx.transaction.update({
          where: { id: existing.id },
          data: {
            amount,
            purpose,
            dayOfWeek,
            updatedAt: new Date(),
          },
        });
      } else {
        // 新規作成
        await tx.transaction.create({
          data: {
            userId,
            date: withdrawalDate,
            dayOfWeek,
            paymentMethodId: withdrawalPaymentMethod.id,
            store,
            purpose,
            type: 'EXPENSE',
            amount,
            isAutoGenerated: true,
          },
        });
      }
    });

    await wait(30); // 処理後に短時間待機

    // 残高更新はトランザクション完了後に行う
    // トランザクション内では個別の残高更新は行わない
  }
}