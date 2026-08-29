import { isManagedAppId, MANAGED_APP_CATALOG } from "../shared/appCatalog";

export type ActivityDevice = { id: number; app: string | null | undefined };

function normalizeAppName(value: string | null | undefined) {
  return (value || "").trim().toLocaleLowerCase("pt-BR");
}

/** Retorna o identificador técnico do catálogo a partir do ID ou nome do APK. */
export function resolveManagedAppId(value: string | null | undefined) {
  const normalized = normalizeAppName(value);
  if (!normalized) return undefined;
  if (isManagedAppId(normalized)) return normalized;
  return Object.values(MANAGED_APP_CATALOG).find((entry) =>
    [entry.displayName, ...entry.deviceAliases]
      .some((alias) => normalizeAppName(alias) === normalized),
  )?.id;
}

/**
 * Escolhe o cadastro que pertence ao aplicativo que enviou a atividade.
 * O MAC físico pode ser o mesmo em vários APKs instalados na mesma TV Box.
 */
export function selectActivityDevice<T extends ActivityDevice>(
  rows: T[],
  reportedApp: string | null | undefined,
): T | undefined {
  const appValue = normalizeAppName(reportedApp);
  if (!appValue) return undefined;

  const managedAppId = resolveManagedAppId(appValue);
  const catalogEntry = managedAppId ? MANAGED_APP_CATALOG[managedAppId] : undefined;

  if (catalogEntry) {
    const aliases = new Set(catalogEntry.deviceAliases.map(normalizeAppName));
    return rows.find((row) => aliases.has(normalizeAppName(row.app)));
  }

  return rows.find((row) => normalizeAppName(row.app) === appValue);
}
