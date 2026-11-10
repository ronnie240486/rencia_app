package com.ouropro.player.utils;

import android.app.AlertDialog;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Toast;

import com.ouropro.player.helper.PreferenceHelper;
import com.ouropro.player.models.AppInfoModel;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

/**
 * Botão "TESTE" do OuroPro -- mesmo mecanismo já usado no Maximus/Future:
 * gera uma conta de teste de verdade num provedor externo (configurado no
 * painel como "gpcpro_server_url", com um link fixo de reserva caso o
 * painel não tenha isso configurado) e, em paralelo (melhor esforço, sem
 * travar nem atrasar o teste de verdade se falhar), registra o lead
 * (nome + WhatsApp) no NOSSO painel via /api/v5/maximus-test-result, com
 * app_id="ouropro" -- assim o lead aparece certo (como "Ouro Pro", não
 * "Maximus") no dashboard do revendedor.
 *
 * IMPORTANTE: diferente do Maximus (Kotlin, com uma "sessão" própria), o
 * OuroPro é um app Java antigo que guarda tudo dentro do próprio
 * AppInfoModel (SharedPreferences + arquivo local via Utils.saveToFile).
 * Por isso, aqui a lista de teste é inserida como MAIS UMA URL dentro de
 * appInfoModel.getResult() -- exatamente igual o que já acontece quando
 * alguém adiciona uma playlist manualmente em "Trocar lista" (ver
 * AddPlaylistDlgFragment.OnGetResponseResult) -- em vez de inventar um
 * jeito novo de guardar isso que o resto do app não saberia ler.
 */
public final class TestPlaylistClient {
    private TestPlaylistClient() {
    }

    private static final String PANEL_ROOT_PRIMARY = "https://renciaapp-production.up.railway.app";
    private static final String PANEL_ROOT_FALLBACK = "https://renciaapp.manus.space";
    // Mesmo provedor de teste externo usado pelo Maximus/Future -- só entra
    // em ação se o painel não tiver "gpcpro_server_url" configurado.
    // Link de reserva do teste, dentro do APK: só é usado quando o PAINEL está fora do ar ou sem link de teste.
    private static final String TEST_REGISTER_FALLBACK = "https://nuvixtv.sigmab.pro/api/chatbot/Yen129WPEa/XYgD9JWr6V";
    private static final String USER_AGENT = "smart-tv";
    private static final String TEST_PLAYLIST_NAME = "TESTE";

    /**
     * Mostra o diálogo pedindo nome + WhatsApp e, ao confirmar, roda o
     * fluxo inteiro (rede em thread de fundo). Ao terminar com sucesso,
     * chama {@code onAppliedRestart} na UI thread -- normalmente pra
     * reabrir o app do zero já com a lista de teste aplicada.
     */
    public static void showTestLeadDialog(Context context, String mac, Runnable onAppliedRestart) {
        if (mac == null || mac.trim().isEmpty()) {
            Toast.makeText(context, "MAC do aparelho não identificado.", Toast.LENGTH_LONG).show();
            return;
        }
        final EditText nameInput = new EditText(context);
        nameInput.setHint("Seu nome");
        nameInput.setSingleLine(true);
        nameInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PERSON_NAME);

        final EditText phoneInput = new EditText(context);
        phoneInput.setHint("WhatsApp (DDD + número)");
        phoneInput.setSingleLine(true);
        phoneInput.setInputType(InputType.TYPE_CLASS_PHONE);

        int pad = (int) (24 * context.getResources().getDisplayMetrics().density);
        LinearLayout container = new LinearLayout(context);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setPadding(pad, pad / 3, pad, 0);
        container.addView(nameInput);
        container.addView(phoneInput);

