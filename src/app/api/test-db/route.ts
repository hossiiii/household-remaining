import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 環境変数の確認（値の一部をマスク）
    const dbUrl = process.env.DATABASE_URL || '';
    const maskedUrl = dbUrl.replace(/postgres:([^@]+)@/, 'postgres:***@');
    
    console.log('Testing database connection...');
    console.log('DATABASE_URL format:', maskedUrl);
    
    // データベースへの単純なクエリ
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      dbUrl: maskedUrl,
      result
    });
  } catch (error) {
    // 環境変数の確認（値の一部をマスク）
    const dbUrl = process.env.DATABASE_URL || '';
    const maskedUrl = dbUrl.replace(/postgres:([^@]+)@/, 'postgres:***@');
    
    console.error('Database connection error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      dbUrl: process.env.DATABASE_URL ? maskedUrl : 'Not set',
      nodeEnv: process.env.NODE_ENV,
    }, { status: 500 });
  }
}