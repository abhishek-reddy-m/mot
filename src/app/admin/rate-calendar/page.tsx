'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { DollarSign, Loader2, CheckCircle2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, getDay } from 'date-fns';

// Custom weekend function: Friday (5) and Saturday (6) are weekend days for hotel pricing
const isWeekendDay = (date: Date): boolean => {
  const day = getDay(date);
  return day === 5 || day === 6; // Friday = 5, Saturday = 6
};

type Property = {
  id: string;
  name: string;
};

type RoomType = {
  id: string;
  name: string;
  basePrice: number;
  propertyId: string;
};

type RoomTypeRate = {
  id?: string;
  date: Date | string; // Allow both Date objects and string dates
  price: number;
  roomTypeId: string;
};

export default function RateCalendarPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rates, setRates] = useState<RoomTypeRate[]>([]);
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Redirect to login if authentication fails
  useEffect(() => {
    if (error && (error.includes('Unauthorized') || error.includes('401'))) {
      router.push('/admin/login');
    }
  }, [error, router]);

  // Fetch properties on component mount
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch('/api/admin/properties', {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          credentials: 'include' // Important for sending cookies/session info
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch properties: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format from API');
        }
        
        setProperties(data);
        
        if (data.length > 0) {
          setSelectedPropertyId(data[0].id);
        } else {
          setError('No properties found. Please create a property first.');
        }
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError(err instanceof Error ? err.message : 'Failed to load properties. Please try again.');
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  // Fetch room types when property is selected
  useEffect(() => {
    if (!selectedPropertyId) return;
    
    const fetchRoomTypes = async () => {
      try {
        setLoading(true);
        setError('');
        setRoomTypes([]);
        
        const response = await fetch(`/api/admin/properties/${selectedPropertyId}/room-types`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch room types: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format from room types API');
        }
        
        setRoomTypes(data);
        
        if (data.length > 0) {
          setSelectedRoomTypeId(data[0].id);
        } else {
          setSelectedRoomTypeId('');
          setError('No room types found for this property. Please add room types first.');
        }
      } catch (err) {
        console.error('Error fetching room types:', err);
        setError(err instanceof Error ? err.message : 'Failed to load room types. Please try again.');
        setRoomTypes([]);
        setSelectedRoomTypeId('');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomTypes();
  }, [selectedPropertyId]);

  // Fetch rates when room type and month are selected
  useEffect(() => {
    if (!selectedRoomTypeId) return;
    
    const fetchRates = async () => {
      try {
        setLoading(true);
        setRates([]); // Clear existing rates
        const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
        
        console.log(`Fetching rates for room type ${selectedRoomTypeId} from ${startDate} to ${endDate}`);
        console.log(`🗓️ Date range: ${startDate} to ${endDate} (should include Aug 31st)`);
        
        // Add cache-busting parameter to prevent browser caching
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/admin/room-types/${selectedRoomTypeId}/rates?startDate=${startDate}&endDate=${endDate}&_=${timestamp}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch rates');
        }
        
        const data = await response.json();
        console.log('🔍 Fetched rates from API:', data);
        
        // Keep dates as strings to avoid timezone conversion issues
        const formattedRates = Array.isArray(data) ? data.map((rate: any) => ({
          ...rate,
          date: rate.date // Keep as string in YYYY-MM-DD format
        })) : [];
        
        console.log('📝 Formatted rates for state:', formattedRates.map(r => ({
          date: r.date,
          price: r.price,
          dateType: typeof r.date
        })));
        
        // Show first few rates with more detail
        console.log('🔍 First 5 rates in detail:', formattedRates.slice(0, 5));
        
        // Show our specific test dates
        const testRates = formattedRates.filter(r => 
          r.date === '2025-08-27' || r.date === '2025-08-28' || r.date === '2025-08-31'
        );
        console.log('🎯 Test dates (27th, 28th, and 31st):', testRates);
        
        // Check if Aug 31st is in the API response
        const aug31Rate = formattedRates.find(r => r.date === '2025-08-31');
        if (aug31Rate) {
          console.log('✅ Aug 31st found in API response:', aug31Rate);
        } else {
          console.log('❌ Aug 31st NOT found in API response');
          console.log('Available dates:', formattedRates.map(r => r.date).sort());
        }
        
        setRates(formattedRates);
      } catch (err) {
        console.error('Error fetching rates:', err);
        setError('Failed to load rates. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, [selectedRoomTypeId, selectedMonth]);

  // Get all days in the selected month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth)
  });

  // Get the base price for the selected room type
  const getBasePrice = (): number => {
    const roomType = roomTypes.find(rt => rt.id === selectedRoomTypeId);
    return roomType ? parseFloat(roomType.basePrice.toString()) : 0;
  };

  // Get the rate for a specific day
  const getDayRate = (day: Date): number => {
    // Normalize the day to 'yyyy-MM-dd' format to compare with stored string dates
    const normalizedDayStr = format(day, 'yyyy-MM-dd');
    
    const rate = rates.find(r => {
      // Since we're now keeping dates as strings, compare directly
      const rateDateStr = typeof r.date === 'string' ? r.date : format(new Date(r.date), 'yyyy-MM-dd');
      return normalizedDayStr === rateDateStr;
    });
    
    if (rate) {
      console.log(`✅ Found rate for ${normalizedDayStr}: $${rate.price}`);
      return parseFloat(rate.price.toString());
    } else {
      console.log(`❌ No rate found for ${normalizedDayStr}, using base price: $${getBasePrice()}`);
      
      // Special debugging for Aug 31st
      if (normalizedDayStr === '2025-08-31') {
        console.log('🔍 Debugging Aug 31st:');
        console.log('Total rates in state:', rates.length);
        console.log('Rate dates:', rates.map(r => typeof r.date === 'string' ? r.date : format(new Date(r.date), 'yyyy-MM-dd')).sort());
        console.log('Looking for exact match:', normalizedDayStr);
      }
      
      return getBasePrice();
    }
  };

  // Update rate for a specific day
  const updateDayRate = (day: Date, price: number) => {
    // Validate price
    if (isNaN(price) || price < 0) {
      setError('Price must be a valid number greater than or equal to 0');
      return;
    }
    
    // Format to 2 decimal places
    const formattedPrice = parseFloat(price.toFixed(2));
    
    // Get the normalized date string for comparison
    const normalizedDayStr = format(day, 'yyyy-MM-dd');
    
    console.log(`📝 Updating rate for ${normalizedDayStr} to $${formattedPrice}`);
    
    const updatedRates = [...rates];
    const index = updatedRates.findIndex(r => {
      const rateDateStr = typeof r.date === 'string' ? r.date : format(new Date(r.date), 'yyyy-MM-dd');
      return rateDateStr === normalizedDayStr;
    });
    
    if (index !== -1) {
      console.log(`✏️ Updated existing rate at index ${index} for ${normalizedDayStr}`);
      updatedRates[index] = { ...updatedRates[index], price: formattedPrice };
    } else {
      console.log(`➕ Added new rate for ${normalizedDayStr}`);
      updatedRates.push({
        date: normalizedDayStr, // Store as string instead of Date object
        price: formattedPrice,
        roomTypeId: selectedRoomTypeId
      });
    }
    
    setRates(updatedRates);
    
    // Clear any existing error message when a valid price is set
    if (error.includes('Price must be')) {
      setError('');
    }
  };

  // Save all rates
  const saveRates = async () => {
    try {
      setSaving(true);
      setError('');
      
      // Validate each rate before sending
      const validRates = rates.filter(rate => {
        const price = parseFloat(rate.price.toString());
        return !isNaN(price) && price >= 0;
      });
      
      if (validRates.length === 0) {
        throw new Error('No valid rates to save');
      }
      
      // Log what we're about to send to the API
      const ratesToSend = validRates.map(rate => {
        // Keep date as string if it's already in YYYY-MM-DD format, otherwise format it
        let dateString: string;
        if (typeof rate.date === 'string' && rate.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dateString = rate.date;
        } else {
          dateString = format(new Date(rate.date), 'yyyy-MM-dd');
        }
        
        return {
          ...rate,
          date: dateString
        };
      });
      
      console.log('💾 Saving rates to API:', ratesToSend.map(r => ({ date: r.date, price: r.price })));
      
      // Send rates to API
      const response = await fetch(`/api/admin/room-types/${selectedRoomTypeId}/rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          rates: ratesToSend
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save rates: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log('Rates saved successfully:', responseData);
      
      setSuccess(true);
      
      // Refresh the rates after saving
      const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
      const timestamp = new Date().getTime();
      
      const refreshResponse = await fetch(`/api/admin/room-types/${selectedRoomTypeId}/rates?startDate=${startDate}&endDate=${endDate}&_=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        console.log('Refreshed rates:', refreshData);
        
        // Keep dates as strings to avoid timezone conversion issues
        const refreshedRates = Array.isArray(refreshData) ? refreshData.map((rate: any) => ({
          ...rate,
          date: rate.date // Keep as string in YYYY-MM-DD format
        })) : [];
        
        setRates(refreshedRates);
      } else {
        console.error('Failed to refresh rates after saving');
      }
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error('Error saving rates:', err);
      setError(err instanceof Error ? err.message : 'Failed to save rates. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Get previous month
  const goToPreviousMonth = () => {
    setSelectedMonth(prevMonth => addMonths(prevMonth, -1));
  };

  // Get next month
  const goToNextMonth = () => {
    setSelectedMonth(prevMonth => addMonths(prevMonth, 1));
  };

  // Manually refresh rates
  const refreshRates = async () => {
    if (!selectedRoomTypeId) return;
    
    try {
      setLoading(true);
      setRates([]); // Clear existing rates
      const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
      
      // Add cache-busting parameter to prevent browser caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/admin/room-types/${selectedRoomTypeId}/rates?startDate=${startDate}&endDate=${endDate}&_=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch rates');
      }
      
      const data = await response.json();
      
      // Keep dates as strings to avoid timezone conversion issues
      const formattedRates = Array.isArray(data) ? data.map((rate: any) => ({
        ...rate,
        date: rate.date // Keep as string in YYYY-MM-DD format
      })) : [];
      
      setRates(formattedRates);
    } catch (err) {
      console.error('Error fetching rates:', err);
      setError('Failed to refresh rates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update multiple days (weekends, weekdays, or all days)
  // Note: Weekend = Friday & Saturday for hotel pricing
  const bulkUpdateRates = (type: 'weekends' | 'weekdays' | 'all', price: number) => {
    const updatedRates = [...rates];
    
    daysInMonth.forEach(day => {
      if (
        type === 'all' || 
        (type === 'weekends' && isWeekendDay(day)) || 
        (type === 'weekdays' && !isWeekendDay(day))
      ) {
        // Get the normalized date string for comparison
        const formattedDate = format(day, 'yyyy-MM-dd');
        
        const index = updatedRates.findIndex(r => {
          const rateDateStr = typeof r.date === 'string' ? r.date : format(new Date(r.date), 'yyyy-MM-dd');
          return rateDateStr === formattedDate;
        });
        
        if (index !== -1) {
          updatedRates[index] = { ...updatedRates[index], price };
        } else {
          updatedRates.push({
            date: formattedDate, // Store as string instead of Date object
            price,
            roomTypeId: selectedRoomTypeId
          });
        }
      }
    });
    
    setRates(updatedRates);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rate Calendar</h1>
          <p className="text-gray-600">Set and manage daily rates for your room types</p>
        </div>
      </div>

      {/* Global error message */}
      {error && (
        <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
          <h3 className="font-semibold mb-1">Error</h3>
          <p>{error}</p>
          <div className="mt-2">
            <Button 
              variant="outline"
              size="sm" 
              onClick={() => {
                setError('');
                window.location.reload();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
          </div>
        </div>
      )}

      {/* Filters - Horizontal layout at the top */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Select Property & Room Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="property">Property</Label>
              <Select 
                value={selectedPropertyId} 
                onValueChange={setSelectedPropertyId}
                disabled={properties.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="roomType">Room Type</Label>
              <Select 
                value={selectedRoomTypeId} 
                onValueChange={setSelectedRoomTypeId}
                disabled={roomTypes.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a room type" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map(roomType => (
                    <SelectItem key={roomType.id} value={roomType.id}>
                      {roomType.name} (Base: ${roomType.basePrice})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-3">Bulk Update</h3>
              
              <div className="flex flex-wrap gap-3">
                <div className="flex space-x-2">
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    placeholder="Price"
                    id="weekendRate"
                    className="w-24"
                  />
                  <Button 
                    onClick={() => {
                      const input = document.getElementById('weekendRate') as HTMLInputElement;
                      if (input.value) {
                        bulkUpdateRates('weekends', parseFloat(input.value));
                      }
                    }}
                    variant="outline"
                    size="sm"
                    title="Friday & Saturday"
                  >
                    Set Weekends (Fri-Sat)
                  </Button>
                </div>
                
                <div className="flex space-x-2">
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    placeholder="Price"
                    id="weekdayRate"
                    className="w-24"
                  />
                  <Button 
                    onClick={() => {
                      const input = document.getElementById('weekdayRate') as HTMLInputElement;
                      if (input.value) {
                        bulkUpdateRates('weekdays', parseFloat(input.value));
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Set Weekdays
                  </Button>
                </div>
                
                <div className="flex space-x-2">
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    placeholder="Price"
                    id="allDaysRate"
                    className="w-24"
                  />
                  <Button 
                    onClick={() => {
                      const input = document.getElementById('allDaysRate') as HTMLInputElement;
                      if (input.value) {
                        bulkUpdateRates('all', parseFloat(input.value));
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Set All Days
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar - Full width below */}
      <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>
              {format(selectedMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={refreshRates}
                title="Refresh Rates"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={goToPreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={goToNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Select 
                value={format(selectedMonth, 'yyyy-MM')}
                onValueChange={(value) => {
                  const [year, month] = value.split('-').map(Number);
                  const newDate = new Date(year, month - 1, 1);
                  setSelectedMonth(newDate);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Jump to month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() + i);
                    return (
                      <SelectItem 
                        key={i} 
                        value={format(date, 'yyyy-MM')}
                      >
                        {format(date, 'MMM yyyy')}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : !selectedRoomTypeId ? (
              <div className="flex flex-col justify-center items-center py-12 text-center">
                <p className="text-gray-500 mb-4">Please select a property and room type to view rates.</p>
              </div>
            ) : (
              <>
                {success && (
                  <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-md flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
                    <div>
                      <p className="font-medium">Rates saved successfully!</p>
                      <p className="text-sm">Your changes have been saved to the database.</p>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-md">
                    {error}
                  </div>
                )}
                
                <div className="grid grid-cols-7 gap-4 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                    <div key={i} className="text-center font-medium text-base py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-4">
                  {/* Add empty cells for days before the 1st of the month */}
                  {Array.from({ length: getDay(startOfMonth(selectedMonth)) }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-2 aspect-square"></div>
                  ))}
                  
                  {daysInMonth.map((day, i) => {
                    const isWeekend = isWeekendDay(day); // Friday & Saturday
                    const formattedDay = format(day, 'yyyy-MM-dd');
                    const dayRate = getDayRate(day);
                    
                    return (
                      <div 
                        key={i} 
                        className={`p-3 border rounded-md flex flex-col min-h-[120px] ${
                          isWeekend ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="text-right text-sm font-medium">
                          {format(day, 'd')}
                        </div>
                        <div className="flex-1 flex items-center justify-center mt-3">
                          <div className="relative w-full">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={dayRate}
                              onChange={(e) => updateDayRate(day, parseFloat(e.target.value))}
                              className="pl-10 py-2 h-12 text-lg font-medium"
                              onFocus={(e) => console.log(`Focusing on date: ${formattedDay}, current value: ${e.target.value}`)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={saveRates}
                    disabled={saving || !selectedRoomTypeId}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Rates'
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
