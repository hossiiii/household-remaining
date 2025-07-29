import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 曜日を取得するヘルパー関数
function getDayOfWeek(date: Date): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[date.getDay()];
}

// ランダムな金額を生成（範囲指定）
function randomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 待機関数
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🌱 シーダー開始...');

  // 既存データをクリア（CASCADEで依存関係も自動削除）
  console.log('🧹 既存データをクリア中...');
  await prisma.$executeRaw`TRUNCATE TABLE users CASCADE;`;

  // テストユーザーの作成
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const user = await prisma.user.create({
    data: {
      name: '田中太郎',
      email: 'test@example.com',
      password: hashedPassword,
    },
  });

  console.log('✅ ユーザー作成完了:', user.name);

  await wait(500); // 0.5秒待機

  // 銀行マスタの作成（個別に作成して負荷軽減）
  console.log('🏦 銀行マスタ作成中...');
  const banks = [];
  
  const bankData = [
    { name: 'みずほ銀行', branchName: '新宿支店', accountNumber: '1234567' },
    { name: '三菱UFJ銀行', branchName: '渋谷支店', accountNumber: '7654321' },
    { name: '三井住友銀行', branchName: '池袋支店', accountNumber: '9876543' },
    { name: 'ゆうちょ銀行', branchName: '本店', accountNumber: '12345678901' },
  ];

  for (const bank of bankData) {
    const createdBank = await prisma.bank.create({
      data: {
        userId: user.id,
        name: bank.name,
        branchName: bank.branchName,
        accountNumber: bank.accountNumber,
      },
    });
    banks.push(createdBank);
    console.log(`  ✓ ${bank.name} 作成完了`);
    await wait(200); // 0.2秒待機
  }

  console.log(`✅ 銀行マスタ作成完了: ${banks.length}件`);

  await wait(500); // 0.5秒待機

  // カード情報の作成（個別に作成して負荷軽減）
  console.log('💳 カードマスタ作成中...');
  const cards = [];
  
  const cardData = [
    { name: 'メインクレジットカード', type: 'CREDIT_CARD', closingDay: 1, withdrawalDay: 10, withdrawalMonthOffset: 1, withdrawalBankIndex: 0 },
    { name: '楽天カード', type: 'CREDIT_CARD', closingDay: 1, withdrawalDay: 27, withdrawalMonthOffset: 1, withdrawalBankIndex: 1 },
    { name: 'イオンカード', type: 'CREDIT_CARD', closingDay: 1, withdrawalDay: 2, withdrawalMonthOffset: 1, withdrawalBankIndex: 2 },
    { name: 'Amazonプリペイドカード', type: 'PREPAID_CARD', closingDay: 1, withdrawalDay: 1, withdrawalMonthOffset: 1, withdrawalBankIndex: 0 },
    { name: 'PayPayカード', type: 'CREDIT_CARD', closingDay: 1, withdrawalDay: 25, withdrawalMonthOffset: 1, withdrawalBankIndex: 3 },
  ];

  for (const card of cardData) {
    const createdCard = await prisma.card.create({
      data: {
        userId: user.id,
        name: card.name,
        type: card.type as 'CREDIT_CARD' | 'PREPAID_CARD',
        closingDay: card.closingDay,
        withdrawalDay: card.withdrawalDay,
        withdrawalMonthOffset: card.withdrawalMonthOffset,
        withdrawalBankId: banks[card.withdrawalBankIndex].id,
      },
    });
    cards.push(createdCard);
    console.log(`  ✓ ${card.name} 作成完了`);
    await wait(200); // 0.2秒待機
  }

  console.log(`✅ カードマスタ作成完了: ${cards.length}件`);

  await wait(500); // 0.5秒待機

  // 支払い方法マスタの作成（個別に作成して負荷軽減）
  console.log('💰 支払い方法作成中...');
  const paymentMethods: any[] = [];

  // 現金の作成
  const cashPaymentMethod = await prisma.paymentMethod.upsert({
    where: {
      userId_name: {
        userId: user.id,
        name: '現金',
      },
    },
    update: {},
    create: {
      userId: user.id,
      name: '現金',
      type: 'CASH',
    },
  });
  paymentMethods.push(cashPaymentMethod);
  console.log('  ✓ 現金 作成完了');
  await wait(200); // 0.2秒待機

  // カード系支払い方法の作成
  for (const card of cards) {
    const cardPaymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: user.id,
        name: card.name,
        type: 'CARD',
        cardId: card.id,
      },
    });
    paymentMethods.push(cardPaymentMethod);
    console.log(`  ✓ ${card.name} 作成完了`);
    await wait(200); // 0.2秒待機
  }

  // 銀行系支払い方法の作成
  for (const bank of banks) {
    const bankPaymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: user.id,
        name: bank.name,
        type: 'BANK',
        bankId: bank.id,
      },
    });
    paymentMethods.push(bankPaymentMethod);
    console.log(`  ✓ ${bank.name} 作成完了`);
    await wait(200); // 0.2秒待機
  }

  console.log(`✅ 支払い方法作成完了: ${paymentMethods.length}件`);

  // より現実的な取引データの作成（過去3ヶ月分）
  const transactionData: Array<{
    date: Date;
    dayOfWeek: string;
    paymentMethodId: string;
    store: string | null;
    purpose: string;
    type: string;
    amount: number;
  }> = [];
  const startDate = new Date('2024-10-01');
  const endDate = new Date('2024-12-31');

  // 各銀行の初期残高を設定（マイナスを避けるため十分な金額）
  const initialBalances = [
    { date: new Date('2024-09-30'), amount: 200000, purpose: 'この時点の残高', store: null, paymentMethodIndex: 5 }, // みずほ銀行
    { date: new Date('2024-09-30'), amount: 150000, purpose: 'この時点の残高', store: null, paymentMethodIndex: 6 }, // 三菱UFJ銀行
    { date: new Date('2024-09-30'), amount: 100000, purpose: 'この時点の残高', store: null, paymentMethodIndex: 7 }, // 三井住友銀行
    { date: new Date('2024-09-30'), amount: 80000, purpose: 'この時点の残高', store: null, paymentMethodIndex: 8 }, // ゆうちょ銀行
  ];

  // 現金の初期残高
  const cashInitialBalance = {
    date: new Date('2024-09-30'), 
    amount: 50000, 
    purpose: 'この時点の残高', 
    store: null, 
    paymentMethodIndex: 0 // 現金
  };

  // 収入データ（銀行口座への入金のみ - 給与は必ず銀行振込）
  const incomeData = [
    { date: new Date('2024-10-25'), amount: 350000, purpose: '給与', store: null, paymentMethodIndex: 5 }, // みずほ銀行
    { date: new Date('2024-11-25'), amount: 350000, purpose: '給与', store: null, paymentMethodIndex: 5 },
    { date: new Date('2024-12-25'), amount: 350000, purpose: '給与', store: null, paymentMethodIndex: 5 },
    { date: new Date('2024-11-15'), amount: 50000, purpose: '副業収入', store: null, paymentMethodIndex: 6 }, // 三菱UFJ銀行
    { date: new Date('2024-12-15'), amount: 75000, purpose: '副業収入', store: null, paymentMethodIndex: 6 },
    { date: new Date('2024-12-31'), amount: 100000, purpose: 'ボーナス', store: null, paymentMethodIndex: 7 }, // 三井住友銀行
  ];

  // カード返金データ（返金・キャンセル等）
  const cardRefundData = [
    { date: new Date('2024-11-03'), amount: 2580, purpose: '商品返品', store: 'Amazon', paymentMethodIndex: 4 }, // Amazonプリペイドカード
    { date: new Date('2024-11-18'), amount: 1200, purpose: 'キャンセル返金', store: 'スタバ', paymentMethodIndex: 1 }, // メインクレジットカード
    { date: new Date('2024-12-05'), amount: 5400, purpose: '過剰請求返金', store: 'イオン', paymentMethodIndex: 3 }, // イオンカード
    { date: new Date('2024-12-22'), amount: 890, purpose: 'ポイント還元', store: '楽天', paymentMethodIndex: 2 }, // 楽天カード
  ];

  // 支出データ（様々なパターン）- 残高がマイナスにならないよう頻度を調整
  const expensePatterns = [
    // 食費関連（頻度を下げる）
    { stores: ['イオン', 'イトーヨーカドー', '西友', 'ライフ'], purposes: ['食材購入', '日用品'], amountRange: [1500, 6000], frequency: 12 },
    { stores: ['セブンイレブン', 'ファミリーマート', 'ローソン'], purposes: ['弁当', '飲み物', '軽食'], amountRange: [200, 1200], frequency: 8 },
    
    // 交通費（頻度を下げる）
    { stores: ['JR東日本', '東京メトロ', '都営地下鉄'], purposes: ['交通費'], amountRange: [200, 600], frequency: 15 },
    
    // 光熱費・通信費（頻度はそのまま、金額を下げる）
    { stores: ['東京電力', '東京ガス'], purposes: ['電気代', 'ガス代'], amountRange: [4000, 10000], frequency: 3 },
    { stores: ['NTTドコモ', 'au', 'ソフトバンク'], purposes: ['携帯代'], amountRange: [6000, 12000], frequency: 3 },
    
    // 娯楽・外食（頻度を下げる）
    { stores: ['マクドナルド', '吉野家', 'スタバ', 'タリーズ'], purposes: ['外食', '飲食'], amountRange: [500, 1800], frequency: 8 },
    { stores: ['Amazon', '楽天', 'ヨドバシ'], purposes: ['ネット購入', '電化製品'], amountRange: [1000, 20000], frequency: 4 },
    
    // 交際費・趣味（頻度を下げる）
    { stores: ['居酒屋', 'カラオケ', '映画館'], purposes: ['交際費', '娯楽'], amountRange: [2000, 6000], frequency: 3 },
    
    // ガソリン・車関連（頻度を下げる）
    { stores: ['ENEOS', '出光', 'コスモ石油'], purposes: ['ガソリン代'], amountRange: [3000, 6000], frequency: 2 },
  ];

  // 支出データ生成
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    for (const pattern of expensePatterns) {
      if (Math.random() < pattern.frequency / 100) {
        const store = pattern.stores[Math.floor(Math.random() * pattern.stores.length)];
        const purpose = pattern.purposes[Math.floor(Math.random() * pattern.purposes.length)];
        const amount = randomAmount(pattern.amountRange[0], pattern.amountRange[1]);
        
        // 支払い方法をランダムに選択（現金の使用を制限）
        let paymentMethodIndex: number;
        if (amount < 500) {
          paymentMethodIndex = Math.random() < 0.6 ? 0 : Math.floor(Math.random() * 6) + 1; // 少額でもカード多め
        } else if (amount < 2000) {
          paymentMethodIndex = Math.random() < 0.8 ? Math.floor(Math.random() * 6) + 1 : 0; // カード・銀行多め
        } else {
          paymentMethodIndex = Math.floor(Math.random() * 6) + 1; // カードまたは銀行のみ
        }

        transactionData.push({
          date: new Date(currentDate),
          dayOfWeek: getDayOfWeek(new Date(currentDate)),
          paymentMethodId: paymentMethods[paymentMethodIndex].id,
          store,
          purpose,
          type: 'EXPENSE',
          amount,
        });
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 初期残高データを追加（最初に追加して日付順ソートで最初に来るようにする）
  initialBalances.forEach(balance => {
    transactionData.push({
      date: balance.date,
      dayOfWeek: getDayOfWeek(balance.date),
      paymentMethodId: paymentMethods[balance.paymentMethodIndex].id,
      store: balance.store,
      purpose: balance.purpose,
      type: 'INCOME',
      amount: balance.amount,
    });
  });

  // 現金の初期残高を追加
  transactionData.push({
    date: cashInitialBalance.date,
    dayOfWeek: getDayOfWeek(cashInitialBalance.date),
    paymentMethodId: paymentMethods[cashInitialBalance.paymentMethodIndex].id,
    store: cashInitialBalance.store,
    purpose: cashInitialBalance.purpose,
    type: 'INCOME',
    amount: cashInitialBalance.amount,
  });

  // 収入データを追加
  incomeData.forEach(income => {
    transactionData.push({
      date: income.date,
      dayOfWeek: getDayOfWeek(income.date),
      paymentMethodId: paymentMethods[income.paymentMethodIndex].id,
      store: income.store,
      purpose: income.purpose,
      type: 'INCOME',
      amount: income.amount,
    });
  });

  // カード返金データを追加
  cardRefundData.forEach(refund => {
    transactionData.push({
      date: refund.date,
      dayOfWeek: getDayOfWeek(refund.date),
      paymentMethodId: paymentMethods[refund.paymentMethodIndex].id,
      store: refund.store,
      purpose: refund.purpose,
      type: 'INCOME',
      amount: refund.amount,
    });
  });

  // 日付でソート
  transactionData.sort((a, b) => a.date.getTime() - b.date.getTime());

  console.log(`📊 取引データ生成完了: ${transactionData.length}件`);

  await wait(500); // 0.5秒待機

  // 取引データを個別に作成（負荷軽減）
  console.log('📝 取引データ作成中...');
  let createdCount = 0;
  const batchSize = 5; // 5件ずつバッチ処理（さらに削減）

  for (let i = 0; i < transactionData.length; i += batchSize) {
    const batch = transactionData.slice(i, i + batchSize);
    
    // バッチ内の取引を個別作成（並行処理を避ける）
    for (const transaction of batch) {
      try {
        await prisma.transaction.create({
          data: {
            userId: user.id,
            date: transaction.date,
            dayOfWeek: transaction.dayOfWeek,
            paymentMethodId: transaction.paymentMethodId,
            store: transaction.store,
            purpose: transaction.purpose,
            type: transaction.type as 'INCOME' | 'EXPENSE',
            amount: transaction.amount,
          },
        });
        createdCount++;
        await wait(100); // 各作成後に0.1秒待機
      } catch (error) {
        console.error(`  ⚠️ 取引作成エラー (${createdCount + 1}件目):`, error);
        await wait(1000); // エラー時は1秒待機してリトライなし
      }
    }
    
    console.log(`  ✓ 取引データ作成中: ${createdCount}/${transactionData.length}件`);
    await wait(500); // バッチ間で0.5秒待機
  }

  console.log(`✅ 取引データ作成完了: ${createdCount}件`);

  await wait(500); // 0.5秒待機

  // 統計情報を表示
  const totalIncome = transactionData
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = transactionData
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  console.log('📈 統計情報:');
  console.log(`   総収入: ${totalIncome.toLocaleString()}円`);
  console.log(`   総支出: ${totalExpense.toLocaleString()}円`);
  console.log(`   差引: ${(totalIncome - totalExpense).toLocaleString()}円`);
  console.log('🎉 シーダー完了！');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ シーダーエラー:', e);
    await prisma.$disconnect();
    process.exit(1);
  });