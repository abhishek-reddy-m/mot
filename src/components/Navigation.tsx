'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Building2, User, LogIn, LogOut, Menu, X, ChevronDown, PlayCircle, Rocket } from 'lucide-react';
import { PRODUCT_NAME } from '@/config/product';

export default function Navigation() {
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const isOwner = session?.user?.role === 'OWNER' || session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER';

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo — platform brand */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-800 shadow-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              {PRODUCT_NAME}
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center space-x-1">
            <a href="/#features" className="px-3 py-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors">Features</a>
            <a href="/#how-it-works" className="px-3 py-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors">How it works</a>
            <a href="/#pricing" className="px-3 py-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors">Pricing</a>
            <a href="/#faq" className="px-3 py-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors">FAQ</a>
            <Link href="/properties" className="px-3 py-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors flex items-center gap-1.5">
              <PlayCircle className="h-4 w-4" />
              Live demo
            </Link>
          </div>

          {/* Auth / CTA — Desktop */}
          <div className="hidden lg:flex items-center space-x-3">
            {status === 'loading' ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-700" />
            ) : session ? (
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 py-2 px-3 hover:bg-gray-50 rounded-lg"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-cyan-600 to-cyan-800 rounded-full flex items-center justify-center">
                    <span className="font-medium text-white text-sm">
                      {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{session.user.name || 'User'}</span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    {isOwner && (
                      <Link
                        href="/owner"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg mx-2"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Building2 className="h-4 w-4 mr-3 text-gray-600" />
                        My properties
                      </Link>
                    )}
                    <Link
                      href="/dashboard"
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg mx-2"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-3 text-gray-600" />
                      My bookings
                    </Link>
                    <Link
                      href="/profile"
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg mx-2"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-3 text-gray-600" />
                      My profile
                    </Link>
                    {session.user.role === 'ADMIN' && (
                      <Link
                        href="/admin/dashboard"
                        className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg mx-2"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Building2 className="h-4 w-4 mr-3 text-gray-600" />
                        Admin panel
                      </Link>
                    )}
                    <hr className="my-2 border-gray-100" />
                    <button
                      onClick={() => { handleSignOut(); setIsUserMenuOpen(false); }}
                      className="flex w-full items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg mx-2"
                    >
                      <LogOut className="h-4 w-4 mr-3 text-red-500" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="flex items-center space-x-2 text-gray-700">
                    <LogIn className="h-4 w-4" />
                    <span>Log in</span>
                  </Button>
                </Link>
                <Link href="/onboarding">
                  <Button className="flex items-center space-x-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg">
                    <Rocket className="h-4 w-4" />
                    <span>Onboard your hotel</span>
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 pt-2 pb-4">
            <div className="flex flex-col space-y-1 px-4">
              <a href="/#features" onClick={() => setIsMobileMenuOpen(false)} className="py-3 px-4 text-gray-700 hover:bg-gray-50 rounded-lg">Features</a>
              <a href="/#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="py-3 px-4 text-gray-700 hover:bg-gray-50 rounded-lg">How it works</a>
              <a href="/#pricing" onClick={() => setIsMobileMenuOpen(false)} className="py-3 px-4 text-gray-700 hover:bg-gray-50 rounded-lg">Pricing</a>
              <a href="/#faq" onClick={() => setIsMobileMenuOpen(false)} className="py-3 px-4 text-gray-700 hover:bg-gray-50 rounded-lg">FAQ</a>
              <Link href="/properties" onClick={() => setIsMobileMenuOpen(false)} className="py-3 px-4 text-gray-700 hover:bg-gray-50 rounded-lg">Live demo</Link>
              <hr className="my-3 border-gray-100" />
              {session ? (
                <>
                  {isOwner && (
                    <Link href="/owner" onClick={() => setIsMobileMenuOpen(false)} className="py-3 px-4 text-gray-700 hover:bg-gray-50 rounded-lg">My properties</Link>
                  )}
                  <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="py-3 px-4 text-gray-700 hover:bg-gray-50 rounded-lg">My bookings</Link>
                  {session.user.role === 'ADMIN' && (
                    <Link href="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="py-3 px-4 text-gray-700 hover:bg-gray-50 rounded-lg">Admin panel</Link>
                  )}
                  <button onClick={() => { handleSignOut(); setIsMobileMenuOpen(false); }} className="py-3 px-4 text-left text-red-600 hover:bg-red-50 rounded-lg">Sign out</button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3 px-1 pt-2">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Log in</Button>
                  </Link>
                  <Link href="/onboarding" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full bg-cyan-700 hover:bg-cyan-800 text-white">Onboard your hotel</Button>
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
