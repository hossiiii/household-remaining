import { z } from 'zod';

// Auth validation schemas
export const signUpSchema = z.object({
  name: z.string().min(2, '名前は2文字以上で入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上で入力してください'),
});

export const signInSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上で入力してください'),
});

// Transaction validation schemas
export const transactionSchema = z.object({
  date: z.string().min(1, '日付を選択してください'),
  paymentMethodId: z.string().min(1, '支払い方法を選択してください'),
  store: z.string().optional(),
  purpose: z.string().optional(),
  type: z.enum(['income', 'expense'], {
    required_error: '種別を選択してください',
  }),
  amount: z.number().positive('金額は正の数で入力してください'),
});

export const transactionUpdateSchema = transactionSchema.partial();

// Payment Method validation schemas
const paymentMethodBaseSchema = z.object({
  name: z.string().min(1, '支払い方法名を入力してください'),
  type: z.enum(['CASH', 'CARD', 'BANK'], {
    required_error: '種別を選択してください',
  }),
  cardId: z.string().optional(),
  bankId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const paymentMethodSchema = paymentMethodBaseSchema.refine((data) => {
  // カードタイプの場合はcardIdが必要
  if (data.type === 'CARD' && !data.cardId) {
    return false;
  }
  // 銀行タイプの場合はbankIdが必要
  if (data.type === 'BANK' && !data.bankId) {
    return false;
  }
  return true;
}, {
  message: '支払い方法の種別に応じて適切な関連情報を選択してください',
});

export const paymentMethodUpdateSchema = paymentMethodBaseSchema.partial();

// Card validation schemas
export const cardSchema = z.object({
  name: z.string().min(1, 'カード名を入力してください'),
  type: z.enum(['CREDIT_CARD', 'PREPAID_CARD'], {
    required_error: 'カード種別を選択してください',
  }),
  closingDay: z.number().min(1, '締日は1日以上で入力してください').max(31, '締日は31日以下で入力してください'),
  withdrawalDay: z.number().min(1, '引き落とし日は1日以上で入力してください').max(31, '引き落とし日は31日以下で入力してください'),
  withdrawalMonthOffset: z.union([z.literal(1), z.literal(2)], {
    required_error: '引き落とし月を選択してください',
  }),
  withdrawalBankId: z.string().min(1, '引き落とし銀行を選択してください'),
  isActive: z.boolean().default(true),
});

export const cardUpdateSchema = cardSchema.partial();

// Bank validation schemas
export const bankSchema = z.object({
  name: z.string().min(1, '銀行名を入力してください'),
  accountNumber: z.string().optional(),
  branchName: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const bankUpdateSchema = bankSchema.partial();

// CSV validation schemas
export const csvRowSchema = z.object({
  date: z.string().min(1, '日付が必要です'),
  paymentMethod: z.string().min(1, '支払い方法が必要です'),
  store: z.string().optional(),
  purpose: z.string().optional(),
  type: z.string().min(1, '種別が必要です'),
  amount: z.string().min(1, '金額が必要です'),
});

// Pagination validation schemas
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Filter validation schemas
export const transactionFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentMethodId: z.string().optional(),
  type: z.enum(['income', 'expense', 'all']).default('all'),
  store: z.string().optional(),
  purpose: z.string().optional(),
});

// Type inference helpers
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type TransactionFormData = z.infer<typeof transactionSchema>;
export type PaymentMethodFormData = z.infer<typeof paymentMethodSchema>;
export type CardFormData = z.infer<typeof cardSchema>;
export type BankFormData = z.infer<typeof bankSchema>;
export type CSVRowData = z.infer<typeof csvRowSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
export type TransactionFilterData = z.infer<typeof transactionFilterSchema>;