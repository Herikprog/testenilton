import { google } from 'googleapis';

export default async function handler(req, res) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
        return res.status(500).send(`
            <html>
                <head>
                    <title>Erro de Configuração</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            max-width: 600px;
                            margin: 100px auto;
                            padding: 2rem;
                            background: #1a1a1a;
                            color: white;
                        }
                        h1 { color: #ef4444; }
                        pre {
                            background: #2d2d2d;
                            padding: 1rem;
                            border-radius: 8px;
                            overflow-x: auto;
                        }
                    </style>
                </head>
                <body>
                    <h1>⚠️ Configuração Necessária</h1>
                    <p>Para usar o login com Google Calendar, você precisa configurar as variáveis de ambiente:</p>
                    <pre>GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui</pre>
                    <p>Veja o arquivo CONFIGURACAO_GOOGLE_CALENDAR.md para instruções completas.</p>
                    <a href="/admin.html" style="color: #ffd700;">← Voltar</a>
                </body>
            </html>
        `);
    }
    
    const redirectUri = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/oauth/callback`;
    
    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );
    
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar'],
        prompt: 'consent'
    });
    
    res.redirect(authUrl);
}
