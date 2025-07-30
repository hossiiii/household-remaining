import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BankWithdrawalSchedulePageClient } from './BankWithdrawalSchedulePageClient';

export default async function BankWithdrawalSchedulePage() {
  const session = await auth();
  
  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          銀行別引落し予定一覧
        </h1>
        <p className="text-gray-600">
          各銀行からの引落し予定を月別・日別に表示します。
        </p>
      </div>
      
      <BankWithdrawalSchedulePageClient />
    </div>
  );
}