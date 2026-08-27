export function normalizeVoiceSearchTranscript(transcript: string) {
  const cleaned = transcript
    .replace(/^\s*(?:buscar|procura(?:r)?|pesquisar|cliente|por)\s+/i, "")
    .trim();

  const macCandidate = cleaned.replace(/[^a-fA-F0-9]/g, "");
  if (/^[a-fA-F0-9]{12}$/.test(macCandidate)) {
    return macCandidate.match(/.{1,2}/g)?.join(":").toUpperCase() ?? cleaned;
  }

  const phoneCandidate = cleaned.replace(/\D/g, "");
  if (phoneCandidate.length >= 8) return phoneCandidate;

  return cleaned.replace(/\s+/g, " ");
}
