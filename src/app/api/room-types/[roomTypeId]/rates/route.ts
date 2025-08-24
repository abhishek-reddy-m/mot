import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format, eachDayOfInterval } from 'date-fns';
import { Prisma } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomTypeId: string }> }
) {
  try {
    // Await params before accessing properties
    const { roomTypeId } = await params;

    // Get search parameters
    const searchParams = request.nextUrl.searchParams;
    const checkInParam = searchParams.get('checkIn');
    const checkOutParam = searchParams.get('checkOut');
    
    // Process check-in date if provided
    let checkIn: Date | null = null;
    if (checkInParam) {
      // Remove any cache-busting query params that might have been added
      const cleanCheckInParam = checkInParam.split('?')[0].trim();
      
      // Ensure the date is in YYYY-MM-DD format and set to noon UTC to avoid timezone issues
      checkIn = new Date(`${cleanCheckInParam}T12:00:00Z`);
      
      // Validate date is valid
      if (isNaN(checkIn.getTime())) {
        console.error(`Invalid check-in date format: ${cleanCheckInParam}`);
        checkIn = null;
      } else {
        console.log(`Using check-in date: ${cleanCheckInParam} -> ${checkIn.toISOString()}`);
      }
    } else {
      console.error('No check-in date provided');
    }
    
    // Process check-out date if provided
    let checkOut: Date | null = null;
    if (checkOutParam) {
      // Ensure the date is in YYYY-MM-DD format and set to noon UTC to avoid timezone issues
      const checkOutStr = checkOutParam.trim();
      checkOut = new Date(`${checkOutStr}T12:00:00Z`);
      
      // Validate date is valid
      if (isNaN(checkOut.getTime())) {
        console.error(`Invalid check-out date format: ${checkOutParam}`);
        checkOut = null;
      } else {
        console.log(`Using check-out date: ${checkOutStr} -> ${checkOut.toISOString()}`);
      }
    } else {
      console.error('No check-out date provided');
    }
    
    // If dates are valid, validate them
    if (checkIn && checkOut) {
      // If check-in is same as check-out, add one day to check-out
      if (checkIn.toDateString() === checkOut.toDateString()) {
        console.log('Check-in and check-out dates are the same, adding one day to check-out');
        checkOut = new Date(checkOut);
        checkOut.setDate(checkOut.getDate() + 1);
      }
      
      // Now check if check-in is still after check-out (shouldn't happen with the fix above)
      if (checkIn > checkOut) {
        console.error(`Invalid date range: checkIn (${checkIn.toISOString()}) is after checkOut (${checkOut.toISOString()})`);
        return NextResponse.json(
          { error: 'Check-in date must be before check-out date.' },
          { status: 400 }
        );
      }
    } else {
      console.error('Missing check-in or check-out date');
      return NextResponse.json(
        { error: 'Valid check-in and check-out dates are required.' },
        { status: 400 }
      );
    }

    // Get the room type
    const roomType = await prisma.roomType.findUnique({
      where: {
        id: roomTypeId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        basePrice: true,
      }
    });

    if (!roomType) {
      return NextResponse.json(
        { error: 'Room type not found' },
        { status: 404 }
      );
    }

    // Get all dates in the stay (excluding the check-out date)
    const stayDates = eachDayOfInterval({
      start: new Date(checkIn),
      end: new Date(new Date(checkOut).setDate(checkOut.getDate() - 1))
    });
    
    console.log(`Stay dates (${stayDates.length} nights):`, 
      stayDates.map(d => format(d, 'yyyy-MM-dd')));

    // Format dates for querying
    const formattedDates = stayDates.map(date => format(date, 'yyyy-MM-dd'));
    console.log(`Looking for rates for room type ${roomTypeId} for dates:`, formattedDates);
    
    // Direct SQL query to debug what's in the database
    const allRatesForRoomType = await prisma.$queryRaw`
      SELECT date, price, 
        date::date as date_as_date,
        TO_CHAR(date, 'YYYY-MM-DD') as date_as_string
      FROM room_type_rates 
      WHERE "roomTypeId" = ${roomTypeId}
      ORDER BY date
      LIMIT 50;
    `;
    
    console.log(`All rates in database for room type ${roomTypeId} (first 50):`, 
      (allRatesForRoomType as any[]).map(r => ({
        date: r.date instanceof Date ? format(r.date, 'yyyy-MM-dd') : String(r.date),
        price: r.price.toString(),
        date_as_date: r.date_as_date,
        date_as_string: r.date_as_string
      }))
    );
    
    // Get any custom rates for the stay dates using a raw query
    // Convert date strings to PostgreSQL-friendly format
    const formattedDateStrings = formattedDates.map(d => `'${d}'::date`).join(',');
    console.log(`SQL dates to check: ${formattedDateStrings}`);
    
    // Direct test for 08/28/2025 (the date that's causing issues)
    const testDate = '2025-08-28';
    const specificDateRates = await prisma.$queryRaw`
      SELECT 
        date, 
        price,
        TO_CHAR(date, 'YYYY-MM-DD') as date_str 
      FROM room_type_rates 
      WHERE "roomTypeId" = ${roomTypeId}
      AND TO_CHAR(date, 'YYYY-MM-DD') = ${testDate}
    `;
    
    console.log(`Specific test for ${testDate}:`, 
      (specificDateRates as any[]).map(rate => ({
        date: rate.date instanceof Date 
          ? format(rate.date, 'yyyy-MM-dd') 
          : String(rate.date),
        date_str: rate.date_str,
        price: rate.price.toString()
      }))
    );
    
    // For all dates (not just single dates), always include the problem date 2025-08-28
    const dateList = [...formattedDates];
    if (!dateList.includes('2025-08-28') && (
        (formattedDates.includes('2025-08-27') && formattedDates.includes('2025-08-29')) ||
        formattedDates.includes('2025-08-28')
    )) {
      console.log('Ensuring 2025-08-28 is included in the query');
      dateList.push('2025-08-28');
    }
    
    // For all dates (not just single dates), let's use TO_CHAR to ensure consistent string formatting
    const customRatesAll = await prisma.$queryRaw`
      SELECT 
        date, 
        price,
        TO_CHAR(date, 'YYYY-MM-DD') as date_str 
      FROM room_type_rates 
      WHERE "roomTypeId" = ${roomTypeId}
      AND TO_CHAR(date, 'YYYY-MM-DD') IN (${Prisma.raw(dateList.map(d => `'${d}'`).join(','))})
    `;

    console.log(`Found ${(customRatesAll as any[]).length} custom rates with TO_CHAR approach:`, 
      (customRatesAll as any[]).map(rate => ({
        date: rate.date instanceof Date 
          ? format(rate.date, 'yyyy-MM-dd') 
          : String(rate.date),
        date_str: rate.date_str,
        price: rate.price.toString()
      }))
    );
    
    // Create a map of date to price
    const rateMap = new Map<string, number>();
    
    // Add all custom rates to the map
    (customRatesAll as any[]).forEach((rate: any) => {
      // ALWAYS use date_str from the TO_CHAR SQL function for consistent formatting
      const dateStr = rate.date_str;
      
      const priceRaw = rate.price.toString();
      const price = parseFloat(priceRaw);
      rateMap.set(dateStr, price);
      console.log(`Adding rate to map for ${dateStr}: $${price} (raw: ${priceRaw}, type: ${typeof rate.price})`);
      
      // Special log for our problem date
      if (dateStr === '2025-08-28') {
        console.log(`*** FOUND RATE FOR 2025-08-28: $${price} ***`);
      }
    });

    // Create the response with rates for each day
    const dailyRates = stayDates.map(date => {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const hasCustomRate = rateMap.has(formattedDate);
      const price = hasCustomRate 
        ? rateMap.get(formattedDate) 
        : parseFloat(roomType.basePrice.toString());
      
      console.log(`Daily rate for ${formattedDate}: ${hasCustomRate ? 'CUSTOM' : 'BASE'} = $${price}`);
      if (!hasCustomRate) {
        console.log(`No custom rate found for ${formattedDate}. Keys in rateMap:`, 
          Array.from(rateMap.keys()));
      }
      
      return {
        date: formattedDate,
        price,
        isCustomRate: hasCustomRate
      };
    });

    // Log the final response data
    console.log('Final response data:', {
      roomTypeId: roomType.id,
      checkIn: format(checkIn, 'yyyy-MM-dd'),
      checkOut: format(checkOut, 'yyyy-MM-dd'),
      dailyRates: dailyRates.map(r => `${r.date}: $${r.price} (${r.isCustomRate ? 'custom' : 'base'})`)
    });

    return NextResponse.json({
      roomTypeId: roomType.id,
      roomTypeName: roomType.name,
      basePrice: parseFloat(roomType.basePrice.toString()),
      checkIn: format(checkIn, 'yyyy-MM-dd'),
      checkOut: format(checkOut, 'yyyy-MM-dd'),
      dailyRates
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (error) {
    console.error('Error fetching room type rates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
