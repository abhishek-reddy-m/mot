'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Calendar, DollarSign, TrendingUp, MapPin, Bed, Star, Loader2 } from 'lucide-react';

type DashboardStats = {
  totalProperties: number;
  totalBookings: number;
  totalUsers: number;
  totalRevenue: number;
  occupancyRate: string | number;
  avgRating: number;
  recentBookings: {
    id: string;
    guest: string;
    property: string;
    checkIn: string;
    amount: number;
  }[];
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalBookings: 0,
    totalUsers: 0,
    totalRevenue: 0,
    occupancyRate: 0,
    avgRating: 0,
    recentBookings: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('/api/admin/dashboard');
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          setError(errorData.error || 'Failed to load dashboard data');
          return;
        }
        
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError('Unable to connect to the server. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Welcome back! Here&apos;s what&apos;s happening with your properties.</p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Last updated</p>
                <p className="text-sm font-medium text-gray-900">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-sm">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-gray-600">Loading dashboard data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Properties</CardTitle>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalProperties}</div>
                  <p className="text-xs text-gray-500 mt-1">Active properties</p>
                </CardContent>
              </Card>

              <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Bookings</CardTitle>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalBookings}</div>
                  <p className="text-xs text-gray-500 mt-1">This month</p>
                </CardContent>
              </Card>

              <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
                  <p className="text-xs text-gray-500 mt-1">Registered customers</p>
                </CardContent>
              </Card>

              <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Revenue</CardTitle>
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-gray-500 mt-1">This month</p>
                </CardContent>
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Occupancy Rate</CardTitle>
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Bed className="h-4 w-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.occupancyRate}%</div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    Current occupancy across all properties
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Average Rating</CardTitle>
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <Star className="h-4 w-4 text-yellow-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.avgRating}/5</div>
                  <p className="text-xs text-gray-500 mt-1">Based on customer reviews</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Recent Bookings */}
        {!loading && (
          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg font-semibold text-gray-900">Recent Bookings</CardTitle>
              <CardDescription className="text-gray-600">Latest booking activity across all properties</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {error ? (
                <div className="text-center py-8 text-red-500">
                  <p>{error}</p>
                </div>
              ) : stats.recentBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-lg font-medium">No recent bookings found</p>
                  <p className="text-sm">Bookings will appear here once guests start booking.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recentBookings.map((booking, index) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{booking.guest}</p>
                          <p className="text-sm text-gray-600">{booking.property}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">${booking.amount.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">Check-in: {booking.checkIn}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
