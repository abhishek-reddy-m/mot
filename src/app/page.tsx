import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import { HeroSection } from '@/components/HeroSection';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Users, 
  Star, 
  Shield, 
  Clock, 
  Wifi,
  CheckCircle,
  ChevronRight
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Navigation />
      
      {/* Hero Section */}
      <HeroSection />

      {/* LA Districts Preview */}
      <section className="py-20 bg-white relative -mt-16 z-20">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-gray-100">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Explore LA&apos;s <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Iconic Districts</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                From the glamour of Hollywood to the beaches of Santa Monica, discover your perfect neighborhood in the City of Angels
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="group cursor-pointer transform hover:scale-105 transition-all duration-300">
                <div className="relative h-40 rounded-2xl overflow-hidden mb-4 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-3xl drop-shadow-lg">🎬</span>
                  </div>
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-all duration-300"></div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <div className="text-white">
                      <h3 className="font-bold text-lg mb-1">Hollywood</h3>
                      <p className="text-sm text-blue-100">Entertainment Capital</p>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 text-sm">Walk the Walk of Fame</p>
                </div>
              </div>

              <div className="group cursor-pointer transform hover:scale-105 transition-all duration-300">
                <div className="relative h-40 rounded-2xl overflow-hidden mb-4 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-3xl drop-shadow-lg">🏖️</span>
                  </div>
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-all duration-300"></div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <div className="text-white">
                      <h3 className="font-bold text-lg mb-1">Santa Monica</h3>
                      <p className="text-sm text-blue-100">Beach Paradise</p>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 text-sm">Ocean views & pier fun</p>
                </div>
              </div>

              <div className="group cursor-pointer transform hover:scale-105 transition-all duration-300">
                <div className="relative h-40 rounded-2xl overflow-hidden mb-4 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-3xl drop-shadow-lg">💎</span>
                  </div>
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-all duration-300"></div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <div className="text-white">
                      <h3 className="font-bold text-lg mb-1">Beverly Hills</h3>
                      <p className="text-sm text-purple-100">Luxury District</p>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 text-sm">Rodeo Drive shopping</p>
                </div>
              </div>

              <div className="group cursor-pointer transform hover:scale-105 transition-all duration-300">
                <div className="relative h-40 rounded-2xl overflow-hidden mb-4 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-3xl drop-shadow-lg">🏙️</span>
                  </div>
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-all duration-300"></div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <div className="text-white">
                      <h3 className="font-bold text-lg mb-1">Downtown LA</h3>
                      <p className="text-sm text-blue-100">Business Hub</p>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 text-sm">Arts district & skyline</p>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link href="/properties">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
                  Explore All LA Areas
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-blue-600 font-semibold mb-2 text-sm uppercase tracking-wider font-montserrat">Casa Blanca&apos;s Premier Experience</p>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Why Choose <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-dancing-script">Casa Blanca</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto font-montserrat">
              Experience the epitome of luxury and elegance at Casa Blanca, 
              Los Angeles&apos; most distinguished boutique hotel with world-class amenities and unparalleled service.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-purple-200 group transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mb-6 group-hover:from-purple-500 group-hover:to-purple-600 transition-all duration-300">
                <Star className="h-8 w-8 text-purple-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Hollywood Glamour</h3>
              <p className="text-gray-600 leading-relaxed">
                Experience the magic of Hollywood with luxury suites, premium amenities, and star-worthy service in the heart of LA.
              </p>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-purple-600 font-medium flex items-center">
                  <span>Celebrity-approved</span>
                  <span className="flex ml-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className="h-3 w-3 text-yellow-400 fill-current" />
                    ))}
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200 group transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-6 group-hover:from-blue-500 group-hover:to-blue-600 transition-all duration-300">
                <Shield className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Prime Locations</h3>
              <p className="text-gray-600 leading-relaxed">
                Stay in LA&apos;s most coveted neighborhoods, from beachfront Santa Monica to the vibrant streets of West Hollywood.
              </p>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-blue-600 font-medium">
                  25+ Premium LA Locations
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-indigo-200 group transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center mb-6 group-hover:from-indigo-500 group-hover:to-indigo-600 transition-all duration-300">
                <Clock className="h-8 w-8 text-indigo-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">24/7 LA Concierge</h3>
              <p className="text-gray-600 leading-relaxed">
                Our local LA experts are available round-the-clock to help you discover hidden gems and exclusive experiences.
              </p>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-indigo-600 font-medium">
                  Local insider knowledge included
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200 group transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-6 group-hover:from-blue-500 group-hover:to-blue-600 transition-all duration-300">
                <Wifi className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">California Lifestyle</h3>
              <p className="text-gray-600 leading-relaxed">
                Enjoy rooftop pools, fitness centers, spa services, and dining that captures the essence of LA living.
              </p>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-blue-600 font-medium">
                  Resort-style amenities
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-blue-600 font-semibold mb-2 text-sm uppercase tracking-wider">Guest Love Stories</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">LA Experiences</span> That Inspire
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Hear from travelers who&apos;ve fallen in love with Los Angeles through our exceptional hospitality
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 transform hover:-translate-y-1">
              <div className="flex items-center mb-6">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-8 italic leading-relaxed text-lg">
                &quot;Staying in Hollywood was a dream come true! The hotel&apos;s rooftop pool overlooked the city, and the concierge got us VIP access to exclusive LA spots. Unforgettable!&quot;
              </p>
              <div className="flex items-center">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-bold text-lg">SM</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Sarah Martinez</h4>
                  <p className="text-sm text-gray-500">Hollywood Experience</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 transform hover:-translate-y-1">
              <div className="flex items-center mb-6">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-8 italic leading-relaxed text-lg">
                &quot;Santa Monica beachfront suite was incredible! Woke up to ocean views every morning, walked to the pier, and the spa treatments were world-class. Pure paradise!&quot;
              </p>
              <div className="flex items-center">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-bold text-lg">MR</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Michael Rodriguez</h4>
                  <p className="text-sm text-gray-500">Beach Vacation</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 transform hover:-translate-y-1">
              <div className="flex items-center mb-6">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-8 italic leading-relaxed text-lg">
                &quot;Beverly Hills luxury at its finest! The penthouse suite, personal butler service, and proximity to Rodeo Drive made this the perfect LA getaway. Five stars!&quot;
              </p>
              <div className="flex items-center">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-bold text-lg">EK</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Emily Kim</h4>
                  <p className="text-sm text-gray-500">Luxury Weekend</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 via-purple-700 to-indigo-600 text-white relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-300 opacity-10 rounded-full translate-x-1/3 translate-y-1/3"></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-purple-300 opacity-10 rounded-full"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Ready to Experience <span className="text-blue-200 font-dancing-script">Casa Blanca</span>?
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed font-montserrat">
              Join discerning travelers who&apos;ve discovered the perfect blend of luxury and comfort. 
              From elegant suites to personalized service – your extraordinary stay awaits at Casa Blanca!
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/properties">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-10 py-4 text-lg font-semibold shadow-xl transform hover:scale-105 transition-all duration-200">
                  <Search className="h-6 w-6 mr-2" />
                  Book Casa Blanca
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="lg" className="border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm px-10 py-4 text-lg font-semibold">
                  Start Your Journey
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-8 text-sm text-blue-200">
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                No booking fees
              </span>
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Best rate guarantee
              </span>
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Instant confirmation
              </span>
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                24/7 concierge service
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-16 pb-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white flex items-center">
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mr-2 font-dancing-script">Casa Blanca</span>
                <span className="font-montserrat font-bold tracking-wide uppercase text-sm">HOTELS</span>
              </h3>
              <p className="text-gray-400 max-w-xs leading-relaxed font-montserrat">
                Experience the elegance and luxury of Casa Blanca Hotels, Los Angeles&apos; premier boutique hotel collection in the heart of the city&apos;s most iconic neighborhoods.
              </p>
              <div className="flex space-x-4 pt-2">
                <a href="#" className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center hover:from-blue-600 hover:to-purple-600 transition-all duration-200">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 flex items-center justify-center hover:from-indigo-500 hover:to-indigo-700 transition-all duration-200">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center hover:from-purple-600 hover:to-blue-600 transition-all duration-200">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6 text-white">LA Neighborhoods</h3>
              <ul className="space-y-3">
                <li><Link href="/properties?area=hollywood" className="text-gray-400 hover:text-blue-400 transition-colors">Hollywood Hotels</Link></li>
                <li><Link href="/properties?area=santa-monica" className="text-gray-400 hover:text-blue-400 transition-colors">Santa Monica</Link></li>
                <li><Link href="/properties?area=beverly-hills" className="text-gray-400 hover:text-blue-400 transition-colors">Beverly Hills</Link></li>
                <li><Link href="/properties?area=west-hollywood" className="text-gray-400 hover:text-blue-400 transition-colors">West Hollywood</Link></li>
                <li><Link href="/properties?area=downtown" className="text-gray-400 hover:text-blue-400 transition-colors">Downtown LA</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Guest Services</h3>
              <ul className="space-y-3">
                <li><Link href="/help" className="text-gray-400 hover:text-blue-400 transition-colors">Help Center</Link></li>
                <li><Link href="/cancellation" className="text-gray-400 hover:text-blue-400 transition-colors">Cancellation Policy</Link></li>
                <li><Link href="/concierge" className="text-gray-400 hover:text-blue-400 transition-colors">LA Concierge</Link></li>
                <li><Link href="/experiences" className="text-gray-400 hover:text-blue-400 transition-colors">LA Experiences</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Contact Casa Blanca</h3>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                  hello@casablancala.com
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                  </svg>
                  1-800-CASA-BLANCA
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  Los Angeles, California
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  24/7 Concierge Service
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-500 flex flex-col md:flex-row justify-between items-center">
            <p>&copy; 2025 Casa Blanca Hotels. All rights reserved. Made with ❤️ in Los Angeles.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/terms" className="text-sm text-gray-500 hover:text-blue-400 transition-colors">Terms</Link>
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-blue-400 transition-colors">Privacy</Link>
              <Link href="/cookies" className="text-sm text-gray-500 hover:text-blue-400 transition-colors">Cookies</Link>
              <Link href="/sitemap" className="text-sm text-gray-500 hover:text-blue-400 transition-colors">Sitemap</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