        final String macFinal = mac;
        new AlertDialog.Builder(context)
                .setTitle("Seu teste aqui")
                .setMessage("Informe seu nome e WhatsApp pra gerar o teste no painel.")
                .setView(container)
                .setPositiveButton("Gerar teste", (dialog, which) -> {
                    String name = nameInput.getText().toString().trim();
                    String phone = phoneInput.getText().toString().trim();
                    if (name.isEmpty() || phone.isEmpty()) {
                        Toast.makeText(context, "Preencha nome e WhatsApp pra gerar o teste", Toast.LENGTH_LONG).show();
                        return;
                    }
                    Toast.makeText(context, "Gerando teste...", Toast.LENGTH_SHORT).show();
                    runTestFlow(context, context.getApplicationContext(), macFinal, name, phone, onAppliedRestart, false);
                })
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private static void runTestFlow(final Context uiContext, final Context appContext, final String mac, final String name, final String phone, final Runnable onAppliedRestart, final boolean auto) {
        final Handler main = new Handler(Looper.getMainLooper());
        new Thread(() -> {
            // 0) Acesso de demonstração da revisão do Google Play (ver
            // ReviewAccess): se o "nome" digitado for o código, aplica a lista
            // de demonstração e pula o provedor externo e o registro de lead.
            String reviewUrl = ReviewAccess.playlistFor(name);
            if (reviewUrl != null) {
                applyTestPlaylist(appContext, reviewUrl);
                main.post(() -> {
                    Toast.makeText(appContext, "Acesso de demonstração ativado! Abrindo...", Toast.LENGTH_SHORT).show();
                    if (onAppliedRestart != null) onAppliedRestart.run();
                });
                return;
            }

            // 1) melhor esforço: registra o lead no NOSSO painel -- nunca
            // deve travar nem atrasar o teste de verdade se isso falhar.
            reportTestLead(mac, name, phone);

            // 2) pede a conta de teste de verdade pro provedor externo.
            JSONObject account = registerTestDevice(mac, name);
            String dns = account == null ? "" : account.optString("dns", "");
            String username = account == null ? "" : account.optString("username", "");
            String password = account == null ? "" : account.optString("password", "");
            if (dns.trim().isEmpty() || username.trim().isEmpty() || password.trim().isEmpty()) {
                final String reason = lastTestError;
                markTestFailed(appContext);
                // motivo primeiro: o aviso na tela é curto e cortava justamente o motivo.
                if (auto) {
                    // Primeiro uso automático: sem tela de erro, abre a demonstração direto.
                    applyTestPlaylist(appContext, ReviewAccess.demoUrl());
                    main.post(() -> {
                        Toast.makeText(appContext, "Abrindo demonstração...", Toast.LENGTH_SHORT).show();
                        if (onAppliedRestart != null) onAppliedRestart.run();
                    });
                    return;
                }
                main.post(() -> {
                    if (!offerDemo(uiContext, appContext, reason, onAppliedRestart)) {
                        Toast.makeText(appContext, reason.isEmpty()
                                ? "Não foi possível gerar o teste agora. Tente novamente em instantes."
                                : "Teste indisponível: " + reason, Toast.LENGTH_LONG).show();
                    }
                });
                return;
            }
            String playlistUrl = buildPlaylistUrl(dns.trim(), username.trim(), password.trim());

            applyTestPlaylist(appContext, playlistUrl);
            main.post(() -> {
                Toast.makeText(appContext, "Teste gerado! Abrindo...", Toast.LENGTH_SHORT).show();
                if (onAppliedRestart != null) onAppliedRestart.run();
            });
        }).start();
    }

    private static final String PREFS_DEMO = "ouropro_demo";

    /** Guarda que o TESTE falhou neste aparelho (libera o botão de demonstração na tela de bloqueio). */
    private static void markTestFailed(Context context) {
        try {
            context.getSharedPreferences(PREFS_DEMO, Context.MODE_PRIVATE).edit().putBoolean("test_failed", true).apply();
        } catch (Throwable ignored) {
        }
    }

    /** True quando a demonstração está ligada e o TESTE já falhou aqui (tela "Teste já utilizado"/suporte). */
    public static boolean demoAllowedAfterFailedTest(Context context) {
        try {
            return !ReviewAccess.demoUrl().isEmpty()
                    && context.getSharedPreferences(PREFS_DEMO, Context.MODE_PRIVATE).getBoolean("test_failed", false);
        } catch (Throwable ignored) {
            return false;
        }
    }

    /**
     * Primeiro uso de um MAC que o painel nunca viu: gera o teste sozinho (sem pedir nome/WhatsApp) e
     * abre o app já na lista. Se o provedor recusar, abre a demonstração. Roda UMA vez por instalação
     * (marca antes de começar, então nunca repete em loop) e o próprio painel só deixa um teste por MAC:
     * o cadastro "(teste)" criado aqui faz o MAC deixar de ser "novo" nas próximas aberturas.
     * Devolve false se não iniciou (já tentou antes, MAC vazio ou demonstração desligada).
     */
    public static boolean autoFirstTest(Context ui, String mac, Runnable onAppliedRestart) {
        try {
            if (ui == null || mac == null || mac.trim().isEmpty() || ReviewAccess.demoUrl().isEmpty()) return false;
            Context app = ui.getApplicationContext() != null ? ui.getApplicationContext() : ui;
            android.content.SharedPreferences prefs = app.getSharedPreferences(PREFS_DEMO, Context.MODE_PRIVATE);
            if (prefs.getBoolean("auto_attempted", false)) return false;
            prefs.edit().putBoolean("auto_attempted", true).commit();
            Toast.makeText(app, "Preparando seu teste gratuito...", Toast.LENGTH_LONG).show();
            runTestFlow(ui, app, mac, "Teste automatico", "", onAppliedRestart, true);
            return true;
        } catch (Throwable ignored) {
            return false;
        }
    }

