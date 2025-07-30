'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { BankWithdrawalScheduleTable } from '@/components/bank-withdrawal-schedule/BankWithdrawalScheduleTable';
import { BankWithdrawalScheduleService, type BankWithdrawalScheduleData, type BankWithdrawalScheduleFilter } from '@/lib/bank-withdrawal-schedule-client';
import { formatDateForInput } from '@/lib/utils';

export const BankWithdrawalSchedulePageClient: React.FC = () => {
  const { data: session } = useSession();
  const { showToast, ToastContainer } = useToast();
  const [data, setData] = useState<BankWithdrawalScheduleData | null>(null);
  const [loading, setLoading] = useState(false);

  // デフォルトは今月から3ヶ月分
  const now = new Date();
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 3, 0);

  const [filter, setFilter] = useState<BankWithdrawalScheduleFilter>({
    startDate: defaultStartDate,
    endDate: defaultEndDate,
  });

  useEffect(() => {
    if (session?.user?.id) {
      loadData();
    }
  }, [session?.user?.id]);

  const loadData = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      const result = await BankWithdrawalScheduleService.getBankWithdrawalSchedule(filter);
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        showToast(result.error || 'データの取得に失敗しました', 'error');
      }
    } catch (error) {
      console.error('Failed to load bank withdrawal schedule:', error);
      showToast('データの取得中にエラーが発生しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof BankWithdrawalScheduleFilter, value: any) => {
    setFilter(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSearch = () => {
    loadData();
  };

  if (!session) {
    return <div>ログインが必要です</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">銀行別引落し予定一覧</h1>
      </div>

      {/* フィルター */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-medium mb-4">期間指定</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="開始日"
            type="date"
            value={filter.startDate ? formatDateForInput(filter.startDate) : ''}
            onChange={(e) => 
              handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : undefined)
            }
          />
          <Input
            label="終了日"
            type="date"
            value={filter.endDate ? formatDateForInput(filter.endDate) : ''}
            onChange={(e) => 
              handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : undefined)
            }
          />
          <div className="flex items-end">
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? '読み込み中...' : '検索'}
            </Button>
          </div>
        </div>
      </div>

      {/* 引き落とし予定表 */}
      <div className="bg-white rounded-lg shadow">
        {data ? (
          <BankWithdrawalScheduleTable 
            data={data} 
            loading={loading}
          />
        ) : (
          <div className="p-8 text-center text-gray-500">
            {loading ? '読み込み中...' : 'データを読み込むには検索ボタンを押してください'}
          </div>
        )}
      </div>

      {/* トースト通知 */}
      <ToastContainer />
    </div>
  );
};