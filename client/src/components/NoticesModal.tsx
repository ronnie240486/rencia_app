import { useEffect, useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "./ui/button";

export default function NoticesModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenToday, setHasSeenToday] = useState(false);
  const { data: notices } = trpc.notices.list.useQuery();

  useEffect(() => {
    // Verificar se o usuário já viu os avisos hoje
    const lastSeenDate = localStorage.getItem("noticesLastSeen");
    const today = new Date().toDateString();

    if (lastSeenDate !== today && notices && notices.length > 0) {
      setIsOpen(true);
    } else if (lastSeenDate === today) {
      setHasSeenToday(true);
    }
  }, [notices]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("noticesLastSeen", new Date().toDateString());
    setHasSeenToday(true);
  };

  if (!isOpen || !notices || notices.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold">Avisos Importantes</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {notices.map((notice: any) => (
            <div
              key={notice.id}
              className="p-4 border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20 rounded-r-lg"
            >
              <h3 className="font-bold text-lg text-orange-700 dark:text-orange-400 mb-2">
                {notice.titulo}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {new Date(notice.criadoEm).toLocaleDateString("pt-BR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {notice.conteudo}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-3 p-6 border-t bg-background/95 backdrop-blur">
          <Button onClick={handleClose} className="w-full">
            Entendi
          </Button>
        </div>
      </div>
    </div>
  );
}
