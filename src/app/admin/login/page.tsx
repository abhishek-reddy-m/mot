'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import { Shield, Mail, Lock, Home } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    console.log("Admin login attempt for:", email);

    try {
      const result = await signIn('admin-credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      
      console.log("Admin login result:", result);

      if (result?.error) {
        setError('Invalid admin credentials. Please try again.');
      } else if (result?.ok) {
        // Successful login - force a page reload to ensure session is recognized
        console.log("Admin login successful, reloading page to ensure session recognition");
        
        // Use window.location for a hard redirect that ensures session persistence
        window.location.href = callbackUrl;
      }
    } catch (error) {
      console.error('Admin login error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="absolute top-4 left-4">
        <Link href="/" className="flex items-center space-x-2 text-gray-700 hover:text-gray-900">
          <Home className="h-5 w-5" />
          <span className="font-medium">Back to Home</span>
        </Link>
      </div>
      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card className="border-gray-100 shadow-lg">
            <CardHeader className="text-center space-y-4 pb-6">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">Admin Login</CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  Access the administrative dashboard
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Admin Email
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 h-4 w-4 text-gray-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter admin email"
                      className="pl-10 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 h-4 w-4 text-gray-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="pl-10 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg py-3 font-medium shadow-sm transition-all duration-200" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    'Admin Sign in'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600">
                  <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 flex items-center justify-center space-x-1">
                    <span>←</span>
                    <span>Back to Customer Login</span>
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

// Mark this page as not using the admin layout
AdminLoginPage.getLayout = (page: React.ReactNode) => page;
