// This script tests the admin API routes
// Using global fetch available in Node.js now

async function testAdminRoutes() {
  try {
    console.log('Testing dashboard API...');
    const dashboardResponse = await fetch('http://localhost:3000/api/admin/dashboard');
    console.log('Dashboard response status:', dashboardResponse.status);
    if (dashboardResponse.ok) {
      const data = await dashboardResponse.json();
      console.log('Dashboard data:', data);
    } else {
      console.log('Dashboard error response:', await dashboardResponse.text());
    }

    console.log('\nTesting room-types API...');
    const roomTypesResponse = await fetch('http://localhost:3000/api/admin/room-types');
    console.log('Room types response status:', roomTypesResponse.status);
    if (roomTypesResponse.ok) {
      const data = await roomTypesResponse.json();
      console.log('Room types count:', data.length);
      if (data.length > 0) {
        console.log('First room type:', data[0]);
      }
    } else {
      console.log('Room types error response:', await roomTypesResponse.text());
    }
  } catch (error) {
    console.error('Error testing admin routes:', error);
  }
}

testAdminRoutes();
