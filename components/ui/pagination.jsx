import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from 'lucide-react';

export const Pagination = React.forwardRef(({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  itemsPerPage = 20, 
  totalItems = 0,
  className = "",
  ...otherProps 
}, ref) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Always show pagination if there are items, even if only one page
  if (totalItems === 0) return null;

  // Debug logging
  console.log('Pagination Debug:', {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    startItem,
    endItem
  });

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, currentPage - halfVisible);
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  // Filter out component-specific props to prevent them from being passed to DOM elements
  const {
    currentPage: _currentPage,
    totalPages: _totalPages,
    onPageChange: _onPageChange,
    itemsPerPage: _itemsPerPage,
    totalItems: _totalItems,
    ...restProps
  } = otherProps;

  return (
    <div ref={ref} className={`flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 bg-gray-50 p-4 rounded-lg ${className}`} {...restProps}>
      <div className="text-sm text-gray-700 font-medium">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>
      
      <div className="flex items-center space-x-2">
        {/* Always show navigation when there are multiple pages */}
        {totalPages > 1 ? (
          <>
            {/* First page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="h-9 w-9 p-0 border-2"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            {/* Previous page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-9 w-9 p-0 border-2"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page numbers */}
            {getPageNumbers().map((pageNum) => (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className={`h-9 min-w-9 px-3 border-2 font-semibold ${
                  currentPage === pageNum 
                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700" 
                    : "hover:bg-blue-50 hover:border-blue-300"
                }`}
                title={`Page ${pageNum}`}
              >
                {pageNum}
              </Button>
            ))}

            {/* Next page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-9 w-9 p-0 border-2"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Last page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="h-9 w-9 p-0 border-2"
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>

            {/* Page input for large datasets */}
            {totalPages > 10 && (
              <div className="flex items-center space-x-2 ml-4">
                <span className="text-sm text-gray-500">Go to:</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      onPageChange(page);
                    }
                  }}
                  className="w-16 h-9 text-center border-2 rounded-md text-sm"
                />
              </div>
            )}
          </>
        ) : (
          /* Show page info for single page */
          <div className="text-sm text-gray-500 font-medium">
            Page 1 of 1
          </div>
        )}
      </div>
    </div>
  );
});

Pagination.displayName = "Pagination";