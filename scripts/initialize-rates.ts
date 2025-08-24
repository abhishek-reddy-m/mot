import { setupFutureRates } from '../src/lib/setup-future-rates';

// This TypeScript file will be executed with next/exec
export async function main() {
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
    
    return result;
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}
