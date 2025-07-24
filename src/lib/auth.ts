import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// ログインフォームのバリデーションスキーマ
const signInSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上で入力してください'),
});

const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email',
          placeholder: 'example@example.com'
        },
        password: { 
          label: 'Password', 
          type: 'password' 
        },
      },
      async authorize(credentials) {
        try {
          console.log('Authorization attempt with credentials:', { email: credentials?.email });
          
          // バリデーション
          const { email, password } = signInSchema.parse(credentials);
          console.log('Validation passed for email:', email);

          // ユーザーをデータベースから検索
          const user = await prisma.user.findUnique({
            where: { email },
          });

          console.log('User found:', user ? { id: user.id, email: user.email, name: user.name } : 'No user found');

          if (!user || !user.password) {
            console.log('User not found or no password');
            return null;
          }

          // パスワードの検証
          const isValidPassword = await bcrypt.compare(password, user.password);
          console.log('Password validation result:', isValidPassword);

          if (!isValidPassword) {
            console.log('Invalid password');
            return null;
          }

          console.log('Authentication successful, returning user data');
          // 認証成功時にユーザー情報を返す
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // ログイン成功後のリダイレクト処理
      console.log('Redirect callback called with:', { url, baseUrl });
      
      // 相対パスの場合は baseUrl を追加
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      
      // 同一ドメインの場合はそのまま返す
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      
      // デフォルトはダッシュボードにリダイレクト
      return `${baseUrl}/dashboard`;
    },
  },
  session: { 
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);

export const { GET, POST } = handlers;
export const authOptions = authConfig;