import { Metadata } from 'next';
import { BankWithdrawalScheduleClient } from './BankWithdrawalScheduleClient';

export const metadata: Metadata = {
  title: '銀行別引落し予定一覧 - 家計管理システム',
  description: '銀行別の引落し予定を月別・日別で確認できます',
};

export default function BankWithdrawalSchedulePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">銀行別引落し予定一覧</h1>
          <p className="mt-2 text-gray-600">
            各銀行の月別合計と日別引落し予定を確認できます
          </p>
        </div>
        
        <BankWithdrawalScheduleClient />
      </div>
    </div>
  );
}