/**
 * Alertas técnicos ficam disponíveis na Central de Alertas, mas não bloqueiam
 * automaticamente o painel. A saúde atual das listas muda frequentemente e
 * não deve interromper o trabalho do administrador com um modal repetido.
 */
export function shouldAutoOpenTechnicalAlertSummary() {
  return false;
}
