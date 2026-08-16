'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/api/resources';
import { isApiError } from '@/lib/api/errors';
import { session } from '@/lib/api/session';

const MIN_PASSWORD_LENGTH = 10;

interface Props {
  mode: 'login' | 'register';
}

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const isRegister = mode === 'register';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const submit = useMutation({
    mutationFn: async () =>
      isRegister
        ? auth.register({ email, password, name: name.trim() || undefined })
        : auth.login({ email, password }),
    onSuccess: (result) => {
      session.start(result.accessToken, result.user);
      router.replace('/rooms');
    },
  });

  const passwordTooShort =
    isRegister && password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const canSubmit = email.trim() && password && !passwordTooShort && !submit.isPending;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (canSubmit) submit.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {isRegister && (
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            autoComplete="name"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          aria-describedby={passwordTooShort ? 'password-hint' : undefined}
          required
        />
        {isRegister && (
          <p
            id="password-hint"
            className={`text-xs ${passwordTooShort ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
        )}
      </div>

      {submit.isError && (
        <p role="alert" className="text-sm text-destructive">
          {isApiError(submit.error)
            ? submit.error.message
            : 'Something went wrong. Please try again.'}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={!canSubmit}>
        {submit.isPending
          ? isRegister
            ? 'Creating account…'
            : 'Signing in…'
          : isRegister
            ? 'Create account'
            : 'Sign in'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? 'Already have an account? ' : 'No account yet? '}
        <Link
          href={isRegister ? '/login' : '/register'}
          className="text-foreground underline underline-offset-4"
        >
          {isRegister ? 'Sign in' : 'Create one'}
        </Link>
      </p>
    </form>
  );
}
