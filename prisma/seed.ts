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

async function main() {
  console.log('🌱 シーダー開始...');

  // テストユーザーの作成
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      name: '田中太郎',
      email: 'test@example.com',
      password: hashedPassword,
    },
  });

  console.log('✅ ユーザー作成完了:', user.name);

  // 銀行マスタの作成（より多くの実際の銀行）
  const banks = await Promise.all([
    prisma.bank.create({
      data: {
        userId: user.id,
        name: 'みずほ銀行',
        branchName: '新宿支店',
        accountNumber: '1234567',
      },
    }),
    prisma.bank.create({
      data: {
        userId: user.id,
        name: '三菱UFJ銀行',
        branchName: '渋谷支店',
        accountNumber: '7654321',
      },
    }),
    prisma.bank.create({
      data: {
        userId: user.id,
        name: '三井住友銀行',
        branchName: '池袋支店',
        accountNumber: '9876543',
      },
    }),
    prisma.bank.create({
      data: {
        userId: user.id,
        name: 'ゆうちょ銀行',
        branchName: '本店',
        accountNumber: '12345678901',
      },
    }),
  ]);

  console.log(`✅ 銀行マスタ作成完了: ${banks.length}件`);

  // カード情報の作成（より多様なカード）
  const cards = await Promise.all([
    prisma.card.create({
      data: {
        userId: user.id,
        name: 'メインクレジットカード',
        type: 'CREDIT_CARD',
        withdrawalDay: 10,
        withdrawalBankId: banks[0].id, // みずほ銀行
      },
    }),
    prisma.card.create({
      data: {
        userId: user.id,
        name: '楽天カード',
        type: 'CREDIT_CARD',
        withdrawalDay: 27,
        withdrawalBankId: banks[1].id, // 三菱UFJ銀行
      },
    }),
    prisma.card.create({
      data: {
        userId: user.id,
        name: 'イオンカード',
        type: 'CREDIT_CARD',
        withdrawalDay: 2,
        withdrawalBankId: banks[2].id, // 三井住友銀行
      },
    }),
    prisma.card.create({
      data: {
        userId: user.id,
        name: 'Amazonプリペイドカード',
        type: 'PREPAID_CARD',
        withdrawalDay: 1,
        withdrawalBankId: banks[0].id,
      },
    }),
    prisma.card.create({
      data: {
        userId: user.id,
        name: 'PayPayカード',
        type: 'CREDIT_CARD',
        withdrawalDay: 25,
        withdrawalBankId: banks[3].id, // ゆうちょ銀行
      },
    }),
  ]);

  console.log(`✅ カードマスタ作成完了: ${cards.length}件`);

  // 支払い方法マスタの作成
  const paymentMethods = await Promise.all([
    // 現金
    prisma.paymentMethod.upsert({
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
    }),
    // カード系支払い方法
    ...cards.map(card => 
      prisma.paymentMethod.create({
        data: {
          userId: user.id,
          name: card.name,
          type: 'CARD',
          cardId: card.id,
        },
      })
    ),
    // 銀行系支払い方法
    ...banks.map(bank => 
      prisma.paymentMethod.create({
        data: {
          userId: user.id,
          name: bank.name,
          type: 'BANK',
          bankId: bank.id,
        },
      })
    ),
  ]);

  console.log(`✅ 支払い方法作成完了: ${paymentMethods.length}件`);

  // より現実的な取引データの作成（過去3ヶ月分）
  const transactionData = [];
  const startDate = new Date('2024-10-01');
  const endDate = new Date('2024-12-31');

  // 収入データ（月1回）
  const incomeData = [
    { date: new Date('2024-10-25'), amount: 350000, purpose: '給与', store: null, paymentMethodIndex: 5 }, // みずほ銀行
    { date: new Date('2024-11-25'), amount: 350000, purpose: '給与', store: null, paymentMethodIndex: 5 },
    { date: new Date('2024-12-25'), amount: 350000, purpose: '給与', store: null, paymentMethodIndex: 5 },
    { date: new Date('2024-11-15'), amount: 50000, purpose: '副業収入', store: null, paymentMethodIndex: 6 }, // 三菱UFJ銀行
    { date: new Date('2024-12-15'), amount: 75000, purpose: '副業収入', store: null, paymentMethodIndex: 6 },
    { date: new Date('2024-12-31'), amount: 100000, purpose: 'ボーナス', store: null, paymentMethodIndex: 5 },
  ];

  // 支出データ（様々なパターン）
  const expensePatterns = [
    // 食費関連
    { stores: ['イオン', 'イトーヨーカドー', '西友', 'ライフ'], purposes: ['食材購入', '日用品'], amountRange: [1500, 8000], frequency: 20 },
    { stores: ['セブンイレブン', 'ファミリーマート', 'ローソン'], purposes: ['弁当', '飲み物', '軽食'], amountRange: [200, 1500], frequency: 15 },
    
    // 交通費
    { stores: ['JR東日本', '東京メトロ', '都営地下鉄'], purposes: ['交通費'], amountRange: [200, 800], frequency: 25 },
    
    // 光熱費・通信費
    { stores: ['東京電力', '東京ガス'], purposes: ['電気代', 'ガス代'], amountRange: [5000, 12000], frequency: 3 },
    { stores: ['NTTドコモ', 'au', 'ソフトバンク'], purposes: ['携帯代'], amountRange: [8000, 15000], frequency: 3 },
    
    // 娯楽・外食
    { stores: ['マクドナルド', '吉野家', 'スタバ', 'タリーズ'], purposes: ['外食', '飲食'], amountRange: [500, 2000], frequency: 12 },
    { stores: ['Amazon', '楽天', 'ヨドバシ'], purposes: ['ネット購入', '電化製品'], amountRange: [1000, 30000], frequency: 8 },
    
    // 交際費・趣味
    { stores: ['居酒屋', 'カラオケ', '映画館'], purposes: ['交際費', '娯楽'], amountRange: [2000, 8000], frequency: 6 },
    
    // ガソリン・車関連
    { stores: ['ENEOS', '出光', 'コスモ石油'], purposes: ['ガソリン代'], amountRange: [3000, 7000], frequency: 4 },
  ];

  // 支出データ生成
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    for (const pattern of expensePatterns) {
      if (Math.random() < pattern.frequency / 100) {
        const store = pattern.stores[Math.floor(Math.random() * pattern.stores.length)];
        const purpose = pattern.purposes[Math.floor(Math.random() * pattern.purposes.length)];
        const amount = randomAmount(pattern.amountRange[0], pattern.amountRange[1]);
        
        // 支払い方法をランダムに選択（現金、カード、銀行から）
        let paymentMethodIndex;
        if (amount < 1000) {
          paymentMethodIndex = 0; // 少額は現金
        } else if (amount < 5000) {
          paymentMethodIndex = Math.random() < 0.7 ? Math.floor(Math.random() * 6) + 1 : 0; // カード多め
        } else {
          paymentMethodIndex = Math.floor(Math.random() * 6) + 1; // カードまたは銀行
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

  // 日付でソート
  transactionData.sort((a, b) => a.date.getTime() - b.date.getTime());

  console.log(`📊 取引データ生成完了: ${transactionData.length}件`);

  // 取引データを一括作成
  const transactions = await prisma.transaction.createMany({
    data: transactionData.map(transaction => ({
      userId: user.id,
      date: transaction.date,
      dayOfWeek: transaction.dayOfWeek,
      paymentMethodId: transaction.paymentMethodId,
      store: transaction.store,
      purpose: transaction.purpose,
      type: transaction.type as 'INCOME' | 'EXPENSE',
      amount: transaction.amount,
    })),
  });

  console.log(`✅ 取引データ作成完了: ${transactions.count}件`);

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