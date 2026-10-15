import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { ROUTES } from '@/config/routes';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="text-[#6C63FF] text-6xl font-bold mb-3">404</div>
      <h1 className="text-[#1E1E1E] text-xl font-bold mb-1">Page not found</h1>
      <p className="text-[#8080A0] text-sm mb-6">The page you are looking for doesn't exist or has been moved.</p>
      <Link to={ROUTES.dashboard} className={buttonClassName('primary')}>
        <ArrowLeft size={15} />
        Back to Dashboard
      </Link>
    </div>
  );
}
