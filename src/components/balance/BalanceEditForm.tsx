'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { BalanceFormData, Bank } from '@/types';
import { MasterService } from '@/lib/masters-client';
import { BalanceService } from '@/lib/balance-client';
import { validateAmount } from '@/lib/utils';

interface BalanceEditFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const BalanceEditForm: React.FC<BalanceEditFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<BalanceFormData>({
    type: 'CASH',
    amount: 0,
  });

  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BalanceFormData, string>>>({});

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    const result = await MasterService.getBanks();
    if (result.success && result.data) {
      setBanks(result.data);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof BalanceFormData, string>> = {};

    if (!validateAmount(formData.amount)) {
      newErrors.amount = '正しい金額を入力してください';
    }

    if (formData.type === 'BANK' && !formData.bankId) {
      newErrors.bankId = '銀行を選択してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const result = await BalanceService.updateBalance(
        formData.type,
        formData.amount,
        formData.bankId
      );

      if (result.success) {
        onSuccess();
      } else {
        alert('残高の更新に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('Balance update error:', error);
      alert('残高の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BalanceFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleTypeChange = (newType: 'CASH' | 'BANK') => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      bankId: newType === 'CASH' ? undefined : prev.bankId,
    }));
    setErrors({});
  };

  const bankOptions = banks.map(bank => ({
    value: bank.id,
    label: `${bank.name} ${bank.branchName ? `(${bank.branchName})` : ''}`,
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">残高を編集</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 残高の種類選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              残高の種類
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="CASH"
                  checked={formData.type === 'CASH'}
                  onChange={() => handleTypeChange('CASH')}
                  className="mr-2"
                />
                現金
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="BANK"
                  checked={formData.type === 'BANK'}
                  onChange={() => handleTypeChange('BANK')}
                  className="mr-2"
                />
                銀行
              </label>
            </div>
          </div>

          {/* 銀行選択（銀行残高の場合のみ） */}
          {formData.type === 'BANK' && (
            <div>
              {bankOptions.length > 0 ? (
                <Select
                  label="銀行を選択"
                  options={bankOptions}
                  value={formData.bankId || ''}
                  onChange={(e) => handleInputChange('bankId', e.target.value)}
                  error={errors.bankId}
                  placeholder="銀行を選択してください"
                  required
                />
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    登録された銀行がありません。先に銀行マスタで銀行を登録してください。
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 金額入力 */}
          <Input
            label="残高"
            type="number"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
            error={errors.amount}
            placeholder="0"
            step="0.01"
            required
          />

          {/* ボタン */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              loading={loading}
              className="flex-1"
              disabled={formData.type === 'BANK' && bankOptions.length === 0}
            >
              更新
            </Button>
            
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              className="flex-1"
            >
              キャンセル
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};