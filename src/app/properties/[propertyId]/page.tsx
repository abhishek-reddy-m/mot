'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Star, Calendar, Users, Coffee, Wifi, Car, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { normalizeDate, calculateNights, storeBookingSearch, getBookingSearch, formatDateForDisplay } from '@/lib/date-utils';
import { ImageCarousel } from '@/components/ImageCarousel';

type RoomTypeRate = {
  id: string;
  roomTypeId: string;
  date: Date;
  price: number;
  isCustomRate?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type RoomType = {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  basePrice: number;
  amenities: string[];
  isActive: boolean;
  availableRooms: number;
  availabilityByDate?: { [date: string]: number };
  totalRooms: number;
  photos: Array<{
    id: string;
    url: string;
    isMain: boolean;
  }>;
  roomTypeRates?: RoomTypeRate[];
};

type Property = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string | null;
  amenities: string[];
  isActive: boolean;
  photos: Array<{
    id: string;
    url: string;
    isMain: boolean;
  }>;
  roomTypes: RoomType[];
};

type BookingDetails = {
  checkIn: string;
  checkOut: string;
  guests: number;
  roomTypeId: string;
  rooms: number;
  // Payment details
  cardNumber: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardCvv: string;
  billingName: string;
  billingZip: string;
};

// Helper function to extract available rooms count from various data structures
function getAvailableRoomsCount(roomType: RoomType | null): number {
  if (!roomType) return 0;
  
  // Try calculatedAvailableRooms first (set by the API)
  if (typeof (roomType as any).calculatedAvailableRooms === 'number') {
    return (roomType as any).calculatedAvailableRooms;
  }
  
  // Next try the availableRooms property
  if (typeof roomType.availableRooms === 'number') {
    return roomType.availableRooms;
  }
  
  // Fall back to total rooms as a last resort
  return roomType.totalRooms;
}

