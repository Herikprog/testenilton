import { google } from 'googleapis';
import { parse } from 'cookie';

export default async function handler(req, res) {
    try {
        const cookies = parse(req.headers.cookie || '');
        const refreshToken = cookies.gcal_refresh_token;
        
        if (!refreshToken) {
            return res.json({ connected: false });
        }
        
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        
        return res.json({
            connected: true,
            email: userInfo.data.email
        });
    } catch (error) {
        console.error('Erro ao verificar status:', error);
        return res.json({ connected: false });
    }
}
