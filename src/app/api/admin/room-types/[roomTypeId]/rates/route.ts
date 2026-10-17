import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import crypto from 'crypto';
import { scheduleRateSync } from '@/lib/channel-manager/sync';

// Define the RoomTypeRate interface
interface RoomTypeRate {
  id: string;
  roomTypeId: string;
  date: Date;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/admin/room-types/[roomTypeId]/rates
export async function GET(
  request: NextRequest,
  { params }: { params: { roomTypeId: string } }
) {
  try {
    const session = await auth();
    
    // Check authentication
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { roomTypeId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Validate dates
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }
    
    // Query rates for the room type within the date range using raw SQL
    try {
      // Avoid timezone conversion issues by using dates directly if they're already in YYYY-MM-DD format
      let formattedStartDate: string;
      let formattedEndDate: string;
      
      if (startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        formattedStartDate = startDate;
      } else {
        formattedStartDate = format(new Date(startDate), 'yyyy-MM-dd');
      }
      
      if (endDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        formattedEndDate = endDate;
      } else {
        formattedEndDate = format(new Date(endDate), 'yyyy-MM-dd');
      }
      
      console.log(`Fetching rates for room type ${roomTypeId} from ${formattedStartDate} to ${formattedEndDate}`);
      console.log(`🗓️ Query date range: ${formattedStartDate} to ${formattedEndDate}`);
      console.log(`📥 Original params: startDate=${startDate}, endDate=${endDate}`);
      
      // Use TO_CHAR to format dates directly in the query to avoid timezone issues
      const rates = await prisma.$queryRaw`
        SELECT 
          id, 
          "roomTypeId", 
          TO_CHAR(date, 'YYYY-MM-DD') as date_str,
          date as original_date,
          price, 
          "createdAt", 
          "updatedAt"
        FROM "room_type_rates" 
        WHERE "roomTypeId" = ${roomTypeId}
        AND "date" >= ${formattedStartDate}::date
        AND "date" <= ${formattedEndDate}::date
        ORDER BY "date" ASC
      `;
      
      console.log(`📊 Raw query returned ${Array.isArray(rates) ? rates.length : 0} rates`);
      
      // Log the results for debugging
      console.log(`Found ${Array.isArray(rates) ? rates.length : 0} rates`);
      
      // Use the date_str from the query to avoid timezone conversion issues
      const formattedRates = Array.isArray(rates) ? rates.map((rate: any) => ({
        id: rate.id,
        roomTypeId: rate.roomTypeId,
        date: rate.date_str, // Use the formatted string from SQL
        price: parseFloat(rate.price.toString()),
        createdAt: rate.createdAt,
        updatedAt: rate.updatedAt
      })) : [];
      
      console.log('Formatted rates sample:', formattedRates.slice(0, 3));
      
      // Log specific test dates
      const testRates = formattedRates.filter((rate: any) => 
        rate.date === '2025-08-27' || rate.date === '2025-08-28' || rate.date === '2025-08-31'
      );
      console.log('🎯 API returning for test dates:', testRates);
      
      // Check specifically for Aug 31st
      const aug31Rate = formattedRates.find((rate: any) => rate.date === '2025-08-31');
      if (aug31Rate) {
        console.log('✅ Aug 31st included in API response:', aug31Rate);
      } else {
        console.log('❌ Aug 31st NOT in API response');
        console.log('📅 All dates returned:', formattedRates.map((r: any) => r.date).sort());
      }
      
      return NextResponse.json(formattedRates);
    } catch (queryError) {
      console.error('Database query error:', queryError);
      
      // Return empty array as a fallback - the room may not have any rates yet
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error fetching room type rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room type rates' },
      { status: 500 }
    );
  }
}

// POST /api/admin/room-types/[roomTypeId]/rates
export async function POST(
  request: NextRequest,
  { params }: { params: { roomTypeId: string } }
) {
  try {
    const session = await auth();
    
    // Check authentication
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { roomTypeId } = await params;
    const body = await request.json();
    const { rates } = body;
    
    if (!rates || !Array.isArray(rates)) {
      return NextResponse.json(
        { error: 'Rates data is required and must be an array' },
        { status: 400 }
      );
    }
    
    // Process each rate in the array
    let successCount = 0;
    const processedDates = new Set();
    
    for (const rate of rates) {
      try {
        const { date, price } = rate;
        if (!date || price === undefined || price === null) {
          continue; // Skip invalid entries
        }
        
        // Ensure the date is properly formatted - avoid timezone conversion if already in correct format
        let formattedDate: string;
        
        if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Date is already in YYYY-MM-DD format, use it directly
          formattedDate = date;
          console.log(`📅 Using date as-is: ${formattedDate}`);
        } else {
          // Try to parse and format the date
          try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
              console.error(`Invalid date format: ${date}`);
              continue;
            }
            formattedDate = format(dateObj, 'yyyy-MM-dd');
            console.log(`📅 Converted date from ${date} to ${formattedDate}`);
          } catch (dateError) {
            console.error(`Error parsing date: ${date}`, dateError);
            continue;
          }
        }
        
        console.log(`🔄 Processing rate for date: ${formattedDate} with price $${price}`);
        
        // Skip duplicates if somehow the client sends the same date multiple times
        if (processedDates.has(formattedDate)) {
          console.log(`Skipping duplicate date: ${formattedDate}`);
          continue;
        }
        processedDates.add(formattedDate);
        
        // Validate price
        const numericPrice = parseFloat(price.toString());
        if (isNaN(numericPrice) || numericPrice < 0) {
          continue; // Skip invalid price
        }
        
        // Check if a rate already exists for this date using raw query
        const existingRatesResult = await prisma.$queryRaw`
          SELECT id FROM "room_type_rates" 
          WHERE "roomTypeId" = ${roomTypeId}
          AND "date" = ${formattedDate}::date
        `;
        
        // Convert result to array and check if we have any matches
        const existingRates = Array.isArray(existingRatesResult) ? existingRatesResult : [];
        const existingRate = existingRates.length > 0 ? existingRates[0] : null;
        
        console.log(`Date ${formattedDate}: Existing rate ${existingRate ? 'found' : 'not found'}`);
        
        if (existingRate) {
          // Update existing rate using raw query
          await prisma.$executeRaw`
            UPDATE "room_type_rates"
            SET "price" = ${numericPrice}, "updatedAt" = NOW()
            WHERE "id" = ${existingRate.id}
          `;
          console.log(`Updated rate for ${formattedDate} to $${numericPrice}`);
          successCount++;
        } else {
          // Create new rate using raw query
          const uuid = crypto.randomUUID();
          await prisma.$executeRaw`
            INSERT INTO "room_type_rates" ("id", "roomTypeId", "date", "price", "createdAt", "updatedAt")
            VALUES (${uuid}, ${roomTypeId}, ${formattedDate}::date, ${numericPrice}, NOW(), NOW())
          `;
          console.log(`Created new rate for ${formattedDate} at $${numericPrice}`);
          successCount++;
        }
      } catch (error) {
        console.error('Error processing rate:', error, rate);
      }
    }
    
    // Push the new rates to connected OTA channels (Expedia, Booking.com)
    scheduleRateSync(roomTypeId, Array.from(processedDates) as string[]);
    
    return NextResponse.json({ 
      success: true, 
      count: successCount,
      message: `Successfully processed ${successCount} rates for room type ${roomTypeId}`
    });
  } catch (error) {
    console.error('Error saving room type rates:', error);
    return NextResponse.json(
      { error: 'Failed to save room type rates' },
      { status: 500 }
    );
  }
}
