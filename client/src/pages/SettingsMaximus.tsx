import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc';

export function SettingsMaximus() {
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current settings
  const { data: settings, isLoading } = trpc.maximus.getSettings.useQuery();

  // Mutations
  const updateSettings = trpc.maximus.updateSettings.useMutation({
    onSuccess: () => {
      setIsSaving(false);
    },
    onError: () => {
      setIsSaving(false);
    },
  });

  const [formData, setFormData] = useState({
    subuser: (settings?.subuser as string) || '',
    alwaysLogin: (settings?.alwaysLogin as boolean) || false,
    autoPlayLastChannel: (settings?.autoPlayLastChannel as boolean) || false,
    autoRotate: (settings?.autoRotate as boolean) || false,
    currentPlan: (settings?.currentPlan as string) || 'Gratuito',
    imageRatio: (settings?.imageRatio as string) || 'Preenchimento',
    bufferSize: (settings?.bufferSize as string) || 'Médio',
    retryAttempts: (settings?.retryAttempts as number) || 3,
    language: (settings?.language as string) || 'pt-BR',
    contactEmail: (settings?.contactEmail as string) || 'support@maxplayer.tv',
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings.mutateAsync(formData);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  if (isLoading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-3xl font-bold">Configurações do Maximus</h1>
        <p className="text-gray-500">Personalize as configurações do aplicativo Maximus</p>
      </div>

      {/* GERAL */}
      <Card>
        <CardHeader>
          <CardTitle>Geral</CardTitle>
          <CardDescription>Configurações gerais do aplicativo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subuser">Subusuário atual</Label>
            <Input
              id="subuser"
              value={formData.subuser}
              onChange={(e) => setFormData({ ...formData, subuser: e.target.value })}
              placeholder="Digite o subusuário"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="alwaysLogin">Sempre fazer login neste subusuário</Label>
            <Switch
              id="alwaysLogin"
              checked={formData.alwaysLogin}
              onCheckedChange={(checked) => setFormData({ ...formData, alwaysLogin: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="autoPlayLastChannel">Reproduzir automaticamente o último canal</Label>
            <Switch
              id="autoPlayLastChannel"
              checked={formData.autoPlayLastChannel}
              onCheckedChange={(checked) => setFormData({ ...formData, autoPlayLastChannel: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="autoRotate">Rotação automática</Label>
            <Switch
              id="autoRotate"
              checked={formData.autoRotate}
              onCheckedChange={(checked) => setFormData({ ...formData, autoRotate: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentPlan">Plano atual</Label>
            <Select value={formData.currentPlan} onValueChange={(value) => setFormData({ ...formData, currentPlan: value })}>
              <SelectTrigger id="currentPlan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gratuito">Gratuito</SelectItem>
                <SelectItem value="Premium">Premium</SelectItem>
                <SelectItem value="Pro">Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* CONFIGURAÇÕES DO REPRODUTOR */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações do reprodutor</CardTitle>
          <CardDescription>Personalize o comportamento do reprodutor de vídeo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="imageRatio">Proporção da imagem padrão</Label>
            <Select value={formData.imageRatio} onValueChange={(value) => setFormData({ ...formData, imageRatio: value })}>
              <SelectTrigger id="imageRatio">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Preenchimento">Preenchimento</SelectItem>
                <SelectItem value="Ajuste">Ajuste</SelectItem>
                <SelectItem value="Esticamento">Esticamento</SelectItem>
                <SelectItem value="16:9">16:9</SelectItem>
                <SelectItem value="4:3">4:3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bufferSize">Tamanho do buffer</Label>
            <Select value={formData.bufferSize} onValueChange={(value) => setFormData({ ...formData, bufferSize: value })}>
              <SelectTrigger id="bufferSize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pequeno">Pequeno</SelectItem>
                <SelectItem value="Médio">Médio</SelectItem>
                <SelectItem value="Grande">Grande</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="retryAttempts">Tentar novamente (número de tentativas)</Label>
            <Input
              id="retryAttempts"
              type="number"
              min="1"
              max="10"
              value={formData.retryAttempts}
              onChange={(e) => setFormData({ ...formData, retryAttempts: parseInt(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      {/* INFORMAÇÃO */}
      <Card>
        <CardHeader>
          <CardTitle>Informação</CardTitle>
          <CardDescription>Informações adicionais do aplicativo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="language">Idioma</Label>
            <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                <SelectItem value="en-US">English (USA)</SelectItem>
                <SelectItem value="es-ES">Español (España)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Fale conosco (Email)</Label>
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              placeholder="support@example.com"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving ? 'Salvando...' : 'Salvar Tudo'}
      </Button>
    </div>
  );
}
