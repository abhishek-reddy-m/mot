// This script will log in to the admin panel and then initialize rates
const puppeteer = require('puppeteer');
const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function loginAndInitializeRates() {
  // Get admin credentials
  const email = await new Promise(resolve => {
    rl.question('Enter admin email: ', (answer) => {
      resolve(answer);
    });
  });
  
  const password = await new Promise(resolve => {
    rl.question('Enter admin password: ', (answer) => {
      resolve(answer);
    });
  });
  
  try {
    console.log('Launching browser to log in to admin panel...');
    
    // Launch browser
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    // Navigate to admin login
    await page.goto('http://localhost:3000/admin/login');
    console.log('Navigated to admin login page');
    
    // Fill in the login form
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', email);
    await page.type('input[type="password"]', password);
    
    // Submit the form
    await Promise.all([
      page.waitForNavigation(),
      page.click('button[type="submit"]')
    ]);
    
    console.log('Logged in successfully');
    
    // Wait to ensure cookies are set
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Close the browser
    await browser.close();
    
    // Now run the initialize rates script
    console.log('Running initialize-rates.js script...');
    exec('node initialize-rates.js', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return;
      }
      console.log(stdout);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  loginAndInitializeRates();
} catch (e) {
  console.log('Puppeteer is not installed. Installing now...');
  exec('npm install puppeteer', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error installing puppeteer: ${error.message}`);
      return;
    }
    console.log('Puppeteer installed successfully');
    loginAndInitializeRates();
  });
}
