import React, { useState, useEffect } from 'react';
import { Issue } from '../types';
import { Link } from 'react-router-dom';
import './IssueList.css';

interface IssueListProps {
  issues: Issue[];
  onDelete: (id: string) => void;
  onEdit: (issue: Issue) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onCreateIssue: (issue: Issue) => void;
  view: 'list' | 'grid' | 'table';
}

type SortField = 'title' | 'status' | 'priority' | 'feature' | 'assignee' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const IssueList: React.FC<IssueListProps> = ({
  issues,
  onDelete,
  onEdit,
  onUpdateNotes,
  onCreateIssue,
  view
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [featureFilter, setFeatureFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>(issues);
  
  // Get unique features for filter dropdown
  const uniqueFeatures = Array.from(new Set(issues.map(issue => issue.feature)));

  // Apply filters and sorting
  useEffect(() => {
    let result = [...issues];
    
    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(issue => 
        issue.title.toLowerCase().includes(searchLower) || 
        issue.description.toLowerCase().includes(searchLower) ||
        issue.assignee.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(issue => issue.status === statusFilter);
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      result = result.filter(issue => issue.priority === priorityFilter);
    }
    
    // Apply feature filter
    if (featureFilter !== 'all') {
      result = result.filter(issue => issue.feature === featureFilter);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'title' || sortField === 'status' || sortField === 'priority' || sortField === 'feature' || sortField === 'assignee') {
        comparison = a[sortField].localeCompare(b[sortField]);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredIssues(result);
  }, [issues, searchTerm, statusFilter, priorityFilter, featureFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <span className="sort-icon">↕</span>;
    return sortDirection === 'asc' ? <span className="sort-icon">↑</span> : <span className="sort-icon">↓</span>;
  };

  const renderTableView = () => (
    <div className="table-container">
      <table className="issues-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('title')}>
              Title {renderSortIcon('title')}
            </th>
            <th onClick={() => handleSort('status')}>
              Status {renderSortIcon('status')}
            </th>
            <th onClick={() => handleSort('priority')}>
              Priority {renderSortIcon('priority')}
            </th>
            <th onClick={() => handleSort('feature')}>
              Feature {renderSortIcon('feature')}
            </th>
            <th onClick={() => handleSort('assignee')}>
              Assignee {renderSortIcon('assignee')}
            </th>
            <th onClick={() => handleSort('createdAt')}>
              Created {renderSortIcon('createdAt')}
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredIssues.map(issue => (
            <tr key={issue.id}>
              <td data-label="Title">
                <Link to={`/issues/${issue.id}`} className="issue-title-link">
                  {issue.title}
                </Link>
              </td>
              <td data-label="Status">
                <span className={`badge-status badge-${issue.status || 'unknown'}`}>
                  {issue.status ? issue.status.charAt(0).toUpperCase() + issue.status.slice(1) : 'Unknown'}
                </span>
              </td>
              <td data-label="Priority">
                <span className={`badge-priority badge-${issue.priority || 'unknown'}`}>
                  {issue.priority ? issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1) : 'Unknown'}
                </span>
              </td>
              <td data-label="Feature">{issue.feature || 'Unassigned'}</td>
              <td data-label="Assignee">
                <div className="table-assignee">
                  <div className="avatar">
                    {issue.assignee ? issue.assignee.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span>{issue.assignee || 'Unassigned'}</span>
                </div>
              </td>
              <td data-label="Created">{new Date(issue.createdAt).toLocaleDateString()}</td>
              <td data-label="Actions">
                <div className="table-actions">
                  <Link to={`/issues/${issue.id}`} className="view-btn table-btn">
                    View
                  </Link>
                  <button
                    onClick={() => onDelete(issue.id)}
                    className="delete-btn table-btn"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderGridView = () => (
    <div className={`issues-container grid`}>
      {filteredIssues.map(issue => (
        <div key={issue.id} className="issue-card">
          <div className="issue-card-content">
            <div className="issue-card-header">
              <Link to={`/issues/${issue.id}`} className="issue-title-link">
                <h3>{issue.title}</h3>
              </Link>
            </div>

            <div className="issue-badges">
              <span className={`badge-status badge-${issue.status || 'unknown'}`}>
                {issue.status ? issue.status.charAt(0).toUpperCase() + issue.status.slice(1) : 'Unknown'}
              </span>
              <span className={`badge-priority badge-${issue.priority || 'unknown'}`}>
                {issue.priority ? issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1) : 'Unknown'} Priority
              </span>
            </div>

            <div className="issue-description">{issue.description || 'No description'}</div>

            <div className="issue-meta">
              <div className="issue-feature">
                <span>Feature:</span>
                <span>{issue.feature || 'Unassigned'}</span>
              </div>
              <div className="issue-assignee">
                <span>Assignee:</span>
                <div className="avatar">
                  {issue.assignee ? issue.assignee.charAt(0).toUpperCase() : 'U'}
                </div>
                <span>{issue.assignee || 'Unassigned'}</span>
              </div>
              <div className="issue-date">
                <span>Created:</span>
                <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="issue-notes">
              <div className="notes-header">
                <h4>Developer Notes</h4>
              </div>
              <div className="notes-content">
                {issue.notes || <span className="notes-empty">No notes added yet</span>}
              </div>
            </div>
          </div>

          <div className="issue-actions">
            <Link to={`/issues/${issue.id}`} className="view-btn">
              View Details
            </Link>
            <button
              onClick={() => onDelete(issue.id)}
              className="delete-btn"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className={`issues-container list`}>
      {filteredIssues.map(issue => (
        <div key={issue.id} className="issue-card">
          <div className="issue-card-content">
            <div className="issue-card-header">
              <Link to={`/issues/${issue.id}`} className="issue-title-link">
                <h3>{issue.title}</h3>
              </Link>
            </div>

            <div className="issue-badges">
              <span className={`badge-status badge-${issue.status || 'unknown'}`}>
                {issue.status ? issue.status.charAt(0).toUpperCase() + issue.status.slice(1) : 'Unknown'}
              </span>
              <span className={`badge-priority badge-${issue.priority || 'unknown'}`}>
                {issue.priority ? issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1) : 'Unknown'} Priority
              </span>
            </div>

            <div className="issue-description">{issue.description || 'No description'}</div>

            <div className="issue-meta">
              <div className="issue-feature">
                <span>Feature:</span>
                <span>{issue.feature || 'Unassigned'}</span>
              </div>
              <div className="issue-assignee">
                <span>Assignee:</span>
                <div className="avatar">
                  {issue.assignee ? issue.assignee.charAt(0).toUpperCase() : 'U'}
                </div>
                <span>{issue.assignee || 'Unassigned'}</span>
              </div>
              <div className="issue-date">
                <span>Created:</span>
                <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="issue-notes">
              <div className="notes-header">
                <h4>Developer Notes</h4>
              </div>
              <div className="notes-content">
                {issue.notes || <span className="notes-empty">No notes added yet</span>}
              </div>
            </div>
          </div>

          <div className="issue-actions">
            <Link to={`/issues/${issue.id}`} className="view-btn">
              View Details
            </Link>
            <button
              onClick={() => onDelete(issue.id)}
              className="delete-btn"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="issues-page">
      <div className="issues-header">
        <h2>All Issues</h2>
        <Link to="/create" className="create-issue-btn">
          Create New Issue
        </Link>
      </div>
      
      <div className="issues-toolbar">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search issues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filters-container">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="doing">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          
          <select 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          
          <select 
            value={featureFilter} 
            onChange={(e) => setFeatureFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Features</option>
            {uniqueFeatures.map(feature => (
              <option key={feature} value={feature}>{feature}</option>
            ))}
          </select>
        </div>
        
        <div className="view-toggle">
          <button
            className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`}
            onClick={() => window.location.href = '/issues?view=table'}
            aria-label="Table view"
          >
            <i className="fas fa-table"></i>
            <span className="view-text">Table</span>
          </button>
          <button
            className={`view-toggle-btn ${view === 'grid' ? 'active' : ''}`}
            onClick={() => window.location.href = '/issues?view=grid'}
            aria-label="Grid view"
          >
            <i className="fas fa-th"></i>
            <span className="view-text">Grid</span>
          </button>
          <button
            className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`}
            onClick={() => window.location.href = '/issues?view=list'}
            aria-label="List view"
          >
            <i className="fas fa-list"></i>
            <span className="view-text">List</span>
          </button>
        </div>
      </div>
      
      <div className="issues-count">
        Showing {filteredIssues.length} of {issues.length} issues
      </div>
      
      {view === 'table' && renderTableView()}
      {view === 'grid' && renderGridView()}
      {view === 'list' && renderListView()}
      
      {filteredIssues.length === 0 && (
        <div className="no-issues">
          <p>No issues found matching your filters.</p>
        </div>
      )}
    </div>
  );
};

export default IssueList; 