import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, Camera, LogOut, Phone, Save, Shield, User } from "lucide-react";
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

  const uploadImage = trpc.settings.uploadImage.useMutation({
    onSuccess: (data) => {
      const url = `https://renciaapp-ldyffp73.manus.space${data.url}`;
      setAvatarUrl(url);
      updateProfile.mutate({ avatarUrl: url });
    },
    onError: () => toast.error("Erro ao fazer upload da foto"),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const displayUser = profile ?? user;

  const [telefone, setTelefone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (profile) {
      setTelefone((profile as any).telefone ?? "");
      setAvatarUrl((profile as any).avatarUrl ?? "");
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile.mutate({ telefone });
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
          <div className="h-28 w-full" style={{ background: "linear-gradient(135deg, oklch(0.55 0.18 45) 0%, oklch(0.72 0.18 55) 100%)" }} />
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-12 mb-4">
              {/* Avatar com botão de upload */}
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
