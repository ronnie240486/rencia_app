import { replaceDnsHost } from "./dnsFailover";
import { hasActiveDeviceUsingDns, dnsOperationalMessage, type DnsOperationalDevice } from "./dnsOperationalStatus";
import { isConfirmedListResponse, probeListUrl } from "./listHealth";

export type DnsEvalEntry = { id: number; host: string; grupo?: string | null };
export type DnsEvalOutcome = {
  status: "success" | "error" | "unknown";
  message: string;
  statusCode: number | null;
  /** apk = cliente ativo usando; real = lista de verdade carregou pelo painel; host = só o endereço respondeu */
  source: "apk" | "real" | "host" | "none";
};
type Probe = typeof probeListUrl;

const norm = (host: string) => host.trim().replace(/\/+$/, "");
const groupOf = (entry: DnsEvalEntry) => entry.grupo || "Padrão";
const hostResponded = (probe: Awaited<ReturnType<Probe>> | null) =>
  Boolean(probe && (probe.status === "success" || (probe.statusCode !== null && probe.statusCode >= 200 && probe.statusCode < 500)));

/**
 * Avalia as DNS sem dar "Falhou" falso.
 * Uma DNS que nenhum cliente usa só pode ser testada pelo painel (rede do Railway). Quando o painel não
 * consegue conectar em NENHUMA DNS do grupo, isso não prova que a DNS caiu (o provedor pode bloquear o IP do
 * painel): fica "unknown" (cinza). Só vira "error" quando outra DNS do mesmo grupo responde e esta não.
 */
export async function evaluateDnsEntries(
  entries: DnsEvalEntry[],
  activeDevices: DnsOperationalDevice[],
  sampleListUrls: string[],
  options: { timeoutMs?: number; probe?: Probe; now?: number } = {},
): Promise<Map<number, DnsEvalOutcome>> {
  const probe = options.probe ?? probeListUrl;
  const timeoutMs = options.timeoutMs ?? 4000;
  const now = options.now ?? Date.now();
  const results = new Map<number, DnsEvalOutcome>();
  const networkFailed = new Set<number>();
  // Só "carregou uma lista M3U de verdade pelo painel" prova que o painel alcança o provedor.
  // O endereço responder na raiz NÃO prova (cada DNS pode tratar a raiz de um jeito).
  const panelLoadedRealList = new Set<number>();

  await Promise.all(entries.map(async (entry) => {
    const host = norm(entry.host);
    const groupHosts = entries.filter((other) => groupOf(other) === groupOf(entry)).map((other) => norm(other.host));
    const sample = sampleListUrls.find((url) => groupHosts.some((groupHost) => url.startsWith(groupHost)));
    if (hasActiveDeviceUsingDns(activeDevices, host, now)) {
      results.set(entry.id, { status: "success", message: dnsOperationalMessage(), statusCode: null, source: "apk" });
      // Também testa com a lista real: se o painel consegue carregar por ela, isso vale como prova de que o painel alcança o provedor.
      if (sample) {
        const real = await probe(replaceDnsHost(sample, host), { requireM3uContent: true, timeoutMs }).catch(() => null);
        if (real && isConfirmedListResponse(real)) panelLoadedRealList.add(entry.id);
      }
      return;
    }
    const [real, plain] = await Promise.all([
      sample ? probe(replaceDnsHost(sample, host), { requireM3uContent: true, timeoutMs }).catch(() => null) : Promise.resolve(null),
      probe(host, { timeoutMs }).catch(() => null),
    ]);
    if (real && isConfirmedListResponse(real)) {
      panelLoadedRealList.add(entry.id);
      results.set(entry.id, { status: "success", message: "Lista real carregou por esta DNS", statusCode: real.statusCode, source: "real" });
      return;
    }
    if (hostResponded(plain)) {
      results.set(entry.id, { status: "success", message: "Host respondeu", statusCode: plain?.statusCode ?? null, source: "host" });
      return;
    }
    const httpCode = real?.statusCode ?? plain?.statusCode ?? null;
    if (httpCode !== null && httpCode >= 500) {
      results.set(entry.id, { status: "error", message: `Servidor respondeu com erro HTTP ${httpCode}`, statusCode: httpCode, source: sample ? "real" : "host" });
      return;
    }
    if (httpCode !== null) {
      results.set(entry.id, { status: "unknown", message: `Servidor respondeu (HTTP ${httpCode}), mas a lista de teste não foi confirmada`, statusCode: httpCode, source: sample ? "real" : "host" });
      return;
    }
    networkFailed.add(entry.id);
  }));

  for (const entry of entries) {
    if (!networkFailed.has(entry.id)) continue;
    const siblingReachable = entries.some((other) => other.id !== entry.id && groupOf(other) === groupOf(entry) && panelLoadedRealList.has(other.id));
    results.set(entry.id, siblingReachable
      ? { status: "error", message: "Não respondeu ao painel, enquanto outra DNS do mesmo grupo carregou a lista de verdade pelo painel", statusCode: null, source: "none" }
      : { status: "unknown", message: "Sem confirmação: o painel não conseguiu conectar e nenhum cliente usa esta DNS agora. Se funciona no aparelho, está OK.", statusCode: null, source: "none" });
  }
  return results;
}
