// This script uses ts-node to run our setup-future-rates module directly
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2017',
  }
});

// Now we can import TypeScript files
const { setupFutureRates } = require('./src/lib/setup-future-rates');

async function runInitialization() {
  try {
    console.log('Initializing rates for all room types for the next 2 years...');
    
    const result = await setupFutureRates();
    
    if (result.success) {
      console.log('Success:', result.message);
      console.log(`Created ${result.created} rate records`);
    } else {
      console.error('Failed:', result.message);
    }
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the initialization
runInitialization();
