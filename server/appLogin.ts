import { normalizeMacForStorage } from "../shared/mac";

export const PENDING_LOGIN_MAC = "LOGIN:PENDENTE";

export type LoginAccessState = {
  credentialActive: boolean;
  deviceStatus: "Liberado" | "Bloqueado" | "Expirado";
  expirationDate?: Date | string | null;
};

export function isLoginAccessAllowed(state: LoginAccessState, now = new Date()): boolean {
  if (!state.credentialActive || state.deviceStatus !== "Liberado") return false;
  if (!state.expirationDate) return true;
  const expiration = new Date(`${String(state.expirationDate).slice(0, 10)}T23:59:59.999Z`);
  return Number.isNaN(expiration.getTime()) || expiration.getTime() >= now.getTime();
}

/**
 * Um login sem MAC recebe o primeiro MAC válido que chegar do APK. Depois
 * disso, o aparelho fica vinculado àquela credencial para evitar uso indevido
 * do mesmo acesso em outro dispositivo.
 */
export function resolveLoginMacBinding(currentMac: string, incomingMac?: string | null) {
  const normalizedIncomingMac = incomingMac ? normalizeMacForStorage(incomingMac) : null;
  const isPending = !currentMac || currentMac === PENDING_LOGIN_MAC;

  if (!normalizedIncomingMac) {
    return { accepted: isPending, mac: currentMac, shouldPersist: false, error: "" } as const;
  }

  if (isPending) {
    return { accepted: true, mac: normalizedIncomingMac, shouldPersist: true, error: "" } as const;
  }

  if (normalizeMacForStorage(currentMac) === normalizedIncomingMac) {
    return { accepted: true, mac: normalizedIncomingMac, shouldPersist: false, error: "" } as const;
  }

  return {
    accepted: false,
    mac: currentMac,
    shouldPersist: false,
    error: "Este login já está vinculado a outro aparelho.",
  } as const;
}
