import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-slate-800/80 border border-slate-700/60 rounded-2xl p-8 backdrop-blur shadow-2xl">
        <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
          <FileQuestion className="w-8 h-8" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
          404 Not Found
        </span>
        <h1 className="text-2xl font-bold text-white mt-4 mb-2">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Berkas atau halaman verifikasi yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