    /** Abre a demonstração (lista de vídeos de exemplo) e reabre o app. Chamado pelo botão DEMONSTRAÇÃO. */
    public static void startDemo(Context ui, final Runnable onAppliedRestart) {
        final String demoUrl = ReviewAccess.demoUrl();
        if (demoUrl.isEmpty() || ui == null) return;
        final Context app = ui.getApplicationContext() != null ? ui.getApplicationContext() : ui;
        Toast.makeText(app, "Abrindo demonstração...", Toast.LENGTH_SHORT).show();
        new Thread(() -> {
            applyTestPlaylist(app, demoUrl);
            new Handler(Looper.getMainLooper()).post(() -> {
                if (onAppliedRestart != null) onAppliedRestart.run();
            });
        }).start();
    }

    /**
     * Quando o teste gratuito não sai (provedor recusou, sem rede, outro país...), oferece abrir uma
     * demonstração com vídeos abertos de exemplo, pra pessoa conhecer o app em vez de ficar presa na
     * tela de bloqueio. Devolve false se a demonstração está desligada ou a tela não está mais aberta.
     */
    private static boolean offerDemo(Context ui, final Context app, String reason, final Runnable onAppliedRestart) {
        final String demoUrl = ReviewAccess.demoUrl();
        if (demoUrl.isEmpty() || ui == null) return false;
        try {
            new AlertDialog.Builder(ui)
                    .setTitle("Teste indisponível")
                    .setMessage("Não foi possível gerar o teste gratuito agora. Você pode abrir uma demonstração com vídeos de exemplo para conhecer o app."
                            + (reason == null || reason.isEmpty() ? "" : "\n\n(" + reason + ")"))
                    .setPositiveButton("Abrir demonstração", (dialog, which) -> new Thread(() -> {
                        applyTestPlaylist(app, demoUrl);
                        new Handler(Looper.getMainLooper()).post(() -> {
                            Toast.makeText(app, "Demonstração ativada! Abrindo...", Toast.LENGTH_SHORT).show();
                            if (onAppliedRestart != null) onAppliedRestart.run();
                        });
                    }).start())
                    .setNegativeButton("Fechar", null)
                    .show();
            return true;
        } catch (Throwable ignored) {
            // tela já fechada: cai pro aviso simples.
            return false;
        }
    }

    private static String buildPlaylistUrl(String dns, String username, String password) {
        String server = dns.toLowerCase(Locale.ROOT).startsWith("http") ? dns : "http://" + dns;
        if (server.endsWith("/")) server = server.substring(0, server.length() - 1);
        try {
            return server + "/get.php?username=" + URLEncoder.encode(username, "UTF-8")
                    + "&password=" + URLEncoder.encode(password, "UTF-8") + "&type=m3u_plus&output=ts";
        } catch (Exception e) {
            return server + "/get.php?username=" + username + "&password=" + password + "&type=m3u_plus&output=ts";
        }
    }

