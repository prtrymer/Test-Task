import { AuthForm } from '@/features/auth/auth-form';

export const metadata = { title: 'Create account · Data Room' };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
