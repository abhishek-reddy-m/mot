/**
 * Date utilities for consistent date handling throughout the booking application
 * 
 * BEST PRACTICES FOR DATE HANDLING IN THIS CODEBASE:
 * =================================================
 * 
 * 1. ALWAYS treat booking dates (check-in, check-out) as "calendar dates" not "moments in time"
 *    - "Dec 23" should always mean Dec 23, regardless of timezone
 * 
 * 2. Store and transfer dates as YYYY-MM-DD strings when possible
 *    - This avoids timezone conversion issues entirely
 * 
 * 3. When you need a Date object, ALWAYS use UTC noon:
 *    - new Date(dateString + 'T12:00:00Z')
 *    - This ensures the date never shifts due to timezone offsets
 * 
 * 4. When extracting date components, ALWAYS use UTC methods:
 *    - getUTCFullYear(), getUTCMonth(), getUTCDate()
 *    - NEVER use getFullYear(), getMonth(), getDate() for booking dates
 * 
 * 5. For display purposes, manually format or use the formatDateForDisplay function
 *    which handles the timezone-safe formatting
 * 
 * ALL HOTELS IN THIS SYSTEM ARE IN PST (UTC-8)
 */

// =============================================================================
// CORE DATE PARSING FUNCTIONS (Server & Client Safe)
// =============================================================================

/**
 * Parses a booking date string into a Date object at UTC noon.
 * This ensures the date never shifts regardless of the server's timezone.
 * 
 * @param dateString - A date string in YYYY-MM-DD format or ISO format
 * @returns A Date object set to noon UTC on that calendar date
 * 
 * @example
 * parseBookingDate('2024-12-23') // Returns Date representing Dec 23, 2024 at 12:00 UTC
 * parseBookingDate(new Date().toISOString()) // Extracts the date and returns noon UTC
 */
export function parseBookingDate(dateString: string | Date): Date {
  const normalized = toDateString(dateString);
  return new Date(normalized + 'T12:00:00Z');
}

/**
 * Converts any date input to a YYYY-MM-DD string.
 * This is the safest way to store and transfer booking dates.
 * 
 * @param date - A Date object, ISO string, or YYYY-MM-DD string
 * @returns A YYYY-MM-DD formatted string
 * 
 * @example
 * toDateString(new Date()) // '2024-12-23'
 * toDateString('2024-12-23T05:30:00.000Z') // '2024-12-23'
 * toDateString('2024-12-23') // '2024-12-23'
 */
