import { supabase } from '../config/supabase';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  color: string;
  event_date: string; // YYYY-MM-DD
  created_at: string;
}

export async function getEventsForMonth(userId: string, year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('created_at', { ascending: true });

  return { data: (data as CalendarEvent[]) || [], error };
}

export async function createCalendarEvent(
  userId: string,
  title: string,
  eventDate: string,
  color: string,
  description?: string
) {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: userId,
      title,
      event_date: eventDate,
      color,
      description: description || null,
    })
    .select()
    .single();

  return { data: data as CalendarEvent | null, error };
}

export async function deleteCalendarEvent(eventId: string) {
  const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
  return { error };
}
