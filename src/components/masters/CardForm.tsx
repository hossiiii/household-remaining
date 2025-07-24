'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { CardFormData, Bank } from '@/types';
import { MasterService } from '@/lib/masters-client';

interface CardFormProps {
  initialData?: Partial<CardFormData>;
  onSubmit: (data: CardFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export const CardForm: React.FC<CardFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<CardFormData>({
    name: initialData?.name || '',
    type: initialData?.type || 'CREDIT_CARD',
    withdrawalDay: initialData?.withdrawalDay || 1,
    withdrawalBankId: initialData?.withdrawalBankId || '',
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
  });

  const [banks, setBanks] = useState<Bank[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof CardFormData, string>>>({});

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
    const newErrors: Partial<Record<keyof CardFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'カード名を入力してください';
    }

    if (!formData.type) {
      newErrors.type = 'カード種別を選択してください';
    }

    if (!formData.withdrawalDay || formData.withdrawalDay < 1 || formData.withdrawalDay > 31) {
      newErrors.withdrawalDay = '引き落とし日は1-31の間で入力してください';
    }

    if (!formData.withdrawalBankId) {
      newErrors.withdrawalBankId = '引き落とし銀行を選択してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handling is done by the parent component
    }
  };

  const handleInputChange = (field: keyof CardFormData, value: string | number | boolean) => {
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

  const bankOptions = banks.map(bank => ({
    value: bank.id,
    label: bank.name,
  }));

  const typeOptions = [
    { value: 'CREDIT_CARD', label: 'クレジットカード' },
    { value: 'PREPAID_CARD', label: 'プリペイドカード' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="カード名"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          error={errors.name}
          placeholder="例: メインカード"
          required
        />

        <Select
          label="カード種別"
          options={typeOptions}
          value={formData.type}
          onChange={(e) => handleInputChange('type', e.target.value as CardFormData['type'])}
          error={errors.type}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="引き落とし日"
          type="number"
          min="1"
          max="31"
          value={formData.withdrawalDay}
          onChange={(e) => handleInputChange('withdrawalDay', Number(e.target.value))}
          error={errors.withdrawalDay}
          placeholder="例: 27"
          required
        />

        <Select
          label="引き落とし銀行"
          options={bankOptions}
          value={formData.withdrawalBankId}
          onChange={(e) => handleInputChange('withdrawalBankId', e.target.value)}
          error={errors.withdrawalBankId}
          placeholder="銀行を選択"
          required
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => handleInputChange('isActive', e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
          有効
        </label>
      </div>

      <div className="flex space-x-3 pt-4">
        <Button
          type="submit"
          loading={loading}
          className="flex-1"
        >
          {initialData ? '更新' : '登録'}
        </Button>
        
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
          >
            キャンセル
          </Button>
        )}
      </div>
    </form>
  );
};