export function toDateString(date: string | Date): string {
  if (date instanceof Date) {
    // Extract UTC date components to avoid timezone shifts
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  if (typeof date === 'string') {
    // If already in YYYY-MM-DD format, return as is
    const trimmed = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    
    // If it's an ISO string, extract the date portion
    if (trimmed.includes('T')) {
      // Parse as UTC noon to get the correct calendar date
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getUTCFullYear();
        const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
        const day = String(parsed.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    // Try to parse other formats
    const parsed = new Date(trimmed + 'T12:00:00Z');
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getUTCFullYear();
      const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
      const day = String(parsed.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  
  // Fallback to today's date
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = String(today.getUTCMonth() + 1).padStart(2, '0');
  const day = String(today.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates an array of date strings (YYYY-MM-DD) for a range.
 * Useful for availability checking where we need to check each night.
 * 
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (exclusive, like checkout date)
 * @returns Array of date strings for each night in the range
 * 
 * @example
 * getDateRange('2024-12-23', '2024-12-25') // ['2024-12-23', '2024-12-24']
 */
export function getDateRange(startDate: string | Date, endDate: string | Date): string[] {
  const startStr = toDateString(startDate);
  const endStr = toDateString(endDate);
  
  const start = parseBookingDate(startStr);
  const end = parseBookingDate(endStr);
  
  const dates: string[] = [];
  const current = new Date(start);
  
  while (current < end) {
    dates.push(toDateString(current));
    // Add one day in UTC
    current.setUTCDate(current.getUTCDate() + 1);
  }
  
  return dates;
}

/**
 * Adds days to a date string.
 * 
 * @param dateString - Starting date
 * @param days - Number of days to add (can be negative)
 * @returns New date string
 */
export function addDays(dateString: string | Date, days: number): string {
  const date = parseBookingDate(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString(date);
}

/**
 * Compares two date strings.
 * 
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
export function compareDates(a: string | Date, b: string | Date): number {
  const dateA = parseBookingDate(a);
  const dateB = parseBookingDate(b);
  return dateA.getTime() - dateB.getTime();
}

/**
 * Checks if date a is before date b.
 */
export function isBefore(a: string | Date, b: string | Date): boolean {
  return compareDates(a, b) < 0;
}

/**
 * Checks if date a is after date b.
 */
export function isAfter(a: string | Date, b: string | Date): boolean {
  return compareDates(a, b) > 0;
}

/**
 * Checks if two dates are the same calendar day.
 */
export function isSameDay(a: string | Date, b: string | Date): boolean {
  return toDateString(a) === toDateString(b);
}

// =============================================================================
// BACKWARD COMPATIBLE FUNCTION (maintains existing API)
// =============================================================================

/**
 * Normalizes a date string to YYYY-MM-DD format using noon UTC
 * to avoid timezone inconsistencies
 * 
 * @param dateString - A string representing a date in any format
 * @param fallbackOffset - Days to add to today for fallback (default: 0)
 * @returns A normalized YYYY-MM-DD date string
 * 
 * @deprecated Use toDateString() for new code
 */
export function normalizeDate(dateString: string, fallbackOffset = 0): string {
  // Handle null or undefined input
  if (!dateString) {
    return addDays(new Date().toISOString(), fallbackOffset);
  }
  
  try {
    return toDateString(dateString);
  } catch (error) {
    console.error("Error normalizing date:", error);
    return addDays(new Date().toISOString(), fallbackOffset);
  }
}

/**
 * Formats a date string for display without timezone issues
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @param format - Format type ('short' | 'long')
 * @returns Formatted date string
 */
export function formatDateForDisplay(dateString: string, format: 'short' | 'long' | 'compact' = 'short'): string {
  try {
    const normalized = normalizeDate(dateString);
    const [year, month, day] = normalized.split('-').map(Number);
    
    // Create date using local timezone but with explicit components to avoid shifting
    const date = new Date(year, month - 1, day); // month is 0-indexed
    
    if (format === 'long') {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    if (format === 'compact') {
      return date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric'
      });
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Calculates the number of nights between two date strings
 * 
 * @param checkIn - Check-in date string
 * @param checkOut - Check-out date string
 * @returns Number of nights (minimum 1)
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  try {
    // Use the timezone-safe date range function
    const nights = getDateRange(checkIn, checkOut);
    return Math.max(1, nights.length);
  } catch (error) {
    console.error('Error calculating nights:', error);
    return 1; // Fallback to 1 night
  }
}

/**
 * Stores booking search parameters consistently in session storage
 * This function is used across the site to maintain consistent search state
 * 
 * @param params - The search parameters to store
 */
export function storeBookingSearch(params: {
  checkIn: string;
  checkOut: string;
  guests: string | number;
  propertyId?: string;
}): void {
  try {
    // First clear any existing search data to prevent stale state
    sessionStorage.removeItem('lastSearch');
    
    // Format the parameters consistently
    const formattedParams = {
      checkIn: normalizeDate(params.checkIn) || '',
      checkOut: normalizeDate(params.checkOut, 1) || '',
      guests: typeof params.guests === 'string' ? params.guests : params.guests.toString(),
      propertyId: params.propertyId || ''
    };
    
    // Log what we're storing for debugging
    console.log('Storing search parameters:', formattedParams);
    
    // Store in session storage
    sessionStorage.setItem('lastSearch', JSON.stringify(formattedParams));
  } catch (error) {
    console.error('Error storing search parameters:', error);
  }
}

/**
 * Retrieves booking search parameters from session storage
 * 
 * @returns The stored search parameters or default values
 */
export function getBookingSearch(): {
  checkIn: string;
  checkOut: string;
  guests: string;
  propertyId: string;
} {
  const defaultSearch = {
    checkIn: normalizeDate(new Date().toISOString()),
    checkOut: normalizeDate(new Date().toISOString(), 1),
    guests: '1',
    propertyId: ''
  };
  
  try {
    const stored = sessionStorage.getItem('lastSearch');
    if (!stored) return defaultSearch;
    
    const parsed = JSON.parse(stored);
    return {
      checkIn: normalizeDate(parsed.checkIn),
      checkOut: normalizeDate(parsed.checkOut, 1),
      guests: parsed.guests?.toString() || '1',
      propertyId: parsed.propertyId || ''
    };
  } catch (error) {
    console.error('Error retrieving booking search:', error);
    return defaultSearch;
  }
}
