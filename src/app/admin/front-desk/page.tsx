'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  Search,
  Phone,
  Mail,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Home,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX,
  BedDouble,
  Wrench,
  Percent,
  Plus,
  X,
  User
} from 'lucide-react';

type Booking = {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  totalPrice: number;
  status: string;
  cardLast4?: string;
  cardBrand?: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  property: {
    id: string;
    name: string;
  };
  roomType: {
    id: string;
    name: string;
  };
};

type Room = {
  id: string;
  roomNumber: string;
  floor?: string;
  status: string;
  isOutOfOrder: boolean;
  outOfOrderReason?: string;
  notes?: string;
  roomType: {
    id: string;
    name: string;
  };
  housekeeping?: {
    id: string;
    status: string;
    assignee?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }[];
};

type Housekeeper = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type Property = {
  id: string;
  name: string;
  roomTypes: {
    id: string;
    name: string;
    totalRooms: number;
  }[];
};

type Tab = 'arrivals' | 'departures' | 'inhouse' | 'occupancy' | 'outoforder' | 'rooms';

export default function FrontDeskPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('arrivals');
  const [arrivals, setArrivals] = useState<Booking[]>([]);
  const [departures, setDepartures] = useState<Booking[]>([]);
  const [currentGuests, setCurrentGuests] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);
  const [showOutOfOrderModal, setShowOutOfOrderModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [outOfOrderReason, setOutOfOrderReason] = useState('');
  const [housekeepers, setHousekeepers] = useState<Housekeeper[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningRoom, setAssigningRoom] = useState<Room | null>(null);
  const [selectedHousekeeper, setSelectedHousekeeper] = useState<string>('');
  const [assigningHousekeeper, setAssigningHousekeeper] = useState(false);
  const [roomStatusFilter, setRoomStatusFilter] = useState<string>('all');
  const [autoAssigning, setAutoAssigning] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Fetch properties on mount
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch('/api/admin/properties');
        if (response.ok) {
          const data = await response.json();
          setProperties(data);
          if (data.length > 0) {
            setSelectedPropertyId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching properties:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  // Fetch data when property changes
  useEffect(() => {
    if (selectedPropertyId) {
      fetchFrontDeskData();
      fetchRooms();
      fetchHousekeepers();
    }
  }, [selectedPropertyId]);

  const fetchFrontDeskData = async () => {
    if (!selectedPropertyId) return;
    
    try {
      setError('');
      const response = await fetch('/api/admin/bookings');
      if (!response.ok) throw new Error('Failed to fetch bookings');
      
      const allBookings: Booking[] = await response.json();
      
      // Filter by selected property
      const propertyBookings = allBookings.filter(b => b.property.id === selectedPropertyId);

      // Filter arrivals (check-in today, not yet checked in)
      const todayArrivals = propertyBookings.filter(b => {
        const checkInDate = b.checkIn.split('T')[0];
        return checkInDate === today && (b.status === 'CONFIRMED' || b.status === 'PENDING');
      });

      // Filter departures (check-out today, currently checked in)
      const todayDepartures = propertyBookings.filter(b => {
        const checkOutDate = b.checkOut.split('T')[0];
        return checkOutDate === today && b.status === 'CHECKED_IN';
      });

      // Filter current guests (checked in, not yet checked out)
      const inHouseGuests = propertyBookings.filter(b => b.status === 'CHECKED_IN');

      setArrivals(todayArrivals);
      setDepartures(todayDepartures);
      setCurrentGuests(inHouseGuests);
    } catch (err) {
      console.error('Error fetching front desk data:', err);
      setError('Failed to load booking data');
    }
  };

  const fetchRooms = async () => {
    if (!selectedPropertyId) return;
    
    try {
      const response = await fetch(`/api/admin/rooms?propertyId=${selectedPropertyId}&includeHousekeeping=true`);
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  const fetchHousekeepers = async () => {
    try {
      const response = await fetch('/api/admin/users?role=HOUSEKEEPER');
      if (response.ok) {
        const data = await response.json();
        setHousekeepers(data);
      }
    } catch (err) {
      console.error('Error fetching housekeepers:', err);
    }
  };

  const assignHousekeeper = async () => {
    if (!assigningRoom || !selectedHousekeeper) return;
    
    try {
      setAssigningHousekeeper(true);
      
      const response = await fetch('/api/admin/housekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: assigningRoom.id,
          assignedTo: selectedHousekeeper,
          status: 'PENDING',
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to assign housekeeper');
      }
      
      await fetchRooms();
      setShowAssignModal(false);
      setAssigningRoom(null);
      setSelectedHousekeeper('');
    } catch (err) {
      console.error('Error assigning housekeeper:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign housekeeper');
    } finally {
      setAssigningHousekeeper(false);
    }
  };

  const autoAssignHousekeepers = async () => {
    // Get dirty rooms without assigned housekeepers
    const dirtyRoomsWithoutAssignment = rooms.filter(room => 
      room.status === 'DIRTY' && 
      !room.isOutOfOrder &&
      !room.housekeeping?.find(h => h.status !== 'COMPLETED' && h.status !== 'INSPECTED')
    );

    if (dirtyRoomsWithoutAssignment.length === 0) {
      setError('No dirty rooms need assignment');
      return;
    }

    if (housekeepers.length === 0) {
      setError('No housekeepers available for assignment');
      return;
    }

    try {
      setAutoAssigning(true);
      setError('');
      
      // Distribute rooms evenly among housekeepers
      let assignmentCount = 0;
      for (let i = 0; i < dirtyRoomsWithoutAssignment.length; i++) {
        const room = dirtyRoomsWithoutAssignment[i];
        const housekeeper = housekeepers[i % housekeepers.length];
        
        const response = await fetch('/api/admin/housekeeping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: room.id,
            assignedTo: housekeeper.id,
            status: 'PENDING',
          }),
        });
        
        if (response.ok) {
          assignmentCount++;
        }
      }
      
      await fetchRooms();
      
      if (assignmentCount > 0) {
        // Show success briefly
        setError(`Successfully assigned ${assignmentCount} room(s) to housekeepers`);
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error('Error auto-assigning housekeepers:', err);
      setError('Failed to auto-assign housekeepers');
    } finally {
      setAutoAssigning(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      setUpdatingBooking(bookingId);
      
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          notes: `Status changed to ${newStatus} from Front Desk`
        }),
      });

      if (!response.ok) throw new Error('Failed to update booking');
      
      await fetchFrontDeskData();
    } catch (err) {
      console.error('Error updating booking:', err);
      setError('Failed to update booking status');
    } finally {
      setUpdatingBooking(null);
    }
  };

  const toggleOutOfOrder = async (room: Room) => {
    if (room.isOutOfOrder) {
      // Remove out of order
      try {
        await fetch(`/api/admin/rooms/${room.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            isOutOfOrder: false,
            outOfOrderReason: null,
            status: 'DIRTY'
          }),
        });
        await fetchRooms();
      } catch (err) {
        console.error('Error updating room:', err);
      }
    } else {
      // Show modal to add reason
      setSelectedRoom(room);
      setOutOfOrderReason('');
      setShowOutOfOrderModal(true);
    }
  };

  const confirmOutOfOrder = async () => {
    if (!selectedRoom) return;
    
    try {
      await fetch(`/api/admin/rooms/${selectedRoom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isOutOfOrder: true,
          outOfOrderReason: outOfOrderReason,
          status: 'OUT_OF_ORDER'
        }),
      });
      await fetchRooms();
      setShowOutOfOrderModal(false);
      setSelectedRoom(null);
    } catch (err) {
      console.error('Error updating room:', err);
    }
  };

  const updateRoomStatus = async (roomId: string, status: string) => {
    try {
      await fetch(`/api/admin/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await fetchRooms();
    } catch (err) {
      console.error('Error updating room status:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'CONFIRMED': 'bg-blue-100 text-blue-800',
      'CHECKED_IN': 'bg-green-100 text-green-800',
      'CHECKED_OUT': 'bg-gray-100 text-gray-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'NO_SHOW': 'bg-orange-100 text-orange-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getRoomStatusBadge = (status: string, isOutOfOrder: boolean) => {
    if (isOutOfOrder) return 'bg-red-100 text-red-800';
    const styles: Record<string, string> = {
      'CLEAN': 'bg-green-100 text-green-800',
      'DIRTY': 'bg-yellow-100 text-yellow-800',
      'INSPECTED': 'bg-blue-100 text-blue-800',
      'OUT_OF_ORDER': 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  // Calculate stats
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const totalRooms = rooms.length;
  const outOfOrderRooms = rooms.filter(r => r.isOutOfOrder).length;
  const cleanRooms = rooms.filter(r => r.status === 'CLEAN' && !r.isOutOfOrder).length;
  const dirtyRooms = rooms.filter(r => r.status === 'DIRTY' && !r.isOutOfOrder).length;
  const occupiedRooms = currentGuests.reduce((sum, b) => sum + b.rooms, 0);
  const availableRooms = totalRooms - outOfOrderRooms - occupiedRooms;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / (totalRooms - outOfOrderRooms)) * 100) : 0;

  const filteredArrivals = arrivals.filter(b => 
    searchQuery === '' || 
    b.user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDepartures = departures.filter(b => 
    searchQuery === '' || 
    b.user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCurrentGuests = currentGuests.filter(b => 
    searchQuery === '' || 
    b.user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter rooms based on status filter
  const filteredRooms = rooms.filter(room => {
    if (roomStatusFilter === 'all') return true;
    if (roomStatusFilter === 'dirty') return room.status === 'DIRTY' && !room.isOutOfOrder;
    if (roomStatusFilter === 'clean') return room.status === 'CLEAN' && !room.isOutOfOrder;
    if (roomStatusFilter === 'inspected') return room.status === 'INSPECTED' && !room.isOutOfOrder;
    if (roomStatusFilter === 'ooo') return room.isOutOfOrder;
    if (roomStatusFilter === 'unassigned') {
      return room.status === 'DIRTY' && !room.isOutOfOrder && 
        !room.housekeeping?.find(h => h.status !== 'COMPLETED' && h.status !== 'INSPECTED');
    }
    return true;
  });

  // Count dirty rooms without assignment
  const unassignedDirtyRooms = rooms.filter(room => 
    room.status === 'DIRTY' && 
    !room.isOutOfOrder &&
    !room.housekeeping?.find(h => h.status !== 'COMPLETED' && h.status !== 'INSPECTED')
  ).length;

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No properties found. Please add a property first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'arrivals', label: 'Arrivals', icon: ArrowRight, count: arrivals.length },
    { id: 'departures', label: 'Departures', icon: ArrowLeft, count: departures.length },
    { id: 'inhouse', label: 'In-House', icon: Home, count: currentGuests.length },
    { id: 'occupancy', label: 'Occupancy', icon: Percent },
    { id: 'outoforder', label: 'Out of Order', icon: Wrench, count: outOfOrderRooms },
    { id: 'rooms', label: 'All Rooms', icon: BedDouble, count: totalRooms },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with Property Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Front Desk</h1>
          <p className="text-gray-500">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="border rounded-md px-4 py-2 text-sm font-medium bg-white"
          >
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => { fetchFrontDeskData(); fetchRooms(); }}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('arrivals')}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Arrivals</p>
                <p className="text-2xl font-bold text-blue-600">{arrivals.length}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('departures')}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Departures</p>
                <p className="text-2xl font-bold text-orange-600">{departures.length}</p>
              </div>
              <ArrowLeft className="h-5 w-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('inhouse')}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">In-House</p>
                <p className="text-2xl font-bold text-green-600">{currentGuests.length}</p>
              </div>
              <Users className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('occupancy')}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Occupancy</p>
                <p className="text-2xl font-bold text-purple-600">{occupancyRate}%</p>
              </div>
              <Percent className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('outoforder')}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Out of Order</p>
                <p className="text-2xl font-bold text-red-600">{outOfOrderRooms}</p>
              </div>
              <Wrench className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('rooms')}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Clean/Dirty</p>
                <p className="text-2xl font-bold text-teal-600">{cleanRooms}/{dirtyRooms}</p>
              </div>
              <BedDouble className="h-5 w-5 text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-4 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <Badge variant="secondary" className="ml-1">{tab.count}</Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search for booking tabs */}
      {['arrivals', 'departures', 'inhouse'].includes(activeTab) && (
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search guest name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'arrivals' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-blue-600" />
              Today's Arrivals
            </CardTitle>
            <CardDescription>Guests checking in today</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredArrivals.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No arrivals scheduled for today</p>
            ) : (
              <div className="space-y-3">
                {filteredArrivals.map(booking => (
                  <div key={booking.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">
                          {booking.user.firstName} {booking.user.lastName}
                        </h4>
                        <p className="text-sm text-gray-500">{booking.roomType.name}</p>
                      </div>
                      <Badge className={getStatusBadge(booking.status)}>
                        {booking.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users className="h-3 w-3" />
                        {booking.guests} guest(s), {booking.rooms} room(s)
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                      </div>
                      {booking.user.phone && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Phone className="h-3 w-3" />
                          {booking.user.phone}
                        </div>
                      )}
                      {booking.cardLast4 && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <CreditCard className="h-3 w-3" />
                          {booking.cardBrand} •••• {booking.cardLast4}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateBookingStatus(booking.id, 'CHECKED_IN')}
                        disabled={updatingBooking === booking.id}
                        className="flex-1"
                      >
                        {updatingBooking === booking.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Check In
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateBookingStatus(booking.id, 'NO_SHOW')}
                        disabled={updatingBooking === booking.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        No Show
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'departures' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowLeft className="h-5 w-5 text-orange-600" />
              Today's Departures
            </CardTitle>
            <CardDescription>Guests checking out today</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDepartures.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No departures scheduled for today</p>
            ) : (
              <div className="space-y-3">
                {filteredDepartures.map(booking => (
                  <div key={booking.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">
                          {booking.user.firstName} {booking.user.lastName}
                        </h4>
                        <p className="text-sm text-gray-500">{booking.roomType.name}</p>
                      </div>
                      <Badge className={getStatusBadge(booking.status)}>
                        {booking.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users className="h-3 w-3" />
                        {booking.guests} guest(s), {booking.rooms} room(s)
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="h-3 w-3" />
                        Checked in {formatDate(booking.checkIn)}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => updateBookingStatus(booking.id, 'CHECKED_OUT')}
                      disabled={updatingBooking === booking.id}
                      className="w-full"
                      variant="outline"
                    >
                      {updatingBooking === booking.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Check Out
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'inhouse' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5 text-green-600" />
              In-House Guests
            </CardTitle>
            <CardDescription>Currently checked-in guests</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredCurrentGuests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No guests currently in-house</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="pb-3 font-medium">Guest</th>
                      <th className="pb-3 font-medium">Room Type</th>
                      <th className="pb-3 font-medium">Check-in</th>
                      <th className="pb-3 font-medium">Check-out</th>
                      <th className="pb-3 font-medium">Rooms</th>
                      <th className="pb-3 font-medium">Contact</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCurrentGuests.map(booking => (
                      <tr key={booking.id} className="border-b last:border-0">
                        <td className="py-3">
                          <div className="font-medium">
                            {booking.user.firstName} {booking.user.lastName}
                          </div>
                        </td>
                        <td className="py-3 text-sm">{booking.roomType.name}</td>
                        <td className="py-3 text-sm">{formatDate(booking.checkIn)}</td>
                        <td className="py-3 text-sm">{formatDate(booking.checkOut)}</td>
                        <td className="py-3 text-sm">{booking.rooms}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {booking.user.phone && (
                              <a href={`tel:${booking.user.phone}`} className="text-blue-600 hover:text-blue-800">
                                <Phone className="h-4 w-4" />
                              </a>
                            )}
                            <a href={`mailto:${booking.user.email}`} className="text-blue-600 hover:text-blue-800">
                              <Mail className="h-4 w-4" />
                            </a>
                          </div>
                        </td>
                        <td className="py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateBookingStatus(booking.id, 'CHECKED_OUT')}
                            disabled={updatingBooking === booking.id}
                          >
                            {updatingBooking === booking.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Check Out'
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'occupancy' && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Percent className="h-5 w-5 text-purple-600" />
                Occupancy Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-purple-600">{occupancyRate}%</p>
                  <p className="text-sm text-gray-500">Occupancy Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-600">{availableRooms}</p>
                  <p className="text-sm text-gray-500">Available Rooms</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-600">{occupiedRooms}</p>
                  <p className="text-sm text-gray-500">Occupied Rooms</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-red-600">{outOfOrderRooms}</p>
                  <p className="text-sm text-gray-500">Out of Order</p>
                </div>
              </div>

              {/* Occupancy Bar */}
              <div className="mt-8">
                <div className="flex justify-between text-sm mb-2">
                  <span>Room Status Distribution</span>
                  <span>{totalRooms} Total Rooms</span>
                </div>
                <div className="h-8 rounded-full overflow-hidden flex bg-gray-200">
                  {occupiedRooms > 0 && (
                    <div 
                      className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(occupiedRooms / totalRooms) * 100}%` }}
                    >
                      {occupiedRooms > 0 && `${occupiedRooms} Occupied`}
                    </div>
                  )}
                  {availableRooms > 0 && (
                    <div 
                      className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(availableRooms / totalRooms) * 100}%` }}
                    >
                      {availableRooms > 0 && `${availableRooms} Available`}
                    </div>
                  )}
                  {outOfOrderRooms > 0 && (
                    <div 
                      className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${(outOfOrderRooms / totalRooms) * 100}%` }}
                    >
                      {outOfOrderRooms > 0 && `${outOfOrderRooms} OOO`}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Room Types Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Room Type Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedProperty?.roomTypes.map(rt => {
                  const typeRooms = rooms.filter(r => r.roomType.id === rt.id);
                  const typeOccupied = currentGuests.filter(b => b.roomType.id === rt.id).reduce((sum, b) => sum + b.rooms, 0);
                  const typeOOO = typeRooms.filter(r => r.isOutOfOrder).length;
                  const typeAvailable = typeRooms.length - typeOccupied - typeOOO;
                  
                  return (
                    <div key={rt.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{rt.name}</h4>
                        <span className="text-sm text-gray-500">{typeRooms.length} rooms</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Available:</span>
                          <span className="ml-2 font-medium text-green-600">{typeAvailable}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Occupied:</span>
                          <span className="ml-2 font-medium text-blue-600">{typeOccupied}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Out of Order:</span>
                          <span className="ml-2 font-medium text-red-600">{typeOOO}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'outoforder' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-red-600" />
                  Out of Order Rooms
                </CardTitle>
                <CardDescription>Rooms currently unavailable for booking</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {rooms.filter(r => r.isOutOfOrder).length === 0 ? (
              <p className="text-gray-500 text-center py-8">No rooms are currently out of order</p>
            ) : (
              <div className="space-y-3">
                {rooms.filter(r => r.isOutOfOrder).map(room => (
                  <div key={room.id} className="border rounded-lg p-4 bg-red-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">Room {room.roomNumber}</h4>
                        <p className="text-sm text-gray-600">{room.roomType.name}</p>
                        {room.floor && <p className="text-sm text-gray-500">Floor: {room.floor}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleOutOfOrder(room)}
                      >
                        Mark Available
                      </Button>
                    </div>
                    {room.outOfOrderReason && (
                      <div className="mt-2 p-2 bg-white rounded border">
                        <p className="text-sm"><strong>Reason:</strong> {room.outOfOrderReason}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'rooms' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-teal-600" />
                  All Rooms
                </CardTitle>
                <CardDescription>Manage room status and housekeeping</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Filter */}
                <select
                  value={roomStatusFilter}
                  onChange={(e) => setRoomStatusFilter(e.target.value)}
                  className="border rounded-md px-3 py-1.5 text-sm bg-white"
                >
                  <option value="all">All Rooms ({rooms.length})</option>
                  <option value="dirty">Dirty ({dirtyRooms})</option>
                  <option value="clean">Clean ({cleanRooms})</option>
                  <option value="inspected">Inspected ({rooms.filter(r => r.status === 'INSPECTED' && !r.isOutOfOrder).length})</option>
                  <option value="ooo">Out of Order ({outOfOrderRooms})</option>
                  <option value="unassigned">Unassigned Dirty ({unassignedDirtyRooms})</option>
                </select>

                {/* Auto Assign Button */}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={autoAssignHousekeepers}
                  disabled={autoAssigning || unassignedDirtyRooms === 0 || housekeepers.length === 0}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {autoAssigning ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Users className="h-4 w-4 mr-1" />
                  )}
                  Auto Assign ({unassignedDirtyRooms})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {rooms.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No rooms have been added yet. Add rooms in Room Types settings.</p>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No rooms match the selected filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="pb-3 font-medium">Room #</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Floor</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Housekeeper</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRooms.map(room => {
                      const activeTask = room.housekeeping?.find(h => h.status !== 'COMPLETED' && h.status !== 'INSPECTED');
                      return (
                      <tr key={room.id} className="border-b last:border-0">
                        <td className="py-3 font-medium">{room.roomNumber}</td>
                        <td className="py-3 text-sm">{room.roomType.name}</td>
                        <td className="py-3 text-sm">{room.floor || '-'}</td>
                        <td className="py-3">
                          <Badge className={getRoomStatusBadge(room.status, room.isOutOfOrder)}>
                            {room.isOutOfOrder ? 'OUT OF ORDER' : room.status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          {activeTask?.assignee ? (
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="h-3 w-3 text-blue-600" />
                              </div>
                              <span className="text-sm">
                                {activeTask.assignee.firstName} {activeTask.assignee.lastName}
                              </span>
                              <Badge className="text-xs bg-yellow-100 text-yellow-700">
                                {activeTask.status}
                              </Badge>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-blue-600 hover:text-blue-800"
                              onClick={() => {
                                setAssigningRoom(room);
                                setSelectedHousekeeper('');
                                setShowAssignModal(true);
                              }}
                            >
                              <User className="h-3 w-3 mr-1" />
                              Assign
                            </Button>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            {!room.isOutOfOrder && (
                              <>
                                <Button
                                  size="sm"
                                  variant={room.status === 'CLEAN' ? 'default' : 'outline'}
                                  onClick={() => updateRoomStatus(room.id, 'CLEAN')}
                                  className="text-xs"
                                >
                                  Clean
                                </Button>
                                <Button
                                  size="sm"
                                  variant={room.status === 'DIRTY' ? 'default' : 'outline'}
                                  onClick={() => updateRoomStatus(room.id, 'DIRTY')}
                                  className="text-xs"
                                >
                                  Dirty
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleOutOfOrder(room)}
                              className={`text-xs ${room.isOutOfOrder ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {room.isOutOfOrder ? 'Available' : 'OOO'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Out of Order Modal */}
      {showOutOfOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Mark Room Out of Order</h3>
              <button onClick={() => setShowOutOfOrderModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Room {selectedRoom?.roomNumber} will be marked as out of order and unavailable for booking.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Reason</label>
              <textarea
                value={outOfOrderReason}
                onChange={(e) => setOutOfOrderReason(e.target.value)}
                className="w-full border rounded-md p-2 text-sm"
                rows={3}
                placeholder="Enter the reason for marking out of order..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowOutOfOrderModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={confirmOutOfOrder} className="flex-1 bg-red-600 hover:bg-red-700">
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Housekeeper Modal */}
      {showAssignModal && assigningRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Assign Housekeeper</h3>
              <button onClick={() => { setShowAssignModal(false); setAssigningRoom(null); }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Assign a housekeeper to clean Room {assigningRoom.roomNumber}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Select Housekeeper</label>
              <select
                value={selectedHousekeeper}
                onChange={(e) => setSelectedHousekeeper(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="">-- Select Housekeeper --</option>
                {housekeepers.map(hk => (
                  <option key={hk.id} value={hk.id}>
                    {hk.firstName} {hk.lastName}
                  </option>
                ))}
              </select>
              {housekeepers.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  No housekeepers found. Add users with the Housekeeper role first.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => { setShowAssignModal(false); setAssigningRoom(null); }} 
                variant="outline" 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={assignHousekeeper} 
                disabled={!selectedHousekeeper || assigningHousekeeper}
                className="flex-1"
              >
                {assigningHousekeeper ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Assign'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
