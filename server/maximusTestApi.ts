export function getMaximusTestApiUrl(settings: Record<string, string>) {
  return (settings.gpcpro_server_url || settings.server_url || settings.contact_website || "").trim();
}

export function maximusTestConfiguration(settings: Record<string, string>) {
  const testApiUrl = getMaximusTestApiUrl(settings);
  return { dns_url: testApiUrl, test_api_url: testApiUrl };
}
