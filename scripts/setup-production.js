#!/usr/bin/env node

/**
 * Production setup script for Render deployment
 * This script handles database migration baseline and Prisma client generation
 */

const { execSync } = require('child_process');

console.log('🚀 Starting production setup...');

try {
  // Generate Prisma client first
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Check migration status
  console.log('🔍 Checking migration status...');
  try {
    execSync('npx prisma migrate status', { stdio: 'inherit' });
  } catch (error) {
    if (error.message.includes('P3005') || error.message.includes('database schema is not empty')) {
      console.log('📊 Database exists but migrations not tracked. Resolving...');
      
      // Mark migrations as applied since database exists
      try {
        execSync('npx prisma migrate resolve --applied 20250715074634_init', { stdio: 'inherit' });
        console.log('✅ Marked initial migration as applied');
      } catch (e) {
        console.log('ℹ️ Initial migration already resolved or not needed');
      }
      
      try {
        execSync('npx prisma migrate resolve --applied 20250719000001_add_room_availability', { stdio: 'inherit' });
        console.log('✅ Marked room availability migration as applied');
      } catch (e) {
        console.log('ℹ️ Room availability migration already resolved or not needed');
      }
    } else {
      console.log('❌ Migration check failed:', error.message);
      throw error;
    }
  }

  console.log('✅ Production setup completed successfully!');
} catch (error) {
  console.error('❌ Production setup failed:', error.message);
  process.exit(1);
}
