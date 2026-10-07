'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authUtils';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
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
  Plus, 
  Trash2, 
  Edit, 
  MapPin,
  Building
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { toast } from 'sonner';

export default function DistrictsManagement() {
  const { user, role } = useAuth();
  const [districts, setDistricts] = useState([]);
  const [mekhalas, setMekhalas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState(null);

  // Form states
  const [districtForm, setDistrictForm] = useState({
    name: '',
    mekhalaId: '',
    description: ''
  });

  // Bulk add states
  const [bulkForm, setBulkForm] = useState({
    districtNames: '',
    mekhalaId: '',
    description: ''
  });

  // Filter and search states
  const [filters, setFilters] = useState({
    search: '',
    mekhalaId: 'all'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch districts
      const districtsSnapshot = await getDocs(collection(db, 'districts'));
      const districtsData = districtsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDistricts(districtsData);

      // Fetch mekhalas
      const mekhalasSnapshot = await getDocs(collection(db, 'mekhala'));
      const mekhalasData = mekhalasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMekhalas(mekhalasData);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDistrictForm({
      name: '',
      mekhalaId: '',
      description: ''
    });
    setEditingDistrict(null);
  };

  const getParsedDistrictNames = () => {
    if (!bulkForm.districtNames.trim()) return [];
    
    return bulkForm.districtNames
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
  };

  const getFilteredDistricts = () => {
    return districts.filter(district => {
      const matchesSearch = !filters.search || 
        district.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        (district.description && district.description.toLowerCase().includes(filters.search.toLowerCase()));
      
      const matchesMekhala = filters.mekhalaId === 'all' || district.mekhalaId === filters.mekhalaId;
      
      return matchesSearch && matchesMekhala;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!districtForm.name.trim() || !districtForm.mekhalaId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const districtData = {
        name: districtForm.name.trim(),
        mekhalaId: districtForm.mekhalaId,
        description: districtForm.description.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (editingDistrict) {
        await updateDoc(doc(db, 'districts', editingDistrict.id), {
          ...districtData,
          createdAt: editingDistrict.createdAt // Keep original creation date
        });
        toast.success('Mekhala updated successfully');
      } else {
        await addDoc(collection(db, 'districts'), districtData);
        toast.success('Mekhala added successfully');
      }

      setIsAddDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving district:', error);
      toast.error('Failed to save district');
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    
    if (!bulkForm.districtNames.trim() || !bulkForm.mekhalaId) {
      toast.error('Please enter district names and select a mekhala');
      return;
    }

    try {
      // Parse district names using helper function
      const districtNames = getParsedDistrictNames();

      if (districtNames.length === 0) {
        toast.error('Please enter valid district names');
        return;
      }

      // Create districts in batch
      const promises = districtNames.map(name => {
        const districtData = {
          name: name,
          mekhalaId: bulkForm.mekhalaId,
          description: bulkForm.description.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        return addDoc(collection(db, 'districts'), districtData);
      });

      await Promise.all(promises);
      
      toast.success(`Successfully added ${districtNames.length} districts`);
      setIsBulkDialogOpen(false);
      setBulkForm({
        districtNames: '',
        mekhalaId: '',
        description: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error adding districts in bulk:', error);
      toast.error('Failed to add districts in bulk');
    }
  };

  const handleEdit = (district) => {
    setEditingDistrict(district);
    setDistrictForm({
      name: district.name,
      mekhalaId: district.mekhalaId,
      description: district.description || ''
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (districtId) => {
    if (!confirm('Are you sure you want to delete this district?')) return;

    try {
      await deleteDoc(doc(db, 'districts', districtId));
      toast.success('Mekhala deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting district:', error);
      toast.error('Failed to delete district');
    }
  };

  const getMekhalaName = (mekhalaId) => {
    const mekhala = mekhalas.find(m => m.id === mekhalaId);
    return mekhala ? mekhala.name : 'Unknown District';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mekhala Management</h1>
            <p className="text-gray-600">Manage mekhalas and their mekhala assignments</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Bulk Add
                </Button>
              </DialogTrigger>
              <DialogContent className='bg-white h-[90vh] overflow-y-scroll max-w-2xl'>
                <DialogHeader>
                  <DialogTitle>Bulk Add Mekhala</DialogTitle>
                  <DialogDescription>
                    Add multiple mekhalas at once using comma-separated names
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBulkSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="mekhala-bulk">Assign to District*</Label>
                    <Select 
                      value={bulkForm.mekhalaId} 
                      onValueChange={(value) => setBulkForm(prev => ({ ...prev, mekhalaId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select district for all mekhalas" />
                      </SelectTrigger>
                      <SelectContent className='bg-white'>
                        {mekhalas.map((mekhala) => (
                          <SelectItem key={mekhala.id} value={mekhala.id}>
                            {mekhala.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="district-names">Mekhala Names*</Label>
                    <Textarea
                      id="district-names"
                      value={bulkForm.districtNames}
                      onChange={(e) => setBulkForm(prev => ({ ...prev, districtNames: e.target.value }))}
                      placeholder="Enter district names separated by commas (e.g., Mekhala A, Mekhala B, Mekhala C)"
                      rows={4}
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Separate district names with commas. Each name will be created as a separate district.
                    </p>
                    
                    {/* Preview Pills */}
                    {getParsedDistrictNames().length > 0 && (
                      <div className="mt-3">
                        <Label className="text-sm font-medium text-gray-700">
                          Preview ({getParsedDistrictNames().length} mekhalas):
                        </Label>
                        <div className="flex flex-wrap gap-2 mt-2 p-3 bg-gray-50 rounded-lg border">
                          {getParsedDistrictNames().map((name, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary" 
                              className="bg-blue-100 text-blue-800 border-blue-200"
                            >
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description-bulk">Description (Optional)</Label>
                    <Textarea
                      id="description-bulk"
                      value={bulkForm.description}
                      onChange={(e) => setBulkForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description for all mekhalas"
                      rows={2}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={getParsedDistrictNames().length === 0 || !bulkForm.mekhalaId}
                    >
                      Add {getParsedDistrictNames().length > 0 ? getParsedDistrictNames().length : ''} Mekhala{getParsedDistrictNames().length !== 1 ? 's' : ''}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Mekhala
                </Button>
              </DialogTrigger>
              <DialogContent className='bg-white'>
                <DialogHeader>
                  <DialogTitle>
                    {editingDistrict ? 'Edit Mekhala' : 'Add New Mekhala'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingDistrict ? 'Update district information' : 'Create a new district'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="district-name">Mekhala Name (Mutliple? Comma Seperated)*</Label>
                    <Input
                      id="district-name"
                      value={districtForm.name}
                      onChange={(e) => setDistrictForm(prev => ({ ...prev, name: e.target.value.toLocaleLowerCase() }))}
                      placeholder="Enter mekhala name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="mekhala">Assign to District*</Label>
                    <Select 
                      value={districtForm.mekhalaId} 
                      onValueChange={(value) => setDistrictForm(prev => ({ ...prev, mekhalaId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent className='bg-white'>
                        {mekhalas.map((mekhala) => (
                          <SelectItem key={mekhala.id} value={mekhala.id}>
                            {mekhala.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={districtForm.description}
                      onChange={(e) => setDistrictForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingDistrict ? 'Update' : 'Add'} Mekhala
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Mekhala ({getFilteredDistricts().length})
            </CardTitle>
            <CardDescription>
              Manage mekhalas and their mekhala assignments
            </CardDescription>
            
            {/* Filter Controls */}
            <div className="flex gap-4 mt-4">
              <div className="flex-1">
                <Input
                  placeholder="Search mekhalas..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full"
                />
              </div>
              <Select value={filters.mekhalaId} onValueChange={(value) => setFilters(prev => ({ ...prev, mekhalaId: value }))}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by District" />
                </SelectTrigger>
                <SelectContent className='bg-white'>
                  <SelectItem value="all">All District</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {mekhalas.map((mekhala) => (
                    <SelectItem key={mekhala.id} value={mekhala.id}>
                      {mekhala.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(filters.search || filters.mekhalaId !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFilters({ search: '', mekhalaId: 'all' });
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {districts.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No mekhalas found</h3>
                <p className="text-gray-500 mb-4">Start by adding your first district</p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Mekhala
                </Button>
              </div>
            ) : getFilteredDistricts().length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No mekhalas match your filters</h3>
                <p className="text-gray-500 mb-4">Try adjusting your search or filter criteria</p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setFilters({ search: '', mekhalaId: 'all' });
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mekhala Name</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredDistricts().map((district) => (
                    <TableRow key={district.id}>
                      <TableCell className="font-medium">{district.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getMekhalaName(district.mekhalaId)}
                        </Badge>
                      </TableCell>
                      <TableCell>{district.description || '-'}</TableCell>
                      <TableCell>
                        {district.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(district)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(district.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
