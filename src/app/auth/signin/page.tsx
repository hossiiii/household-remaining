import { SignInForm } from '@/components/auth/SignInForm';

export default function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; message?: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {searchParams.message === 'registration-success' && (
        <div className="max-w-md w-full mb-4">
          <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded text-center">
            登録が完了しました。ログインしてください。
          </div>
        </div>
      )}
      <SignInForm callbackUrl={searchParams.callbackUrl} />
    </div>
  );
}