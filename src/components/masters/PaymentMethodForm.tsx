'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { PaymentMethodFormData } from '@/types';
import { validateAmount } from '@/lib/utils';

interface PaymentMethodFormProps {
  initialData?: Partial<PaymentMethodFormData>;
  onSubmit: (data: PaymentMethodFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export const PaymentMethodForm: React.FC<PaymentMethodFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<PaymentMethodFormData>({
    name: initialData?.name || '',
    type: initialData?.type || 'CASH',
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof PaymentMethodFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PaymentMethodFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = '支払い方法名を入力してください';
    }

    if (!formData.type) {
      newErrors.type = '種別を選択してください';
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

  const handleInputChange = (field: keyof PaymentMethodFormData, value: string | boolean) => {
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

  const typeOptions = [
    { value: 'CASH', label: '現金' },
    { value: 'CREDIT_CARD', label: 'クレジットカード' },
    { value: 'PREPAID_CARD', label: 'プリペイドカード' },
    { value: 'MEAL_TICKET', label: '食券' },
    { value: 'BANK', label: '銀行' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="支払い方法名"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          error={errors.name}
          placeholder="例: メインクレジット"
          required
        />

        <Select
          label="種別"
          options={typeOptions}
          value={formData.type}
          onChange={(e) => handleInputChange('type', e.target.value as PaymentMethodFormData['type'])}
          error={errors.type}
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