// VERSÃO PARA VERCEL - Use este arquivo na Vercel
// Renomeie para book.js quando fizer deploy na Vercel

import { getCalendarClient } from './get-calendar-client.js';

function getServiceDuration(service) {
    const durations = {
        'Corte Clássico': 50,
        'Design de Barba': 40,
        'Corte + Barba Completo': 90
    };
    return durations[service] || 60;
}

function createLisbonDate(dateString, timeString) {
    const isoString = `${dateString}T${timeString}:00`;
    return new Date(isoString);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        let body;
        if (typeof req.body === 'string') {
            try {
                body = JSON.parse(req.body);
            } catch (e) {
                return res.status(400).json({ message: 'JSON inválido no corpo da requisição' });
            }
        } else if (req.body && typeof req.body === 'object') {
            body = req.body;
        } else {
            return res.status(400).json({ message: 'Corpo da requisição não encontrado' });
        }

        const { name, email, phone, service, date, time, notes } = body;

        if (!name || !email || !phone || !service || !date || !time) {
            return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
        }

        const startDateTime = createLisbonDate(date, time);
        const serviceDuration = getServiceDuration(service);
        const endDateTime = new Date(startDateTime.getTime() + serviceDuration * 60000);

        const eventData = {
            summary: `NILTON BARBER - ${service}`,
            description: `Cliente: ${name}\nTelefone: ${phone}\nEmail: ${email}\nServiço: ${service}\n\nObservações: ${notes || 'Nenhuma'}`,
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: 'Europe/Lisbon'
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'Europe/Lisbon'
            },
            attendees: [
                { email: email }
            ],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 60 }
                ]
            }
        };

        try {
            const calendar = await getCalendarClient(req);
            
            const dayStart = createLisbonDate(date, '00:00');
            const dayEnd = createLisbonDate(date, '23:59');
            
            const existingEvents = await calendar.events.list({
                calendarId: 'primary',
                timeMin: dayStart.toISOString(),
                timeMax: dayEnd.toISOString(),
                timeZone: 'Europe/Lisbon',
                singleEvents: true
            });

            const events = existingEvents.data.items || [];
            const hasConflict = events.some(event => {
                if (!event.start || !event.end) return false;
                
                const eventStart = new Date(event.start.dateTime || event.start.date);
                const eventEnd = new Date(event.end.dateTime || event.end.date);

                return (startDateTime < eventEnd && endDateTime > eventStart);
            });

            if (hasConflict) {
                return res.status(409).json({
                    success: false,
                    message: 'Este horário já está ocupado. Por favor, escolha outro horário.',
                    conflict: true
                });
            }
            
            const calendarEvent = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: eventData,
                sendUpdates: 'all'
            });
            
            return res.status(200).json({
                success: true,
                message: 'Agendamento realizado com sucesso!',
                eventId: calendarEvent.data.id,
                eventLink: calendarEvent.data.htmlLink
            });
        } catch (calendarError) {
            console.error('Google Calendar Error:', calendarError.message);
            
            const isAuthError = calendarError.message.includes('not configured') || 
                               calendarError.message.includes('Not authenticated');
            
            if (isAuthError) {
                console.log('Agendamento simulado (Google Calendar não conectado):', eventData);
                return res.status(200).json({
                    success: true,
                    message: 'Agendamento registrado com sucesso!',
                    note: 'Conecte seu Google Calendar em /admin.html para sincronização automática'
                });
            }
            
            return res.status(500).json({
                success: false,
                message: 'Erro ao criar evento no Google Calendar',
                error: calendarError.message
            });
        }

    } catch (error) {
        console.error('Erro ao processar agendamento:', error);
        return res.status(500).json({
            message: 'Erro ao processar agendamento',
            error: error.message
        });
    }
}
