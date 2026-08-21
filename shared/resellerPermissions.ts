export const RESELLER_PERMISSION_CATALOG = [
  { key: "app_logins", label: "Login dos Aplicativos", description: "Gerenciar credenciais de acesso dos aplicativos.", routes: ["/credenciais-app"] },
  { key: "manage_resellers", label: "Revendas", description: "Criar e administrar sub-revendas próprias.", routes: ["/revendas"] },
  { key: "global_search", label: "Busca Global", description: "Pesquisar dados dentro do escopo autorizado.", routes: ["/busca"] },
  { key: "list_monitor", label: "Monitor e Diagnóstico", description: "Acompanhar o monitoramento de listas.", routes: ["/monitor-listas", "/diagnostico"] },
  { key: "app_settings", label: "Configurações dos Aplicativos", description: "Alterar visuais e configurações dos aplicativos.", routes: ["/settings", "/ultra-player", "/gpcpro", "/maximus", "/nuvix-config", "/aplicativos/"] },
  { key: "app_distribution", label: "Loja, Ranking e Atualizações", description: "Gerenciar distribuição e atualizações dos aplicativos.", routes: ["/loja-painel", "/ranking-apps", "/atualizacoes"] },
  { key: "reseller_finance", label: "Financeiro de Revendas", description: "Ver cobranças e relatórios de sub-revendas.", routes: ["/cobrancas-revendas", "/relatorio-revendas"] },
  { key: "chatbot", label: "Chatbot de Avisos", description: "Configurar automações e avisos de chatbot.", routes: ["/chatbot"] },
  { key: "control_center", label: "Central de Controle", description: "Usar ferramentas globais de operação.", routes: ["/central"] },
  { key: "security", label: "Segurança", description: "Gerenciar segurança operacional permitida.", routes: ["/seguranca"] },
  { key: "permissions", label: "Permissões", description: "Delegar permissões às sub-revendas próprias.", routes: ["/permissoes"] },
  { key: "global_notices", label: "Avisos Globais", description: "Criar avisos para os próprios subordinados.", routes: ["/avisos"] },
  { key: "backups", label: "Backups", description: "Criar e restaurar backups do próprio escopo.", routes: ["/backups"] },
  { key: "panel_settings", label: "Configurações do Painel", description: "Ajustar configurações do painel autorizadas.", routes: ["/app-settings", "/configuracoes", "/carousel", "/panel-functions"] },
] as const;

export type ResellerPermissionKey = typeof RESELLER_PERMISSION_CATALOG[number]["key"];

export const RESELLER_PERMISSION_KEYS = RESELLER_PERMISSION_CATALOG.map(item => item.key) as ResellerPermissionKey[];

export function normalizeResellerPermissions(value: unknown): ResellerPermissionKey[] {
  if (!Array.isArray(value)) return [];
  const valid = new Set<string>(RESELLER_PERMISSION_KEYS);
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && valid.has(item)))) as ResellerPermissionKey[];
}

export function permissionForRoute(path: string): ResellerPermissionKey | null {
  const matched = RESELLER_PERMISSION_CATALOG.find(item => item.routes.some(route => path === route || path.startsWith(route.endsWith("/") ? route : `${route}/`)));
  return matched?.key ?? null;
}
