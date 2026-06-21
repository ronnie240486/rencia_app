import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { toast } from "sonner";

interface ButtonColor {
  name: string;
  label: string;
  key: string;
}

const BUTTONS: ButtonColor[] = [
  { name: "search_button", label: "Botão de Busca (Lupa)", key: "panel_search_button_color" },
  { name: "add_user", label: "Botão Cadastrar Novo Usuário", key: "panel_add_user_color" },
  { name: "add_user_bottom", label: "Botão Cadastrar Usuário (Rodapé)", key: "panel_add_user_bottom_color" },
  { name: "new_resale", label: "Texto 'Novo Revenda'", key: "panel_new_resale_color" },
  { name: "active", label: "Texto 'Ativo'", key: "panel_active_color" },
  { name: "all", label: "Texto 'Todos'", key: "panel_all_color" },
];

export function PanelFunctions() {
  const [colors, setColors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleColorChange = (name: string, value: string) => {
    setColors((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Aqui você pode adicionar a lógica para salvar as cores
      // Por enquanto, apenas mostramos um toast
      toast.success("✅ Cores atualizadas com sucesso!");
      console.log("Cores salvas:", colors);
    } catch (error: any) {
      toast.error("❌ Erro ao atualizar cores");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout title="Funções do Painel">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Personalize as cores dos botões e textos do painel.
          </p>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
            <Save size={16} />
            Salvar Cores
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BUTTONS.map((button) => (
            <Card key={button.name}>
              <CardHeader>
                <CardTitle className="text-base">{button.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Cor</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={colors[button.name] || "#000000"}
                      onChange={(e) => handleColorChange(button.name, e.target.value)}
                      className="w-12 h-10 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={colors[button.name] || "#000000"}
                      onChange={(e) => handleColorChange(button.name, e.target.value)}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="pt-2">
                  <button
                    style={{
                      backgroundColor: colors[button.name] || "#000000",
                      color: "#FFFFFF",
                    }}
                    className="w-full py-2 px-4 rounded transition-colors"
                  >
                    Preview
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
