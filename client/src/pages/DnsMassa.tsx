import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRightLeft, RefreshCw } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

export default function DnsMassa() {
  const [oldUrl, setOldUrl] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [useDropdown, setUseDropdown] = useState(true);

  const { data: uniqueUrls = [], isLoading: loadingUrls, refetch } = trpc.devices.listUniqueUrls.useQuery();

  const swapMutation = trpc.devices.bulkSwapDns.useMutation({
    onSuccess: (data) => {
      if (data.count === 0) {
        toast.warning("Nenhum usuário encontrado com essa DNS.");
      } else {
        toast.success(`✅ DNS atualizada em ${data.count} usuário(s) com sucesso!`);
        setOldUrl("");
        setNewUrl("");
        refetch();
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldUrl.trim()) return toast.error("Selecione a DNS atual.");
    if (!newUrl.trim()) return toast.error("Informe a nova DNS.");
    if (oldUrl.trim() === newUrl.trim()) return toast.error("A DNS nova deve ser diferente da atual.");
    swapMutation.mutate({ oldUrl: oldUrl.trim(), newUrl: newUrl.trim() });
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-yellow-500" />
            Trocar DNS em Massa
          </h1>
          <p className="text-muted-foreground mt-1">
            Selecione a DNS atual e informe a nova. Somente os usuários que possuem a DNS selecionada serão afetados.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Substituição de DNS</CardTitle>
            <CardDescription>
              Escolha a DNS que deseja substituir e informe a nova URL. O sistema irá atualizar automaticamente todos os usuários que possuem essa DNS cadastrada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* DNS Atual */}
              <div className="space-y-2">
                <Label>DNS Atual (a ser substituída)</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    {useDropdown ? (
                      <Select value={oldUrl} onValueChange={setOldUrl}>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingUrls ? "Carregando..." : "Selecione uma DNS cadastrada"} />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueUrls.map((url) => (
                            <SelectItem key={url} value={url}>
                              <span className="font-mono text-xs truncate max-w-xs block">{url}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Digite a URL da DNS atual"
                        value={oldUrl}
                        onChange={(e) => setOldUrl(e.target.value)}
                      />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setUseDropdown(!useDropdown); setOldUrl(""); }}
                    title={useDropdown ? "Digitar manualmente" : "Selecionar da lista"}
                  >
                    {useDropdown ? "Digitar" : "Lista"}
                  </Button>
                </div>
                {uniqueUrls.length === 0 && !loadingUrls && (
                  <p className="text-xs text-muted-foreground">Nenhuma DNS cadastrada ainda.</p>
                )}
              </div>

              {/* Nova DNS */}
              <div className="space-y-2">
                <Label>Nova DNS</Label>
                <Input
                  placeholder="http://novoservidor.com/get.php?username=..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Todos os usuários que tinham a DNS anterior receberão esta nova URL.
                </p>
              </div>

              {/* Preview */}
              {oldUrl && newUrl && (
                <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                  <p className="font-medium text-muted-foreground">Prévia da alteração:</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded text-xs break-all">
                      {oldUrl.length > 60 ? oldUrl.slice(0, 60) + "..." : oldUrl}
                    </code>
                    <ArrowRightLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                    <code className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-xs break-all">
                      {newUrl.length > 60 ? newUrl.slice(0, 60) + "..." : newUrl}
                    </code>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                disabled={swapMutation.isPending || !oldUrl || !newUrl}
              >
                {swapMutation.isPending ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Atualizando...</>
                ) : (
                  <><ArrowRightLeft className="w-4 h-4 mr-2" /> Trocar DNS em Massa</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lista de DNS cadastradas */}
        {uniqueUrls.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">DNS Cadastradas ({uniqueUrls.length})</CardTitle>
              <CardDescription>URLs únicas atualmente em uso pelos seus usuários.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {uniqueUrls.map((url, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-muted rounded text-xs font-mono cursor-pointer hover:bg-muted/80"
                    onClick={() => { setOldUrl(url); setUseDropdown(false); }}
                    title="Clique para selecionar como DNS atual"
                  >
                    <span className="truncate flex-1">{url}</span>
                    <span className="ml-2 text-muted-foreground shrink-0">→ selecionar</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
