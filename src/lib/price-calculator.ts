import { format, eachDayOfInterval } from 'date-fns';
import { prisma } from './prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

// Define interfaces for our models
interface RoomTypeRate {
  id: string;
  roomTypeId: string;
  date: Date;
  price: Decimal;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Calculate the total price for a booking based on daily rates
 * 
 * @param roomTypeId The ID of the room type
 * @param checkIn Check-in date
 * @param checkOut Check-out date
 * @param rooms Number of rooms
 * @returns The total price for the stay
 */
export async function calculateBookingPrice(
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date,
  rooms: number = 1
): Promise<number> {
  try {
    // Get the base price for the room type
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      select: { basePrice: true }
    });

    if (!roomType) {
      throw new Error('Room type not found');
    }

    const basePrice = parseFloat(roomType.basePrice.toString());

    // Get all dates in the stay (excluding the check-out date)
    const stayDates = eachDayOfInterval({
      start: new Date(checkIn),
      end: new Date(new Date(checkOut).setDate(checkOut.getDate() - 1))
    });

    // Format dates for querying
    const formattedDates = stayDates.map(date => format(date, 'yyyy-MM-dd'));
    
    // Get any custom rates for the stay dates using parameterized query
    const customRates = await prisma.$queryRaw<RoomTypeRate[]>`
      SELECT * FROM room_type_rates 
      WHERE "roomTypeId" = ${roomTypeId} 
      AND date IN (${Prisma.join(formattedDates)})
    `;

    // Create a map of date to price
    const rateMap = new Map<string, number>();
    
    // Add all custom rates to the map
    customRates.forEach((rate: RoomTypeRate) => {
      rateMap.set(
        format(new Date(rate.date), 'yyyy-MM-dd'),
        parseFloat(rate.price.toString())
      );
    });

    console.log(`Found ${customRates.length} custom rates for booking`);
    
    // Calculate total price
    let totalPrice = 0;
    let datesWithoutRates: string[] = [];

    // For each date in the stay, use the custom rate if available, otherwise use base price
    stayDates.forEach(date => {
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      if (rateMap.has(formattedDate)) {
        const dayRate = rateMap.get(formattedDate)!;
        totalPrice += dayRate;
        console.log(`${formattedDate}: Using custom rate $${dayRate}`);
      } else {
        totalPrice += basePrice;
        datesWithoutRates.push(formattedDate);
        console.log(`${formattedDate}: Using base price $${basePrice}`);
      }
    });

    // Log warning if any dates don't have rates
    if (datesWithoutRates.length > 0) {
      console.warn(`Warning: ${datesWithoutRates.length} dates don't have custom rates and are using base price:`, datesWithoutRates);
    }

    // Multiply by number of rooms
    totalPrice *= rooms;
    
    console.log(`Total price for booking: $${totalPrice} (${rooms} rooms × ${stayDates.length} nights)`);

    return totalPrice;
  } catch (error) {
    console.error('Error calculating booking price:', error);
    throw error;
  }
}