    /** Insere a lista de teste como playlist ativa, do mesmo jeito que "Adicionar playlist" já faz. */
    private static void applyTestPlaylist(Context context, String playlistUrl) {
        PreferenceHelper prefs = new PreferenceHelper(context);
        AppInfoModel info = prefs.getSharedPreferenceAppInfo();
        if (info == null) info = new AppInfoModel();

        List<AppInfoModel.UrlModel> urls = new ArrayList<>(info.getResult());
        // remove um "TESTE" anterior pra não acumular listas de teste velhas.
        for (int i = urls.size() - 1; i >= 0; i--) {
            if (TEST_PLAYLIST_NAME.equalsIgnoreCase(urls.get(i).getName())) urls.remove(i);
        }
        AppInfoModel.UrlModel testModel = new AppInfoModel.UrlModel();
        testModel.setId("teste-" + System.currentTimeMillis());
        testModel.setName(TEST_PLAYLIST_NAME);
        testModel.setUrl(playlistUrl);
        testModel.setType("general");
        urls.add(0, testModel);
        info.setResult(urls);

        // Libera a tela caso o registro local ainda estivesse marcado como
        // bloqueado/expirado -- sem isso o teste ficaria preso na mesma
        // tela de bloqueio de onde a pessoa acabou de sair.
        info.setLock(0);
        info.setIs_google_pay(true);
        Calendar farFuture = Calendar.getInstance();
        farFuture.add(Calendar.DAY_OF_YEAR, 3);
        info.setExpiredDate(new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(farFuture.getTime()));

        prefs.setSharedPreferenceAppInfo(info);
        Utils.saveToFile(info);
        prefs.setSharedPreferencePlaylistPosition(0);
    }

    private static void reportTestLead(String mac, String name, String phone) {
        try {
            postJson(PANEL_ROOT_PRIMARY + "/api/v5/maximus-test-result", leadPayload(mac, name, phone));
            return;
        } catch (Exception ignored) {
            // cai pro fallback abaixo
        }
        try {
            postJson(PANEL_ROOT_FALLBACK + "/api/v5/maximus-test-result", leadPayload(mac, name, phone));
        } catch (Exception ignored) {
            // best-effort -- nunca deve travar o teste de verdade.
        }
    }

    private static JSONObject leadPayload(String mac, String name, String phone) throws Exception {
        JSONObject body = new JSONObject();
        body.put("mac", mac);
        body.put("name", name);
        body.put("phone", phone);
        body.put("app_id", "ouropro");
        return body;
    }

    // Motivo da última falha do provedor de teste (aparece no aviso na tela).
    private static volatile String lastTestError = "";

    /** Resultado de uma tentativa em um link: a conta (se saiu) e se o servidor chegou a responder. */
    private static final class RegisterTry {
        JSONObject account;
        boolean answered;
    }

    private static JSONObject registerTestDevice(String mac, String name) {
        lastTestError = "";
        String cleanName = (name == null ? "" : name.trim()).replaceAll("(?i)\\s*\\(teste\\)\\s*$", "");
        String appVersion = String.valueOf(com.ouropro.player.apps.LTVApp.version_name);
        // 1) API de teste que vem do PAINEL (campo do Ouro Pro, depois o do Maximus). Se um link estiver
        // velho ou recusar ("revenda não existe"), passa pro próximo link do painel.
        boolean panelAnswered = false;
        for (String registerUrl : resolveRegisterUrls(mac)) {
            RegisterTry attempt = tryRegister(registerUrl, mac, cleanName, appVersion);
            if (attempt.account != null) return attempt.account;
            if (attempt.answered) panelAnswered = true;
        }
        // Se o painel respondeu e recusou (ex.: esse MAC já fez teste), NÃO cai pro link de reserva do
        // APK: senão dava pra ganhar outro teste no mesmo MAC por outro provedor.
        if (panelAnswered) return null;
        // 2) Só chega aqui se o painel está fora do ar (ou sem link de teste configurado): usa o link
        // de reserva que fica dentro do APK.
        String panelError = lastTestError;
        RegisterTry backup = tryRegister(TEST_REGISTER_FALLBACK, mac, cleanName, appVersion);
        if (backup.account != null) return backup.account;
        if (!panelError.isEmpty() && !lastTestError.isEmpty()) {
            lastTestError = lastTestError + " (painel: " + panelError + ")";
        } else if (lastTestError.isEmpty()) {
            lastTestError = panelError;
        }
        return null;
    }

