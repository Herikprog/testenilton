import { serialize } from 'cookie';

export default async function handler(req, res) {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
    };
    
    const cookies = [
        serialize('gcal_access_token', '', cookieOptions),
        serialize('gcal_refresh_token', '', cookieOptions),
        serialize('gcal_expiry_date', '', cookieOptions)
    ];
    
    res.setHeader('Set-Cookie', cookies);
    res.json({ success: true });
}
