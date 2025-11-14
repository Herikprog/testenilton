import { google } from 'googleapis';
import { parse } from 'cookie';

export async function getCalendarClient(req) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
        throw new Error('Google Calendar credentials not configured');
    }
    
    const cookies = parse(req.headers.cookie || '');
    const refreshToken = cookies.gcal_refresh_token || process.env.GOOGLE_REFRESH_TOKEN;
    
    if (!refreshToken) {
        throw new Error('Not authenticated');
    }
    
    const redirectUri = cookies.gcal_refresh_token 
        ? `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/oauth/callback`
        : 'https://developers.google.com/oauthplayground';
    
    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );
    
    oauth2Client.setCredentials({
        refresh_token: refreshToken
    });
    
    return google.calendar({ version: 'v3', auth: oauth2Client });
}
