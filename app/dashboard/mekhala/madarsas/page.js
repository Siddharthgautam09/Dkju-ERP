'use client';

import { useState, useEffect } from 'react';
import useAuthStore from '@/lib/authStore';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  Users, 
  GraduationCap,
  Search,
  Eye,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Filter
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

export default function MekhalaMadarsas() {
  const { user, userData } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [madarsas, setMadarsas] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    totalMadarsas: 0,
    totalStudents: 0,
    totalTeachers: 0,
    activeMadarsas: 0
  });

  useEffect(() => {
    if (userData && userData.role === 'mekhala_admin') {
      const fetchMadarsasData = async () => {
        try {
          setLoading(true);

          // Get current mekhala admin's ID
          const mekhalaId = userData.uid || userData.id;

          // First, fetch districts assigned to this mekhala
          const districtsQuery = query(
            collection(db, 'districts'),
            where('mekhalaId', '==', mekhalaId),
            orderBy('name', 'asc')
          );
          const districtsSnapshot = await getDocs(districtsQuery);
          const districtsData = districtsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setDistricts(districtsData);

          // Get district names
          const districtNames = districtsData.map(d => d.name);

          if (districtNames.length > 0) {
            // Fetch all madarsas and filter by district
            const madarsasQuery = query(
              collection(db, 'madarsas'),
              orderBy('name', 'asc')
            );
            const madarsasSnapshot = await getDocs(madarsasQuery);
            const allMadarsas = madarsasSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));


            // Filter madarsas by district
            const filteredMadarsas = allMadarsas.filter(madarsa => 
              districtNames.some(district => 
                district.toLowerCase() === madarsa.district?.toLowerCase()
              )
            );
            // console.log(allMadarsas)
            // console.log(filteredMadarsas);


            
            // Fetch student and teacher counts for each madarsa
            const madarsasWithCounts = await Promise.all(
              filteredMadarsas.map(async (madarsa) => {
                try {
                  // Get students count
                  const studentsQuery = query(
                    collection(db, 'students'),
                    where('madarsaId', '==', madarsa.madarsaId || madarsa.id)
                  );
                  const studentsSnapshot = await getDocs(studentsQuery);
                  const studentCount = studentsSnapshot.size;

                  // Get teachers count
                  const teachersQuery = query(
                    collection(db, 'teachers'),
                    where('madarsaId', '==', madarsa.madarsaId || madarsa.id)
                  );
                  const teachersSnapshot = await getDocs(teachersQuery);
                  const teacherCount = teachersSnapshot.size;

                  return {
                    ...madarsa,
                    studentCount,
                    teacherCount
                  };
                } catch (error) {
                  console.error(`Error fetching counts for madarsa ${madarsa.id}:`, error);
                  return {
                    ...madarsa,
                    studentCount: 0,
                    teacherCount: 0
                  };
                }
              })
            );

            setMadarsas(madarsasWithCounts);

            // Calculate stats
            const totalStudents = madarsasWithCounts.reduce((sum, m) => sum + (m.studentCount || 0), 0);
            const totalTeachers = madarsasWithCounts.reduce((sum, m) => sum + (m.teacherCount || 0), 0);
            const activeMadarsas = madarsasWithCounts.filter(m => m.status === 'active').length;

            setStats({
              totalMadarsas: madarsasWithCounts.length,
              totalStudents,
              totalTeachers,
              activeMadarsas
            });
          } else {
            setMadarsas([]);
            setStats({
              totalMadarsas: 0,
              totalStudents: 0,
              totalTeachers: 0,
              activeMadarsas: 0
            });
          }

        } catch (error) {
          console.error('Error fetching madarsas:', error);
          toast.error('Failed to fetch madarsas data');
        } finally {
          setLoading(false);
        }
      };

      fetchMadarsasData();
    } else {
      setLoading(false);
    }
  }, [userData]);

  // Filter madarsas based on search term, district, and status
  const filteredMadarsas = madarsas.filter(madarsa => {
    const matchesSearch = madarsa.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         madarsa.madarsaId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         madarsa.adminName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         madarsa.adminEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDistrict = filterDistrict === 'all' || madarsa.district === filterDistrict;
    const matchesStatus = filterStatus === 'all' || madarsa.status === filterStatus;
    
    return matchesSearch && matchesDistrict && matchesStatus;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading madarsas...</div>
        </div>
      </Layout>
    );
  }

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
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Madarsa Management
          </h1>
          <p className="text-green-100">
            Manage and monitor madarsas in your assigned districts
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-blue-600" />
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
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Teachers</p>
                  <p className="text-2xl font-bold">{stats.totalTeachers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Building className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Madrasas</p>
                  <p className="text-2xl font-bold">{stats.activeMadarsas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Madrasas Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Madrasas ({filteredMadarsas.length})
            </CardTitle>
            <CardDescription>
              Madrasas in your assigned districts
            </CardDescription>
            
            {/* Search and Filters */}
            <div className="flex flex-col gap-4 mt-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by name, ID, admin name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                {/* District Filter */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">District:</span>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={filterDistrict === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterDistrict('all')}
                    >
                      All
                    </Button>
                    {districts.map(district => (
                      <Button
                        key={district.id}
                        variant={filterDistrict === district.name ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterDistrict(district.name)}
                        className="max-w-[150px] truncate"
                      >
                        {district.name}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Status Filter */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Status:</span>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={filterStatus === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterStatus('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={filterStatus === 'active' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterStatus('active')}
                    >
                      Active
                    </Button>
                    <Button
                      variant={filterStatus === 'inactive' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterStatus('inactive')}
                    >
                      Inactive
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredMadarsas.length === 0 ? (
              <div className="text-center py-12">
                <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  {searchTerm || filterDistrict !== 'all' || filterStatus !== 'all' 
                    ? 'No madarsas found' 
                    : 'No madarsas in your districts'
                  }
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || filterDistrict !== 'all' || filterStatus !== 'all'
                    ? 'Try adjusting your search criteria or filters' 
                    : 'Madrasas will appear here when they are added to your assigned districts'
                  }
                </p>
                {(searchTerm || filterDistrict !== 'all' || filterStatus !== 'all') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setFilterDistrict('all');
                      setFilterStatus('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Madrasa Details</TableHead>
                      <TableHead>District</TableHead>
                      <TableHead>Admin Contact</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Teachers</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMadarsas.map((madarsa) => (
                      <TableRow key={madarsa.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <div className="font-semibold text-gray-900">{madarsa.name || "N/A"}</div>
                            <Badge variant="outline" className="mt-1 bg-blue-50 text-blue-700">
                              {madarsa.madarsaId || "N/A"}
                            </Badge>
                            {madarsa.established && (
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Est. {madarsa.established}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-gray-100">
                            {madarsa.district || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{madarsa.adminName || "N/A"}</div>
                            <div className="text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {madarsa.adminEmail || "N/A"}
                            </div>
                            <div className="text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {madarsa.phone || "N/A"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <GraduationCap className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="font-semibold">{madarsa.studentCount || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-purple-600" />
                            </div>
                            <span className="font-semibold">{madarsa.teacherCount || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={madarsa.status === 'active' ? 'default' : 'secondary'}
                            className={madarsa.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {madarsa.status || 'active'}
                          </Badge>
                        </TableCell>
                       
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
