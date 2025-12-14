/**
 * ActiveJobsList Component
 * Displays a list of bulk processing jobs with filtering and search
 */

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JobCard } from './JobCard';
import { Search, Filter, Plus } from 'lucide-react';
import type { BulkJob, BulkJobStatus } from '@/types/bulk-processing';

interface ActiveJobsListProps {
  jobs: BulkJob[];
  isLoading?: boolean;
  onViewDetails: (jobId: string) => void;
  onPause?: (jobId: string) => void;
  onResume?: (jobId: string) => void;
  onStop?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
  onCreateNew?: () => void;
}

export const ActiveJobsList: React.FC<ActiveJobsListProps> = ({
  jobs,
  isLoading = false,
  onViewDetails,
  onPause,
  onResume,
  onStop,
  onDelete,
  onCreateNew
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BulkJobStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'progress' | 'name'>('date');

  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobs;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.name.toLowerCase().includes(query) ||
          job.id.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((job) => job.status === statusFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case 'progress':
          return b.progress - a.progress;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return sorted;
  }, [jobs, searchQuery, statusFilter, sortBy]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Active Jobs</CardTitle>
          {onCreateNew && (
            <Button onClick={onCreateNew} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create New Job
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as BulkJobStatus | 'all')}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="stopped">Stopped</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'date' | 'progress' | 'name')}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="progress">Sort by Progress</SelectItem>
              <SelectItem value="name">Sort by Name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Jobs List */}
        {filteredAndSortedJobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-2">
              {jobs.length === 0
                ? 'No jobs found. Create your first bulk processing job.'
                : 'No jobs match your filters.'}
            </div>
            {onCreateNew && jobs.length === 0 && (
              <Button onClick={onCreateNew} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create New Job
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onViewDetails={onViewDetails}
                onPause={onPause}
                onResume={onResume}
                onStop={onStop}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}

        {/* Results Count */}
        {filteredAndSortedJobs.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            Showing {filteredAndSortedJobs.length} of {jobs.length} jobs
          </div>
        )}
      </CardContent>
    </Card>
  );
};

