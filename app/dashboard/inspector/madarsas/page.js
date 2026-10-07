"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import InspectorLayout from "@/components/InspectorLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Eye, Search, MapPin, Users, Calendar, School, AlertCircle, CheckCircle } from "lucide-react";
import useAuthStore from "@/lib/authStore";
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function InspectorMadarsasPage() {
  const { user, userData } = useAuthStore();
  const [madarsas, setMadarsas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchAssignedMadarsas = async () => {
      try {
        setLoading(true);
        setError("");

        if (!userData?.assignedMadarsas || userData.assignedMadarsas.length === 0) {
          setLoading(false);
          return;
        }

        

        // First, let's check what madarsas exist in the collection
        const allMadarsasQuery = query(collection(db, "madarsas"));
        const allMadarsasSnapshot = await getDocs(allMadarsasQuery);
        console.log('Total madarsas in collection:', allMadarsasSnapshot.size);
        
     
     

        // Fetch assigned madarsas details
        const madarsasQuery = query(
          collection(db, "madarsas"),
          where("madarsaId", "in", userData.assignedMadarsas)
        );
        const madarsasSnapshot = await getDocs(madarsasQuery);

      
        // Debug: Check for matches manually
        const allMadarsaIds = allMadarsasSnapshot.docs.map(doc => doc.data().madarsaId);
        
        const matches = userData.assignedMadarsas.filter(assignedId => 
          allMadarsaIds.includes(assignedId)
        );
        
        const nonMatches = userData.assignedMadarsas.filter(assignedId => 
          !allMadarsaIds.includes(assignedId)
        );

        if (madarsasSnapshot.empty) {
          setError("No madarsas found for the assigned IDs.");
          setLoading(false);
          return;
        }

        // Get student counts for each madarsa
        const madarsasWithStats = await Promise.all(
          madarsasSnapshot.docs.map(async (doc) => {
            const madarsaData = { id: doc.id, ...doc.data() };
            
            try {
              // Get student count
              const studentsCount = await getCountFromServer(
                query(
                  collection(db, "students"),
                  where("madarsaId", "==", madarsaData.madarsaId)
                )
              );

              // Get teacher count
              const teachersCount = await getCountFromServer(
                query(
                  collection(db, "users"),
                  where("role", "==", "teacher"),
                  where("madarsaId", "==", madarsaData.madarsaId)
                )
              );

              return {
                ...madarsaData,
                studentCount: studentsCount.data().count,
                teacherCount: teachersCount.data().count,
              };
            } catch (countError) {
              console.error("Error fetching counts for madarsa:", madarsaData.madarsaId, countError);
              return {
                ...madarsaData,
                studentCount: 0,
                teacherCount: 0,
              };
            }
          })
        );

        setMadarsas(madarsasWithStats);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching assigned madarsas:", error);
        setError("Failed to load assigned madarsas. Please try again.");
        setLoading(false);
      }
    };

    if (userData) {
      fetchAssignedMadarsas();
    }
  }, [userData]);

  const filteredMadarsas = madarsas.filter(
    (madarsa) =>
      madarsa.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      madarsa.madarsaId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      madarsa.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      madarsa.district?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <InspectorLayout>
        <div className="p-6 space-y-6">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
          
          {/* Search Skeleton */}
          <div className="h-10 bg-gray-200 rounded w-80 animate-pulse"></div>
          
          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </InspectorLayout>
    );
  }

  return (
    <InspectorLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              Assigned Madrasas
            </h1>
            <p className="text-gray-600 mt-1">
              Manage and inspect your assigned madarsas ({madarsas.length} total)
            </p>
          </div>
       
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search and Stats */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search madarsas by name, ID, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 border-gray-200 focus:border-teal-500 focus:ring-teal-500"
            />
          </div>
          
          {searchTerm && (
            <div className="text-sm text-gray-600">
              Showing {filteredMadarsas.length} of {madarsas.length} madarsas
            </div>
          )}
        </div>

        {/* Madrasas Grid */}
        {filteredMadarsas.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="text-center py-16">
              <div className="flex flex-col items-center space-y-4">
                <div className="rounded-full bg-gray-100 p-4">
                  <Building className="h-12 w-12 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {madarsas.length === 0 ? "No Madrasas Assigned" : "No Results Found"}
                  </h3>
                  <p className="text-gray-600 max-w-sm">
                    {madarsas.length === 0
                      ? "You haven't been assigned any madarsas yet. Contact your administrator for assignments."
                      : `No madarsas match "${searchTerm}". Try adjusting your search terms.`}
                  </p>
                </div>
                {searchTerm && (
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchTerm("")}
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMadarsas.map((madarsa) => (
              <Card key={madarsa.id} className="hover:shadow-lg transition-all duration-200 border-gray-200 hover:border-teal-300 group">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-teal-600 transition-colors truncate">
                        {madarsa.name}
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-1">
                        <span className="text-xs text-gray-500">ID:</span>
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                          {madarsa.madarsaId}
                        </code>
                      </CardDescription>
                    </div>
                    <Badge
                      variant={madarsa.status === "active" ? "default" : "secondary"}
                      className={
                        madarsa.status === "active" 
                          ? "bg-green-100 text-green-800 border-green-200" 
                          : "bg-gray-100 text-gray-600"
                      }
                    >
                      {madarsa.status || "active"}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Location */}
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {madarsa.address}
                      </p>
                      {madarsa.district && (
                        <p className="text-xs text-gray-500 mt-1">
                          District: {madarsa.district}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-2 bg-teal-50 rounded-lg">
                      <Users className="h-4 w-4 text-teal-600" />
                      <div>
                        <p className="text-sm font-medium text-teal-900">
                          {madarsa.studentCount}
                        </p>
                        <p className="text-xs text-teal-600">Students</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                      <Users className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900">
                          {madarsa.teacherCount}
                        </p>
                        <p className="text-xs text-green-600">Teachers</p>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <span className="text-gray-500 text-xs">Established:</span>
                      <p className="font-medium text-gray-700">
                        {madarsa.established || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-500 text-xs">Capacity:</span>
                      <p className="font-medium text-gray-700">
                        {madarsa.capacity || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {madarsa.description && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                        {madarsa.description}
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-2">
                    <Button 
                      asChild 
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                    >
                      <Link href={`/dashboard/inspector/madarsas/${madarsa.madarsaId}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        Start Inspection
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </InspectorLayout>
  );
}
