'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import { 
  MapPin, 
  Star, 
  Wifi, 
  Car, 
  Coffee, 
  Search, 
  Filter as FilterIcon, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Waves as SwimmingPool,
  AirVent,
  AlertCircle,
  Building,
  Home,
  Building2,
  UtensilsCrossed as Utensils,
  PalmtreeIcon as Palmtree,
  Clapperboard as Film
} from 'lucide-react';

type PropertyWithAvailability = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  mainPhoto: string | null;
  totalRooms: number;
  availableRooms: number;
  lowestPrice: number | null;
  roomTypeCount: number;
  hasAvailability: boolean;
}

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/properties');
        if (!response.ok) {
          throw new Error('Failed to fetch properties');
        }
        const data = await response.json();
        setProperties(data);
      } catch (err) {
        setError('Error loading properties. Please try again.');
        console.error('Error fetching properties:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const filteredProperties = properties.filter((property) =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Property card component
  function PropertyCard({ property }: { property: PropertyWithAvailability }) {
    return (
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-gray-100">
        <div className="aspect-[4/3] relative overflow-hidden">
          {property.mainPhoto ? (
            <img
              src={property.mainPhoto}
              alt={property.name}
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
          
          {/* Rating badge */}
          <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-md shadow-md">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium">4.8</span>
            </div>
          </div>
          
          {/* Availability badge */}
          {property.hasAvailability && (
            <div className="absolute top-4 left-4 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-md font-medium">
              Available Now
            </div>
          )}
        </div>
        
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold group-hover:text-blue-600 transition-colors">
            {property.name}
          </CardTitle>
          <CardDescription className="flex items-center space-x-1 text-gray-500">
            <MapPin className="h-4 w-4" />
            <span>{property.city}, {property.state}</span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-gray-600 text-sm mb-6 line-clamp-2">
            {property.description || 'Comfortable accommodation with modern amenities.'}
          </p>

          {/* LA-specific amenities */}
          <div className="mb-6">
            {/* LA neighborhood indicator */}
            <div className="flex items-center mb-4">
              <MapPin className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm text-gray-700">
                <span className="font-medium">{property.city === 'Los Angeles' ? 'Hollywood' : 'Downtown LA'}</span> • 
                <span className="text-gray-500 ml-1">
                  {property.id.charCodeAt(0) % 2 === 0 ? '5 min to Walk of Fame' : '10 min to Staples Center'}
                </span>
              </span>
            </div>
            
            {/* Amenities grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-50 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                <Wifi className="h-4 w-4 text-blue-600 mb-1" />
                <span className="text-xs text-gray-700">Free WiFi</span>
              </div>
              <div className="bg-blue-50 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                <Car className="h-4 w-4 text-blue-600 mb-1" />
                <span className="text-xs text-gray-700">Valet Parking</span>
              </div>
              <div className="bg-blue-50 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                {property.id.charCodeAt(0) % 2 === 0 ? (
                  <>
                    <SwimmingPool className="h-4 w-4 text-blue-600 mb-1" />
                    <span className="text-xs text-gray-700">Pool</span>
                  </>
                ) : (
                  <>
                    <Coffee className="h-4 w-4 text-blue-600 mb-1" />
                    <span className="text-xs text-gray-700">Breakfast</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4 mt-2">
            <div>
              {property.lowestPrice ? (
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-blue-600">${property.lowestPrice}</span>
                  <span className="text-gray-500 text-sm ml-1">/night</span>
                </div>
              ) : (
                <span className="text-gray-500">Contact for pricing</span>
              )}
              {property.availableRooms > 0 && (
                <span className="block text-xs text-gray-500 mt-1">
                  {property.availableRooms} {property.availableRooms === 1 ? 'room' : 'rooms'} available
                </span>
              )}
            </div>
            <Button 
              onClick={() => router.push(`/properties/${property.id}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state component with more realistic skeleton UI
  function PropertiesLoading() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border border-gray-100">
            <div className="aspect-[4/3] bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse relative">
              {/* Simulated rating badge */}
              <div className="absolute top-4 right-4 w-12 h-6 bg-white rounded-md" />
            </div>
            <CardHeader className="pb-2">
              <div className="h-7 bg-gray-200 rounded animate-pulse mb-2 w-3/4" />
              <div className="h-5 bg-gray-200 rounded animate-pulse w-1/2 flex items-center">
                <div className="w-4 h-4 rounded-full bg-gray-300 mr-2" />
                <div className="flex-1 h-4 bg-gray-300 rounded" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-6">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[0, 1, 2].map((n) => (
                  <div key={n} className="bg-gray-100 rounded-lg p-2 flex flex-col items-center">
                    <div className="w-4 h-4 rounded-full bg-gray-200 mb-1" />
                    <div className="w-12 h-3 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
              
              <div className="pt-4 mt-2 border-t flex justify-between items-center">
                <div>
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-20 mt-1 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  // LA-specific No results component
  function NoResults() {
    return (
      <div className="col-span-3 text-center py-16 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex flex-col items-center max-w-md mx-auto px-4">
          <div className="relative mb-6">
            <MapPin className="h-16 w-16 text-gray-300" />
            <Search className="h-8 w-8 text-gray-300 absolute bottom-0 right-0" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No LA properties found</h3>
          <p className="text-gray-500 mb-6">
            We couldn&apos;t find any Los Angeles properties matching your criteria. 
            Try different neighborhoods or amenities to discover the perfect LA stay.
          </p>
          <div className="space-y-4">
            <Button 
              onClick={() => {
                setSearchTerm('');
                // Reset other filters if you have them in state
              }}
              variant="outline"
              className="w-full"
            >
              Clear All Filters
            </Button>
            
            <p className="text-sm text-gray-500">Or try one of these popular LA areas:</p>
            
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="secondary" size="sm">Hollywood</Button>
              <Button variant="secondary" size="sm">Downtown LA</Button>
              <Button variant="secondary" size="sm">Santa Monica</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state component
  function ErrorState({ message, onRetry }: { message: string, onRetry: () => void }) {
    return (
      <div className="col-span-3 text-center py-16 bg-red-50 rounded-xl border border-red-100">
        <div className="flex flex-col items-center max-w-md mx-auto px-4">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <Button 
            onClick={onRetry}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Hero section for Los Angeles properties */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white py-16 relative overflow-hidden">
        {/* LA skyline silhouette */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-black opacity-20" style={{ 
          maskImage: 'url("https://assets.codepen.io/756881/la-skyline.png")', 
          maskSize: 'contain',
          maskRepeat: 'repeat-x',
          maskPosition: 'bottom'
        }}></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl">
            <div className="flex items-center mb-2">
              <MapPin className="h-5 w-5 text-yellow-400 mr-2" />
              <span className="text-yellow-300 font-medium">Los Angeles, California</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Discover LA&apos;s Best Places to Stay</h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl">
              From downtown luxury to beachside comfort, find the perfect spot for your LA adventure
            </p>
            
            {/* Search bar - prominent placement */}
            <div className="relative bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                <Search className="w-5 h-5" />
              </div>
              <input 
                type="text"
                placeholder="Search LA properties by name, neighborhood, or features..."
                className="w-full pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Popular LA neighborhoods */}
            <div className="mt-8 flex flex-wrap gap-2">
              <span className="text-sm font-medium text-white mr-2">Popular areas:</span>
              <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-full">
                Downtown LA
              </Button>
              <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-full">
                Hollywood
              </Button>
              <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-full">
                Santa Monica
              </Button>
              <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-full">
                Beverly Hills
              </Button>
              <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-full">
                Venice Beach
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12">
        {/* LA-specific filter section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-12 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
            <FilterIcon className="w-5 h-5 mr-2 text-blue-600" />
            Find Your Perfect LA Stay
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">LA Neighborhood</label>
              <div className="relative">
                <select className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-10">
                  <option>All Neighborhoods</option>
                  <option>Downtown LA</option>
                  <option>Hollywood</option>
                  <option>Beverly Hills</option>
                  <option>Santa Monica</option>
                  <option>Venice Beach</option>
                  <option>West Hollywood</option>
                  <option>Silver Lake</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
              <div className="relative">
                <select className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-10">
                  <option>Any Price</option>
                  <option>Under $150</option>
                  <option>$150 - $250</option>
                  <option>$250 - $400</option>
                  <option>Over $400</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Near Attraction</label>
              <div className="relative">
                <select className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-10">
                  <option>Any Location</option>
                  <option>Hollywood Sign</option>
                  <option>Universal Studios</option>
                  <option>Santa Monica Pier</option>
                  <option>Venice Boardwalk</option>
                  <option>Rodeo Drive</option>
                  <option>The Grove</option>
                  <option>Griffith Observatory</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
            
            <div className="flex items-end">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6">
                <FilterIcon className="w-4 h-4 mr-2" />
                Find LA Properties
              </Button>
            </div>
          </div>
          
          {/* LA-specific filters */}
          <div className="mt-6 flex flex-wrap gap-2">
            <div className="mr-4">
              <span className="text-sm font-medium text-gray-700 mr-2 flex items-center mb-2">
                Property Type:
              </span>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="rounded-full">
                  <Building className="h-3 w-3 mr-1" /> Hotel
                </Button>
                <Button variant="outline" size="sm" className="rounded-full">
                  <Home className="h-3 w-3 mr-1" /> Motel
                </Button>
                <Button variant="outline" size="sm" className="rounded-full">
                  <Building2 className="h-3 w-3 mr-1" /> Boutique
                </Button>
              </div>
            </div>
            
            <div>
              <span className="text-sm font-medium text-gray-700 mr-2 flex items-center mb-2">
                LA Amenities:
              </span>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="rounded-full">
                  <Wifi className="h-3 w-3 mr-1" /> WiFi
                </Button>
                <Button variant="outline" size="sm" className="rounded-full">
                  <SwimmingPool className="h-3 w-3 mr-1" /> Pool
                </Button>
                <Button variant="outline" size="sm" className="rounded-full">
                  <Car className="h-3 w-3 mr-1" /> Valet Parking
                </Button>
                <Button variant="outline" size="sm" className="rounded-full">
                  <Utensils className="h-3 w-3 mr-1" /> Restaurant
                </Button>
                <Button variant="outline" size="sm" className="rounded-full">
                  <Palmtree className="h-3 w-3 mr-1" /> Ocean View
                </Button>
                <Button variant="outline" size="sm" className="rounded-full">
                  <Film className="h-3 w-3 mr-1" /> Studio Tours
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* LA Results info */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Los Angeles Properties
              {!loading && <span className="text-gray-500 ml-2 text-lg">({filteredProperties.length})</span>}
            </h2>
            <p className="text-gray-600">
              Experience the best of LA with our carefully curated accommodations
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <select className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Sort by: Recommended</option>
              <option>Distance to Hollywood</option>
              <option>Distance to Beach</option>
              <option>Price: Low to High</option>
              <option>Rating: High to Low</option>
            </select>
          </div>
        </div>

        {/* Properties Grid */}
        {loading ? (
          <PropertiesLoading />
        ) : error ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProperties.length === 0 ? (
              <NoResults />
            ) : (
              filteredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))
            )}
          </div>
        )}
        
        {/* Pagination - static for now */}
        {!loading && filteredProperties.length > 0 && (
          <div className="mt-12 flex justify-center">
            <nav className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-9 h-9 p-0 flex items-center justify-center"
                disabled
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous</span>
              </Button>
              
              <Button variant="default" size="sm" className="w-9 h-9 p-0">1</Button>
              <Button variant="outline" size="sm" className="w-9 h-9 p-0">2</Button>
              <Button variant="outline" size="sm" className="w-9 h-9 p-0">3</Button>
              <span className="text-gray-500">...</span>
              <Button variant="outline" size="sm" className="w-9 h-9 p-0">8</Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-9 h-9 p-0 flex items-center justify-center"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next</span>
              </Button>
            </nav>
          </div>
        )}
      </div>
      
      {/* LA-Themed Newsletter Section */}
      <section className="bg-gradient-to-r from-blue-700 to-indigo-800 py-16 text-white relative overflow-hidden">
        {/* Hollywood hills silhouette */}
        <div className="absolute top-0 left-0 right-0 h-48 opacity-10">
          <div className="w-full h-full bg-black" style={{
            maskImage: 'url("https://assets.codepen.io/756881/hollywood-hills.png")',
            maskSize: 'cover',
            maskPosition: 'center'
          }}></div>
        </div>
        
        {/* Hollywood sign suggestion in background */}
        <div className="absolute top-4 right-12 opacity-10 transform -rotate-6">
          <div className="text-4xl font-black tracking-widest">HOLLYWOOD</div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Get LA&apos;s Exclusive Hotel Deals</h2>
            <p className="text-blue-100 mb-6">
              Subscribe for insider access to special Los Angeles hotel offers, event tickets, and local experiences.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="email" 
                placeholder="Your email address" 
                className="flex-1 px-4 py-3 rounded-lg focus:outline-none text-gray-900"
              />
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-medium px-6">
                Get LA Deals
              </Button>
            </div>
            <p className="mt-4 text-xs text-blue-200">
              We respect your privacy. Unsubscribe at any time.
            </p>
            
            {/* LA Perks */}
            <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-4">
              <div className="flex items-center">
                <Palmtree className="h-5 w-5 text-yellow-400 mr-2" />
                <span className="text-sm">Beach Access Deals</span>
              </div>
              <div className="flex items-center">
                <Film className="h-5 w-5 text-yellow-400 mr-2" />
                <span className="text-sm">Studio Tour Discounts</span>
              </div>
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-400 mr-2" />
                <span className="text-sm">Celebrity Hotspot Info</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
