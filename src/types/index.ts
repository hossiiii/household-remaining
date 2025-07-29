// 家計管理システムの基本型定義
import { User as PrismaUser, Transaction as PrismaTransaction, PaymentMethod as PrismaPaymentMethod, Card as PrismaCard, Bank as PrismaBank, Balance as PrismaBalance } from '@prisma/client';

// Auth.js拡張型定義
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }
}

// Prisma型をベースにした型定義
export type User = PrismaUser;
export type Transaction = PrismaTransaction;
export type PaymentMethod = PrismaPaymentMethod;
export type Card = PrismaCard;
export type Bank = PrismaBank;
export type Balance = PrismaBalance;

// 旧型定義（後方互換性のため残す）
export interface LegacyTransaction {
  id: string;
  date: Date;
  dayOfWeek: string;
  paymentMethod: string;
  store?: string;
  purpose?: string;
  type: 'income' | 'expense';
  amount: number;
  cashIncome?: number;
  cashExpense?: number;
  cashBalance?: number;
  cardAmount?: number;
  cardWithdrawalDate?: Date;
  bankIncome?: number;
  bankExpense?: number;
  bankBalance?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionFormData {
  date: string;
  paymentMethodId: string;
  store?: string;
  purpose?: string;
  type: 'income' | 'expense';
  amount: number;
}

export interface TransactionFilter {
  startDate?: Date;
  endDate?: Date;
  paymentMethodId?: string;
  type?: 'income' | 'expense' | 'all';
  store?: string;
  purpose?: string;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  cashBalance: number;
  bankBalance: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface CSVImportData {
  date: string;
  paymentMethod: string;
  store?: string;
  purpose?: string;
  type: string;
  amount: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// フォームデータ型定義
export interface PaymentMethodFormData {
  name: string;
  type: 'CASH' | 'CARD' | 'BANK';
  cardId?: string;
  bankId?: string;
  memo?: string;
  isActive?: boolean;
}

export interface CardFormData {
  name: string;
  type: 'CREDIT_CARD' | 'PREPAID_CARD';
  closingDay: number;
  withdrawalDay: number;
  withdrawalMonthOffset: number;
  withdrawalBankId: string;
  memo?: string;
  isActive?: boolean;
}

export interface BankFormData {
  name: string;
  branchName?: string;
  accountNumber?: string;
  memo?: string;
  isActive?: boolean;
}

// リレーション付きの型定義
export type PaymentMethodWithRelations = PaymentMethod & {
  card?: Card;
  bank?: Bank;
};

export type BalanceWithBank = Balance & {
  bank?: Bank;
};

export type TransactionWithPaymentMethod = Transaction & {
  paymentMethod: PaymentMethodWithRelations;
};

// 残高管理用の型定義
export interface BalanceSummary {
  cashBalance: number;
  bankBalances: {
    bankId: string;
    bankName: string;
    branchName?: string;
    balance: number;
  }[];
  totalBalance: number;
}

export interface BalanceFormData {
  type: 'CASH' | 'BANK';
  bankId?: string;
  amount: number;
}

// 履歴残高管理用の型定義
export interface HistoricalBalance {
  cash: number;
  banks: { bankId: string; bankName: string; balance: number }[];
}

export interface TransactionWithHistoricalBalance extends TransactionWithPaymentMethod {
  historicalBalance: HistoricalBalance;
  transactionImpact: {
    cashAmount?: number;
    bankTransactions?: { bankId: string; amount: number }[];
  };
}

export interface CSVRowWithBalance {
  date: string;
  paymentMethod: string;
  store: string;
  purpose: string;
  type: string;
  amount: number;
  cashTransaction: number | '';
  cashBalance: number;
  [key: string]: number | string; // 動的な銀行取引列・残高列
}