import { ImageIcon } from "lucide-react";

type AppLogoBadgeProps = {
  logoUrl?: string;
  label: string;
  className?: string;
};

/** Miniatura consistente para aplicativos no painel, sem imagem quebrada quando ainda não há logo. */
export function AppLogoBadge({ logoUrl, label, className = "h-6 w-6" }: AppLogoBadgeProps) {
  if (!logoUrl) {
    return (
      <span aria-hidden="true" className={`${className} shrink-0 rounded-md bg-muted text-muted-foreground grid place-items-center`}>
        <ImageIcon className="h-3.5 w-3.5" />
      </span>
    );
  }

  return <img src={logoUrl} alt="" className={`${className} shrink-0 rounded-md object-cover bg-muted`} />;
}
