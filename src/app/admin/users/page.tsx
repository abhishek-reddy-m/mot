'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Plus,
  Search,
  Loader2,
  Edit2,
  Trash2,
  X,
  Building2,
  Shield
} from 'lucide-react';

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  assignedProperties?: {
    id: string;
    property: {
      id: string;
      name: string;
    };
  }[];
};

type Property = {
  id: string;
  name: string;
};

const ROLES = [
  { value: 'ADMIN', label: 'Admin', description: 'Full system access' },
  { value: 'OWNER', label: 'Owner', description: 'Property owner with full property access' },
  { value: 'MANAGER', label: 'Manager', description: 'Manages assigned properties' },
  { value: 'FRONT_DESK', label: 'Front Desk', description: 'Check-in/out and front desk operations' },
  { value: 'HOUSEKEEPER', label: 'Housekeeper', description: 'Room cleaning status updates' },
  { value: 'CUSTOMER', label: 'Customer', description: 'Regular booking customer' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchProperties();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/admin/properties');
      if (response.ok) {
        const data = await response.json();
        setProperties(data);
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchUsers();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      'ADMIN': 'bg-purple-100 text-purple-800',
      'OWNER': 'bg-blue-100 text-blue-800',
      'MANAGER': 'bg-green-100 text-green-800',
      'FRONT_DESK': 'bg-yellow-100 text-yellow-800',
      'HOUSEKEEPER': 'bg-orange-100 text-orange-800',
      'CUSTOMER': 'bg-gray-100 text-gray-800',
    };
    return styles[role] || 'bg-gray-100 text-gray-800';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Group by role for staff display
  const staffUsers = filteredUsers.filter(u => u.role !== 'CUSTOMER');
  const customerUsers = filteredUsers.filter(u => u.role === 'CUSTOMER');

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">Manage staff and customer accounts</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Staff User
        </Button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError('')} className="float-right">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="all">All Roles</option>
          {ROLES.map(role => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
      </div>

      {/* Staff Users */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Staff Users</CardTitle>
          </div>
          <CardDescription>Users with administrative or operational roles</CardDescription>
        </CardHeader>
        <CardContent>
          {staffUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No staff users found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Assigned Properties</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffUsers.map(user => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-3">
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                      </td>
                      <td className="py-3 text-sm">{user.email}</td>
                      <td className="py-3">
                        <Badge className={getRoleBadge(user.role)}>
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 text-sm">
                        {user.assignedProperties && user.assignedProperties.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.assignedProperties.map(ap => (
                              <Badge key={ap.id} variant="outline" className="text-xs">
                                {ap.property.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">
                            {['ADMIN', 'OWNER'].includes(user.role) ? 'All Properties' : 'None'}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowEditModal(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => deleteUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-600" />
            <CardTitle className="text-lg">Customers</CardTitle>
          </div>
          <CardDescription>Regular booking customers</CardDescription>
        </CardHeader>
        <CardContent>
          {customerUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No customers found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Phone</th>
                    <th className="pb-3 font-medium">Joined</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customerUsers.slice(0, 20).map(user => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-3">
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                      </td>
                      <td className="py-3 text-sm">{user.email}</td>
                      <td className="py-3 text-sm">{user.phone || '-'}</td>
                      <td className="py-3 text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditModal(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customerUsers.length > 20 && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  Showing 20 of {customerUsers.length} customers
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Modal */}
      {showAddModal && (
        <UserFormModal
          mode="add"
          properties={properties}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchUsers();
          }}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <UserFormModal
          mode="edit"
          user={selectedUser}
          properties={properties}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

// User Form Modal Component
function UserFormModal({
  mode,
  user,
  properties,
  onClose,
  onSuccess,
}: {
  mode: 'add' | 'edit';
  user?: User;
  properties: Property[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    role: user?.role || 'FRONT_DESK',
    isActive: user?.isActive ?? true,
    assignedPropertyIds: user?.assignedProperties?.map(ap => ap.property.id) || [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError('Please fill in all required fields');
      return;
    }

    if (mode === 'add' && !formData.password) {
      setError('Password is required for new users');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const url = mode === 'add' 
        ? '/api/admin/users' 
        : `/api/admin/users/${user?.id}`;
      
      const method = mode === 'add' ? 'POST' : 'PATCH';
      
      const body: any = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || null,
        role: formData.role,
        isActive: formData.isActive,
        assignedPropertyIds: formData.assignedPropertyIds,
      };

      if (formData.password) {
        body.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save user');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleProperty = (propertyId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedPropertyIds: prev.assignedPropertyIds.includes(propertyId)
        ? prev.assignedPropertyIds.filter(id => id !== propertyId)
        : [...prev.assignedPropertyIds, propertyId]
    }));
  };

  const showPropertyAssignment = ['MANAGER', 'FRONT_DESK', 'HOUSEKEEPER'].includes(formData.role);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {mode === 'add' ? 'Add Staff User' : 'Edit User'}
          </h3>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name *</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name *</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Password {mode === 'add' ? '*' : '(leave blank to keep current)'}
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={mode === 'edit' ? 'Leave blank to keep current password' : ''}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                {ROLES.filter(r => r.value !== 'CUSTOMER').map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label} - {role.description}
                  </option>
                ))}
              </select>
            </div>

            {showPropertyAssignment && (
              <div>
                <label className="block text-sm font-medium mb-2">Assigned Properties</label>
                <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                  {properties.length === 0 ? (
                    <p className="text-sm text-gray-500">No properties available</p>
                  ) : (
                    properties.map(property => (
                      <label key={property.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.assignedPropertyIds.includes(property.id)}
                          onChange={() => toggleProperty(property.id)}
                          className="rounded"
                        />
                        <span className="text-sm">{property.name}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select which properties this user can access
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isActive" className="text-sm">Active account</label>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button type="button" onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (mode === 'add' ? 'Add User' : 'Save Changes')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
