'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Building2, User, LogIn, LogOut, Menu, X, ChevronDown, Home, Phone, Info } from 'lucide-react';

export default function Navigation() {
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (isUserMenuOpen) setIsUserMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">MotelBooking</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link 
              href="/properties" 
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors flex items-center gap-1"
            >
              <Home className="h-4 w-4" />
              <span>Properties</span>
            </Link>
            <Link 
              href="/about" 
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors flex items-center gap-1"
            >
              <Info className="h-4 w-4" />
              <span>About</span>
            </Link>
            <Link 
              href="/contact" 
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors flex items-center gap-1"
            >
              <Phone className="h-4 w-4" />
              <span>Contact</span>
            </Link>
          </div>

          {/* Auth Buttons - Desktop */}
          <div className="hidden lg:flex items-center space-x-3">
            {status === 'loading' ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            ) : session ? (
              // Authenticated user menu
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={toggleUserMenu}
                  className="flex items-center space-x-2 py-2"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="font-medium text-blue-600">
                      {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium block">
                      {session.user.name || 'User'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {session.user.role === 'ADMIN' ? 'Administrator' : 'Customer'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200 animate-fadeIn">
                    <Link
                      href="/dashboard"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-2 text-blue-500" />
                      My Dashboard
                    </Link>
                    
                    {session.user.role === 'ADMIN' && (
                      <Link
                        href="/admin/dashboard"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Building2 className="h-4 w-4 mr-2 text-blue-500" />
                        Admin Panel
                      </Link>
                    )}
                    
                    <hr className="my-1" />
                    
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsUserMenuOpen(false);
                      }}
                      className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 mr-2 text-red-500" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Guest user menu
              <>
                <Link href="/login">
                  <Button variant="ghost" className="flex items-center space-x-1">
                    <LogIn className="h-4 w-4" />
                    <span>Login</span>
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700">
                    <User className="h-4 w-4" />
                    <span>Sign Up</span>
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            <button 
              onClick={toggleMobileMenu}
              className="p-2 rounded-md text-gray-600 hover:text-blue-600 focus:outline-none"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t pt-2 pb-4 animate-fadeIn">
            <div className="flex flex-col space-y-2 px-4">
              <Link 
                href="/properties"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-2 px-3 text-gray-700 hover:bg-blue-50 rounded-md flex items-center space-x-2"
              >
                <Home className="h-5 w-5 text-blue-600" />
                <span>Properties</span>
              </Link>
              <Link 
                href="/about"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-2 px-3 text-gray-700 hover:bg-blue-50 rounded-md flex items-center space-x-2"
              >
                <Info className="h-5 w-5 text-blue-600" />
                <span>About</span>
              </Link>
              <Link 
                href="/contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-2 px-3 text-gray-700 hover:bg-blue-50 rounded-md flex items-center space-x-2"
              >
                <Phone className="h-5 w-5 text-blue-600" />
                <span>Contact</span>
              </Link>
              
              <hr className="my-2" />
              
              {status === 'loading' ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : session ? (
                <>
                  <div className="flex items-center space-x-3 px-3 py-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="font-medium text-blue-600">
                        {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">{session.user.name || 'User'}</div>
                      <div className="text-sm text-gray-500">
                        {session.user.role === 'ADMIN' ? 'Administrator' : 'Customer'}
                      </div>
                    </div>
                  </div>
                  
                  <Link 
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="py-2 px-3 text-gray-700 hover:bg-blue-50 rounded-md flex items-center space-x-2"
                  >
                    <User className="h-5 w-5 text-blue-600" />
                    <span>My Dashboard</span>
                  </Link>
                  
                  {session.user.role === 'ADMIN' && (
                    <Link 
                      href="/admin/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2 px-3 text-gray-700 hover:bg-blue-50 rounded-md flex items-center space-x-2"
                    >
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <span>Admin Panel</span>
                    </Link>
                  )}
                  
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-2 px-3 text-left text-red-600 hover:bg-red-50 rounded-md flex items-center space-x-2"
                  >
                    <LogOut className="h-5 w-5 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3 px-3 pt-2">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      <LogIn className="h-4 w-4 mr-2" />
                      Login
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <User className="h-4 w-4 mr-2" />
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
