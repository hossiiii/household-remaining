import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Since we can't use auth() directly in edge runtime,
// we'll check for the session token cookie instead
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check for session token (NextAuth v5 uses this cookie name)
  const sessionToken = request.cookies.get('authjs.session-token') || 
                      request.cookies.get('__Secure-authjs.session-token');
  const isLoggedIn = !!sessionToken;

  // 認証が必要なページのパスを定義
  const protectedPaths = [
    '/dashboard',
    '/transactions',
    '/masters',
    '/import-export',
  ];

  // 認証済みユーザーがアクセスできないページ（ログインページなど）
  const authPaths = [
    '/auth/signin',
    '/auth/signup',
  ];

  // 認証が必要なページへの未認証アクセス
  const isProtectedPath = protectedPaths.some(path => 
    pathname.startsWith(path)
  );

  if (isProtectedPath && !isLoggedIn) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // 認証済みユーザーの認証ページへのアクセス
  const isAuthPath = authPaths.some(path => 
    pathname.startsWith(path)
  );

  if (isAuthPath && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ルートページへのアクセス時の処理
  if (pathname === '/') {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 以下のパスを除外してミドルウェアを実行
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};