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
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { date, service } = req.query;

        if (!date || !service) {
            return res.status(400).json({ message: 'Data e serviço são obrigatórios' });
        }

        const serviceDuration = getServiceDuration(service);
        
        const startOfDay = createLisbonDate(date, '00:00');
        const endOfDay = createLisbonDate(date, '23:59');

        try {
            const calendar = await getCalendarClient(req);
            
            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: startOfDay.toISOString(),
                timeMax: endOfDay.toISOString(),
                timeZone: 'Europe/Lisbon',
                singleEvents: true,
                orderBy: 'startTime'
            });

            const events = response.data.items || [];
            const allTimes = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
            const occupiedTimes = [];

            allTimes.forEach(timeSlot => {
                const slotStart = createLisbonDate(date, timeSlot);
                const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);

                const hasConflict = events.some(event => {
                    if (!event.start || !event.end) return false;
                    
                    const eventStart = new Date(event.start.dateTime || event.start.date);
                    const eventEnd = new Date(event.end.dateTime || event.end.date);

                    return (slotStart < eventEnd && slotEnd > eventStart);
                });

                if (hasConflict) {
                    occupiedTimes.push(timeSlot);
                }
            });

            return res.status(200).json({
                success: true,
                date,
                service,
                serviceDuration,
                occupiedTimes,
                availableTimes: allTimes.filter(time => !occupiedTimes.includes(time))
            });

        } catch (calendarError) {
            console.error('Erro ao buscar eventos do Google Calendar:', calendarError);
            
            const isAuthError = calendarError.message.includes('not configured') || 
                               calendarError.message.includes('Not authenticated');
            
            return res.status(200).json({
                success: false,
                date,
                service,
                error: isAuthError ? 'Google Calendar não conectado' : 'Erro ao buscar horários',
                authRequired: isAuthError,
                details: calendarError.message
            });
        }

    } catch (error) {
        console.error('Erro ao processar requisição:', error);
        return res.status(500).json({
            message: 'Erro ao buscar horários disponíveis',
            error: error.message
        });
    }
}