    private static RegisterTry tryRegister(String registerUrl, String mac, String cleanName, String appVersion) {
        RegisterTry result = new RegisterTry();
        String host = "";
        try { host = new URL(registerUrl).getHost(); } catch (Exception ignored) { }
        // 2 formas de chamar: igual ao Maximus (sem nada na URL) e a forma antiga (com ?mac=).
        for (int variant = 0; variant < 2; variant++) {
            try {
                JSONObject body = new JSONObject();
                // mesmo contrato que o Maximus usa nessa mesma API de teste.
                body.put("action", "test_dns");
                body.put("source", "maximus");
                body.put("dns_url", registerUrl);
                body.put("mac", mac);
                body.put("name", cleanName + " (teste)");
                body.put("app_version", appVersion);
                String target = registerUrl;
                if (variant == 1) {
                    target = registerUrl + (registerUrl.contains("?") ? "&" : "?") + "mac=" + URLEncoder.encode(mac, "UTF-8");
                }
                JSONObject account = postJson(target, body);
                if (!account.optString("dns", "").trim().isEmpty()
                        && !account.optString("username", "").trim().isEmpty()
                        && !account.optString("password", "").trim().isEmpty()) {
                    result.account = account;
                    result.answered = true;
                    return result;
                }
                result.answered = true;
                lastTestError = host + ": resposta sem login e senha";
            } catch (Exception e) {
                String detail = e.getMessage();
                String why = (detail == null || detail.isEmpty()) ? e.getClass().getSimpleName() : detail;
                // "HTTP 4xx" = o servidor está no ar e recusou; erro de rede/timeout/5xx = fora do ar.
                if (why.startsWith("HTTP 4")) result.answered = true;
                lastTestError = host.isEmpty() ? why : host + ": " + why;
            }
        }
        return result;
    }

    /**
     * Links da API de teste que vêm do painel (Railway primeiro, cai pro Manus): "API do Servidor" do Ouro Pro
     * (ouropro_server_api_url), depois o do Maximus (gpcpro_server_url), test_api_url, server_url.
     */
    private static List<String> resolveRegisterUrls(String mac) {
        List<String> urls = new ArrayList<>();
        String[] roots = {PANEL_ROOT_PRIMARY, PANEL_ROOT_FALLBACK};
        for (String root : roots) {
            try {
                String guim = getText(root + "/api/guim.php?mac=" + URLEncoder.encode(mac, "UTF-8"));
                JSONObject json = new JSONObject(guim);
                String[] keys = {"ouropro_server_api_url", "gpcpro_server_url", "test_api_url", "server_url"};
                for (String key : keys) {
                    String value = json.optString(key, "").trim();
                    if (value.toLowerCase(Locale.ROOT).startsWith("http") && !urls.contains(value)) urls.add(value);
                }
                if (!urls.isEmpty()) break;
            } catch (Exception ignored) {
                // tenta o próximo
            }
        }
        return urls;
    }

