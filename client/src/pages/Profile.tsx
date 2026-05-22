import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, Camera, KeyRound, Loader2, LogOut, Mail, Phone, Save, Shield, User } from "lucide-react";
import { useRef, useState, useEffect } from "react";

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

  const changeCredentials = trpc.adminUsers.changeCredentials.useMutation({
    onSuccess: () => {
      toast.success("Dados de acesso atualizados! Faça login novamente para aplicar.");
      refetch();
      utils.adminUsers.profile.invalidate();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const uploadImage = trpc.settings.uploadImage.useMutation({
    onSuccess: (data) => {
      const url = `https://renciaapp-ldyffp73.manus.space${data.url}`;
      setAvatarUrl(url);
      updateProfile.mutate({ avatarUrl: url });
    },
    onError: () => toast.error("Erro ao fazer upload da foto"),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const displayUser = profile ?? user;

  const [telefone, setTelefone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");

  // Campos de credenciais
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    if (profile) {
      setTelefone((profile as any).telefone ?? "");
      setAvatarUrl((profile as any).avatarUrl ?? "");
      setBannerUrl((profile as any).bannerUrl ?? "");
      setNewName((profile as any).name ?? "");
      setNewEmail((profile as any).email ?? "");
    }
  }, [profile]);

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("field", "profile_banner_url");
      const resp = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!resp.ok) throw new Error("Erro no upload");
      const { url } = await resp.json() as { url: string };
      setBannerUrl(url);
      updateProfile.mutate({ bannerUrl: url });
      toast.success("✅ Banner atualizado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao enviar banner: " + err.message);
    } finally {
      setUploadingBanner(false);
      e.target.value = "";
    }
  };

  const handleSave = () => {
    updateProfile.mutate({ telefone });
  };

  const handleSaveCredentials = () => {
    if (!newName.trim() && !newEmail.trim()) {
      toast.error("Preencha ao menos um campo para atualizar.");
      return;
    }
    const payload: { name?: string; email?: string } = {};
    if (newName.trim() && newName.trim() !== (profile as any)?.name) payload.name = newName.trim();
    if (newEmail.trim() && newEmail.trim() !== (profile as any)?.email) payload.email = newEmail.trim();
    if (Object.keys(payload).length === 0) {
      toast.info("Nenhuma alteração detectada.");
      return;
    }
    changeCredentials.mutate(payload);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      uploadImage.mutate({ field: "avatar", dataUrl, filename: file.name });
    };
    reader.readAsDataURL(file);
  };

  const initials = displayUser?.name?.charAt(0)?.toUpperCase() ?? "U";
  const roleName = displayUser?.role === "admin" ? "Administrador" : "Usuário";

  return (
    <AdminLayout title="Meu Perfil">
      <div className="max-w-xl mx-auto space-y-5">

        {/* ── Header com foto ── */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div
            className="h-28 w-full relative group cursor-pointer overflow-hidden"
            style={bannerUrl ? {} : { background: "linear-gradient(135deg, oklch(0.55 0.18 45) 0%, oklch(0.72 0.18 55) 100%)" }}
            onClick={() => bannerInputRef.current?.click()}
          >
            {bannerUrl && (
              <img src={bannerUrl} alt="banner" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {uploadingBanner
                ? <Loader2 size={20} className="text-white animate-spin" />
                : <>
                    <Camera size={18} className="text-white" />
                    <span className="text-white text-sm font-medium">Mudar Banner</span>
                  </>
              }
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerChange}
            />
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-12 mb-4">
              <div className="relative group">
                <div
                  className="w-20 h-20 rounded-2xl border-4 border-card flex items-center justify-center text-2xl font-bold shadow-md overflow-hidden cursor-pointer"
                  style={{ background: avatarUrl ? "transparent" : "linear-gradient(135deg, oklch(0.55 0.18 45), oklch(0.72 0.18 55))" }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span style={{ color: "white" }}>{initials}</span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow border-2 border-card"
                  title="Trocar foto"
                >
                  <Camera className="w-3 h-3" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-bold text-foreground">{displayUser?.name ?? "Usuário"}</h2>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary mt-1">
                  <Shield size={10} />
                  <span>{roleName}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Alterar Nome e E-mail (Login) ── */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Alterar Nome e Login</h3>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Atualize seu nome de exibição e e-mail de login. Após salvar, faça logout e login novamente para aplicar.
          </p>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <User size={11} /> Nome de exibição
            </Label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Seu nome"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail size={11} /> E-mail de login
            </Label>
            <Input
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="email@exemplo.com"
              type="email"
              className="h-9 text-sm"
            />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200 flex gap-2">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>O e-mail alterado aqui é usado para identificação no painel. O login via OAuth (Manus) continua funcionando normalmente.</span>
          </div>

          <Button
            onClick={handleSaveCredentials}
            disabled={changeCredentials.isPending}
            variant="outline"
            className="w-full h-9 text-sm font-semibold"
          >
            <Save className="w-4 h-4 mr-2" />
            {changeCredentials.isPending ? "Salvando..." : "Salvar Nome e E-mail"}
          </Button>
        </div>

        {/* ── Campos editáveis ── */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Contato</h3>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Telefone / WhatsApp</Label>
            <div className="flex gap-2">
              <Phone className="w-4 h-4 mt-2.5 text-muted-foreground flex-shrink-0" />
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
            {updateProfile.isPending ? "Salvando..." : "Salvar Contato"}
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
