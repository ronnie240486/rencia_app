import { isManagedAppId, MANAGED_APP_CATALOG } from "../shared/appCatalog";

export type ActivityDevice = { id: number; app: string | null | undefined };

function normalizeAppName(value: string | null | undefined) {
  return (value || "").trim().toLocaleLowerCase("pt-BR");
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

  const catalogEntry = isManagedAppId(appValue)
    ? MANAGED_APP_CATALOG[appValue]
    : Object.values(MANAGED_APP_CATALOG).find((entry) =>
      [entry.id, entry.displayName, ...entry.deviceAliases]
        .some((alias) => normalizeAppName(alias) === appValue),
    );

  if (catalogEntry) {
    const aliases = new Set(catalogEntry.deviceAliases.map(normalizeAppName));
    return rows.find((row) => aliases.has(normalizeAppName(row.app)));
  }

  return rows.find((row) => normalizeAppName(row.app) === appValue);
}
