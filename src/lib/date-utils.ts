"use client";

/**
 * Date utilities for consistent date handling throughout the booking application
 */

/**
 * Normalizes a date string to YYYY-MM-DD format using noon UTC
 * to avoid timezone inconsistencies
 * 
 * @param dateString - A string representing a date in any format
 * @param fallbackOffset - Days to add to today for fallback (default: 0)
 * @returns A normalized YYYY-MM-DD date string
 */
export function normalizeDate(dateString: string, fallbackOffset = 0): string {
  // If already in YYYY-MM-DD format, return as is
  if (dateString?.trim().match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString.trim();
  }
  
  try {
    // Parse with noon UTC to avoid timezone issues
    const cleanDateString = dateString?.split('?')[0] || '';
    const date = new Date(`${cleanDateString}T12:00:00Z`);
    
    // Check if date is valid
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (error) {
    console.error("Error normalizing date:", error);
  }
  
  // Fallback to today + offset if invalid
  const fallbackDate = new Date();
  fallbackDate.setDate(fallbackDate.getDate() + fallbackOffset);
  return fallbackDate.toISOString().split('T')[0];
}

/**
 * Formats a date string for display without timezone issues
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @param format - Format type ('short' | 'long')
 * @returns Formatted date string
 */
export function formatDateForDisplay(dateString: string, format: 'short' | 'long' = 'short'): string {
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
  const normalizedCheckIn = normalizeDate(checkIn);
  const normalizedCheckOut = normalizeDate(checkOut, 1); // Default to tomorrow if invalid
  
  const startDate = new Date(`${normalizedCheckIn}T12:00:00Z`);
  const endDate = new Date(`${normalizedCheckOut}T12:00:00Z`);
  
  // Calculate difference in days, minimum 1 night
  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
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
