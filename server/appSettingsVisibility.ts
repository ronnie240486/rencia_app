export function isAppSettingVisibleToReseller(allowedApps: string[] | null, appId: string | null) {
  return allowedApps === null || appId === null || allowedApps.includes(appId);
}
