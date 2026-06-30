import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Upload } from "lucide-react";
import { toast } from "sonner";

export default function AppIntro() {
  const [formData, setFormData] = useState({
    logoUrl: "",
    soundUrl: "",
    duracao: 3000,
    habilitado: true,
  });
  const [preview, setPreview] = useState<{ logo?: string; sound?: string }>({});

  const { data: config } = trpc.appIntro.getConfig.useQuery();
  const updateMutation = trpc.appIntro.updateConfig.useMutation();

  useEffect(() => {
    if (config) {
      setFormData({
        logoUrl: config.logoUrl || "",
        soundUrl: config.soundUrl || "",
        duracao: config.duracao || 3000,
        habilitado: config.habilitado !== false,
      });
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(formData);
      toast.success("Configuração de introdução salva com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configuração");
    }
  };

  const handlePlayPreview = () => {
    if (formData.soundUrl) {
      const audio = new Audio(formData.soundUrl);
      audio.play().catch(() => toast.error("Erro ao reproduzir som"));
    }
  };

  return (
    <AdminLayout title="Introdução do App">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Logo Animado com Som</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure o logo e som que aparecerão na introdução do InteractivePro
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configurações */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">URL do Logo Animado</label>
                <Input
                  placeholder="https://exemplo.com/logo.gif"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">Aceita GIF, PNG ou vídeo MP4</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">URL do Som</label>
                <Input
                  placeholder="https://exemplo.com/som.mp3"
                  value={formData.soundUrl}
                  onChange={(e) => setFormData({ ...formData, soundUrl: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">Aceita MP3, WAV ou OGG</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Duração (ms)</label>
                <Input
                  type="number"
                  min="1000"
                  max="10000"
                  step="100"
                  value={formData.duracao}
                  onChange={(e) => setFormData({ ...formData, duracao: parseInt(e.target.value) })}
                />
                <p className="text-xs text-gray-500 mt-1">Tempo de exibição em milissegundos</p>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="habilitado"
                  checked={formData.habilitado}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, habilitado: checked as boolean })
                  }
                />
                <label htmlFor="habilitado" className="text-sm font-medium cursor-pointer">
                  Habilitar introdução animada
                </label>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={updateMutation.isPending} className="flex-1">
                  Salvar Configurações
                </Button>
                {formData.soundUrl && (
                  <Button variant="outline" onClick={handlePlayPreview}>
                    <Play className="w-4 h-4 mr-2" />
                    Testar Som
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.habilitado ? (
                <>
                  <div className="bg-black rounded-lg p-8 flex items-center justify-center min-h-64">
                    {formData.logoUrl ? (
                      <div className="text-center">
                        <img
                          src={formData.logoUrl}
                          alt="Logo Preview"
                          className="max-w-48 max-h-48 mx-auto rounded"
                          onError={() => (
                            <div className="text-gray-400">Logo não carregou</div>
                          )}
                        />
                        <p className="text-white text-sm mt-4">
                          Duração: {formData.duracao}ms
                          {formData.soundUrl && " + Som"}
                        </p>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center">
                        <p>Adicione a URL do logo para ver o preview</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      ℹ️ A introdução será exibida quando o usuário abrir o InteractivePro pela primeira vez.
                    </p>
                  </div>
                </>
              ) : (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 flex items-center justify-center min-h-64">
                  <p className="text-gray-500 dark:text-gray-400">Introdução desabilitada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dicas */}
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-amber-900 dark:text-amber-100">💡 Dicas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
            <p>• Use um GIF animado ou vídeo MP4 para o logo</p>
            <p>• Recomendado: duração entre 2000ms e 5000ms</p>
            <p>• Som deve ter duração similar ao logo para melhor sincronização</p>
            <p>• Formatos suportados: GIF, PNG, MP4 para logo; MP3, WAV, OGG para som</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
