// This is a helper function to calculate prices for the booking system

/**
 * Precisely adds two numbers with 2 decimal places of precision
 */
function preciseAdd(a: number, b: number): number {
  return parseFloat((a + b).toFixed(2));
}

/**
 * Calculates total price for a booking
 * 
 * @param dates Array of dates in the booking
 * @param rates Map of dates to custom rates
 * @param basePrice Base price to use when no custom rate exists
 * @param rooms Number of rooms being booked
 */
function calculatePrice(
  dates: string[],
  rates: Map<string, number>,
  basePrice: number,
  rooms: number
): number {
  // Start with zero
  let total = 0;
  
  // Calculate price for each date
  dates.forEach(date => {
    // Use custom rate if available, otherwise use base price
    const dayRate = rates.has(date) ? rates.get(date)! : basePrice;
    
    // Add to total with precise calculation
    total = preciseAdd(total, dayRate);
    console.log(`Date: ${date}, Rate: $${dayRate.toFixed(2)}, Running total: $${total.toFixed(2)}`);
  });
  
  // Multiply by number of rooms
  return parseFloat((total * rooms).toFixed(2));
}

// Example usage
const dates = ['2025-08-27', '2025-08-28'];
const rates = new Map([
  ['2025-08-27', 99.94],
  ['2025-08-28', 100.00]
]);
const basePrice = 99.94;
const rooms = 1;

const totalPrice = calculatePrice(dates, rates, basePrice, rooms);
console.log(`Total price: $${totalPrice.toFixed(2)}`);
// Should print: Total price: $199.94
