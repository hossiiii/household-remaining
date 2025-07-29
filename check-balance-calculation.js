const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBalanceCalculation() {
  try {
    console.log('🔍 残高計算の詳細を確認中...\n');
    
    // 最初のユーザーを取得
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ ユーザーが見つかりません');
      return;
    }
    
    console.log(`👤 ユーザー: ${user.name} (${user.id})\n`);
    
    // すべての取引を取得
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      include: {
        paymentMethod: {
          include: {
            bank: true,
            card: true,
          }
        }
      },
      orderBy: { date: 'asc' }
    });
    
    console.log(`📊 総取引数: ${transactions.length}件\n`);
    
    // 支払い方法別に集計
    const byPaymentType = {
      CASH: { income: 0, expense: 0, count: 0 },
      BANK: { income: 0, expense: 0, count: 0 },
      CARD: { income: 0, expense: 0, count: 0 },
    };
    
    // 銀行別集計
    const byBank = {};
    
    transactions.forEach(t => {
      const amount = Number(t.amount);
      const pmType = t.paymentMethod.type;
      
      byPaymentType[pmType].count++;
      
      if (t.type === 'INCOME') {
        byPaymentType[pmType].income += amount;
      } else {
        byPaymentType[pmType].expense += amount;
      }
      
      // 銀行別の集計
      if (pmType === 'BANK' && t.paymentMethod.bank) {
        const bankId = t.paymentMethod.bankId;
        const bankName = t.paymentMethod.bank.name;
        
        if (!byBank[bankId]) {
          byBank[bankId] = {
            name: bankName,
            income: 0,
            expense: 0,
            balance: 0
          };
        }
        
        if (t.type === 'INCOME') {
          byBank[bankId].income += amount;
        } else {
          byBank[bankId].expense += amount;
        }
        byBank[bankId].balance = byBank[bankId].income - byBank[bankId].expense;
      }
    });
    
    // 結果を表示
    console.log('💰 支払い方法別集計:');
    console.log('='.repeat(50));
    
    Object.entries(byPaymentType).forEach(([type, data]) => {
      console.log(`\n【${type}】`);
      console.log(`  取引数: ${data.count}件`);
      console.log(`  収入: ${data.income.toLocaleString()}円`);
      console.log(`  支出: ${data.expense.toLocaleString()}円`);
      console.log(`  差引: ${(data.income - data.expense).toLocaleString()}円`);
    });
    
    console.log('\n\n🏦 銀行別集計:');
    console.log('='.repeat(50));
    
    Object.entries(byBank).forEach(([bankId, data]) => {
      console.log(`\n【${data.name}】`);
      console.log(`  収入: ${data.income.toLocaleString()}円`);
      console.log(`  支出: ${data.expense.toLocaleString()}円`);
      console.log(`  残高: ${data.balance.toLocaleString()}円`);
    });
    
    // 総計
    const totalIncome = Object.values(byPaymentType).reduce((sum, data) => sum + data.income, 0);
    const totalExpense = Object.values(byPaymentType).reduce((sum, data) => sum + data.expense, 0);
    
    console.log('\n\n📈 総計:');
    console.log('='.repeat(50));
    console.log(`総収入: ${totalIncome.toLocaleString()}円`);
    console.log(`総支出: ${totalExpense.toLocaleString()}円`);
    console.log(`差引（全て含む）: ${(totalIncome - totalExpense).toLocaleString()}円`);
    
    // カードを除いた計算
    const cashBankIncome = byPaymentType.CASH.income + byPaymentType.BANK.income;
    const cashBankExpense = byPaymentType.CASH.expense + byPaymentType.BANK.expense;
    
    console.log(`\n💳 カードを除いた計算:`);
    console.log(`収入（現金+銀行）: ${cashBankIncome.toLocaleString()}円`);
    console.log(`支出（現金+銀行）: ${cashBankExpense.toLocaleString()}円`);
    console.log(`差引（現金+銀行のみ）: ${(cashBankIncome - cashBankExpense).toLocaleString()}円`);
    
    // 現在の残高データベースの値を確認
    console.log('\n\n💾 データベースの残高テーブル:');
    console.log('='.repeat(50));
    
    const balances = await prisma.balance.findMany({
      where: { userId: user.id },
      include: { bank: true }
    });
    
    let dbTotal = 0;
    balances.forEach(b => {
      const amount = Number(b.amount);
      dbTotal += amount;
      
      if (b.type === 'CASH') {
        console.log(`現金: ${amount.toLocaleString()}円`);
      } else if (b.bank) {
        console.log(`${b.bank.name}: ${amount.toLocaleString()}円`);
      }
    });
    
    console.log(`\n総残高（データベース）: ${dbTotal.toLocaleString()}円`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBalanceCalculation();