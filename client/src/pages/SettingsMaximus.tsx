'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
interface SettingsData {
  autoPlayLastChannel: boolean;
  autoRotate: boolean;
  currentPlan: string;
  imageRatio: string;
  bufferSize: string;
  retryAttempts: number;
  language: string;
  contactEmail: string;
  // Novas configurações
  qualidade: string;
  legendas: string;
  audioTrack: string;
  mostAssistidos: boolean;
  recentementeVisto: boolean;
  canalAtual: string;
}

const DEFAULT_SETTINGS: SettingsData = {
  autoPlayLastChannel: true,
  autoRotate: false,
  currentPlan: 'Premium',
  imageRatio: '16:9',
  bufferSize: 'Médio',
  retryAttempts: 3,
  language: 'pt-BR',
  contactEmail: 'support@maximus.com',
  qualidade: '1080p',
  legendas: 'Português',
  audioTrack: 'Português',
  mostAssistidos: true,
  recentementeVisto: true,
  canalAtual: 'SBT',
};

export default function SettingsMaximus() {
  const { data: storedSettings, isLoading } = trpc.maximus.getSettings.useQuery();
  const save = trpc.maximus.updateSettings.useMutation({
    onSuccess: () => toast.success('Configurações do Maximus salvas!'),
    onError: (error) => toast.error(error.message),
  });
  const [formData, setFormData] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [dirty, setDirty] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !storedSettings) return;
    setFormData({ ...DEFAULT_SETTINGS, ...storedSettings } as SettingsData);
    initializedRef.current = true;
  }, [storedSettings]);

  const update = (patch: Partial<SettingsData>) => {
    setFormData((current) => ({ ...current, ...patch }));
    setDirty(true);
  };

  const handleSave = () => {
    save.mutate(formData, { onSuccess: () => setDirty(false) });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações Maximus</h1>
        <p className="text-gray-500">Personalize seu Maximus Player</p>
      </div>

      {/* CONFIGURAÇÕES GERAIS */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>Personalize o comportamento geral do aplicativo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="autoPlayLastChannel">Reproduzir automaticamente o último canal</Label>
            <Switch
              id="autoPlayLastChannel"
              checked={formData.autoPlayLastChannel}
              onCheckedChange={(checked) => update({ autoPlayLastChannel: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="autoRotate">Rotação automática</Label>
            <Switch
              id="autoRotate"
              checked={formData.autoRotate}
              onCheckedChange={(checked) => update({ autoRotate: checked })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentPlan">Plano atual</Label>
            <Select value={formData.currentPlan} onValueChange={(value) => update({ currentPlan: value })}>
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
          <CardTitle>Configurações do Reprodutor</CardTitle>
          <CardDescription>Personalize o comportamento do reprodutor de vídeo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qualidade">Qualidade de Vídeo</Label>
            <Select value={formData.qualidade} onValueChange={(value) => update({ qualidade: value })}>
              <SelectTrigger id="qualidade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="480p">480p</SelectItem>
                <SelectItem value="720p">720p</SelectItem>
                <SelectItem value="1080p">1080p</SelectItem>
                <SelectItem value="4K">4K</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="legendas">Legendas</Label>
            <Select value={formData.legendas} onValueChange={(value) => update({ legendas: value })}>
              <SelectTrigger id="legendas">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Desativado">Desativado</SelectItem>
                <SelectItem value="Português">Português</SelectItem>
                <SelectItem value="Inglês">Inglês</SelectItem>
                <SelectItem value="Espanhol">Espanhol</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="audioTrack">Faixa de Áudio</Label>
            <Select value={formData.audioTrack} onValueChange={(value) => update({ audioTrack: value })}>
              <SelectTrigger id="audioTrack">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Português">Português</SelectItem>
                <SelectItem value="Inglês">Inglês</SelectItem>
                <SelectItem value="Espanhol">Espanhol</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="imageRatio">Proporção da Imagem Padrão</Label>
            <Select value={formData.imageRatio} onValueChange={(value) => update({ imageRatio: value })}>
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
            <Label htmlFor="bufferSize">Tamanho do Buffer</Label>
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
            <Label htmlFor="retryAttempts">Tentar Novamente (número de tentativas)</Label>
            <Input
              id="retryAttempts"
              type="number"
              min="1"
              max="10"
              value={formData.retryAttempts}
              onChange={(e) => update({ retryAttempts: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })}
            />
          </div>
        </CardContent>
      </Card>

      {/* CONTEÚDO ASSISTIDO */}
      <Card>
        <CardHeader>
          <CardTitle>Conteúdo Assistido</CardTitle>
          <CardDescription>Configure como o app mostra seu histórico</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="mostAssistidos">Mostrar Canais Mais Assistidos</Label>
            <Switch
              id="mostAssistidos"
              checked={formData.mostAssistidos}
              onCheckedChange={(checked) => update({ mostAssistidos: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="recentementeVisto">Mostrar Recentemente Visto</Label>
            <Switch
              id="recentementeVisto"
              checked={formData.recentementeVisto}
              onCheckedChange={(checked) => update({ recentementeVisto: checked })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="canalAtual">Canal Atualmente Assistido</Label>
            <Input
              id="canalAtual"
              type="text"
              value={formData.canalAtual}
              onChange={(e) => update({ canalAtual: e.target.value })}
              placeholder="Ex: SBT"
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
            <Select value={formData.language} onValueChange={(value) => update({ language: value })}>
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
            <Label htmlFor="contactEmail">Fale Conosco (Email)</Label>
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => update({ contactEmail: e.target.value })}
              placeholder="support@maximus.com"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isLoading || !dirty || save.isPending} className="w-full dark:!text-white dark:!bg-green-600 dark:hover:!bg-green-700">
        {save.isPending ? 'Salvando...' : 'Salvar Tudo'}
      </Button>
    </div>
  );
}
