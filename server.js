import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bookHandler from './api/book-vercel.js';
import availableTimesHandler from './api/available-times.js';
import oauthAuthorizeHandler from './api/oauth/authorize.js';
import oauthCallbackHandler from './api/oauth/callback.js';
import oauthStatusHandler from './api/oauth/status.js';
import oauthDisconnectHandler from './api/oauth/disconnect.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

// Middleware para parse de JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache-Control headers para desenvolvimento
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Rotas OAuth
app.get('/api/oauth/authorize', oauthAuthorizeHandler);
app.get('/api/oauth/callback', oauthCallbackHandler);
app.get('/api/oauth/status', oauthStatusHandler);
app.post('/api/oauth/disconnect', oauthDisconnectHandler);

// Rota da API de agendamento
app.post('/api/book', async (req, res) => {
    try {
        await bookHandler(req, res);
    } catch (error) {
        console.error('Error in /api/book:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                message: 'Erro interno do servidor',
                error: error.message 
            });
        }
    }
});

// Rota da API de horários disponíveis
app.get('/api/available-times', async (req, res) => {
    try {
        await availableTimesHandler(req, res);
    } catch (error) {
        console.error('Error in /api/available-times:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                message: 'Erro interno do servidor',
                error: error.message 
            });
        }
    }
});

// Servir arquivos estáticos
app.use(express.static(__dirname, {
    extensions: ['html'],
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
}));

// Fallback para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`📅 Google Calendar integration ready`);
});
