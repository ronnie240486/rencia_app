// Rota para servir o web player idêntico ao gpcpro.com.br
export function setupPlayerRoute(app: any) {
  app.get("/player", (_req: any, res: any) => {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GPCPro - Premium Experience</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --primary-500: 255, 204, 0;
            --primary-400: 255, 221, 51;
            --primary-500-rgb: 255, 204, 0;
        }
        
        html, body { height: 100%; width: 100%; }
        
        body {
            background: #000;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
        }
        
        .container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        
        main {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            overflow-y: auto;
        }
        
        .content {
            width: 100%;
            max-width: 1200px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 60px;
        }
        
        .header h1 {
            font-size: 48px;
            font-weight: 300;
            letter-spacing: 3px;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 14px;
            color: #999;
            letter-spacing: 1px;
        }
        
        .status {
            text-align: center;
            margin-bottom: 40px;
            font-size: 12px;
            color: #666;
        }
        
        .status .dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            background: #ff3333;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 60px;
            margin-bottom: 60px;
        }
        
        @media (max-width: 768px) {
            .grid { grid-template-columns: 1fr; gap: 40px; }
            .header h1 { font-size: 36px; }
        }
        
        .section {
            display: flex;
            flex-direction: column;
        }
        
        .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
        }
        
        .section-number {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border: 2px solid #fff;
            border-radius: 50%;
            font-size: 14px;
            font-weight: 600;
            flex-shrink: 0;
        }
        
        .section-title {
            font-size: 13px;
            font-weight: 500;
            color: #ccc;
            line-height: 1.6;
        }
        
        .mac-box {
            border: 2px dashed #ff3333;
            padding: 30px;
            text-align: center;
            margin-bottom: 20px;
            background: rgba(255, 51, 51, 0.05);
        }
        
        .mac-label {
            font-size: 10px;
            letter-spacing: 2px;
            color: #999;
            margin-bottom: 15px;
            display: block;
            text-transform: uppercase;
        }
        
        .mac-value {
            font-size: 24px;
            font-weight: 600;
            letter-spacing: 2px;
            font-family: 'Courier New', monospace;
            margin-bottom: 20px;
            color: #ffcc00;
        }
        
        .copy-btn {
            background: transparent;
            border: 1px solid #ffcc00;
            color: #ffcc00;
            padding: 8px 16px;
            font-size: 11px;
            cursor: pointer;
            letter-spacing: 1px;
            transition: all 0.3s;
            text-transform: uppercase;
            font-weight: 600;
        }
        
        .copy-btn:hover {
            background: #ffcc00;
            color: #000;
        }
        
        .copy-btn.copied {
            background: #ffcc00;
            color: #000;
        }
        
        form {
            display: flex;
            flex-direction: column;
            gap: 12px;
            flex: 1;
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .form-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #999;
        }
        
        .form-input {
            width: 100%;
            background: transparent;
            border: 2px dashed #ffcc00;
            color: #fff;
            padding: 12px;
            font-size: 14px;
            font-family: inherit;
            transition: all 0.3s;
        }
        
        .form-input::placeholder {
            color: #666;
        }
        
        .form-input:focus {
            outline: none;
            border-color: #ff3333;
        }
        
        .submit-btn {
            background: #ffcc00;
            color: #000;
            border: none;
            padding: 16px;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 2px;
            cursor: pointer;
            text-transform: uppercase;
            transition: all 0.3s;
            margin-top: 10px;
        }
        
        .submit-btn:hover {
            background: #ffdd33;
            transform: translateY(-2px);
        }
        
        .submit-btn:active {
            transform: translateY(0);
        }
        
        .submit-btn.loading {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .message {
            padding: 12px;
            margin-bottom: 12px;
            font-size: 12px;
            border-left: 3px solid #ffcc00;
            display: none;
            background: rgba(255, 204, 0, 0.1);
        }
        
        .message.success {
            background: rgba(76, 175, 80, 0.1);
            border-left-color: #4caf50;
            color: #4caf50;
            display: block;
        }
        
        .message.error {
            background: rgba(255, 51, 51, 0.1);
            border-left-color: #ff3333;
            color: #ff3333;
            display: block;
        }
        
        .message.info {
            background: rgba(255, 204, 0, 0.1);
            border-left-color: #ffcc00;
            color: #ffcc00;
            display: block;
        }
        
        .player-section {
            display: none;
            width: 100%;
            height: 100%;
            flex-direction: column;
        }
        
        .player-section.active {
            display: flex;
        }
        
        .player-header {
            background: #111;
            padding: 20px;
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .player-header h2 {
            font-size: 24px;
            font-weight: 300;
            letter-spacing: 2px;
        }
        
        .player-info {
            font-size: 12px;
            color: #999;
            letter-spacing: 1px;
        }
        
        .player-info strong {
            color: #ffcc00;
            font-weight: 600;
        }
        
        .logout-btn {
            background: #ff3333;
            color: #fff;
            border: none;
            padding: 10px 20px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 1px;
            cursor: pointer;
            text-transform: uppercase;
            transition: all 0.3s;
        }
        
        .logout-btn:hover {
            background: #ff5555;
        }
        
        footer {
            text-align: center;
            padding: 20px;
            border-top: 1px solid #333;
            font-size: 11px;
            color: #666;
            letter-spacing: 1px;
        }
    </style>
</head>
<body>
    <div class="container">
        <main>
            <div class="content">
                <!-- Login Section -->
                <div id="loginSection">
                    <div class="header">
                        <h1>GPCPRO</h1>
                        <p>Premium Experience</p>
                    </div>
                    
                    <div class="status">
                        <span class="dot"></span>
                        <span>Verificando ativação automática...</span>
                    </div>
                    
                    <div class="grid">
                        <!-- Left Column -->
                        <div class="section">
                            <div class="section-header">
                                <div class="section-number">1</div>
                                <div class="section-title">Envie o ID do dispositivo para o seu revendedor ativar o acesso automaticamente.</div>
                            </div>
                            
                            <div class="mac-box">
                                <span class="mac-label">ID DO DISPOSITIVO (MAC)</span>
                                <div class="mac-value" id="deviceId">Carregando...</div>
                                <button class="copy-btn" onclick="copyDeviceId()">Toque para copiar</button>
                            </div>
                        </div>
                        
                        <!-- Right Column -->
                        <div class="section">
                            <div class="section-header">
                                <div class="section-number">2</div>
                                <div class="section-title">Ou entre com o código do revendedor.</div>
                            </div>
                            
                            <div id="message" class="message"></div>
                            
                            <form onsubmit="login(event)">
                                <div class="form-group">
                                    <label class="form-label">CÓDIGO DE REVENDA</label>
                                    <input type="text" class="form-input" id="resellerCode" placeholder="ID de Revendedor">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">USUÁRIO</label>
                                    <input type="text" class="form-input" id="username" placeholder="usuário">
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">SENHA</label>
                                    <input type="password" class="form-input" id="password" placeholder="••••••••">
                                </div>
                                
                                <button type="submit" class="submit-btn">Entrar</button>
                            </form>
                        </div>
                    </div>
                </div>
                
                <!-- Player Section -->
                <div id="playerSection" class="player-section">
                    <div class="player-header">
                        <h2>GPCPRO</h2>
                        <div class="player-info">
                            MAC: <strong id="playerMac">--:--:--:--:--:--</strong>
                        </div>
                        <button class="logout-btn" onclick="logout()">Sair</button>
                    </div>
                </div>
            </div>
        </main>
        
        <footer>
            Precisa de ajuda? Contate seu revendedor · v1.0.0 · © 2026
        </footer>
    </div>
    
    <script>
        const BACKEND_URL = window.location.origin;
        
        function generateMac() {
            return Array.from({length: 6}, () => 
                Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()
            ).join(':');
        }
        
        window.addEventListener('load', () => {
            const mac = localStorage.getItem('deviceMac') || generateMac();
            localStorage.setItem('deviceMac', mac);
            document.getElementById('deviceId').textContent = mac;
            document.getElementById('playerMac').textContent = mac;
            checkMacAutomatic();
        });
        
        async function checkMacAutomatic() {
            const mac = localStorage.getItem('deviceMac');
            try {
                const response = await fetch(\`\${BACKEND_URL}/api/v5/check_mac.php\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: \`mac=\${mac}\`
                });
                const data = await response.json();
                if (data.mac_registered) {
                    localStorage.setItem('userLoggedIn', 'true');
                    showPlayer();
                }
            } catch (error) {
                console.log('MAC não registrado');
            }
        }
        
        function copyDeviceId() {
            const deviceId = document.getElementById('deviceId').textContent;
            navigator.clipboard.writeText(deviceId).then(() => {
                const btn = event.target;
                btn.textContent = 'Copiado!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = 'Toque para copiar';
                    btn.classList.remove('copied');
                }, 2000);
            });
        }
        
        async function login(event) {
            event.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const mac = localStorage.getItem('deviceMac');
            
            if (!username || !password) {
                showMessage('Por favor, preencha usuário e senha', 'error');
                return;
            }
            
            try {
                const btn = event.target.querySelector('button[type="submit"]');
                btn.classList.add('loading');
                btn.disabled = true;
                
                const response = await fetch(\`\${BACKEND_URL}/api/v5/check_mac.php\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: \`mac=\${mac}&username=\${username}&password=\${password}\`
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.mac_registered) {
                        localStorage.setItem('userLoggedIn', 'true');
                        localStorage.setItem('username', username);
                        showMessage('Login realizado com sucesso!', 'success');
                        setTimeout(() => {
                            showPlayer();
                        }, 1000);
                    } else {
                        showMessage('MAC não registrado.', 'error');
                    }
                } else {
                    showMessage('Falha na autenticação.', 'error');
                }
                
                btn.classList.remove('loading');
                btn.disabled = false;
            } catch (error) {
                showMessage('Erro ao conectar: ' + error.message, 'error');
                event.target.querySelector('button[type="submit"]').classList.remove('loading');
                event.target.querySelector('button[type="submit"]').disabled = false;
            }
        }
        
        function showPlayer() {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('playerSection').classList.add('active');
        }
        
        function logout() {
            localStorage.removeItem('userLoggedIn');
            localStorage.removeItem('username');
            document.getElementById('loginSection').style.display = 'block';
            document.getElementById('playerSection').classList.remove('active');
            showMessage('Você foi desconectado', 'info');
        }
        
        function showMessage(text, type) {
            const msg = document.getElementById('message');
            msg.textContent = text;
            msg.className = \`message \${type}\`;
            setTimeout(() => {
                msg.className = 'message';
            }, 5000);
        }
        
        if (localStorage.getItem('userLoggedIn')) {
            showPlayer();
        }
    </script>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });
}
