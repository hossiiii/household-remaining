'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { PaymentMethodFormData, Card, Bank } from '@/types';
import { MasterService } from '@/lib/masters-client';

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
    cardId: initialData?.cardId || '',
    bankId: initialData?.bankId || '',
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
  });

  const [cards, setCards] = useState<Card[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [sourceType, setSourceType] = useState<'cash' | 'card' | 'bank'>('cash');
  const [errors, setErrors] = useState<Partial<Record<keyof PaymentMethodFormData, string>>>({});

  useEffect(() => {
    loadMasterData();
    
    // 初期データがある場合は適切なソースタイプを設定
    if (initialData?.type === 'CARD' && initialData?.cardId) {
      setSourceType('card');
    } else if (initialData?.type === 'BANK' && initialData?.bankId) {
      setSourceType('bank');
    } else {
      setSourceType('cash');
    }
  }, [initialData]);

  const loadMasterData = async () => {
    const [cardResult, bankResult] = await Promise.all([
      MasterService.getCards(),
      MasterService.getBanks(),
    ]);
    
    if (cardResult.success && cardResult.data) {
      setCards(cardResult.data);
    }
    
    if (bankResult.success && bankResult.data) {
      setBanks(bankResult.data);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PaymentMethodFormData, string>> = {};

    if (sourceType === 'cash') {
      if (!formData.name.trim()) {
        newErrors.name = '支払い方法名を入力してください';
      } else if (formData.name.trim() !== '現金') {
        newErrors.name = '現金の場合は「現金」と入力してください';
      }
    } else if (sourceType === 'card') {
      if (!formData.cardId) {
        newErrors.cardId = 'カードを選択してください';
      }
    } else if (sourceType === 'bank') {
      if (!formData.bankId) {
        newErrors.bankId = '銀行を選択してください';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    let submitData: PaymentMethodFormData;
    
    if (sourceType === 'cash') {
      submitData = {
        name: '現金',
        type: 'CASH',
        isActive: formData.isActive,
      };
    } else if (sourceType === 'card') {
      const selectedCard = cards.find(c => c.id === formData.cardId);
      submitData = {
        name: selectedCard?.name || '',
        type: 'CARD',
        cardId: formData.cardId,
        isActive: formData.isActive,
      };
    } else {
      const selectedBank = banks.find(b => b.id === formData.bankId);
      submitData = {
        name: selectedBank?.name || '',
        type: 'BANK',
        bankId: formData.bankId,
        isActive: formData.isActive,
      };
    }

    try {
      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleSourceTypeChange = (newType: 'cash' | 'card' | 'bank') => {
    setSourceType(newType);
    
    // フォームデータをリセット
    setFormData(prev => ({
      ...prev,
      name: newType === 'cash' ? '現金' : '',
      type: newType === 'cash' ? 'CASH' : newType === 'card' ? 'CARD' : 'BANK',
      cardId: '',
      bankId: '',
    }));
    
    // エラーをクリア
    setErrors({});
  };

  const handleInputChange = (field: keyof PaymentMethodFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const cardOptions = cards.map(card => ({
    value: card.id,
    label: `${card.name} (${card.type === 'CREDIT_CARD' ? 'クレジット' : 'プリペイド'})`,
  }));

  const bankOptions = banks.map(bank => ({
    value: bank.id,
    label: `${bank.name} ${bank.branchName ? `(${bank.branchName})` : ''}`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 支払い方法の種類選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          支払い方法の種類
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="sourceType"
              value="cash"
              checked={sourceType === 'cash'}
              onChange={() => handleSourceTypeChange('cash')}
              className="mr-2"
            />
            現金
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="sourceType"
              value="card"
              checked={sourceType === 'card'}
              onChange={() => handleSourceTypeChange('card')}
              className="mr-2"
            />
            カード
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="sourceType"
              value="bank"
              checked={sourceType === 'bank'}
              onChange={() => handleSourceTypeChange('bank')}
              className="mr-2"
            />
            銀行
          </label>
        </div>
      </div>

      {/* 条件に応じた入力フィールド */}
      {sourceType === 'cash' && (
        <Input
          label="支払い方法名"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          error={errors.name}
          placeholder="現金"
          required
        />
      )}

      {sourceType === 'card' && (
        <div>
          {cardOptions.length > 0 ? (
            <Select
              label="カードを選択"
              options={cardOptions}
              value={formData.cardId || ''}
              onChange={(e) => handleInputChange('cardId', e.target.value)}
              error={errors.cardId}
              placeholder="カードを選択してください"
              required
            />
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                登録されたカードがありません。先にカードマスタでカードを登録してください。
              </p>
            </div>
          )}
        </div>
      )}

      {sourceType === 'bank' && (
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

      {/* 有効フラグ */}
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

      {/* ボタン */}
      <div className="flex space-x-3 pt-4">
        <Button
          type="submit"
          loading={loading}
          className="flex-1"
          disabled={
            (sourceType === 'card' && cardOptions.length === 0) ||
            (sourceType === 'bank' && bankOptions.length === 0)
          }
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