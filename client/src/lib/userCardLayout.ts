/** Define a grade compacta de aplicativos liberados no card móvel do usuário. */
export function getAvailableAppsGridClass(appCount: number) {
  return appCount > 1 ? "grid grid-cols-2 gap-1.5" : "grid grid-cols-1 gap-1.5";
}
