import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";

function formatDeletedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Lixeira de clientes: lista os excluídos e restaura com tudo (as listas, MACs, credenciais...). */
export function DeviceTrashDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.devices.trashList.useQuery(undefined, { enabled: open });
  const items = data ?? [];

  const refresh = () => {
    utils.devices.trashList.invalidate();
    utils.devices.list.invalidate();
    utils.devices.stats.invalidate();
  };

  const restoreMutation = trpc.devices.trashRestore.useMutation({
    onSuccess: (result) => {
      const extra = result.replaced > 0 ? ` (o cadastro de teste criado depois com o mesmo MAC foi substituído)` : "";
      toast.success(`${result.nomeServer} restaurado com ${result.lists} lista(s).${extra}`);
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const purgeMutation = trpc.devices.trashPurge.useMutation({
    onSuccess: () => {
      toast.success("Removido da lixeira de vez.");
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lixeira de clientes</DialogTitle>
          <DialogDescription>
            Clientes excluídos ficam guardados aqui com tudo: dados, todas as listas, MACs adicionais, credenciais e pagamentos. Ao restaurar, voltam do jeito que estavam.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && items.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">A lixeira está vazia.</p>
          )}
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.nomeServer}</p>
                <p className="text-xs text-muted-foreground">
                  {item.mac ? `MAC ${item.mac} · ` : ""}{item.urlsCount} lista(s){item.app ? ` · ${item.app}` : ""}
                  {item.dataExpiracao ? ` · vence ${item.dataExpiracao.split("-").reverse().join("/")}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">Excluído em {formatDeletedAt(item.deletedAt)}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1"
                  disabled={restoreMutation.isPending}
                  onClick={() => restoreMutation.mutate({ id: item.id })}
                >
                  <ArchiveRestore className="w-3 h-3" />
                  Restaurar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1 text-red-600"
                  disabled={purgeMutation.isPending}
                  onClick={() => {
                    if (window.confirm(`Apagar ${item.nomeServer} de vez? Depois disso não dá mais pra restaurar.`)) {
                      purgeMutation.mutate({ id: item.id });
                    }
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                  Apagar de vez
                </Button>
              </div>
            </div>
          ))}
        </div>

        {items.length > 1 && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-red-600"
              disabled={purgeMutation.isPending}
              onClick={() => {
                if (window.confirm("Esvaziar a lixeira? Todos os clientes dela serão apagados de vez.")) {
                  purgeMutation.mutate({});
                }
              }}
            >
              Esvaziar lixeira
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
