import { AuthForm } from '@/features/auth/auth-form';

export const metadata = { title: 'Sign in · Data Room' };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