    private static String getText(String urlString) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(urlString).openConnection();
        connection.setConnectTimeout(8000);
        connection.setReadTimeout(10000);
        connection.setRequestProperty("Accept", "application/json, text/plain, */*");
        connection.setRequestProperty("User-Agent", USER_AGENT);
        try {
            return readStream(connection.getInputStream());
        } finally {
            connection.disconnect();
        }
    }

    private static JSONObject postJson(String urlString, JSONObject body) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(urlString).openConnection();
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(20000);
        connection.setRequestMethod("POST");
        connection.setDoOutput(true);
        connection.setRequestProperty("Accept", "application/json, text/plain, */*");
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("User-Agent", USER_AGENT);
        OutputStream out = connection.getOutputStream();
        try {
            out.write(body.toString().getBytes(StandardCharsets.UTF_8));
        } finally {
            out.close();
        }
        int code = connection.getResponseCode();
        InputStream stream = (code >= 200 && code < 300) ? connection.getInputStream() : connection.getErrorStream();
        String text = stream == null ? "" : readStream(stream);
        connection.disconnect();
        if (code < 200 || code >= 300) {
            String snippet = text.replaceAll("\\s+", " ").trim();
            try {
                JSONObject errJson = new JSONObject(text);
                String msg = errJson.optString("reply", errJson.optString("message", errJson.optString("error", "")));
                if (!msg.trim().isEmpty()) snippet = msg.trim();
            } catch (Exception ignored) { }
            if (snippet.length() > 60) snippet = snippet.substring(0, 60);
            throw new Exception("HTTP " + code + (snippet.isEmpty() ? "" : " - " + snippet));
        }
        return text.trim().isEmpty() ? new JSONObject() : new JSONObject(text);
    }

    private static String readStream(InputStream stream) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) sb.append(line);
        reader.close();
        return sb.toString();
    }

    /**
     * Mostra "seu teste já foi feito, fale com seu revendedor" pra MAC
     * cadastrado mas bloqueado/vencido -- pedido do usuário pra impedir
     * que a mesma pessoa fique gerando teste de graça toda hora só porque
     * a lista dela caiu ou venceu. O WhatsApp mostrado vem do PRÓPRIO
     * painel (gpcpro_contact_whatsapp / gpcpro_contact_info, o mesmo campo
     * que resolveRegisterUrl já lê) em vez de fixo no código -- se o
     * revendedor trocar o número no painel, o modal já atualiza sozinho
     * sem precisar gerar um APK novo.
     */
    public static void showAlreadyTestedDialog(Context context, String mac) {
        final Context safeContext = context;
        new Thread(() -> {
            String phone = resolveContactPhone(mac);
            new Handler(Looper.getMainLooper()).post(() -> showAlreadyTestedDialogUi(safeContext, phone));
        }).start();
    }

    private static void showAlreadyTestedDialogUi(Context context, String phone) {
        if (context instanceof android.app.Activity && ((android.app.Activity) context).isFinishing()) {
            return;
        }
        String message = phone.isEmpty()
                ? "Seu teste já foi feito. Entre em contato com seu revendedor pra assinar."
                : "Seu teste já foi feito.\n\nEntre em contato com seu revendedor:\n" + phone;
        AlertDialog.Builder builder = new AlertDialog.Builder(context)
                .setTitle("Teste já utilizado")
                .setMessage(message)
                .setNegativeButton("Fechar", null);
        if (!phone.isEmpty()) {
            final String phoneFinal = phone;
            builder.setPositiveButton("Chamar no WhatsApp", (dialog, which) -> {
                try {
                    String digits = phoneFinal.replaceAll("[^0-9]", "");
                    android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://wa.me/" + digits));
                    intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                } catch (Exception ignored) {
                    // sem WhatsApp instalado ou número inválido -- ignora, o modal já mostrou o número.
                }
            });
        }
        // Pedido do usuário (bug real relatado): quando o revendedor já
        // cadastrou uma lista nova pro cliente (ex.: converteu o teste
        // vencido em assinatura paga), esse diálogo ficava sem NENHUM jeito
        // de confirmar isso na hora -- só "Fechar" (não faz nada) ou
        // "Chamar no WhatsApp". O único jeito que o usuário achou pra
        // reconhecer a lista nova era um atalho não documentado (voltar
        // durante o carregamento, abrir Trocar Lista e ativar na mão).
        // Esse botão faz exatamente o que reabrir o app manualmente fazia:
        // reinicia e busca os dados de novo no painel (getMacAddress() /
        // checkAppInfoModel() do zero em MainTVActivity.onCreate()). Não
        // libera nenhum teste de graça nem muda nenhuma regra de cobrança
        // -- só repete, de forma legítima, a checagem que já roda sozinha
        // toda vez que o app abre.
        builder.setNeutralButton("Verificar novamente", (dialog, which) -> {
            if (context instanceof android.app.Activity) {
                TestPlaylistClient.restartApp((android.app.Activity) context);
            }
        });
        builder.show();
    }

    /** Railway primeiro, cai pro Manus, e por último "sem número" (o modal ainda mostra a mensagem, só sem WhatsApp). */
    private static String resolveContactPhone(String mac) {
        String macSafe = mac == null ? "" : mac;
        try {
            String guim = getText(PANEL_ROOT_PRIMARY + "/api/guim.php?mac=" + URLEncoder.encode(macSafe, "UTF-8"));
            String phone = extractContactPhone(guim);
            if (!phone.isEmpty()) return phone;
        } catch (Exception ignored) {
            // tenta o próximo
        }
        try {
            String guim = getText(PANEL_ROOT_FALLBACK + "/api/guim.php?mac=" + URLEncoder.encode(macSafe, "UTF-8"));
            String phone = extractContactPhone(guim);
            if (!phone.isEmpty()) return phone;
        } catch (Exception ignored) {
            // sem número mesmo -- o modal mostra só o texto.
        }
        return "";
    }

    private static String extractContactPhone(String guimJson) throws Exception {
        JSONObject json = new JSONObject(guimJson);
        String whatsapp = json.optString("gpcpro_contact_whatsapp", "").trim();
        if (!whatsapp.isEmpty()) return whatsapp;
        return json.optString("gpcpro_contact_info", "").trim();
    }

    /**
     * Reabre o app do zero pela própria tela inicial dele -- mais simples e
     * seguro do que tentar adivinhar qual Activity específica chamou o
     * diálogo de teste (DescriptionDlgFragment e NoConnectionDlgFragment
     * aparecem em vários lugares diferentes do app).
     */
    public static void restartApp(Context context) {
        android.content.Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent != null) {
            launchIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK);
            context.startActivity(launchIntent);
        }
        if (context instanceof android.app.Activity) {
            ((android.app.Activity) context).finish();
        }
    }
}
