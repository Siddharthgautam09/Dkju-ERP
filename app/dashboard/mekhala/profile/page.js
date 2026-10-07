'use client';

import { useState, useEffect } from 'react';
import useAuthStore from '@/lib/authStore';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Edit,
  Save,
  X,
  Eye,
  EyeOff,
  Building
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

export default function MekhalaProfile() {
  const { user, userData, setUserData } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [stats, setStats] = useState({
    assignedDistricts: 0,
    totalMadarsas: 0,
    totalStudents: 0,
    totalTeachers: 0
  });

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    loginId: '',
    phone: '',
    address: '',
    district: '',
    state: '',
    password: '',
    status: 'active'
  });

  const [originalData, setOriginalData] = useState({});

  useEffect(() => {
    if (userData && userData.role === 'mekhala_admin') {
      // Initialize profile data from userData
      const data = {
        name: userData.name || '',
        email: userData.email || '',
        loginId: userData.loginId || '',
        phone: userData.phone || '',
        address: userData.address || '',
        district: userData.district || '',
        state: userData.state || '',
        password: userData.password || '',
        status: userData.status || 'active'
      };
      setProfileData(data);
      setOriginalData(data);

      // Fetch related statistics
      fetchMekhalaStats();
    }
  }, [userData]);

  const fetchMekhalaStats = async () => {
    try {
      if (!userData?.uid) return;

      const mekhalaId = userData.uid || userData.id;

      // Fetch districts assigned to this mekhala
      const districtsQuery = query(
        collection(db, 'districts'),
        where('mekhalaId', '==', mekhalaId)
      );
      const districtsSnapshot = await getDocs(districtsQuery);
      const districtsData = districtsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDistricts(districtsData);

      // Fetch madarsas in assigned districts
      if (districtsData.length > 0) {
        const districtNames = districtsData.map(d => d.name);
        
        const madarsasQuery = query(collection(db, 'madarsas'));
        const madarsasSnapshot = await getDocs(madarsasQuery);
        const allMadarsas = madarsasSnapshot.docs.map(doc => doc.data());

        const filteredMadarsas = allMadarsas.filter(madarsa => 
          districtNames.includes(madarsa.district)
        );

        // Calculate stats
        let totalStudents = 0;
        let totalTeachers = 0;

        for (const madarsa of filteredMadarsas) {
          try {
            const studentsQuery = query(
              collection(db, 'students'),
              where('madarsaId', '==', madarsa.madarsaId || madarsa.id)
            );
            const studentsSnapshot = await getDocs(studentsQuery);
            totalStudents += studentsSnapshot.size;

            const teachersQuery = query(
              collection(db, 'teachers'),
              where('madarsaId', '==', madarsa.madarsaId || madarsa.id)
            );
            const teachersSnapshot = await getDocs(teachersQuery);
            totalTeachers += teachersSnapshot.size;
          } catch (error) {
            console.error('Error fetching counts:', error);
          }
        }

        setStats({
          assignedDistricts: districtsData.length,
          totalMadarsas: filteredMadarsas.length,
          totalStudents,
          totalTeachers
        });
      }
    } catch (error) {
      console.error('Error fetching mekhala stats:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (!userData?.uid) {
        toast.error('User ID not found');
        return;
      }

      // Validate required fields
      if (!profileData.name.trim() || !profileData.email.trim() || !profileData.loginId.trim()) {
        toast.error('Name, email, and login ID are required');
        return;
      }

      // Update document in Firestore
      const mekhalaDocRef = doc(db, 'mekhala', userData.uid);
      await updateDoc(mekhalaDocRef, {
        name: profileData.name.trim(),
        email: profileData.email.trim(),
        loginId: profileData.loginId.trim(),
        phone: profileData.phone.trim(),
        address: profileData.address.trim(),
        district: profileData.district.trim(),
        state: profileData.state.trim(),
        password: profileData.password, // In a real app, this should be hashed
        status: profileData.status,
        updatedAt: new Date().toISOString()
      });

      // Update userData in store
      const updatedUserData = {
        ...userData,
        ...profileData,
        updatedAt: new Date().toISOString()
      };
      setUserData(updatedUserData);

      setOriginalData(profileData);
      setEditing(false);
      toast.success('Profile updated successfully!');

    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setEditing(false);
  };

  if (!userData || userData.role !== 'mekhala_admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You need to be logged in as a Mekhala Admin to access this page.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Mekhala Profile
          </h1>
          <p className="text-indigo-100">
            Manage your profile information and view your administration statistics
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Assigned Districts</p>
                  <p className="text-2xl font-bold">{stats.assignedDistricts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Building className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Madrasas</p>
                  <p className="text-2xl font-bold">{stats.totalMadarsas}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold">{stats.totalStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Teachers</p>
                  <p className="text-2xl font-bold">{stats.totalTeachers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    {editing ? 'Edit your profile information' : 'View and manage your profile details'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={loading}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Saving...' : 'Save'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  {editing ? (
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md">
                      {profileData.name || 'Not provided'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loginId">Login ID</Label>
                  {editing ? (
                    <Input
                      id="loginId"
                      value={profileData.loginId}
                      onChange={(e) => handleInputChange('loginId', e.target.value)}
                      placeholder="Enter your login ID"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md">
                      {profileData.loginId || 'Not provided'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  {editing ? (
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      {profileData.email || 'Not provided'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  {editing ? (
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      {profileData.phone || 'Not provided'}
                    </div>
                  )}
                </div>
              </div>

              {/* Location Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  {editing ? (
                    <Input
                      id="district"
                      value={profileData.district}
                      onChange={(e) => handleInputChange('district', e.target.value)}
                      placeholder="Enter your district"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md">
                      {profileData.district || 'Not provided'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  {editing ? (
                    <Input
                      id="state"
                      value={profileData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="Enter your state"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md">
                      {profileData.state || 'Not provided'}
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                {editing ? (
                  <Textarea
                    id="address"
                    value={profileData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter your complete address"
                    rows={3}
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-md">
                    {profileData.address || 'Not provided'}
                  </div>
                )}
              </div>

              {/* Password */}
              {editing && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={profileData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Account Status</Label>
                {editing ? (
                  <Select
                    value={profileData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className='bg-white'>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <Badge 
                      variant={profileData.status === 'active' ? 'default' : 'secondary'}
                      className={profileData.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {profileData.status || 'active'}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assigned Districts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Assigned Districts
              </CardTitle>
              <CardDescription>
                Districts under your administration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {districts.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Districts Assigned</h3>
                  <p className="text-gray-500 text-sm">
                    Districts will appear here when assigned to your mekhala
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {districts.map((district) => (
                    <div key={district.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{district.name}</h4>
                          <p className="text-sm text-gray-500">{district.state}</p>
                        </div>
                        <Badge 
                          variant={district.status === 'active' ? 'default' : 'secondary'}
                          className={district.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {district.status || 'active'}
                        </Badge>
                      </div>
                      {district.code && (
                        <p className="text-xs text-gray-400 mt-1">Code: {district.code}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              Account creation and last update details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label className="text-sm font-medium text-gray-600">Account Created</Label>
                <p className="text-sm text-gray-900 mt-1">
                  {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Not available'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Last Updated</Label>
                <p className="text-sm text-gray-900 mt-1">
                  {userData.updatedAt ? new Date(userData.updatedAt).toLocaleDateString() : 'Not available'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Role</Label>
                <p className="text-sm text-gray-900 mt-1">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700">
                    Mekhala Administrator
                  </Badge>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
