// This script initializes the daily rates for all room types for the next 2 years
// Run this script after adding new room types or periodically to ensure future dates have rates

const https = require('https');

async function initializeRates() {
  try {
    console.log('Initializing rates for all room types for the next 2 years...');
    console.log('Make sure you are logged in as an admin in the browser before running this script.');
    
    // Get the port where the Next.js server is running
    const port = 3000; // Using port 3000 as specified
    console.log(`Using port: ${port}`);
    
    // Create a Promise to handle the HTTP request
    const doFetch = () => new Promise((resolve, reject) => {
      // Options for the HTTP request
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/api/admin/initialize-rates',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      // Make the HTTP request
      const req = require('http').request(options, (res) => {
        let data = '';
        
        // Handle the response data
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        // Handle the end of the response
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const result = JSON.parse(data);
              resolve(result);
            } catch (e) {
              reject(new Error(`Invalid JSON response: ${data}`));
            }
          } else if (res.statusCode === 401) {
            reject(new Error(`Authentication failed (${res.statusCode}): You need to be logged in as an admin. Please log in at http://localhost:${port}/admin/login first.`));
          } else {
            try {
              const error = JSON.parse(data);
              reject(new Error(`API error (${res.statusCode}): ${error.error || 'Unknown error'}`));
            } catch (e) {
              reject(new Error(`API error (${res.statusCode}): ${data || 'Unknown error'}`));
            }
          }
        });
      });
      
      // Handle request errors
      req.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });
      
      // Send the request
      req.end(JSON.stringify({}));
    });
    
    console.log('Sending request to API...');
    const data = await doFetch();
    
    console.log('Success:', data.message || 'Rates initialized successfully');
    console.log(`Created ${data.created || 0} rate records`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

initializeRates();
