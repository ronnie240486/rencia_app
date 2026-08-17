import { normalizeMacForStorage } from "../shared/mac";

export type MaximusCompletedTest = {
  mac: string;
  name: string;
  phone?: string | null;
};

export function normalizeTestCustomerName(value: string) {
  const baseName = value.trim().replace(/\s*\(teste\)\s*$/i, "").trim();
  return `${baseName || "Cliente"} (teste)`;
}

export function normalizeTestPhone(value?: string | null) {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 20);
  return digits || null;
}

export function normalizeCompletedTest(input: MaximusCompletedTest) {
  return {
    mac: normalizeMacForStorage(input.mac),
    name: normalizeTestCustomerName(input.name),
    phone: normalizeTestPhone(input.phone),
  };
}

export function isPanelTestName(value: string | null | undefined) {
  return /\s\(teste\)\s*$/i.test(value ?? "");
}
