// This script directly calls the setupFutureRates function
// without needing to go through the API
const { setupFutureRates } = require('./src/lib/setup-future-rates');

async function runDirectInitialization() {
  try {
    console.log('Initializing rates for all room types for the next 2 years...');
    
    const result = await setupFutureRates();
    
    console.log('Result:', result);
    
    if (result.success) {
      console.log('Success:', result.message);
      console.log(`Created ${result.created} rate records`);
    } else {
      console.error('Failed:', result.message);
    }
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  }
}

runDirectInitialization();
