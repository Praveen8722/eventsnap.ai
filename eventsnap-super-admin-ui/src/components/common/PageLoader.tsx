export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-label="Loading page">
      <div className="w-8 h-8 rounded-full border-2 border-[#6C63FF]/20 border-t-[#6C63FF] animate-spin" />
    </div>
  );
}