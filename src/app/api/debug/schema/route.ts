import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Debug endpoint for checking database schema and connectivity
 * Useful for diagnosing issues in production
 */
export async function GET() {
  try {
    // Check basic connectivity
    const testConnection = await prisma.$queryRaw`SELECT 1 as connected`;
    
    // Object to collect all results
    const results: Record<string, any> = {
      connection: testConnection,
      schema: {},
      tables: {},
      columns: {}
    };
    
    // Get database version
    try {
      const versionInfo = await prisma.$queryRaw`SELECT version()`;
      results.version = versionInfo;
    } catch (error: any) {
      results.version = { 
        error: error?.message || 'Unknown error fetching database version' 
      };
    }
    
    // Check important tables
    const tablesToCheck = [
      'users', 'properties', 'property_photos', 'room_types',
      'room_type_photos', 'bookings', 'room_availabilities'
    ];
    
    for (const table of tablesToCheck) {
      try {
        // Count rows in each table
        const query = `SELECT COUNT(*) as count FROM "${table}"`;
        const countResult = await prisma.$queryRawUnsafe(query);
        results.tables[table] = countResult;
        
        // Get column info for this table
        const columnQuery = `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
        `;
        
        const columnInfo = await prisma.$queryRawUnsafe(columnQuery, table);
        results.columns[table] = columnInfo;
      } catch (error: any) {
        results.tables[table] = { 
          error: error?.message || `Unknown error checking table ${table}` 
        };
      }
    }
    
    // Check for specific schema issues that have caused problems
    try {
      const roomTypesColumns = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_name = 'room_types'
      `;
      
      // Check if availableRooms exists
      const hasAvailableRooms = Array.isArray(roomTypesColumns) && 
        roomTypesColumns.some((col: any) => col.column_name === 'availableRooms');
      
      results.schema.hasAvailableRoomsColumn = hasAvailableRooms;
    } catch (error: any) {
      results.schema.checkError = error?.message || 'Unknown error checking room_types schema';
    }
    
    // Return all diagnostic info
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      results
    });
  } catch (error: any) {
    console.error('Database diagnostic error:', error);
    return NextResponse.json({
      status: 'error',
      message: error?.message || 'Unknown database diagnostic error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    }, { status: 500 });
  }
}
