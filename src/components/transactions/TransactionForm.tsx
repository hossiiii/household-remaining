'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { TransactionFormData, PaymentMethod } from '@/types';
import { MasterService } from '@/lib/masters-client';
import { formatDateForInput, validateAmount } from '@/lib/utils';

interface TransactionFormProps {
  initialData?: Partial<TransactionFormData>;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<TransactionFormData>({
    date: initialData?.date || formatDateForInput(new Date()),
    paymentMethodId: initialData?.paymentMethodId || '',
    store: initialData?.store || '',
    purpose: initialData?.purpose || '',
    type: initialData?.type || 'expense',
    amount: initialData?.amount || 0,
  });

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof TransactionFormData, string>>>({});

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    const result = await MasterService.getPaymentMethods();
    if (result.success && result.data) {
      setPaymentMethods(result.data);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TransactionFormData, string>> = {};

    if (!formData.date) {
      newErrors.date = '日付を入力してください';
    }

    if (!formData.paymentMethodId) {
      newErrors.paymentMethodId = '支払い方法を選択してください';
    }

    if (!validateAmount(formData.amount) || formData.amount <= 0) {
      newErrors.amount = '正しい金額を入力してください';
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
      console.error('Form submission error:', error);
    }
  };

  const handleInputChange = (field: keyof TransactionFormData, value: string | number) => {
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

  const paymentMethodOptions = paymentMethods.map(method => {
    let typeLabel = '';
    switch (method.type) {
      case 'CASH':
        typeLabel = '[現金]';
        break;
      case 'CARD':
        typeLabel = '[カード]';
        break;
      case 'BANK':
        typeLabel = '[銀行]';
        break;
    }
    
    return {
      value: method.id,
      label: `${typeLabel} ${method.name}`,
    };
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="日付"
          type="date"
          value={formData.date}
          onChange={(e) => handleInputChange('date', e.target.value)}
          error={errors.date}
          required
        />

        <Select
          label="支払い方法"
          options={paymentMethodOptions}
          value={formData.paymentMethodId}
          onChange={(e) => handleInputChange('paymentMethodId', e.target.value)}
          placeholder="支払い方法を選択"
          error={errors.paymentMethodId}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="使用店舗"
          type="text"
          value={formData.store}
          onChange={(e) => handleInputChange('store', e.target.value)}
          placeholder="店舗名を入力（任意）"
        />

        <Input
          label="用途"
          type="text"
          value={formData.purpose}
          onChange={(e) => handleInputChange('purpose', e.target.value)}
          placeholder="用途を入力（任意）"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="種別"
          options={[
            { value: 'income', label: '収入' },
            { value: 'expense', label: '支出' },
          ]}
          value={formData.type}
          onChange={(e) => handleInputChange('type', e.target.value as 'income' | 'expense')}
          required
        />

        <Input
          label="金額"
          type="number"
          min="0"
          step="1"
          value={formData.amount}
          onChange={(e) => handleInputChange('amount', Number(e.target.value))}
          error={errors.amount}
          placeholder="金額を入力"
          required
        />
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