export async function register() {
  // Set up properties' default subdomains in the background, without delaying startup
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { syncPropertySubdomains } = await import('@/lib/property-subdomains');
    syncPropertySubdomains().catch(error => console.error('Property subdomain sync failed:', error));
  }
}
