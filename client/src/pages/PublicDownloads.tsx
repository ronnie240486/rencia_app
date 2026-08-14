import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Download, Loader2, PackageOpen, ShieldCheck, Smartphone } from "lucide-react";

type DownloadApp = {
  slug: "ouropro" | "ultra" | "maximus";
  name: string;
  version: string;
  downloadUrl: string;
  logoUrl: string;
  accent: "gold" | "violet" | "sky";
};

const ACCENT: Record<DownloadApp["accent"], string> = {
  gold: "from-amber-400 to-yellow-600",
  violet: "from-violet-400 to-fuchsia-600",
  sky: "from-sky-400 to-blue-600",
};

function AppLogo({ app }: { app: DownloadApp }) {
  const [failed, setFailed] = useState(!app.logoUrl);
  return <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-xl font-black text-white">
    {!failed ? <img src={app.logoUrl} alt={app.name} className="h-full w-full object-cover" onError={() => setFailed(true)} /> : app.name.slice(0, 1)}
  </div>;
}

export default function PublicDownloads() {
  const [location] = useLocation();
  const [apps, setApps] = useState<DownloadApp[]>([]);
  const [loading, setLoading] = useState(true);
  const slug = useMemo(() => location.split("/")[2] || "", [location]);

  useEffect(() => {
    let active = true;
    fetch("/api/public/apps")
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Não foi possível carregar os aplicativos.")))
      .then((data: { apps: DownloadApp[] }) => { if (active) setApps(data.apps || []); })
      .catch(() => { if (active) setApps([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleApps = slug ? apps.filter(app => app.slug === slug) : apps;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#2a2115,_#090b11_48%,_#050609)] px-4 py-10 text-white sm:px-6">
    <section className="mx-auto max-w-4xl">
      <header className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-400/10 text-amber-300 shadow-[0_0_40px_rgba(251,191,36,.14)]"><Download size={30} /></div>
        <p className="text-xs font-bold uppercase tracking-[.24em] text-amber-300">Central oficial de downloads</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Baixe seu aplicativo</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">Escolha o aplicativo informado pelo seu revendedor. Esta página é pública e não dá acesso ao painel.</p>
      </header>

      {loading ? <div className="flex justify-center py-20 text-amber-300"><Loader2 className="animate-spin" size={30} /></div> : visibleApps.length ? <div className="grid gap-5 md:grid-cols-2">
        {visibleApps.map(app => <article key={app.slug} className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-2xl backdrop-blur">
          <div className={`h-2 bg-gradient-to-r ${ACCENT[app.accent]}`} />
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-4"><AppLogo app={app} /><div><h2 className="text-xl font-bold">{app.name}</h2><p className="mt-1 text-sm text-slate-400">{app.version}</p></div></div>
            <a href={app.downloadUrl} target="_blank" rel="noopener noreferrer" className={`mt-7 flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r ${ACCENT[app.accent]} px-5 text-base font-black text-slate-950 shadow-lg transition-transform hover:scale-[1.02]`}><Download size={20} /> BAIXAR AGORA</a>
            <div className="mt-6 space-y-3 text-xs text-slate-400"><p className="flex gap-2"><ShieldCheck size={16} className="shrink-0 text-emerald-400" />Baixe somente pelo link enviado pelo seu revendedor.</p><p className="flex gap-2"><Smartphone size={16} className="shrink-0 text-amber-300" />Se o Android solicitar, permita a instalação do aplicativo baixado.</p></div>
          </div>
        </article>)}
      </div> : <div className="rounded-3xl border border-white/10 bg-slate-950/80 px-6 py-16 text-center"><PackageOpen className="mx-auto mb-4 text-slate-500" size={36} /><h2 className="text-xl font-bold">Aplicativo indisponível</h2><p className="mt-2 text-sm text-slate-400">Peça ao seu revendedor o link correto para download.</p></div>}
    </section>
  </main>;
}
