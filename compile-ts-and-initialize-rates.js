// compile-ts-and-initialize-rates.js
const { execSync } = require('child_process');
const path = require('path');

function runScript() {
  try {
    // Compile the TypeScript file to JavaScript
    console.log('Compiling TypeScript files...');
    
    try {
      // This will compile the TypeScript file to JavaScript
      execSync('npx tsc src/lib/setup-future-rates.ts --outDir ./temp --esModuleInterop true', { 
        stdio: 'inherit',
        encoding: 'utf-8' 
      });
      
      console.log('TypeScript compilation successful');
    } catch (compileError) {
      console.error('Error compiling TypeScript:', compileError.message);
      process.exit(1);
    }
    
    // Create a temporary file to run the initialization
    const fs = require('fs');
    const tempFile = path.join(__dirname, 'temp-initialize.js');
    
    fs.writeFileSync(tempFile, `
    // Temporary file to run initialization
    const { setupFutureRates } = require('./temp/src/lib/setup-future-rates');
    
    async function run() {
      try {
        console.log('Initializing rates for all room types...');
        const result = await setupFutureRates();
        console.log('Result:', result);
        if (result.success) {
          console.log('Success:', result.message);
        } else {
          console.error('Failed:', result.message);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        process.exit(0);
      }
    }
    
    run();
    `);
    
    // Run the temporary file
    console.log('Running initialization script...');
    execSync('node temp-initialize.js', { 
      stdio: 'inherit',
      encoding: 'utf-8' 
    });
    
    // Clean up
    console.log('Cleaning up temporary files...');
    fs.unlinkSync(tempFile);
    
    console.log('Initialization complete');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

runScript();
