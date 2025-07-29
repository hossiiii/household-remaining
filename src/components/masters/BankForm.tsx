'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { BankFormData } from '@/types';

interface BankFormProps {
  initialData?: Partial<BankFormData>;
  onSubmit: (data: BankFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export const BankForm: React.FC<BankFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<BankFormData>({
    name: initialData?.name || '',
    branchName: initialData?.branchName || '',
    accountNumber: initialData?.accountNumber || '',
    memo: initialData?.memo || '',
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof BankFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof BankFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = '銀行名を入力してください';
    }

    // branchName and accountNumber are optional, so no validation required

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

  const handleInputChange = (field: keyof BankFormData, value: string | boolean) => {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="銀行名"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          error={errors.name}
          placeholder="例: みずほ銀行"
          required
        />

        <Input
          label="支店名"
          type="text"
          value={formData.branchName || ''}
          onChange={(e) => handleInputChange('branchName', e.target.value)}
          error={errors.branchName}
          placeholder="例: 新宿支店（任意）"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="口座番号"
          type="text"
          value={formData.accountNumber || ''}
          onChange={(e) => handleInputChange('accountNumber', e.target.value)}
          error={errors.accountNumber}
          placeholder="例: 1234567（任意）"
        />

        <div></div> {/* Empty div for grid spacing */}
      </div>

      <div>
        <label htmlFor="memo" className="block text-sm font-medium text-gray-700 mb-1">
          メモ（任意）
        </label>
        <textarea
          id="memo"
          value={formData.memo || ''}
          onChange={(e) => handleInputChange('memo', e.target.value)}
          placeholder="例: 給与振込用の口座"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          rows={3}
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