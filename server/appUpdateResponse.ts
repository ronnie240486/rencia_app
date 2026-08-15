export type AppUpdateResponse = {
  app: string;
  version: string;
  url: string;
  apk_link: string;
  force_update: boolean;
  update_available: boolean;
  release_notes: string;
};

export function buildAppUpdateResponse(app: string, url: string, version: string): AppUpdateResponse {
  const available = Boolean(url.trim());
  return {
    app,
    version,
    url: available ? url : "",
    apk_link: available ? url : "",
    force_update: false,
    update_available: available,
    release_notes: available
      ? `Versão ${version} disponível. Toque para atualizar o ${app}.`
      : `Nenhuma atualização configurada para o ${app}.`,
  };
}
