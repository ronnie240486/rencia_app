/**
 * Resolve os recursos visuais de uma única resposta do APK em paralelo.
 * URLs vazias mantêm a posição na resposta sem chamar o resolvedor.
 */
export async function resolveOptionalImagesInParallel(
  sources: readonly string[],
  resolver: (source: string) => Promise<string>,
): Promise<string[]> {
  return Promise.all(sources.map((source) => source ? resolver(source) : Promise.resolve("")));
}
