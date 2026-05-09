export function StatusMessage({ tone, text }: { tone: 'error' | 'success'; text: string }) {
  const styles =
    tone === 'error'
      ? 'border-red-400/30 bg-red-500/10 text-red-100'
      : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';

  return (
    <p className={`mb-4 rounded-lg border px-4 py-3 text-sm font-semibold ${styles}`}>
      {text}
    </p>
  );
}