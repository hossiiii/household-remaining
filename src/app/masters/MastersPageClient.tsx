'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { PaymentMethodForm } from '@/components/masters/PaymentMethodForm';
import { PaymentMethodTable } from '@/components/masters/PaymentMethodTable';
import { CardForm } from '@/components/masters/CardForm';
import { CardTable } from '@/components/masters/CardTable';
import { BankForm } from '@/components/masters/BankForm';
import { BankTable } from '@/components/masters/BankTable';
import type { 
  PaymentMethod, 
  PaymentMethodFormData,
  Card,
  CardFormData,
  Bank,
  BankFormData
} from '@/types';
import { MasterService } from '@/lib/masters-client';

type ActiveTab = 'payment-methods' | 'cards' | 'banks';

export const MastersPageClient: React.FC = () => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<ActiveTab>('payment-methods');
  const [loading, setLoading] = useState(false);
  
  // Payment Methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  
  // Cards
  const [cards, setCards] = useState<(Card & { withdrawalBank: Bank })[]>([]);
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  
  // Banks
  const [banks, setBanks] = useState<Bank[]>([]);
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      loadData();
    }
  }, [session?.user?.id, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'payment-methods':
          await loadPaymentMethods();
          break;
        case 'cards':
          await loadCards();
          break;
        case 'banks':
          await loadBanks();
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    const result = await MasterService.getPaymentMethods();
    if (result.success && result.data) {
      setPaymentMethods(result.data);
    }
  };

  const loadCards = async () => {
    const result = await MasterService.getCards();
    if (result.success && result.data) {
      setCards(result.data as (Card & { withdrawalBank: Bank })[]);
    }
  };

  const loadBanks = async () => {
    const result = await MasterService.getBanks();
    if (result.success && result.data) {
      setBanks(result.data);
    }
  };

  // Payment Method handlers
  const handleCreatePaymentMethod = async (data: PaymentMethodFormData) => {
    const paymentMethodData = {
      name: data.name,
      type: data.type,
      isActive: data.isActive ?? true,
      bankId: data.bankId || null,
      cardId: data.cardId || null,
      memo: data.memo || null,
    };
    const result = await MasterService.createPaymentMethod(paymentMethodData);
    if (result.success) {
      setShowPaymentMethodForm(false);
      loadPaymentMethods();
    } else {
      alert(result.error || '支払い方法の作成に失敗しました');
    }
  };

  const handleUpdatePaymentMethod = async (data: PaymentMethodFormData) => {
    if (!editingPaymentMethod) return;
    
    const result = await MasterService.updatePaymentMethod(editingPaymentMethod.id, data);
    if (result.success) {
      setEditingPaymentMethod(null);
      setShowPaymentMethodForm(false);
      loadPaymentMethods();
    } else {
      alert(result.error || '支払い方法の更新に失敗しました');
    }
  };

  const handleEditPaymentMethod = (paymentMethod: PaymentMethod) => {
    setEditingPaymentMethod(paymentMethod);
    setShowPaymentMethodForm(true);
  };

  // Card handlers
  const handleCreateCard = async (data: CardFormData) => {
    const cardData = {
      name: data.name,
      type: data.type,
      closingDay: data.closingDay,
      withdrawalDay: data.withdrawalDay,
      withdrawalMonthOffset: data.withdrawalMonthOffset,
      withdrawalBankId: data.withdrawalBankId,
      isActive: data.isActive ?? true,
      memo: data.memo || null,
    };
    const result = await MasterService.createCard(cardData);
    if (result.success) {
      setShowCardForm(false);
      loadCards();
    } else {
      alert(result.error || 'カード情報の作成に失敗しました');
    }
  };

  const handleUpdateCard = async (data: CardFormData) => {
    if (!editingCard) return;
    
    const result = await MasterService.updateCard(editingCard.id, data);
    if (result.success) {
      setEditingCard(null);
      setShowCardForm(false);
      loadCards();
    } else {
      alert(result.error || 'カード情報の更新に失敗しました');
    }
  };

  const handleEditCard = (card: Card) => {
    setEditingCard(card);
    setShowCardForm(true);
  };

  const handleDeleteCard = async (id: string) => {
    // Note: Delete functionality would be implemented here
    // For now, just show alert as delete API endpoints aren't implemented yet
    alert('カード削除機能は実装予定です');
  };

  // Bank handlers
  const handleCreateBank = async (data: BankFormData) => {
    const bankData = {
      name: data.name,
      branchName: data.branchName ?? null,
      accountNumber: data.accountNumber ?? null,
      isActive: data.isActive ?? true,
      memo: data.memo || null,
    };
    const result = await MasterService.createBank(bankData);
    if (result.success) {
      setShowBankForm(false);
      loadBanks();
    } else {
      alert(result.error || '銀行情報の作成に失敗しました');
    }
  };

  const handleUpdateBank = async (data: BankFormData) => {
    if (!editingBank) return;
    
    const result = await MasterService.updateBank(editingBank.id, data);
    if (result.success) {
      setEditingBank(null);
      setShowBankForm(false);
      loadBanks();
    } else {
      alert(result.error || '銀行情報の更新に失敗しました');
    }
  };

  const handleEditBank = (bank: Bank) => {
    setEditingBank(bank);
    setShowBankForm(true);
  };

  const handleDeleteBank = async (id: string) => {
    // Note: Delete functionality would be implemented here
    // For now, just show alert as delete API endpoints aren't implemented yet
    alert('銀行削除機能は実装予定です');
  };

  if (!session) {
    return <div>ログインが必要です</div>;
  }

  const tabs = [
    { key: 'payment-methods' as const, label: '支払い方法' },
    { key: 'cards' as const, label: 'カード' },
    { key: 'banks' as const, label: '銀行' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'payment-methods':
        return (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">支払い方法管理</h2>
              <Button
                onClick={() => {
                  setEditingPaymentMethod(null);
                  setShowPaymentMethodForm(true);
                }}
              >
                新規支払い方法
              </Button>
            </div>

            {showPaymentMethodForm && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h3 className="text-lg font-medium mb-4">
                  {editingPaymentMethod ? '支払い方法編集' : '新規支払い方法'}
                </h3>
                <PaymentMethodForm
                  initialData={editingPaymentMethod ? {
                    name: editingPaymentMethod.name,
                    type: editingPaymentMethod.type,
                    isActive: editingPaymentMethod.isActive,
                  } : undefined}
                  onSubmit={editingPaymentMethod ? handleUpdatePaymentMethod : handleCreatePaymentMethod}
                  onCancel={() => {
                    setShowPaymentMethodForm(false);
                    setEditingPaymentMethod(null);
                  }}
                />
              </div>
            )}

            <div className="bg-white rounded-lg shadow">
              <PaymentMethodTable
                paymentMethods={paymentMethods}
                onEdit={handleEditPaymentMethod}
                loading={loading}
              />
            </div>
          </>
        );

      case 'cards':
        return (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">カード管理</h2>
              <Button
                onClick={() => {
                  setEditingCard(null);
                  setShowCardForm(true);
                }}
              >
                新規カード
              </Button>
            </div>

            {showCardForm && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h3 className="text-lg font-medium mb-4">
                  {editingCard ? 'カード編集' : '新規カード'}
                </h3>
                <CardForm
                  initialData={editingCard ? {
                    name: editingCard.name,
                    type: editingCard.type,
                    withdrawalDay: editingCard.withdrawalDay,
                    withdrawalBankId: editingCard.withdrawalBankId,
                    isActive: editingCard.isActive,
                  } : undefined}
                  onSubmit={editingCard ? handleUpdateCard : handleCreateCard}
                  onCancel={() => {
                    setShowCardForm(false);
                    setEditingCard(null);
                  }}
                />
              </div>
            )}

            <div className="bg-white rounded-lg shadow">
              <CardTable
                cards={cards}
                onEdit={handleEditCard}
                onDelete={handleDeleteCard}
                loading={loading}
              />
            </div>
          </>
        );

      case 'banks':
        return (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">銀行管理</h2>
              <Button
                onClick={() => {
                  setEditingBank(null);
                  setShowBankForm(true);
                }}
              >
                新規銀行
              </Button>
            </div>

            {showBankForm && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h3 className="text-lg font-medium mb-4">
                  {editingBank ? '銀行編集' : '新規銀行'}
                </h3>
                <BankForm
                  initialData={editingBank ? {
                    name: editingBank.name,
                    branchName: editingBank.branchName || undefined,
                    accountNumber: editingBank.accountNumber || undefined,
                    isActive: editingBank.isActive,
                  } : undefined}
                  onSubmit={editingBank ? handleUpdateBank : handleCreateBank}
                  onCancel={() => {
                    setShowBankForm(false);
                    setEditingBank(null);
                  }}
                />
              </div>
            )}

            <div className="bg-white rounded-lg shadow">
              <BankTable
                banks={banks}
                onEdit={handleEditBank}
                onDelete={handleDeleteBank}
                loading={loading}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">マスタデータ管理</h1>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      {renderTabContent()}
    </div>
  );
};