export default function PropertyDetailsPage({ params }: { params: Promise<{ propertyId: string }> }) {
  console.log('🏠 PropertyDetailsPage component rendered');
  
  // Test normalizeDate function
  try {
    const testDate = normalizeDate('2025-08-27');
    console.log('🧪 normalizeDate test:', testDate);
  } catch (error) {
    console.error('❌ normalizeDate error:', error);
  }
  
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Only log that we're loading the property detail page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Property detail page loaded');
    }
  }, []);
  const [error, setError] = useState('');
  
  // Use React.use() to unwrap the params promise
  const { propertyId } = use(params);
  
  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
    guests: 1,
    roomTypeId: '',
    rooms: 1,
    // Payment details
    cardNumber: '',
    cardExpMonth: '',
    cardExpYear: '',
    cardCvv: '',
    billingName: '',
    billingZip: ''
  });
  
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  useEffect(() => {
    const fetchProperty = async () => {
      if (!propertyId) return;
      
      try {
        setLoading(true);
        
        // First try to get dates from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        let checkInParam = urlParams.get('checkIn');
        let checkOutParam = urlParams.get('checkOut');
        let guestsParam = urlParams.get('guests');
        
        // Clean the checkInParam of any cache busting parameters
        if (checkInParam && checkInParam.includes('?')) {
          checkInParam = checkInParam.split('?')[0];
          console.log(`Cleaned check-in param: ${checkInParam}`);
        }
        
        // Get stored search from sessionStorage if URL params aren't available
        if (!checkInParam || !checkOutParam) {
          try {
            const searchData = getBookingSearch();
            checkInParam = checkInParam || searchData.checkIn;
            checkOutParam = checkOutParam || searchData.checkOut;
            guestsParam = guestsParam || searchData.guests;
            console.log("Using dates from stored search:", { checkInParam, checkOutParam, guestsParam });
          } catch (e) {
            console.error("Error getting stored booking search:", e);
          }
        }
        
        // Normalize the check-in date
        if (checkInParam) {
          // Ensure it's a valid date in YYYY-MM-DD format using noon UTC to avoid timezone issues
          let checkInDate: Date;
          try {
            checkInDate = new Date(`${checkInParam}T12:00:00Z`);
            if (!isNaN(checkInDate.getTime())) {
              const formattedCheckIn = checkInDate.toISOString().split('T')[0];
              console.log(`Setting check-in date: ${formattedCheckIn} (from ${checkInParam})`);
              setBookingDetails(prev => ({...prev, checkIn: formattedCheckIn}));
            } else {
              console.warn(`Invalid check-in date detected: ${checkInParam}`);
              // Fallback to today's date if invalid
              const today = new Date();
              const formattedToday = today.toISOString().split('T')[0];
              setBookingDetails(prev => ({...prev, checkIn: formattedToday}));
            }
          } catch (error) {
            console.error("Error parsing check-in date:", error);
            // Fallback to today's date on error
            const today = new Date();
            const formattedToday = today.toISOString().split('T')[0];
            setBookingDetails(prev => ({...prev, checkIn: formattedToday}));
          }
        }
        
        // Normalize the check-out date
        if (checkOutParam) {
          // Ensure it's a valid date in YYYY-MM-DD format using noon UTC to avoid timezone issues
          let checkOutDate: Date;
          try {
            checkOutDate = new Date(`${checkOutParam}T12:00:00Z`);
            if (!isNaN(checkOutDate.getTime())) {
              const formattedCheckOut = checkOutDate.toISOString().split('T')[0];
              console.log(`Setting check-out date: ${formattedCheckOut} (from ${checkOutParam})`);
              setBookingDetails(prev => ({...prev, checkOut: formattedCheckOut}));
            } else {
              console.warn(`Invalid check-out date detected: ${checkOutParam}`);
              // Fallback to tomorrow's date if invalid
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const formattedTomorrow = tomorrow.toISOString().split('T')[0];
              setBookingDetails(prev => ({...prev, checkOut: formattedTomorrow}));
            }
          } catch (error) {
            console.error("Error parsing check-out date:", error);
            // Fallback to tomorrow's date on error
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const formattedTomorrow = tomorrow.toISOString().split('T')[0];
            setBookingDetails(prev => ({...prev, checkOut: formattedTomorrow}));
          }
        }
        
        // Handle guests parameter
        if (guestsParam) {
          try {
            const guestsValue = parseInt(guestsParam);
            if (!isNaN(guestsValue) && guestsValue > 0) {
              console.log(`Setting guests: ${guestsValue}`);
              setBookingDetails(prev => ({...prev, guests: guestsValue}));
            }
          } catch (error) {
            console.error("Error parsing guests parameter:", error);
          }
        }
        
        // Ensure we have clean YYYY-MM-DD formatted dates for consistency
        const cleanCheckIn = checkInParam ? (
          checkInParam.trim().match(/^\d{4}-\d{2}-\d{2}$/)
            ? checkInParam.trim()
            : new Date(`${checkInParam}T12:00:00Z`).toISOString().split('T')[0]
        ) : '';
          
        const cleanCheckOut = checkOutParam ? (
          checkOutParam.trim().match(/^\d{4}-\d{2}-\d{2}$/)
            ? checkOutParam.trim()
            : new Date(`${checkOutParam}T12:00:00Z`).toISOString().split('T')[0]
        ) : '';
        
        // Save the current booking details to sessionStorage for consistency
        const currentBookingDetails = {
          propertyId,
          checkIn: cleanCheckIn,
          checkOut: cleanCheckOut,
          guests: guestsParam ? parseInt(guestsParam) : 1
        };
        
        // Save both currentBooking and lastSearch to maintain consistency across flows
        sessionStorage.setItem('currentBooking', JSON.stringify(currentBookingDetails));
        sessionStorage.setItem('lastSearch', JSON.stringify({
          propertyId,
          checkIn: cleanCheckIn,
          checkOut: cleanCheckOut,
          guests: currentBookingDetails.guests
        }));
        
        // Build API URL with date parameters to ensure we get date-specific availability
        const apiParams = new URLSearchParams();
        const timestamp = new Date().getTime();
        
        if (cleanCheckIn) apiParams.append('checkIn', cleanCheckIn);
        if (cleanCheckOut) apiParams.append('checkOut', cleanCheckOut);
        if (currentBookingDetails.guests) apiParams.append('guests', currentBookingDetails.guests.toString());
        apiParams.append('_t', timestamp.toString()); // Add cache busting
        
        const apiUrl = `/api/properties/${propertyId}?${apiParams.toString()}`;
        console.log(`Fetching property with date-specific availability: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          // Add cache control headers
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          cache: 'no-store' // Disable caching completely for fetch API
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch property: ${response.status} ${response.statusText}`, errorText);
          throw new Error(`Failed to fetch property: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setProperty(data);
        console.log(`Property loaded with ${data.roomTypes?.length || 0} room types`);
        
        // If there are room types, select the first one by default
        if (data.roomTypes && data.roomTypes.length > 0) {
          setSelectedRoomType(data.roomTypes[0]);
          setBookingDetails(prev => ({
            ...prev,
            roomTypeId: data.roomTypes[0].id
          }));
          
          // Log availability for debugging
          data.roomTypes.forEach((rt: RoomType) => {
            console.log(`Room type: ${rt.name}, Available: ${rt.availableRooms}/${rt.totalRooms}`);
            console.log(`Calculated Available Rooms: ${(rt as any).calculatedAvailableRooms}`);
          });
        }
      } catch (err) {
        setError('Error loading property. Please try again.');
        console.error('Error fetching property:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId]);

  // Fetch room rates whenever booking dates or selected room type changes
  useEffect(() => {
    if (selectedRoomType?.id && bookingDetails.checkIn && bookingDetails.checkOut) {
      // Validate dates before triggering fetch
      const checkInDate = new Date(`${bookingDetails.checkIn}T12:00:00Z`);
      const checkOutDate = new Date(`${bookingDetails.checkOut}T12:00:00Z`);
      
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        console.error('Invalid dates, not fetching rates:', 
          { checkIn: bookingDetails.checkIn, checkOut: bookingDetails.checkOut });
        return;
      }
      
      // Ensure check-out is after check-in
      if (checkInDate >= checkOutDate) {
        console.log('Check-in date is on or after check-out date. Not fetching rates.');
        return;
      }
      
      console.log(`Triggering room rates fetch for room type ${selectedRoomType.id} from ${bookingDetails.checkIn} to ${bookingDetails.checkOut}`);
      fetchRoomRates(selectedRoomType.id, bookingDetails.checkIn, bookingDetails.checkOut);
    }
  }, [selectedRoomType?.id, bookingDetails.checkIn, bookingDetails.checkOut]);

  // Force component re-render when room type rates are updated
  useEffect(() => {
    if (selectedRoomType?.roomTypeRates && selectedRoomType.roomTypeRates.length > 0) {
      console.log('🔄 Room type rates updated, triggering re-calculation');
      console.log('🔄 Current rates:', selectedRoomType.roomTypeRates.map(r => ({
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
        price: r.price
      })));
      // Force a state update to trigger re-render
      setBookingDetails(prev => ({...prev}));
    }
  }, [selectedRoomType?.roomTypeRates]);

  // Debug current state whenever it changes
  useEffect(() => {
    console.log('📊 Component state updated:');
    console.log('📊 Selected room type:', selectedRoomType?.name);
    console.log('📊 Room type rates count:', selectedRoomType?.roomTypeRates?.length || 0);
    console.log('📊 Booking details:', bookingDetails);
  }, [selectedRoomType, bookingDetails]);

  // Debug function for testing (accessible from browser console)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugPropertyPage = {
        selectedRoomType,
        bookingDetails,
        calculateTotalPrice,
        testRatesParsing: () => {
          const testRates = ['2025-08-27: $99.94 (custom)', '2025-08-28: $100 (custom)'];
          console.log('🧪 Testing rates parsing:', testRates);
          
          const parsed = testRates.map((rate: string) => {
            const match = rate.match(/^(\d{4}-\d{2}-\d{2}):\s*\$?([0-9.]+)\s*\(([^)]+)\)$/);
            if (match) {
              return {
                date: match[1],
                price: parseFloat(match[2]),
                isCustom: match[3].toLowerCase().includes('custom')
              };
            }
            return null;
          });
          console.log('🧪 Parsed rates:', parsed);
          return parsed;
        }
      };
      console.log('🔧 Debug functions added to window.debugPropertyPage');
    }
  }, [selectedRoomType, bookingDetails]);

  const handleBookingDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Update state first
    setBookingDetails(prev => ({
      ...prev,
      [name]: name === 'guests' || name === 'rooms' ? parseInt(value) : value
    }));
    
    // If date fields were changed, schedule an automatic refresh after a short delay
    if (name === 'checkIn' || name === 'checkOut') {
      console.log(`Date changed: ${name} = ${value}`);
      
      // Show a message that dates have changed
      const dateChangeMessage = document.getElementById('date-change-message');
      if (dateChangeMessage) {
        dateChangeMessage.textContent = 'Dates changed! Click "Refresh Availability" to see updated room availability.';
        dateChangeMessage.style.display = 'block';
      }
    }
  };

  const handleRoomTypeChange = (roomTypeId: string) => {
    const roomType = property?.roomTypes.find(rt => rt.id === roomTypeId);
    if (roomType) {
      setSelectedRoomType(roomType);
      setBookingDetails(prev => ({
        ...prev,
        roomTypeId: roomType.id
      }));
      
      // Fetch room rates for the selected room type and date range
      fetchRoomRates(roomType.id, bookingDetails.checkIn, bookingDetails.checkOut);
    }
  };
  
  // Function to fetch room rates for the selected room type and date range
  const fetchRoomRates = async (roomTypeId: string, checkIn: string, checkOut: string) => {
    console.log(`🚀 fetchRoomRates called with:`, { roomTypeId, checkIn, checkOut });
    
    if (!roomTypeId || !checkIn || !checkOut) return;
    
    // Validate dates before sending request
    const checkInDate = new Date(`${checkIn}T12:00:00Z`);
    const checkOutDate = new Date(`${checkOut}T12:00:00Z`);
    
    // Make sure we have valid dates and check-in is before check-out
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      console.error('Invalid date format. Check-in:', checkIn, 'Check-out:', checkOut);
      return;
    }
    
    // If dates are the same, add one day to check-out to ensure at least one night
    let adjustedCheckOut = checkOut;
    if (checkInDate.getTime() >= checkOutDate.getTime()) {
      console.log('Adjusting check-out date because it was on or before check-in date');
      const nextDay = new Date(checkInDate);
      nextDay.setDate(nextDay.getDate() + 1);
      adjustedCheckOut = nextDay.toISOString().split('T')[0];
      console.log(`Adjusted check-out from ${checkOut} to ${adjustedCheckOut}`);
    }
    
    try {
      const timestamp = new Date().getTime();
      console.log(`Fetching rates with checkIn=${checkIn}, checkOut=${adjustedCheckOut}`);
      const response = await fetch(
        `/api/room-types/${roomTypeId}/rates?checkIn=${checkIn}&checkOut=${adjustedCheckOut}&_=${timestamp}`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          cache: 'no-store'
        }
      );
      
      if (!response.ok) {
        console.error('Failed to fetch room rates:', await response.text());
        return;
      }
      
      const data = await response.json();
      console.log('Fetched room rates:', data);
      
      // Add specific debugging for our problem dates
      if (checkIn === '2025-08-27' || checkIn === '08/27/2025') {
        console.log('SPECIAL DEBUG FOR 8/27-8/29 BOOKING:');
        console.log('API response daily rates:', JSON.stringify(data.dailyRates));
      }
      
      if (!data.dailyRates || !Array.isArray(data.dailyRates) || data.dailyRates.length === 0) {
        console.warn('No daily rates returned from API');
        return;
      }
      
      console.log(`Processing ${data.dailyRates.length} daily rates for dates from ${data.checkIn} to ${data.checkOut}`);
      
      // Map the rates for easier use - handle both string and object formats
      const roomTypeRates = data.dailyRates.map((rate: any, index: number) => {
        let dateStr: string;
        let priceNum: number;
        let isCustomRate = false;
        
        // Handle string format like "2025-08-27: $99.94 (custom)"
        if (typeof rate === 'string') {
          console.log(`🔍 Parsing rate string: "${rate}"`);
          const match = rate.match(/^(\d{4}-\d{2}-\d{2}):\s*\$?([0-9.]+)\s*\(([^)]+)\)$/);
          if (match) {
            dateStr = match[1];
            priceNum = parseFloat(match[2]);
            isCustomRate = match[3].toLowerCase().includes('custom');
            console.log(`✅ Parsed: date=${dateStr}, price=${priceNum}, isCustom=${isCustomRate}`);
          } else {
            console.error(`❌ Unable to parse rate string: ${rate}`);
            return null;
          }
        } 
        // Handle object format
        else if (typeof rate === 'object' && rate.date && rate.price !== undefined) {
          dateStr = rate.date;
          priceNum = typeof rate.price === 'number' ? rate.price : parseFloat(rate.price.toString());
          isCustomRate = rate.isCustomRate || false;
        } else {
          console.error(`Unknown rate format:`, rate);
          return null;
        }
        
        // Create date object
        let dateObj;
        try {
          console.log(`📅 Creating date object from: "${dateStr}"`);
          if (dateStr.includes('T')) {
            dateObj = new Date(dateStr);
          } else {
            dateObj = new Date(`${dateStr}T12:00:00Z`);
          }
          console.log(`📅 Created date object: ${dateObj.toISOString()}`);
        } catch (e) {
          console.error(`Error parsing date: ${dateStr}`, e);
          dateObj = new Date();
        }
        
        // Let's use the original dateStr directly instead of normalizing for now
        const normalizedDate = dateStr; // Skip normalization to see if that's the issue
        console.log(`📅 Using date as-is: ${normalizedDate}`);
        
        console.log(`Processing rate: date=${dateStr}, normalized=${normalizedDate}, price=${priceNum}, isCustom=${isCustomRate}`);
        
        return {
          id: `${roomTypeId}-${dateStr}`,
          roomTypeId,
          date: dateObj,
          price: priceNum,
          isCustomRate,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }).filter(Boolean); // Remove null entries
      
      console.log(`Created ${roomTypeRates.length} room type rate objects`);
      if (roomTypeRates.length > 0) {
        console.log('=== PROCESSED ROOM TYPE RATES ===');
        roomTypeRates.forEach((rate: any, i: number) => {
          const dateStr = rate.date instanceof Date ? normalizeDate(rate.date.toISOString()) : normalizeDate(rate.date);
          console.log(`  ${i}: ${dateStr} -> $${rate.price} (isCustom: ${rate.isCustomRate})`);
        });
      }
      
      // Update the selected room type with the fetched rates
      if (selectedRoomType && selectedRoomType.id === roomTypeId) {
        console.log(`🔄 Updating selectedRoomType with ${roomTypeRates.length} rates`);
        setSelectedRoomType(prevRoomType => {
          if (!prevRoomType) return null;
          
          const updatedRoomType = {
            ...prevRoomType,
            roomTypeRates
          };
          
          console.log('🔄 Updated selectedRoomType with rates:', updatedRoomType.roomTypeRates?.length);
          console.log('🔄 First rate in updated room type:', updatedRoomType.roomTypeRates?.[0]);
          
          // Force a price recalculation log
          setTimeout(() => {
            console.log('🔄 Triggering price calculation after state update...');
          }, 100);
          
          return updatedRoomType;
        });
      } else {
        console.log('❌ Not updating selectedRoomType - mismatch or null', {
          hasSelectedRoomType: !!selectedRoomType,
          selectedRoomTypeId: selectedRoomType?.id,
          targetRoomTypeId: roomTypeId
        });
      }
      
      // Also update the room type in the property object for all displayed room types
      setProperty(prevProperty => {
        if (!prevProperty) return null;
        
        const updatedRoomTypes = prevProperty.roomTypes.map(rt => {
          if (rt.id === roomTypeId) {
            return {
              ...rt,
              roomTypeRates
            };
          }
          return rt;
        });
        
        return {
          ...prevProperty,
          roomTypes: updatedRoomTypes
        };
      });
    } catch (error) {
      console.error('Error fetching room rates:', error);
    }
  };

  // Helper function for precise addition to avoid floating point errors
  const preciseAdd = (a: number, b: number): number => {
    // Using string manipulation to ensure exact decimal precision
    const aFixed = parseFloat(a.toFixed(2));
    const bFixed = parseFloat(b.toFixed(2));
    return parseFloat((aFixed + bFixed).toFixed(2));
  };

  const calculateTotalPrice = () => {
    console.log('🧮 calculateTotalPrice() called');
    
    if (!selectedRoomType || !bookingDetails.checkIn || !bookingDetails.checkOut) {
      console.log('calculateTotalPrice: Missing required data', { 
        hasSelectedRoomType: !!selectedRoomType, 
        checkIn: bookingDetails.checkIn, 
        checkOut: bookingDetails.checkOut 
      });
      return 0;
    }
    
    // Use our date utility function to normalize dates and calculate nights
    const normalizedCheckIn = normalizeDate(bookingDetails.checkIn);
    const normalizedCheckOut = normalizeDate(bookingDetails.checkOut, 1);
    
    // Calculate nights using our utility function
    const nights = calculateNights(normalizedCheckIn, normalizedCheckOut);
    
    if (nights <= 0) {
      console.log(`Invalid nights calculation: ${nights}. Using base price calculation.`);
      return parseFloat(selectedRoomType.basePrice.toString()) * bookingDetails.rooms;
    }
    
    console.log(`Calculating price for ${nights} nights from ${normalizedCheckIn} to ${normalizedCheckOut}`);
    
    // Special handling for the known case while debugging
    if (normalizedCheckIn === '2025-08-27' && normalizedCheckOut === '2025-08-29' && nights === 2) {
      console.log('*** SPECIAL CASE: 8/27-8/29 detected ***');
      
      // Check if we have the custom rates loaded
      const dailyRates = selectedRoomType.roomTypeRates || [];
      console.log(`Available daily rates for special case:`, dailyRates.length);
      
      if (dailyRates.length >= 2) {
        // We should have rates for both nights, let's use them
        const rateMap = new Map<string, number>();
        
        dailyRates.forEach(rate => {
          let dateStr: string;
          if (rate.date instanceof Date) {
            dateStr = normalizeDate(rate.date.toISOString());
          } else if (typeof rate.date === 'string') {
            dateStr = normalizeDate(rate.date);
          } else {
            return;
          }
          
          const price = parseFloat(rate.price.toString());
          if (!isNaN(price)) {
            rateMap.set(dateStr, price);
          }
        });
        
        const rate1 = rateMap.get('2025-08-27');
        const rate2 = rateMap.get('2025-08-28');
        
        if (rate1 !== undefined && rate2 !== undefined) {
          const total = parseFloat((rate1 + rate2).toFixed(2)) * bookingDetails.rooms;
          console.log(`*** USING CUSTOM RATES: $${rate1} + $${rate2} = $${(rate1 + rate2).toFixed(2)} × ${bookingDetails.rooms} rooms = $${total} ***`);
          console.log(`*** SPECIAL CASE TOTAL PRICE BEING RETURNED: $${total.toFixed(2)} ***`);
          return total;
        } else {
          console.log('*** Custom rates not found in map, using general calculation ***');
        }
      } else {
        console.log('*** Custom rates not loaded yet, using general calculation ***');
      }
    }
    
    // Check if we have custom daily rates for this room type
    const dailyRates = selectedRoomType.roomTypeRates || [];
    console.log(`Available daily rates for calculation:`, dailyRates.length);
    
    if (dailyRates.length > 0) {
      // Log all available rates for debugging
      console.log('All available room type rates:');
      dailyRates.forEach((rate, i) => {
        const dateStr = rate.date instanceof Date ? normalizeDate(rate.date.toISOString()) : normalizeDate(rate.date);
        console.log(`  ${i}: ${dateStr} -> $${rate.price} (isCustom: ${rate.isCustomRate})`);
      });
      
      // Create a date to price mapping for quick lookup
      const rateMap = new Map<string, number>();
      
      dailyRates.forEach(rate => {
        let dateStr: string;
        console.log(`🗓️ Processing rate for map:`, rate);
        
        if (rate.date instanceof Date) {
          // For Date objects, get YYYY-MM-DD format
          dateStr = rate.date.toISOString().split('T')[0];
        } else if (typeof rate.date === 'string') {
          // For string dates, use as-is if already in YYYY-MM-DD format
          const dateString = rate.date as string;
          if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateStr = dateString;
          } else {
            dateStr = normalizeDate(dateString);
          }
        } else {
          console.error('Unknown date format in rate:', rate);
          return;
        }
        
        const price = parseFloat(rate.price.toString());
        if (!isNaN(price)) {
          rateMap.set(dateStr, price);
          console.log(`Added to rate map: ${dateStr} -> $${price}`);
        }
      });
      
      // Generate all stay dates (excluding checkout date)
      const stayDates: string[] = [];
      const checkIn = new Date(`${normalizedCheckIn}T12:00:00Z`);
      const checkOut = new Date(`${normalizedCheckOut}T12:00:00Z`);
      const currentDate = new Date(checkIn);
      
      console.log(`🗓️ Generating stay dates from ${checkIn.toISOString()} to ${checkOut.toISOString()}`);
      
      while (currentDate < checkOut) {
        const dateStr = currentDate.toISOString().split('T')[0]; // Get YYYY-MM-DD format
        stayDates.push(dateStr);
        console.log(`🗓️ Added stay date: ${dateStr}`);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Calculate total by summing up daily rates
      let subtotal = 0;
      const basePrice = parseFloat(selectedRoomType.basePrice.toString());
      
      console.log('=== CALCULATING TOTAL PRICE ===');
      console.log(`Stay dates: ${stayDates.join(', ')}`);
      console.log(`Rate map contents:`, Array.from(rateMap.entries()));
      console.log(`Base price: $${basePrice}`);
      
      stayDates.forEach(dateStr => {
        const dayRate = rateMap.has(dateStr) ? rateMap.get(dateStr)! : basePrice;
        const rateType = rateMap.has(dateStr) ? 'custom' : 'base';
        
        subtotal = preciseAdd(subtotal, dayRate);
        console.log(`- ${dateStr}: $${dayRate.toFixed(2)} (${rateType} rate) | Running total: $${subtotal.toFixed(2)}`);
      });
      
      // Multiply by number of rooms
      const totalPrice = parseFloat((subtotal * bookingDetails.rooms).toFixed(2));
      
      console.log(`=== FINAL CALCULATION ===`);
      console.log(`Subtotal: $${subtotal.toFixed(2)} × ${bookingDetails.rooms} room(s) = $${totalPrice.toFixed(2)}`);
      console.log(`Expected for 8/27-8/29: $99.94 + $100.00 = $199.94`);
      console.log(`*** TOTAL PRICE BEING RETURNED: $${totalPrice.toFixed(2)} ***`);
      return totalPrice;
      
    } else {
      // Fallback to simple calculation if no daily rates available
      const basePrice = parseFloat(selectedRoomType.basePrice.toString());
      const totalPrice = parseFloat((basePrice * nights * bookingDetails.rooms).toFixed(2));
      
      console.log(`Using base price: $${basePrice} × ${nights} nights × ${bookingDetails.rooms} rooms = $${totalPrice.toFixed(2)}`);
      console.log(`*** TOTAL PRICE BEING RETURNED (BASE): $${totalPrice.toFixed(2)} ***`);
      return totalPrice;
    }
  };

  const refreshAvailability = () => {
    // Force refresh with current dates
    const timestamp = new Date().getTime();
    
    // Use our date utility function for consistent normalization
    const cleanCheckIn = normalizeDate(bookingDetails.checkIn);
    const cleanCheckOut = normalizeDate(bookingDetails.checkOut, 1);
    
    // Check if dates are valid
    if (!cleanCheckIn || !cleanCheckOut) {
      alert('Please select valid check-in and check-out dates');
      return;
    }
    
    try {
      // Clear any existing search data first to prevent stale state
      sessionStorage.removeItem('lastSearch');
      
      // Store search parameters in session storage for consistency
      // This exactly matches the format used in the properties listing page
      const searchData = {
        checkIn: cleanCheckIn || '',
        checkOut: cleanCheckOut || '',
        guests: bookingDetails.guests || '',
        propertyId: propertyId
      };
      
      sessionStorage.setItem('lastSearch', JSON.stringify(searchData));
      console.log('Stored search data for availability refresh:', searchData);
    } catch (error) {
      console.error('Error storing booking search:', error);
      
      // If session storage fails, we still want to continue with the page refresh
    }
    
    // Show loading indicator
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.textContent = 'Refreshing...';
      refreshBtn.classList.add('opacity-50');
    }
    
    // Build URL parameters
    const params = new URLSearchParams();
    if (cleanCheckIn) params.append('checkIn', cleanCheckIn);
    if (cleanCheckOut) params.append('checkOut', cleanCheckOut);
    if (bookingDetails.guests) params.append('guests', bookingDetails.guests.toString());
    params.append('_t', timestamp.toString());
    
    // Navigate to the URL with parameters but don't force an additional reload
    const url = `/properties/${propertyId}?${params.toString()}`;
    console.log('Refreshing availability with URL:', url);
    
    // Update the URL which will load fresh data
    window.location.href = url;
  };
  
  const handleBookNow = async () => {
    try {
      setIsBooking(true);
      setBookingError('');
      
      // Validate dates before proceeding
      if (!bookingDetails.checkIn || !bookingDetails.checkOut) {
        setBookingError('Please select both check-in and check-out dates');
        setIsBooking(false);
        return;
      }
      
      const checkInDate = new Date(bookingDetails.checkIn);
      const checkOutDate = new Date(bookingDetails.checkOut);
      
      if (checkOutDate <= checkInDate) {
        setBookingError('Check-out date must be after check-in date');
        setIsBooking(false);
        return;
      }
      
      if (!bookingDetails.roomTypeId) {
        setBookingError('Please select a room type');
        setIsBooking(false);
        return;
      }
      
      // Validate payment details
      if (!bookingDetails.cardNumber || !bookingDetails.cardExpMonth || 
          !bookingDetails.cardExpYear || !bookingDetails.cardCvv || !bookingDetails.billingName) {
        setBookingError('Please fill in all payment details');
        setIsBooking(false);
        return;
      }
      
      // Validate card number format (basic validation)
      const cleanCard = bookingDetails.cardNumber.replace(/\s/g, '');
      if (!/^\d{13,19}$/.test(cleanCard)) {
        setBookingError('Please enter a valid card number');
        setIsBooking(false);
        return;
      }
      
      // Validate expiry
      const expMonth = parseInt(bookingDetails.cardExpMonth);
      const expYear = parseInt(bookingDetails.cardExpYear);
      if (expMonth < 1 || expMonth > 12) {
        setBookingError('Please enter a valid expiry month (01-12)');
        setIsBooking(false);
        return;
      }
      
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        setBookingError('Card has expired');
        setIsBooking(false);
        return;
      }
      
      // Validate CVV
      if (!/^\d{3,4}$/.test(bookingDetails.cardCvv)) {
        setBookingError('Please enter a valid CVV (3 or 4 digits)');
        setIsBooking(false);
        return;
      }
      
      // Check if user is logged in
      const authResponse = await fetch('/api/auth/session');
      const authData = await authResponse.json();
      
      if (!authData.user) {
        // Save booking details to session storage and redirect to login
        sessionStorage.setItem('pendingBooking', JSON.stringify({
          propertyId: propertyId,
          ...bookingDetails
        }));
        
        router.push('/login?redirect=/properties/' + propertyId);
        return;
      }
      
      // Format dates consistently as YYYY-MM-DD for the API using our utility
      const formattedCheckIn = normalizeDate(bookingDetails.checkIn);
      const formattedCheckOut = normalizeDate(bookingDetails.checkOut, 1); // fallback to tomorrow if invalid
        
      console.log('Creating booking with dates:', {
        original: {
          checkIn: bookingDetails.checkIn,
          checkOut: bookingDetails.checkOut
        },
        formatted: {
          checkIn: formattedCheckIn,
          checkOut: formattedCheckOut
        }
      });
      
      // Store the final booking details for consistency across the flow
      storeBookingSearch({
        checkIn: formattedCheckIn,
        checkOut: formattedCheckOut,
        guests: bookingDetails.guests,
        propertyId
      });
      
      // User is logged in, proceed with booking
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: propertyId,
          roomTypeId: bookingDetails.roomTypeId,
          checkIn: formattedCheckIn,
          checkOut: formattedCheckOut,
          guests: bookingDetails.guests,
          rooms: bookingDetails.rooms,
          totalPrice: calculateTotalPrice(),
          // Payment details
          cardNumber: bookingDetails.cardNumber,
          cardExpMonth: bookingDetails.cardExpMonth,
          cardExpYear: bookingDetails.cardExpYear,
          cardCvv: bookingDetails.cardCvv,
          billingName: bookingDetails.billingName,
          billingZip: bookingDetails.billingZip
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create booking');
      }
      
      setBookingSuccess(true);
      
      // Redirect to bookings page after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      
    } catch (err: Error | unknown) {
      console.error('Error creating booking:', err);
      setBookingError(err instanceof Error ? err.message : 'An error occurred during booking. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[70vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-red-600 mb-2">{error || 'Property not found'}</h3>
            <Button onClick={() => router.push('/properties')}>Back to Properties</Button>
          </div>
        </div>
      </div>
    );
  }

  const mainPhoto = property.photos.find(p => p.isMain)?.url || property.photos[0]?.url;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Property Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.name}</h1>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">
                  {property.address}, {property.city}, {property.state} {property.zipCode}
                </span>
              </div>
            </div>
            <div className="flex items-center mt-2 lg:mt-0">
              <div className="flex items-center bg-blue-50 px-3 py-1 rounded-lg">
                <Star className="h-5 w-5 text-yellow-500 fill-current" />
                <span className="ml-1 font-semibold text-gray-800">4.8</span>
                <span className="ml-1 text-gray-500">(42 reviews)</span>
              </div>
            </div>
          </div>
          
          {/* Property Photo Carousel */}
          <ImageCarousel 
            photos={property.photos} 
            alt={property.name}
            height="h-72 md:h-80"
            autoPlay={true}
            autoPlayInterval={5000}
          />
        </div>

        {/* Property Description & Amenities */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">About this property</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <p className="text-gray-700 mb-6">{property.description || 'No description available.'}</p>
            
            <h3 className="font-semibold text-lg mb-3">Amenities</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {property.amenities.map((amenity, i) => (
                <div key={i} className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                  <span>{amenity}</span>
                </div>
              ))}
              {property.amenities.length === 0 && (
                <span className="text-gray-500">No amenities listed</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Room Types */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Available Rooms</h2>
            
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-500">
                {bookingDetails.checkIn && bookingDetails.checkOut && (
                  <span>
                    For {formatDateForDisplay(bookingDetails.checkIn, 'short')} - {formatDateForDisplay(bookingDetails.checkOut, 'short')}
                  </span>
                )}
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center space-x-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => {
                  // Show a brief message to indicate refresh is happening
                  const refreshBtn = document.getElementById('refresh-btn');
                  if (refreshBtn) {
                    refreshBtn.classList.add('pointer-events-none');
                    refreshBtn.querySelector('span')!.textContent = 'Refreshing...';
                  }
                  // Call the refresh function after a brief delay
                  setTimeout(refreshAvailability, 100);
                }}
                id="refresh-btn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin duration-1000">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                </svg>
                <span>Refresh Availability</span>
              </Button>
            </div>
          </div>
          
          {property.roomTypes.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <p className="text-gray-500">No rooms available at this property.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {property.roomTypes.map(roomType => {
                const roomPhoto = roomType.photos.find(p => p.isMain)?.url || 
                                 roomType.photos[0]?.url || 
                                 mainPhoto;
                // Ensure we're using the calculated available rooms correctly
                // Use calculatedAvailableRooms if available (from date-specific check)
                // Otherwise fall back to the standard availableRooms
                // Handle both scenarios - either we have calculatedAvailableRooms as a number
                // or we have the new structure with { availableRooms, availabilityByDate }
                let availableRooms = 0;
                
                if ((roomType as any).calculatedAvailableRooms !== undefined) {
                  // If calculatedAvailableRooms is a number, use it directly
                  if (typeof (roomType as any).calculatedAvailableRooms === 'number') {
                    availableRooms = (roomType as any).calculatedAvailableRooms;
                  } 
                  // If it's an object with the new structure, extract just the availableRooms number
                  else if (typeof (roomType as any).calculatedAvailableRooms === 'object' && 
                          (roomType as any).calculatedAvailableRooms?.availableRooms !== undefined) {
                    availableRooms = (roomType as any).calculatedAvailableRooms.availableRooms;
                  }
                } else {
                  // Fall back to other available properties
                  availableRooms = (roomType as any).availableRooms || roomType.totalRooms;
                }
                
                const isAvailable = (availableRooms > 0) && roomType.isActive;
                
                console.log(`Rendering room type ${roomType.name}: isAvailable=${isAvailable}, availableRooms=${availableRooms}, calculatedAvailable=${(roomType as any).calculatedAvailableRooms}`);
                
                return (
                  <Card 
                    key={roomType.id}
                    className={`overflow-hidden hover:shadow-md transition-shadow ${
                      selectedRoomType?.id === roomType.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => isAvailable && handleRoomTypeChange(roomType.id)}
                  >
                    <div className="relative">
                      <ImageCarousel 
                        photos={roomType.photos.length > 0 ? roomType.photos : (property.photos.length > 0 ? [property.photos[0]] : [])} 
                        alt={roomType.name}
                        height="h-48"
                        autoPlay={false}
                      />
                      
                      {!isAvailable && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                          <Badge variant="destructive" className="text-lg py-1 px-3">
                            Not Available
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle>{roomType.name}</CardTitle>
                        <div className="text-xl font-bold text-blue-600">
                          ${(() => {
                            // Get the rate for the check-in date or fall back to base price
                            try {
                              if (roomType.roomTypeRates && roomType.roomTypeRates.length > 0 && 
                                  bookingDetails.checkIn) {
                                
                                const checkInDate = bookingDetails.checkIn; // Use raw date format
                                console.log(`🏷️ Room card price lookup for: ${checkInDate}`);
                                
                                // Find matching rate for check-in date
                                for (const rate of roomType.roomTypeRates) {
                                  let rateDate;
                                  if (rate.date instanceof Date) {
                                    rateDate = rate.date.toISOString().split('T')[0]; // Get YYYY-MM-DD format
                                  } else if (typeof rate.date === 'string') {
                                    rateDate = rate.date; // Use as-is
                                  } else {
                                    continue;
                                  }
                                  
                                  console.log(`🏷️ Comparing rate date ${rateDate} with check-in ${checkInDate}`);
                                  
                                  if (rateDate === checkInDate) {
                                    const price = parseFloat(rate.price.toString());
                                    console.log(`🏷️ Found matching rate: $${price} for ${rateDate}`);
                                    return price.toFixed(2);
                                  }
                                }
                                
                                // If no exact match, use first available rate
                                if (roomType.roomTypeRates[0]) {
                                  const price = parseFloat(roomType.roomTypeRates[0].price.toString());
                                  console.log(`🏷️ Using first available rate: $${price}`);
                                  return price.toFixed(2);
                                }
                              }
                            } catch (error) {
                              console.error('Error finding custom rate:', error);
                            }
                            
                            // Fallback to base price
                            const basePrice = parseFloat(roomType.basePrice.toString());
                            console.log(`🏷️ Using base price: $${basePrice}`);
                            return basePrice.toFixed(2);
                          })()}
                          <span className="text-sm font-normal text-gray-500">/night</span>
                        </div>
                      </div>
                      <CardDescription>
                        Up to {roomType.capacity} guests
                        {roomType.roomTypeRates && roomType.roomTypeRates.length > 0 && (
                          <span className="ml-2 text-xs text-green-600">*Custom rates available</span>
                        )}
                      </CardDescription>
                      <div className="mt-1 text-sm text-muted-foreground flex flex-col space-y-1">
                        <div className="flex items-center">
                          {/* Use the calculatedAvailableRooms property if available, or fall back to the regular property */}
                          <span className={`font-medium ${availableRooms > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {availableRooms} {availableRooms === 1 ? 'room' : 'rooms'} available
                          </span>
                          
                          {bookingDetails.checkIn && bookingDetails.checkOut && (
                            <span className="ml-2 text-xs text-gray-500">
                              for {formatDateForDisplay(bookingDetails.checkIn)} - {formatDateForDisplay(bookingDetails.checkOut)}
                            </span>
                          )}
                          
                          {/* Show per-date availability if available */}
                          {(roomType as any).availabilityByDate && Object.keys((roomType as any).availabilityByDate).length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              <details>
                                <summary className="cursor-pointer hover:text-blue-500">View availability by date</summary>
                                <div className="mt-1 pl-2 border-l-2 border-gray-200">
                                  {Object.entries((roomType as any).availabilityByDate).map(([date, available]) => (
                                    <div key={date} className="flex justify-between">
                                      <span>{formatDateForDisplay(date)}</span>
                                      <span className={Number(available) > 0 ? 'text-green-600' : 'text-red-600'}>
                                        {String(available)}/{roomType.totalRooms} available
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          )}
                        </div>
                        
                        {availableRooms > 0 && bookingDetails.checkIn && bookingDetails.checkOut && (
                          <div className="text-xs text-green-700 flex items-center mt-1">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> 
                            Available for your selected dates
                          </div>
                        )}
                        
                        {roomType.totalRooms > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {availableRooms}/{roomType.totalRooms} total rooms
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        {roomType.description || 'Comfortable accommodation with standard amenities.'}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {roomType.amenities.map((amenity, i) => (
                          <Badge key={i} variant="outline" className="bg-blue-50">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="mt-4">
                        <Button 
                          className="w-full"
                          disabled={!isAvailable}
                          onClick={() => {
                            setSelectedRoomType(roomType);
                            setBookingDetails(prev => ({
                              ...prev,
                              roomTypeId: roomType.id
                            }));
                            setShowBookingForm(true);
                          }}
                        >
                          {isAvailable ? 'Select Room' : 'Not Available'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Booking Form */}
        {showBookingForm && selectedRoomType && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            {(() => {
              console.log('🎫 Booking form rendered for room type:', selectedRoomType.name);
              console.log('🎫 Room type has rates:', selectedRoomType.roomTypeRates?.length || 0);
              return null;
            })()}
            <h2 className="text-2xl font-bold mb-4">Book Your Stay</h2>
            
            {bookingSuccess ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <h3 className="text-lg font-medium text-green-800 mb-2">Booking Successful!</h3>
                <p className="text-green-700 mb-4">Your booking has been confirmed. Redirecting to your dashboard...</p>
              </div>
            ) : (
              <>
                {bookingError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
                    <p className="text-red-700">{bookingError}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Check-in Date</label>
                    <Input 
                      type="date"
                      name="checkIn"
                      value={bookingDetails.checkIn}
                      onChange={handleBookingDetailsChange}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Check-out Date</label>
                    <Input 
                      type="date"
                      name="checkOut"
                      value={bookingDetails.checkOut}
                      onChange={handleBookingDetailsChange}
                      min={bookingDetails.checkIn}
                    />
                  </div>
                </div>
                
                {/* Date validation message */}
                {bookingDetails.checkIn && bookingDetails.checkOut && 
                 new Date(bookingDetails.checkOut) <= new Date(bookingDetails.checkIn) && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    Check-out date must be after check-in date
                  </div>
                )}
                
                {/* Date change notification */}
                <div 
                  id="date-change-message" 
                  className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md text-sm hidden"
                ></div>
                
                {/* Refresh button for date changes */}
                <div className="mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={refreshAvailability}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                    </svg>
                    Refresh Availability
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Guests</label>
                    <select
                      name="guests"
                      value={bookingDetails.guests}
                      onChange={handleBookingDetailsChange}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: selectedRoomType.capacity }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} guest{num !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Rooms</label>
                    <select
                      name="rooms"
                      value={bookingDetails.rooms}
                      onChange={handleBookingDetailsChange}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Array.from({ length: Math.min(5, getAvailableRoomsCount(selectedRoomType)) }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} room{num !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Payment Details Section */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="14" x="2" y="5" rx="2"/>
                      <line x1="2" x2="22" y1="10" y2="10"/>
                    </svg>
                    Payment Details
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">Your card will not be charged. We collect payment details for reservation guarantee only.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Name on Card *</label>
                      <Input 
                        type="text"
                        name="billingName"
                        value={bookingDetails.billingName}
                        onChange={handleBookingDetailsChange}
                        placeholder="John Doe"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Card Number *</label>
                      <Input 
                        type="text"
                        name="cardNumber"
                        value={bookingDetails.cardNumber}
                        onChange={(e) => {
                          // Format card number with spaces every 4 digits
                          let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                          value = value.substring(0, 16);
                          const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                          setBookingDetails(prev => ({ ...prev, cardNumber: formatted }));
                        }}
                        placeholder="1234 5678 9012 3456"
                        className="w-full"
                        maxLength={19}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Exp Month *</label>
                        <select
                          name="cardExpMonth"
                          value={bookingDetails.cardExpMonth}
                          onChange={handleBookingDetailsChange}
                          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">MM</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                            <option key={month} value={month.toString().padStart(2, '0')}>
                              {month.toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Exp Year *</label>
                        <select
                          name="cardExpYear"
                          value={bookingDetails.cardExpYear}
                          onChange={handleBookingDetailsChange}
                          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">YY</option>
                          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() % 100 + i).map(year => (
                            <option key={year} value={year.toString()}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">CVV *</label>
                        <Input 
                          type="text"
                          name="cardCvv"
                          value={bookingDetails.cardCvv}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').substring(0, 4);
                            setBookingDetails(prev => ({ ...prev, cardCvv: value }));
                          }}
                          placeholder="123"
                          className="w-full"
                          maxLength={4}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Billing Zip Code</label>
                      <Input 
                        type="text"
                        name="billingZip"
                        value={bookingDetails.billingZip}
                        onChange={handleBookingDetailsChange}
                        placeholder="12345"
                        className="w-full max-w-[150px]"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold">Selected Room:</span>
                    <span>{selectedRoomType.name}</span>
                  </div>
                  
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold">Price per night:</span>
                  <span>${(() => {
                    try {
                      // Find rate for check-in date
                      if (selectedRoomType?.roomTypeRates && selectedRoomType.roomTypeRates.length > 0 &&
                          bookingDetails.checkIn) {
                        
                        const checkInDate = bookingDetails.checkIn; // Use raw date format
                        console.log(`💰 Booking form price lookup for: ${checkInDate}`);
                        
                        // Look for matching rate for check-in date
                        for (const rate of selectedRoomType.roomTypeRates) {
                          let rateDate;
                          if (rate.date instanceof Date) {
                            rateDate = rate.date.toISOString().split('T')[0]; // Get YYYY-MM-DD format
                          } else if (typeof rate.date === 'string') {
                            rateDate = rate.date; // Use as-is
                          } else {
                            continue;
                          }
                          
                          console.log(`💰 Comparing rate date ${rateDate} with check-in ${checkInDate}`);
                          
                          if (rateDate === checkInDate) {
                            const price = parseFloat(rate.price.toString());
                            console.log(`💰 Found matching rate: $${price} for ${rateDate}`);
                            return price.toFixed(2);
                          }
                        }
                        
                        // If no exact match, use first available rate
                        if (selectedRoomType.roomTypeRates[0]) {
                          const price = parseFloat(selectedRoomType.roomTypeRates[0].price.toString());
                          console.log(`💰 Using first available rate: $${price}`);
                          return price.toFixed(2);
                        }
                      }
                      
                      // Fallback to base price
                      const basePrice = parseFloat(selectedRoomType?.basePrice.toString() || "0");
                      console.log(`💰 Using base price: $${basePrice}`);
                      return basePrice.toFixed(2);
                    } catch (error) {
                      console.error('Error calculating price per night:', error);
                      return selectedRoomType ? parseFloat(selectedRoomType.basePrice.toString()).toFixed(2) : "0.00";
                    }
                  })()}</span>
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold">Available for selected dates:</span>
                  <span className={`font-semibold ${getAvailableRoomsCount(selectedRoomType) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {getAvailableRoomsCount(selectedRoomType)} rooms
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold">Total Price:</span>
                  <div className="text-right">
                    <span className="text-xl font-bold text-blue-600">
                      ${(() => {
                        const total = calculateTotalPrice();
                        console.log(`🔥 UI DISPLAY: Total price calculated as $${total.toFixed(2)}`);
                        console.log(`🔥 Selected room type has ${selectedRoomType?.roomTypeRates?.length || 0} rates`);
                        console.log(`🔥 Booking details:`, {
                          checkIn: bookingDetails.checkIn,
                          checkOut: bookingDetails.checkOut,
                          rooms: bookingDetails.rooms
                        });
                        return total.toFixed(2);
                      })()}
                    </span>
                    {selectedRoomType?.roomTypeRates && selectedRoomType.roomTypeRates.length > 0 && (
                      <div className="text-xs text-green-600">*Custom rates applied</div>
                    )}
                  </div>
                </div>
                
                  <Button
                    className="w-full mt-4"
                    disabled={isBooking || !bookingDetails.checkIn || !bookingDetails.checkOut || 
                             new Date(bookingDetails.checkOut) <= new Date(bookingDetails.checkIn) ||
                             !bookingDetails.cardNumber || !bookingDetails.cardExpMonth || 
                             !bookingDetails.cardExpYear || !bookingDetails.cardCvv || !bookingDetails.billingName}
                    onClick={handleBookNow}
                  >
                    {isBooking ? 'Processing...' : 'Book Now'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
