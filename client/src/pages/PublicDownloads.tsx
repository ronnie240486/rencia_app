import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Download, Loader2, PackageOpen, ShieldCheck, Smartphone } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

type DownloadApp = {
  slug: "ouropro" | "ultra" | "maximus" | "prestige" | "optimus" | "imperio" | "infinitus" | "supremus" | "evolux";
  name: string;
  version: string;
  downloadUrl: string;
  downloaderCode: string;
  aftvUrl: string;
  logoUrl: string;
  accent: "gold" | "violet" | "sky" | "rose" | "emerald" | "orange" | "indigo" | "pink" | "cyan";
};

const ACCENT: Record<DownloadApp["accent"], string> = {
  gold: "from-amber-400 to-yellow-600",
  violet: "from-violet-400 to-fuchsia-600",
  sky: "from-sky-400 to-blue-600",
  rose: "from-rose-400 to-red-600",
  emerald: "from-emerald-400 to-teal-600",
  orange: "from-orange-400 to-amber-600",
  indigo: "from-indigo-400 to-violet-600",
  pink: "from-pink-400 to-fuchsia-600",
  cyan: "from-cyan-400 to-sky-600",
};

const SHORT_DOWNLOAD_SLUGS: Record<string, DownloadApp["slug"]> = {
  "/o": "ouropro",
  "/u": "ultra",
  "/m": "maximus",
  "/p": "prestige",
  "/x": "optimus",
  "/i": "imperio",
  "/n": "infinitus",
  "/s": "supremus",
  "/e": "evolux",
};

const APP_SHOWCASES: Partial<Record<DownloadApp["slug"], { title: string; images: Array<{ url: string; label: string }> }>> = {
  ouropro: {
    title: "Conheça o Ouro Pro",
    images: [
      { url: "/manus-storage/03-inicio_579dda8d.webp", label: "Tela inicial" },
      { url: "/manus-storage/02-canais_4f59d933.webp", label: "Canais ao vivo" },
      { url: "/manus-storage/05-filmes_e4a96396.webp", label: "Filmes" },
      { url: "/manus-storage/04-radios_35e9e2b4.webp", label: "Rádios" },
      { url: "/manus-storage/01-configuracoes_14ff9f34.webp", label: "Configurações" },
    ],
  },
};

function AppLogo({ app }: { app: DownloadApp }) {
  const [failed, setFailed] = useState(!app.logoUrl);
  return <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-xl font-black text-white">
    {!failed ? <img src={app.logoUrl} alt={app.name} className="h-full w-full object-cover" onError={() => setFailed(true)} /> : app.name.slice(0, 1)}
  </div>;
}

function AppShowcase({ app }: { app: DownloadApp }) {
  const showcase = APP_SHOWCASES[app.slug];
  if (!showcase) return null;

  return <section className="border-t border-white/10 bg-black/20 px-6 py-6 sm:px-8">
    <p className="mb-4 text-sm font-bold text-white">{showcase.title}</p>
    <Carousel opts={{ loop: true }} className="mx-auto w-full max-w-3xl px-10">
      <CarouselContent>
        {showcase.images.map((image) => <CarouselItem key={image.url}>
          <figure className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-xl">
            <img src={image.url} alt={`${app.name} — ${image.label}`} className="aspect-video w-full object-cover" loading="lazy" />
            <figcaption className="border-t border-white/10 px-4 py-3 text-center text-sm font-medium text-slate-200">{image.label}</figcaption>
          </figure>
        </CarouselItem>)}
      </CarouselContent>
      <CarouselPrevious className="left-1 border-white/20 bg-slate-950/90 text-white hover:bg-slate-800 hover:text-white" />
      <CarouselNext className="right-1 border-white/20 bg-slate-950/90 text-white hover:bg-slate-800 hover:text-white" />
    </Carousel>
  </section>;
}

export default function PublicDownloads() {
  const [location] = useLocation();
  const [apps, setApps] = useState<DownloadApp[]>([]);
  const [loading, setLoading] = useState(true);
  const slug = useMemo(() => SHORT_DOWNLOAD_SLUGS[location] || location.split("/")[2] || "", [location]);
  const allAppsStore = location === "/d";

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

      {loading ? <div className="flex justify-center py-20 text-amber-300"><Loader2 className="animate-spin" size={30} /></div> : visibleApps.length ? <div className={allAppsStore ? "space-y-5" : "grid gap-5 md:grid-cols-2"}>
        {visibleApps.map(app => <article key={app.slug} className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-2xl backdrop-blur">
          <div className={`h-2 bg-gradient-to-r ${ACCENT[app.accent]}`} />
          <div className={allAppsStore ? "flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8" : "p-6 sm:p-8"}>
            <div className={allAppsStore ? "flex items-center gap-4" : "flex items-center gap-4"}><AppLogo app={app} /><div><h2 className="text-xl font-bold">{app.name}</h2><p className="mt-1 text-sm text-slate-400">{app.version}</p></div></div>
            {app.downloaderCode && <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Código Downloader</p><p className="mt-1 text-xl font-black tracking-[.12em] text-amber-300">{app.downloaderCode}</p></div>}
            {app.aftvUrl && <a href={app.aftvUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-sky-300/30 bg-sky-400/10 px-4 py-3 text-center text-sm font-bold text-sky-200 hover:bg-sky-400/20">Abrir link AFTV</a>}
            <a href={app.downloadUrl} target="_blank" rel="noopener noreferrer" className={`${allAppsStore ? "sm:min-w-56" : "mt-7"} flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r ${ACCENT[app.accent]} px-5 text-base font-black text-slate-950 shadow-lg transition-transform hover:scale-[1.02]`}><Download size={20} /> BAIXAR AGORA</a>
            {!allAppsStore && <div className="mt-6 space-y-3 text-xs text-slate-400"><p className="flex gap-2"><ShieldCheck size={16} className="shrink-0 text-emerald-400" />Baixe somente pelo link enviado pelo seu revendedor.</p><p className="flex gap-2"><Smartphone size={16} className="shrink-0 text-amber-300" />Se o Android solicitar, permita a instalação do aplicativo baixado.</p></div>}
          </div>
          <AppShowcase app={app} />
        </article>)}
      </div> : <div className="rounded-3xl border border-white/10 bg-slate-950/80 px-6 py-16 text-center"><PackageOpen className="mx-auto mb-4 text-slate-500" size={36} /><h2 className="text-xl font-bold">Aplicativo indisponível</h2><p className="mt-2 text-sm text-slate-400">Peça ao seu revendedor o link correto para download.</p></div>}
    </section>
  </main>;
}
