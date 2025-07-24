'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Navigation } from './Navigation';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { data: session } = useSession();
  const pathname = usePathname();
  
  // 認証ページではナビゲーションを表示しない
  const isAuthPage = pathname?.startsWith('/auth/');
  
  if (isAuthPage || !session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main>{children}</main>
    </div>
  );
};