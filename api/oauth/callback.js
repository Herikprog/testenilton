import { google } from 'googleapis';
import { serialize, parse } from 'cookie';

export default async function handler(req, res) {
    const { code } = req.query;
    
    if (!code) {
        return res.status(400).send('Código de autorização não encontrado');
    }
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/oauth/callback`;
    
    try {
        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
        );
        
        const { tokens } = await oauth2Client.getToken(code);
        
        const existingCookies = parse(req.headers.cookie || '');
        const existingRefreshToken = existingCookies.gcal_refresh_token;
        const finalRefreshToken = tokens.refresh_token || existingRefreshToken;
        
        if (!finalRefreshToken) {
            return res.status(400).send(`
                <html>
                    <head>
                        <title>Erro na Autorização</title>
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
                            a {
                                display: inline-block;
                                padding: 1rem 2rem;
                                background: linear-gradient(135deg, #ffd700, #b8860b);
                                color: #1a1a1a;
                                text-decoration: none;
                                border-radius: 50px;
                                font-weight: bold;
                                margin-top: 2rem;
                            }
                        </style>
                    </head>
                    <body>
                        <h1>⚠️ Erro na Autorização</h1>
                        <p>O Google não retornou um token de atualização válido.</p>
                        <p>Isso pode acontecer se você já autorizou anteriormente. Por favor, tente novamente e certifique-se de autorizar todas as permissões solicitadas.</p>
                        <a href="/admin.html">Tentar Novamente</a>
                    </body>
                </html>
            `);
        }
        
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365,
            path: '/'
        };
        
        const cookies = [
            serialize('gcal_access_token', tokens.access_token || '', cookieOptions),
            serialize('gcal_refresh_token', finalRefreshToken, cookieOptions),
            serialize('gcal_expiry_date', String(tokens.expiry_date || ''), cookieOptions)
        ];
        
        res.setHeader('Set-Cookie', cookies);
        
        res.send(`
            <html>
                <head>
                    <title>Conectado!</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            max-width: 600px;
                            margin: 100px auto;
                            padding: 2rem;
                            background: #1a1a1a;
                            color: white;
                            text-align: center;
                        }
                        h1 { color: #22c55e; font-size: 3rem; }
                        p { font-size: 1.2rem; margin: 2rem 0; }
                        a {
                            display: inline-block;
                            padding: 1rem 2rem;
                            background: linear-gradient(135deg, #ffd700, #b8860b);
                            color: #1a1a1a;
                            text-decoration: none;
                            border-radius: 50px;
                            font-weight: bold;
                            margin-top: 2rem;
                        }
                    </style>
                </head>
                <body>
                    <h1>✅</h1>
                    <h2>Conectado com sucesso!</h2>
                    <p>Seu Google Calendar agora está sincronizado com o sistema de agendamentos.</p>
                    <a href="/admin.html">Ir para Admin</a>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Erro no OAuth callback:', error);
        res.status(500).send(`
            <html>
                <head>
                    <title>Erro</title>
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
                    </style>
                </head>
                <body>
                    <h1>❌ Erro na autenticação</h1>
                    <p>${error.message}</p>
                    <a href="/admin.html" style="color: #ffd700;">← Tentar novamente</a>
                </body>
            </html>
        `);
    }
}
