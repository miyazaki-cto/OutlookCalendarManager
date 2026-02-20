
import { CalendarEvent } from "../types/calendar";

export interface SchedulerOptions {
  durationMinutes: number;
  workHourStart: number; // e.g., 9
  workHourEnd: number;   // e.g., 18
  excludeWeekends: boolean;
}

export interface TimeSlot {
  start: Date;
  end: Date;
}

/**
 * Finds common free time slots for selected members.
 * 
 * @param events All loaded events.
 * @param memberEmails List of emails of members to check.
 * @param searchStart Start of the search range.
 * @param searchEnd End of the search range.
 * @param options Scheduler options.
 * @returns List of available time slots.
 */
export const findCommonFreeTime = (
  events: CalendarEvent[],
  memberEmails: string[],
  searchStart: Date,
  searchEnd: Date,
  options: SchedulerOptions
): TimeSlot[] => {
  if (memberEmails.length === 0) return [];

  // Filter events relevant to the selected members and time range
  const relevantEvents = events.filter(event => 
    memberEmails.includes(event.ownerEmail || '') &&
    new Date(event.end.dateTime) > searchStart &&
    new Date(event.start.dateTime) < searchEnd
  );

  // Create a combined "busy" timeline
  const busySlots: TimeSlot[] = relevantEvents.map(e => ({
    start: new Date(e.start.dateTime),
    end: new Date(e.end.dateTime)
  }));

  // Sort by start time
  busySlots.sort((a, b) => a.start.getTime() - b.start.getTime());

  // Merge overlapping busy slots
  const mergedBusySlots: TimeSlot[] = [];
  if (busySlots.length > 0) {
    let current = busySlots[0];
    for (let i = 1; i < busySlots.length; i++) {
        const next = busySlots[i];
        if (current.end >= next.start) {
            // Overlap or adjacent, merge
            current.end = new Date(Math.max(current.end.getTime(), next.end.getTime()));
        } else {
            mergedBusySlots.push(current);
            current = next;
        }
    }
    mergedBusySlots.push(current);
  }

  // Find gaps (free time)
  const freeSlots: TimeSlot[] = [];
  let pointer = new Date(searchStart);

  // Add a "dummy" busy slot at the end to close the loop
  const slotsToCheck = [...mergedBusySlots, { start: searchEnd, end: searchEnd }];

  for (const busy of slotsToCheck) {
      if (pointer < busy.start) {
          // Found a gap
          let gapStart = new Date(pointer);
          let gapEnd = new Date(busy.start);
          
          // Gap might span multiple days or be outside working hours.
          // We need to slice this gap into valid slots.
          const validSlots = sliceGapIntoWorkingHours(gapStart, gapEnd, options);
          freeSlots.push(...validSlots);
      }
      pointer = new Date(Math.max(pointer.getTime(), busy.end.getTime()));
  }

  return freeSlots;
};

/**
 * Slices a continuous gap into valid working hour slots.
 */
const sliceGapIntoWorkingHours = (gapStart: Date, gapEnd: Date, options: SchedulerOptions): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const minDurationMs = options.durationMinutes * 60 * 1000;

    let currentDay = new Date(gapStart);
    currentDay.setHours(0, 0, 0, 0); // Start of the "day" of the gap

    const gapEndParams = {
        year: gapEnd.getFullYear(),
        month: gapEnd.getMonth(),
        date: gapEnd.getDate()
    };
    
    // Iterate through days covered by the gap
    while (true) {
        // Check if weekend
        const dayOfWeek = currentDay.getDay();

        if (options.excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
             // Skip weekend
             currentDay.setDate(currentDay.getDate() + 1);
             if (currentDay.getTime() > gapEnd.getTime()) break;
             continue; 
        }

        // Define working hours for this day
        const workStart = new Date(currentDay);
        workStart.setHours(options.workHourStart, 0, 0, 0);
        
        const workEnd = new Date(currentDay);
        workEnd.setHours(options.workHourEnd, 0, 0, 0);
        
        // Determine the overlap between the gap and today's working hours
        const effectiveStart = new Date(Math.max(gapStart.getTime(), workStart.getTime()));
        const effectiveEnd = new Date(Math.min(gapEnd.getTime(), workEnd.getTime()));

        if (effectiveEnd.getTime() - effectiveStart.getTime() >= minDurationMs) {
            // We have a valid slot, but we might want to return multiple slots if the duration is long? 
            // For now, let's just return the whole block. The UI can handle "picking" a time.
            // Or, let's split it into chunks? 
            // Better to return the range, and let the user pick the start time in the UI logic if needed.
            // But wait, the prompt asked to "extract common free time". listing available "starts" is better.
            
            // Let's generate slots: e.g. 10:00-11:00, 10:30-11:30...
            // For simplicity in this logic, we return the CONTINUOUS BLOCK. 
            // The UI will be responsible for displaying "You can start at 10:00, 10:30..."
            slots.push({ start: effectiveStart, end: effectiveEnd });
        }

        // Move to next day
        currentDay.setDate(currentDay.getDate() + 1);
        
        if (currentDay.getTime() > gapEnd.getTime()) break;
         // Safety check for infinite loops or long ranges
        if (slots.length > 100) break; 
    }

    return slots;
};
