import dynamic from 'next/dynamic';

const VERAApp = dynamic(() => import('@/components/VERAApp'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#0F2A5C] flex items-center justify-center">
          <svg className="w-7 h-7 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
        </div>
        <div className="text-sm text-slate-500 font-semibold">VERA Loading...</div>
      </div>
    </div>
  ),
});

export default function Home() {
  return <VERAApp />;
}
