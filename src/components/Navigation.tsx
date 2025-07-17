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
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-white/20 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 shadow-xl group-hover:shadow-2xl transition-all duration-300 w-12 h-12 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-white/10 rounded-2xl"></div>
              <span className="relative text-white font-bold text-2xl font-dancing-script z-10 drop-shadow-lg">C</span>
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-2xl"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-dancing-script font-bold">
                Casa Blanca
              </span>
              <span className="text-[10px] font-medium text-gray-600 tracking-widest uppercase font-montserrat text-center -mt-1">
                HOTELS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link 
              href="/properties" 
              className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-200 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50/50"
            >
              <Home className="h-4 w-4" />
              <span>Hotels</span>
            </Link>
            <Link 
              href="/about" 
              className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-200 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50/50"
            >
              <Info className="h-4 w-4" />
              <span>About LA</span>
            </Link>
            <Link 
              href="/contact" 
              className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-200 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50/50"
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
                  className="flex items-center space-x-2 py-2 px-3 hover:bg-blue-50/50 rounded-xl border border-transparent hover:border-blue-200/50 transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-md">
                    <span className="font-medium text-white text-sm">
                      {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium block text-gray-700">
                      {session.user.name || 'User'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {session.user.role === 'ADMIN' ? 'Administrator' : 'Guest'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 ml-1 text-gray-400" />
                </Button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl py-2 z-50 border border-white/20 animate-fadeIn">
                    <Link
                      href="/dashboard"
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50/50 rounded-lg mx-2 transition-all duration-200"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-3 text-blue-500" />
                      My Dashboard
                    </Link>
                    
                    {session.user.role === 'ADMIN' && (
                      <Link
                        href="/admin/dashboard"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50/50 rounded-lg mx-2 transition-all duration-200"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Building2 className="h-4 w-4 mr-3 text-blue-500" />
                        Admin Panel
                      </Link>
                    )}
                    
                    <hr className="my-2 border-gray-200/50" />
                    
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsUserMenuOpen(false);
                      }}
                      className="flex w-full items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50/50 rounded-lg mx-2 transition-all duration-200"
                    >
                      <LogOut className="h-4 w-4 mr-3 text-red-500" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Guest user menu
              <>
                <Link href="/login">
                  <Button variant="ghost" className="flex items-center space-x-2 px-4 py-2 rounded-xl hover:bg-blue-50/50 border border-transparent hover:border-blue-200/50 transition-all duration-200">
                    <LogIn className="h-4 w-4" />
                    <span>Login</span>
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
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
              className="p-2 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50/50 focus:outline-none transition-all duration-200"
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
          <div className="lg:hidden bg-white/95 backdrop-blur-md border-t border-white/20 pt-2 pb-4 animate-fadeIn rounded-b-xl">
            <div className="flex flex-col space-y-1 px-4">
              <Link 
                href="/properties"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-3 px-4 text-gray-700 hover:bg-blue-50/50 rounded-xl flex items-center space-x-3 transition-all duration-200"
              >
                <Home className="h-5 w-5 text-blue-600" />
                <span>Hotels</span>
              </Link>
              <Link 
                href="/about"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-3 px-4 text-gray-700 hover:bg-blue-50/50 rounded-xl flex items-center space-x-3 transition-all duration-200"
              >
                <Info className="h-5 w-5 text-blue-600" />
                <span>About LA</span>
              </Link>
              <Link 
                href="/contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-3 px-4 text-gray-700 hover:bg-blue-50/50 rounded-xl flex items-center space-x-3 transition-all duration-200"
              >
                <Phone className="h-5 w-5 text-blue-600" />
                <span>Contact</span>
              </Link>
              
              <hr className="my-3 border-gray-200/50" />
              
              {status === 'loading' ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : session ? (
                <>
                  <div className="flex items-center space-x-3 px-4 py-3 bg-blue-50/30 rounded-xl mx-1">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-md">
                      <span className="font-medium text-white">
                        {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">{session.user.name || 'User'}</div>
                      <div className="text-sm text-gray-500">
                        {session.user.role === 'ADMIN' ? 'Administrator' : 'Guest'}
                      </div>
                    </div>
                  </div>
                  
                  <Link 
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="py-3 px-4 text-gray-700 hover:bg-blue-50/50 rounded-xl flex items-center space-x-3 transition-all duration-200"
                  >
                    <User className="h-5 w-5 text-blue-600" />
                    <span>My Dashboard</span>
                  </Link>
                  
                  {session.user.role === 'ADMIN' && (
                    <Link 
                      href="/admin/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-3 px-4 text-gray-700 hover:bg-blue-50/50 rounded-xl flex items-center space-x-3 transition-all duration-200"
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
                    className="w-full py-3 px-4 text-left text-red-600 hover:bg-red-50/50 rounded-xl flex items-center space-x-3 transition-all duration-200"
                  >
                    <LogOut className="h-5 w-5 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3 px-1 pt-2">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-xl border-blue-200 hover:bg-blue-50/50">
                      <LogIn className="h-4 w-4 mr-2" />
                      Login
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl shadow-lg">
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
