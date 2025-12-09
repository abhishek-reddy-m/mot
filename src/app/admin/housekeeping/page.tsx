'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  BedDouble,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Sparkles,
  Wrench,
  User
} from 'lucide-react';

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
  property: {
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

type Property = {
  id: string;
  name: string;
};

export default function HousekeepingPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'dirty' | 'clean' | 'inspected'>('dirty');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingRoom, setUpdatingRoom] = useState<string | null>(null);

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

  // Fetch rooms when property changes
  useEffect(() => {
    if (selectedPropertyId) {
      fetchRooms();
    }
  }, [selectedPropertyId]);

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

  const updateRoomStatus = async (roomId: string, status: string) => {
    try {
      setUpdatingRoom(roomId);
      
      await fetch(`/api/admin/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      await fetchRooms();
    } catch (err) {
      console.error('Error updating room status:', err);
    } finally {
      setUpdatingRoom(null);
    }
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

  // Filter rooms
  const filteredRooms = rooms.filter(room => {
    // Don't show out of order rooms in housekeeping
    if (room.isOutOfOrder) return false;
    
    // Search filter
    if (searchQuery && !room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Status filter
    if (filter === 'all') return true;
    if (filter === 'dirty') return room.status === 'DIRTY';
    if (filter === 'clean') return room.status === 'CLEAN';
    if (filter === 'inspected') return room.status === 'INSPECTED';
    
    return true;
  });

  // Stats
  const dirtyCount = rooms.filter(r => r.status === 'DIRTY' && !r.isOutOfOrder).length;
  const cleanCount = rooms.filter(r => r.status === 'CLEAN' && !r.isOutOfOrder).length;
  const inspectedCount = rooms.filter(r => r.status === 'INSPECTED' && !r.isOutOfOrder).length;
  const outOfOrderCount = rooms.filter(r => r.isOutOfOrder).length;

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
            <p className="text-gray-500">No properties found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Housekeeping</h1>
          <p className="text-gray-500">Manage room cleanliness status</p>
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
          <Button variant="outline" size="sm" onClick={fetchRooms}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card 
          className={`cursor-pointer transition-shadow ${filter === 'dirty' ? 'ring-2 ring-yellow-500' : 'hover:shadow-md'}`}
          onClick={() => setFilter('dirty')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Dirty Rooms</p>
                <p className="text-2xl font-bold text-yellow-600">{dirtyCount}</p>
              </div>
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-shadow ${filter === 'clean' ? 'ring-2 ring-green-500' : 'hover:shadow-md'}`}
          onClick={() => setFilter('clean')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Clean Rooms</p>
                <p className="text-2xl font-bold text-green-600">{cleanCount}</p>
              </div>
              <Sparkles className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-shadow ${filter === 'inspected' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
          onClick={() => setFilter('inspected')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Inspected</p>
                <p className="text-2xl font-bold text-blue-600">{inspectedCount}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Out of Order</p>
                <p className="text-2xl font-bold text-red-600">{outOfOrderCount}</p>
              </div>
              <Wrench className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search room number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'dirty' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('dirty')}
            className={filter === 'dirty' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
          >
            Dirty
          </Button>
          <Button
            variant={filter === 'clean' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('clean')}
            className={filter === 'clean' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            Clean
          </Button>
          <Button
            variant={filter === 'inspected' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('inspected')}
            className={filter === 'inspected' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            Inspected
          </Button>
        </div>
      </div>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              {rooms.length === 0 
                ? 'No rooms have been added yet'
                : `No ${filter === 'all' ? '' : filter} rooms found`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map(room => (
            <Card key={room.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold">Room {room.roomNumber}</h3>
                    <p className="text-sm text-gray-500">{room.roomType.name}</p>
                    {room.floor && (
                      <p className="text-xs text-gray-400">Floor {room.floor}</p>
                    )}
                  </div>
                  <Badge className={getRoomStatusBadge(room.status, room.isOutOfOrder)}>
                    {room.status}
                  </Badge>
                </div>

                {/* Show assigned housekeeper */}
                {room.housekeeping && room.housekeeping.length > 0 && room.housekeeping[0].assignee && (
                  <div className="mb-3 p-2 bg-blue-50 rounded-md border border-blue-200">
                    <div className="flex items-center gap-2 text-sm text-blue-800">
                      <User className="h-4 w-4" />
                      <span className="font-medium">
                        {room.housekeeping[0].assignee.firstName} {room.housekeeping[0].assignee.lastName}
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Status: {room.housekeeping[0].status}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {room.status === 'DIRTY' && (
                    <Button
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => updateRoomStatus(room.id, 'CLEAN')}
                      disabled={updatingRoom === room.id}
                    >
                      {updatingRoom === room.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-1" />
                          Mark Clean
                        </>
                      )}
                    </Button>
                  )}
                  
                  {room.status === 'CLEAN' && (
                    <>
                      <Button
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => updateRoomStatus(room.id, 'INSPECTED')}
                        disabled={updatingRoom === room.id}
                      >
                        {updatingRoom === room.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Inspected
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-yellow-600"
                        onClick={() => updateRoomStatus(room.id, 'DIRTY')}
                        disabled={updatingRoom === room.id}
                      >
                        Mark Dirty
                      </Button>
                    </>
                  )}
                  
                  {room.status === 'INSPECTED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-yellow-600"
                      onClick={() => updateRoomStatus(room.id, 'DIRTY')}
                      disabled={updatingRoom === room.id}
                    >
                      {updatingRoom === room.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Mark Dirty'
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
