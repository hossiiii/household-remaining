import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // テストユーザーの作成
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const user = await prisma.user.create({
    data: {
      name: 'テストユーザー',
      email: 'test@example.com',
      password: hashedPassword,
    },
  });

  console.log('Created user:', user);

  // 銀行マスタの作成
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
  ]);

  console.log('Created banks:', banks);

  // カード情報の作成
  const cards = await Promise.all([
    prisma.card.create({
      data: {
        userId: user.id,
        name: 'メインクレジットカード',
        type: 'CREDIT_CARD',
        withdrawalDay: 27,
        withdrawalBankId: banks[0].id,
      },
    }),
    prisma.card.create({
      data: {
        userId: user.id,
        name: '楽天カード',
        type: 'CREDIT_CARD',
        withdrawalDay: 27,
        withdrawalBankId: banks[1].id,
      },
    }),
  ]);

  console.log('Created cards:', cards);

  // 支払い方法マスタの作成
  const paymentMethods = await Promise.all([
    prisma.paymentMethod.create({
      data: {
        userId: user.id,
        name: '現金',
        type: 'CASH',
      },
    }),
    prisma.paymentMethod.create({
      data: {
        userId: user.id,
        name: 'メインクレジットカード',
        type: 'CARD',
        cardId: cards[0].id,
      },
    }),
    prisma.paymentMethod.create({
      data: {
        userId: user.id,
        name: '楽天カード',
        type: 'CARD',
        cardId: cards[1].id,
      },
    }),
    prisma.paymentMethod.create({
      data: {
        userId: user.id,
        name: 'みずほ銀行',
        type: 'BANK',
        bankId: banks[0].id,
      },
    }),
    prisma.paymentMethod.create({
      data: {
        userId: user.id,
        name: '三菱UFJ銀行',
        type: 'BANK',
        bankId: banks[1].id,
      },
    }),
  ]);

  console.log('Created payment methods:', paymentMethods);

  // サンプル取引の作成
  const transactions = await Promise.all([
    prisma.transaction.create({
      data: {
        userId: user.id,
        date: new Date('2024-01-15'),
        dayOfWeek: '月',
        paymentMethodId: paymentMethods[0].id, // 現金
        store: 'スーパーマーケット',
        purpose: '食材購入',
        type: 'EXPENSE',
        amount: 2500,
      },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        date: new Date('2024-01-16'),
        dayOfWeek: '火',
        paymentMethodId: paymentMethods[1].id, // メインクレジットカード
        store: 'ガソリンスタンド',
        purpose: '燃料費',
        type: 'EXPENSE',
        amount: 5000,
      },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        date: new Date('2024-01-18'),
        dayOfWeek: '木',
        paymentMethodId: paymentMethods[2].id, // 楽天カード
        store: 'オンラインショップ',
        purpose: '日用品購入',
        type: 'EXPENSE',
        amount: 3200,
      },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        date: new Date('2024-01-20'),
        dayOfWeek: '土',
        paymentMethodId: paymentMethods[3].id, // みずほ銀行
        purpose: '給与',
        type: 'INCOME',
        amount: 300000,
      },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        date: new Date('2024-01-25'),
        dayOfWeek: '木',
        paymentMethodId: paymentMethods[4].id, // 三菱UFJ銀行
        purpose: '副業収入',
        type: 'INCOME',
        amount: 50000,
      },
    }),
  ]);

  console.log('Created transactions:', transactions);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });