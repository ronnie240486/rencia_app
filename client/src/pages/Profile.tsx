import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, ImagePlus, LogOut, Phone, Save, Shield } from "lucide-react";
import { useRef, useState, useEffect } from "react";

const BANNER_COLORS = [
  { label: "Dourado", value: "linear-gradient(135deg, #b8860b 0%, #ffd700 100%)" },
  { label: "Azul", value: "linear-gradient(135deg, #1a3a6b 0%, #2563eb 100%)" },
  { label: "Verde", value: "linear-gradient(135deg, #064e3b 0%, #10b981 100%)" },
  { label: "Roxo", value: "linear-gradient(135deg, #3b0764 0%, #9333ea 100%)" },
  { label: "Vermelho", value: "linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)" },
  { label: "Rosa", value: "linear-gradient(135deg, #831843 0%, #ec4899 100%)" },
  { label: "Laranja", value: "linear-gradient(135deg, #7c2d12 0%, #f97316 100%)" },
  { label: "Cinza", value: "linear-gradient(135deg, #1f2937 0%, #6b7280 100%)" },
  { label: "Ciano", value: "linear-gradient(135deg, #164e63 0%, #06b6d4 100%)" },
  { label: "Preto", value: "linear-gradient(135deg, #000000 0%, #374151 100%)" },
];

export default function Profile() {
  const { user, logout } = useAuth();
  const { data: profile, isLoading, refetch } = trpc.adminUsers.profile.useQuery();
  const utils = trpc.useUtils();

  const updateProfile = trpc.adminUsers.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      refetch();
      utils.adminUsers.profile.invalidate();
    },
    onError: (e) => toast.error("Erro ao salvar: " + e.message),
  });

  const uploadImage = trpc.settings.uploadImage.useMutation({
    onError: () => toast.error("Erro ao fazer upload da imagem"),
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const displayUser = profile ?? user;

  const [telefone, setTelefone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [bannerColor, setBannerColor] = useState(BANNER_COLORS[0].value);
  const [showPalette, setShowPalette] = useState(false);

  useEffect(() => {
    if (profile) {
      setTelefone((profile as any).telefone ?? "");
      setAvatarUrl((profile as any).avatarUrl ?? "");
      setBannerImage((profile as any).bannerImage ?? "");
      setBannerColor((profile as any).bannerColor ?? BANNER_COLORS[0].value);
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile.mutate({ telefone, bannerColor, bannerImage } as any);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      uploadImage.mutate({ field: "avatar", dataUrl, filename: file.name }, {
        onSuccess: (data) => {
          const url = `https://renciaapp-ldyffp73.manus.space${data.url}`;
          setAvatarUrl(url);
          updateProfile.mutate({ avatarUrl: url } as any);
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      uploadImage.mutate({ field: "banner", dataUrl, filename: file.name }, {
        onSuccess: (data) => {
          const url = `https://renciaapp-ldyffp73.manus.space${data.url}`;
          setBannerImage(url);
          updateProfile.mutate({ bannerImage: url } as any);
          toast.success("Banner atualizado!");
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const initials = displayUser?.name?.charAt(0)?.toUpperCase() ?? "U";
  const roleName = displayUser?.role === "admin" ? "Administrador" : "Usuário";

  const bannerStyle = bannerImage
    ? { backgroundImage: `url(${bannerImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: bannerColor };

  return (
    <AdminLayout title="Meu Perfil">
      <div className="max-w-xl mx-auto space-y-5">

        {/* ── Header com banner + foto ── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          {/* Banner */}
          <div className="h-28 w-full relative group" style={bannerStyle}>
            {/* Botão trocar banner */}
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ImagePlus className="w-3 h-3" />
              Trocar banner
            </button>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
          </div>

          <div className="px-6 pb-4">
            <div className="flex items-end gap-4 -mt-12 mb-3">
              {/* Avatar */}
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-2xl border-4 border-card flex items-center justify-center text-2xl font-bold shadow-md overflow-hidden cursor-pointer"
                  style={{ background: avatarUrl ? "transparent" : bannerColor }}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span style={{ color: "white" }}>{initials}</span>
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow border-2 border-card"
                >
                  <Camera className="w-3 h-3" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-bold text-foreground">{displayUser?.name ?? "Usuário"}</h2>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary mt-1">
                  <Shield size={10} />
                  <span>{roleName}</span>
                </span>
              </div>
            </div>

            {/* Paleta de cores do banner */}
            <div className="mt-1">
              <button
                onClick={() => setShowPalette(p => !p)}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              >
                <span className="w-3 h-3 rounded-full border border-border inline-block" style={{ background: bannerColor }} />
                Cor do banner
              </button>
              {showPalette && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {BANNER_COLORS.map(c => (
                    <button
                      key={c.value}
                      title={c.label}
                      onClick={() => { setBannerColor(c.value); setBannerImage(""); setShowPalette(false); }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${bannerColor === c.value && !bannerImage ? "border-primary scale-110" : "border-transparent"}`}
                      style={{ background: c.value }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Campos editáveis ── */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Editar Perfil</h3>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <Input value={displayUser?.name ?? ""} disabled className="h-9 text-sm bg-muted/40" />
            <p className="text-xs text-muted-foreground">Nome gerenciado pelo OAuth</p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-mail</Label>
            <Input value={displayUser?.email ?? ""} disabled className="h-9 text-sm bg-muted/40" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Telefone / WhatsApp</Label>
            <div className="flex gap-2 items-center">
              <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Input
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="w-full h-9 text-sm font-semibold"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateProfile.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>

        {/* ── Sessão ── */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Sessão</h3>
          <Button variant="destructive" size="sm" onClick={() => logout()} className="gap-2">
            <LogOut size={14} />
            Encerrar Sessão
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
