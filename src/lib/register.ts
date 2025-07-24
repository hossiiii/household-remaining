import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上で入力してください'),
});

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    const { name, email, password } = registerSchema.parse(data);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('このメールアドレスは既に使用されています');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(error.errors[0].message);
    }
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('ユーザー登録に失敗しました');
  }
}