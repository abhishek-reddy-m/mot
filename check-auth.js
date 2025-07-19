// This is a simplified version to check auth session
import { auth } from './src/lib/auth';

async function checkAuth() {
  try {
    console.log('Checking auth session...');
    const session = await auth();
    console.log('Auth session:', session ? {
      id: session.user?.id,
      email: session.user?.email,
      name: session.user?.name,
      role: session.user?.role
    } : null);
  } catch (error) {
    console.error('Error checking auth:', error);
  }
}

checkAuth();
