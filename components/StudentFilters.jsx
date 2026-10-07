"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Loader2 } from "lucide-react";

/**
 * StudentFilters Component
 * Implements cascading filter logic for student data
 * Filter hierarchy (per MD doc): Mekhala (District) → District (Mekhala) → Madrasa → Gender/Class/Status
 * Note: UI labels are swapped - "District" uses mekhala collection, "Mekhala" uses district collection
 */
export default function StudentFilters({
  searchTerm = "",
  setSearchTerm,
  filterMahal = "all",
  setFilterMahal,
  filterMekhala = "all",
  setFilterMekhala,
  filterDistrict = "all",
  setFilterDistrict,
  filterGender = "all",
  setFilterGender,
  filterClass = "all",
  setFilterClass,
  filterStatus = "all",
  setFilterStatus,
  madarsas = [],
  mekhalas = [],
  districts = [],
  classes = [],
  loading = false,
  searchLoading = false,
}) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          {/* Search Filter - Full Width */}
          <div className="w-full">
            <div className="relative">
              {searchLoading ? (
                <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              )}
              {loading ? (
                <div className="pl-10">
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <Input
                  placeholder="Search by name, email, phone, admission #, guardian..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              )}
            </div>
          </div>

          {/* Other Filters - Row Layout */}
          <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:gap-4">
            {/* District Filter - Level 1 (Independent, uses mekhala collection) */}
            <div className="w-full lg:w-48">
              {loading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <SearchableSelect
                  value={filterMekhala}
                  onValueChange={setFilterMekhala}
                  placeholder="Filter by District"
                  searchPlaceholder="Search District..."
                  options={mekhalas}
                  getOptionLabel={(mekhala) => mekhala.name}
                  getOptionValue={(mekhala) => mekhala.id}
                  getOptionSearchText={(mekhala) =>
                    `${mekhala.name} ${mekhala.id || ""}`
                  }
                  allOptionText="All Districts"
                  emptyText="No District found"
                />
              )}
            </div>

            {/* Mekhala Filter - Level 2 (Depends on District, uses district collection) */}
            <div className="w-full lg:w-48">
              {loading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={filterDistrict}
                  onValueChange={setFilterDistrict}
                  disabled={!filterMekhala || filterMekhala === "all"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Mekhala" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Mekhalas</SelectItem>
                    {districts.map((district) => (
                      <SelectItem key={district.id} value={district.id}>
                        {district.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Madrasa Filter - Level 3 (Filtered by parent pages based on District + Mekhala) */}
            <div className="w-full lg:w-48">
              {loading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <SearchableSelect
                  value={filterMahal}
                  onValueChange={setFilterMahal}
                  placeholder="Filter by Madrasa"
                  searchPlaceholder="Search madrasas..."
                  options={madarsas}
                  getOptionLabel={(madarsa) => `${madarsa.name}`}
                  getOptionValue={(madarsa) => madarsa.madarsaId || madarsa.id}
                  getOptionSearchText={(madarsa) =>
                    `${madarsa.name} ${madarsa.madarsaId || ""}`
                  }
                  allOptionText="All Madrasas"
                  emptyText="No madrasas found"
                />
              )}
            </div>

            {/* Gender Filter - Independent (can be used with any combination) */}
            <div className="w-full lg:w-48">
              {loading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={filterGender} onValueChange={setFilterGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Class Filter - Independent (can be used with any combination) */}
            <div className="w-full lg:w-48">
              {loading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Class" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((classLevel) => (
                      <SelectItem key={classLevel} value={classLevel}>
                        {classLevel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Status Filter - Independent (can be used with any combination) */}
            {setFilterStatus && (
              <div className="w-full lg:w-48">
                {loading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
