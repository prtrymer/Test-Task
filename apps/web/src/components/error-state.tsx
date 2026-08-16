import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';

interface Props {
  error: unknown;
  onRetry?: () => void;
}

/**
 * The API answers 404 for anything the caller may not see, so a deleted item
 * and a revoked share look identical here. That is deliberate — but it means
 * the copy has to cover both without guessing which happened.
 */
export function ErrorState({ error, onRetry }: Props) {
  const gone = isApiError(error) && error.isGone;

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        <AlertCircle className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="font-medium">
          {gone ? 'This is no longer available' : 'Something went wrong'}
        </p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          {gone
            ? 'It may have been deleted, or the owner may have revoked your access.'
            : isApiError(error)
              ? error.message
              : 'Please try again in a moment.'}
        </p>
      </div>
      {onRetry && !gone && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
