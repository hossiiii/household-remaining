'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface SignInFormProps {
  callbackUrl?: string;
}

export const SignInForm: React.FC<SignInFormProps> = ({ callbackUrl }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use NextAuth's built-in redirect functionality
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        callbackUrl: callbackUrl || '/dashboard',
        redirect: true,
      });

      // redirect: true means NextAuth handles the redirect automatically
      // If we reach here, it means authentication failed
      console.log('SignIn result (should only happen on error):', result);
      
      if (result?.error || result === null) {
        console.error('Login error:', result?.error);
        setError('メールアドレスまたはパスワードが正しくありません');
      } else {
        // This shouldn't happen with redirect: true, but just in case
        setError('ログインに失敗しました');
      }
    } catch (error) {
      setError('ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // エラーをクリア
    if (error) {
      setError('');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">ログイン</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="メールアドレス"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="example@example.com"
          required
        />

        <Input
          label="パスワード"
          type="password"
          value={formData.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          placeholder="パスワードを入力"
          required
        />

        {error && (
          <div className="text-red-600 text-sm text-center">{error}</div>
        )}

        <Button
          type="submit"
          loading={loading}
          className="w-full"
        >
          ログイン
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          アカウントをお持ちでない方は{' '}
          <a 
            href="/auth/signup" 
            className="text-blue-600 hover:text-blue-500"
          >
            新規登録
          </a>
        </p>
      </div>
    </div>
  );
};