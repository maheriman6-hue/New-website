import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-[#f2eee6]">
      <div className="text-center">
        <div className="font-display text-[6rem] uppercase tracking-[-0.08em]">404</div>
        <Link href="/" className="mt-4 inline-block rounded-full bg-[#f2eee6] px-5 py-2 text-[12px] uppercase tracking-[0.12em] text-[#0a0a0a]">
          Go home
        </Link>
      </div>
    </div>
  );
}
