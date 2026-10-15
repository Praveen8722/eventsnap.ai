import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';

  return (
    <div className="flex flex-col items-center justify-center text-center py-24" role="alert">
      <div className="w-12 h-12 rounded-2xl bg-[#FFF1F0] flex items-center justify-center mb-4">
        <AlertTriangle size={22} className="text-[#FF675D]" />
      </div>
      <h2 className="text-[#1E1E1E] text-lg font-bold mb-1">Couldn't load this page</h2>
      <p className="text-[#8080A0] text-sm mb-6 max-w-md">{message}</p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          <RotateCw size={15} /> Try again
        </Button>
      )}
    </div>
  );
}
