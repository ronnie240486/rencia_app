import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

export function NuvixConfig() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const { data: config } = trpc.nuvix.getConfig.useQuery(
    { ownerId: user?.id || 0 },
    { enabled: !!user?.id }
  );

  const updateMut = trpc.nuvix.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Configurações atualizadas!");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const [dns, setDns] = useState<Array<{ nome: string; url: string }>>([
    { nome: "", url: "" },
    { nome: "", url: "" },
    { nome: "", url: "" },
    { nome: "", url: "" },
    { nome: "", url: "" },
  ]);

  const [appName, setAppName] = useState(config?.appName || "NUVIX");
  const [buttonColor, setButtonColor] = useState(config?.buttonColor || "#000000");
  const [backgroundUrl, setBackgroundUrl] = useState(config?.backgroundUrl || "");
  const [iconUrl, setIconUrl] = useState(config?.iconUrl || "");

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const data: any = {
        appName,
        buttonColor,
        backgroundUrl,
        iconUrl,
      };

      dns.forEach((d, i) => {
        if (d.nome && d.url) {
          data[`dns${i + 1}_nome`] = d.nome;
          data[`dns${i + 1}_url`] = d.url;
        }
      });

      await updateMut.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDnsChange = (index: number, field: "nome" | "url", value: string) => {
    const newDns = [...dns];
    newDns[index] = { ...newDns[index], [field]: value };
    setDns(newDns);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações do NuvixXC6</h1>
        <p className="text-muted-foreground">Personalize o APK com até 5 DNS, imagem de fundo e ícones</p>
      </div>

      {/* Configurações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
          <CardDescription>Nome do app e cores dos botões</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="appName">Nome do App</Label>
            <Input
              id="appName"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="NUVIX"
            />
          </div>
          <div>
            <Label htmlFor="buttonColor">Cor dos Botões</Label>
            <div className="flex gap-2">
              <Input
                id="buttonColor"
                type="color"
                value={buttonColor}
                onChange={(e) => setButtonColor(e.target.value)}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={buttonColor}
                onChange={(e) => setButtonColor(e.target.value)}
                placeholder="#000000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Imagem de Fundo e Ícone */}
      <Card>
        <CardHeader>
          <CardTitle>Mídia</CardTitle>
          <CardDescription>Imagem de fundo e ícone customizado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="backgroundUrl">URL da Imagem de Fundo</Label>
            <Input
              id="backgroundUrl"
              value={backgroundUrl}
              onChange={(e) => setBackgroundUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label htmlFor="iconUrl">URL do Ícone</Label>
            <Input
              id="iconUrl"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>

      {/* DNS */}
      <Card>
        <CardHeader>
          <CardTitle>Servidores DNS</CardTitle>
          <CardDescription>Configure até 5 DNS que aparecerão nos botões do app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dns.map((d, i) => (
            <div key={i} className="space-y-2 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Servidor {i + 1}</h3>
              </div>
              <div>
                <Label htmlFor={`dns${i}-nome`}>Nome</Label>
                <Input
                  id={`dns${i}-nome`}
                  value={d.nome}
                  onChange={(e) => handleDnsChange(i, "nome", e.target.value)}
                  placeholder="Ex: DNS Principal"
                />
              </div>
              <div>
                <Label htmlFor={`dns${i}-url`}>URL</Label>
                <Input
                  id={`dns${i}-url`}
                  value={d.url}
                  onChange={(e) => handleDnsChange(i, "url", e.target.value)}
                  placeholder="http://servidor.com:8080"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={isLoading || updateMut.isPending}
          size="lg"
        >
          {isLoading || updateMut.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Configurações"
          )}
        </Button>
      </div>
    </div>
  );
}
