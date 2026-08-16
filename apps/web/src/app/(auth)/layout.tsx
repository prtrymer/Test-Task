import { Vault } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl border bg-muted">
            <Vault className="size-5" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Data Room</h1>
        </div>
        {children}
      </div>
    </main>
  );
}
