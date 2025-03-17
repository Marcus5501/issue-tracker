import React, { useState } from 'react';
import { Issue } from '../types';
import { Link } from 'react-router-dom';
import './Dashboard.css';

interface DashboardProps {
  issues: Issue[];
}

const Dashboard: React.FC<DashboardProps> = ({ issues }) => {
  const [timeRange, setTimeRange] = useState<'all' | 'week' | 'month'>('all');
  
  // Filter issues based on time range
  const getFilteredIssues = () => {
    if (timeRange === 'all') return issues;
    
    const now = new Date();
    const msInDay = 86400000; // 1 day in milliseconds
    const daysToFilter = timeRange === 'week' ? 7 : 30;
    const cutoffDate = new Date(now.getTime() - (daysToFilter * msInDay));
    
    return issues.filter(issue => new Date(issue.createdAt) >= cutoffDate);
  };
  
  const filteredIssues = getFilteredIssues();
  
  // Calculate statistics
  const totalIssues = filteredIssues.length;
  const pendingIssues = filteredIssues.filter(issue => issue.status === 'pending').length;
  const inProgressIssues = filteredIssues.filter(issue => issue.status === 'doing').length;
  const resolvedIssues = filteredIssues.filter(issue => issue.status === 'resolved').length;
  
  const highPriorityIssues = filteredIssues.filter(issue => issue.priority === 'high').length;
  const mediumPriorityIssues = filteredIssues.filter(issue => issue.priority === 'medium').length;
  const lowPriorityIssues = filteredIssues.filter(issue => issue.priority === 'low').length;

  // Calculate completion rate
  const completionRate = totalIssues > 0 
    ? Math.round((resolvedIssues / totalIssues) * 100) 
    : 0;

  // Group issues by feature
  const featureCounts: Record<string, number> = {};
  filteredIssues.forEach(issue => {
    if (featureCounts[issue.feature]) {
      featureCounts[issue.feature]++;
    } else {
      featureCounts[issue.feature] = 1;
    }
  });

  // Get recent issues (last 5)
  const recentIssues = [...filteredIssues]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Team workload analysis
  const teamWorkload: Record<string, {
    total: number,
    pending: number,
    doing: number,
    resolved: number,
    high: number,
    medium: number,
    low: number
  }> = {};

  filteredIssues.forEach(issue => {
    const assignee = issue.assignee;
    
    // Initialize if first encounter
    if (!teamWorkload[assignee]) {
      teamWorkload[assignee] = {
        total: 0,
        pending: 0,
        doing: 0,
        resolved: 0,
        high: 0,
        medium: 0,
        low: 0
      };
    }
    
    // Update counts
    teamWorkload[assignee].total++;
    teamWorkload[assignee][issue.status]++;
    teamWorkload[assignee][issue.priority]++;
  });

  // Sort team members by workload (total issues)
  const sortedTeamMembers = Object.keys(teamWorkload).sort(
    (a, b) => teamWorkload[b].total - teamWorkload[a].total
  );

  // Get feature icons based on feature name
  const getFeatureIcon = (feature: string) => {
    const lowerFeature = feature.toLowerCase();
    if (lowerFeature.includes('ui') || lowerFeature.includes('interface')) return 'fa-palette';
    if (lowerFeature.includes('api') || lowerFeature.includes('backend')) return 'fa-server';
    if (lowerFeature.includes('auth') || lowerFeature.includes('security')) return 'fa-shield-halved';
    if (lowerFeature.includes('data') || lowerFeature.includes('database')) return 'fa-database';
    if (lowerFeature.includes('test') || lowerFeature.includes('qa')) return 'fa-vial';
    if (lowerFeature.includes('doc') || lowerFeature.includes('report')) return 'fa-file-lines';
    if (lowerFeature.includes('mobile') || lowerFeature.includes('app')) return 'fa-mobile-screen';
    return 'fa-code-branch';
  };

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="time-filter">
          <button 
            className={`time-btn ${timeRange === 'all' ? 'active' : ''}`}
            onClick={() => setTimeRange('all')}
          >
            <i className="fas fa-infinity fa-sm"></i> All Time
          </button>
          <button 
            className={`time-btn ${timeRange === 'month' ? 'active' : ''}`}
            onClick={() => setTimeRange('month')}
          >
            <i className="fas fa-calendar-days fa-sm"></i> Last 30 Days
          </button>
          <button 
            className={`time-btn ${timeRange === 'week' ? 'active' : ''}`}
            onClick={() => setTimeRange('week')}
          >
            <i className="fas fa-calendar-week fa-sm"></i> Last 7 Days
          </button>
        </div>
      </div>
      
      <div className="stats-overview">
        <div className="stat-card total-issues">
          <div className="stat-icon">
            <i className="fas fa-clipboard-list"></i>
          </div>
          <div className="stat-content">
            <h3>Total Issues</h3>
            <p className="stat-value">{totalIssues}</p>
          </div>
        </div>
        
        <div className="stat-card completion-rate">
          <div className="stat-icon">
            <i className="fas fa-chart-pie"></i>
          </div>
          <div className="stat-content">
            <h3>Completion Rate</h3>
            <p className="stat-value">{completionRate}%</p>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="stat-card high-priority">
          <div className="stat-icon">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <div className="stat-content">
            <h3>High Priority</h3>
            <p className="stat-value">{highPriorityIssues}</p>
            <small>{totalIssues > 0 ? Math.round((highPriorityIssues / totalIssues) * 100) : 0}% of total</small>
          </div>
        </div>
        
        <div className="stat-card in-progress">
          <div className="stat-icon">
            <i className="fas fa-spinner fa-spin-pulse"></i>
          </div>
          <div className="stat-content">
            <h3>In Progress</h3>
            <p className="stat-value">{inProgressIssues}</p>
            <small>{totalIssues > 0 ? Math.round((inProgressIssues / totalIssues) * 100) : 0}% of total</small>
          </div>
        </div>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card status-distribution">
          <h2>Status Distribution</h2>
          <div className="status-chart">
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color pending"></span>
                <span className="legend-label">Pending</span>
                <span className="legend-value">{pendingIssues}</span>
              </div>
              <div className="legend-item">
                <span className="legend-color doing"></span>
                <span className="legend-label">In Progress</span>
                <span className="legend-value">{inProgressIssues}</span>
              </div>
              <div className="legend-item">
                <span className="legend-color resolved"></span>
                <span className="legend-label">Resolved</span>
                <span className="legend-value">{resolvedIssues}</span>
              </div>
            </div>
            <div className="chart-visual">
              {totalIssues > 0 ? (
                <>
                  <div 
                    className="chart-bar pending" 
                    style={{ width: `${(pendingIssues / totalIssues) * 100}%` }}
                    title={`Pending: ${pendingIssues} (${Math.round((pendingIssues / totalIssues) * 100)}%)`}
                  ></div>
                  <div 
                    className="chart-bar doing" 
                    style={{ width: `${(inProgressIssues / totalIssues) * 100}%` }}
                    title={`In Progress: ${inProgressIssues} (${Math.round((inProgressIssues / totalIssues) * 100)}%)`}
                  ></div>
                  <div 
                    className="chart-bar resolved" 
                    style={{ width: `${(resolvedIssues / totalIssues) * 100}%` }}
                    title={`Resolved: ${resolvedIssues} (${Math.round((resolvedIssues / totalIssues) * 100)}%)`}
                  ></div>
                </>
              ) : (
                <div className="no-data-chart">No data available</div>
              )}
            </div>
          </div>
          
          <h3>Priority Breakdown</h3>
          <div className="priority-chart">
            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-color high"></span>
                <span className="legend-label">High</span>
                <span className="legend-value">{highPriorityIssues}</span>
              </div>
              <div className="legend-item">
                <span className="legend-color medium"></span>
                <span className="legend-label">Medium</span>
                <span className="legend-value">{mediumPriorityIssues}</span>
              </div>
              <div className="legend-item">
                <span className="legend-color low"></span>
                <span className="legend-label">Low</span>
                <span className="legend-value">{lowPriorityIssues}</span>
              </div>
            </div>
            <div className="chart-visual">
              {totalIssues > 0 ? (
                <>
                  <div 
                    className="chart-bar high" 
                    style={{ width: `${(highPriorityIssues / totalIssues) * 100}%` }}
                    title={`High: ${highPriorityIssues} (${Math.round((highPriorityIssues / totalIssues) * 100)}%)`}
                  ></div>
                  <div 
                    className="chart-bar medium" 
                    style={{ width: `${(mediumPriorityIssues / totalIssues) * 100}%` }}
                    title={`Medium: ${mediumPriorityIssues} (${Math.round((mediumPriorityIssues / totalIssues) * 100)}%)`}
                  ></div>
                  <div 
                    className="chart-bar low" 
                    style={{ width: `${(lowPriorityIssues / totalIssues) * 100}%` }}
                    title={`Low: ${lowPriorityIssues} (${Math.round((lowPriorityIssues / totalIssues) * 100)}%)`}
                  ></div>
                </>
              ) : (
                <div className="no-data-chart">No data available</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="dashboard-card feature-distribution">
          <h2>Issues by Feature</h2>
          <div className="features-grid">
            {Object.entries(featureCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([feature, count]) => (
                <div key={feature} className="feature-card">
                  <div className="feature-icon">
                    <i className={`fas ${getFeatureIcon(feature)}`}></i>
                  </div>
                  <div className="feature-content">
                    <h4>{feature}</h4>
                    <p className="feature-count">{count} {count === 1 ? 'issue' : 'issues'}</p>
                  </div>
                </div>
              ))}
            {Object.keys(featureCounts).length === 0 && (
              <div className="no-data">No feature data available</div>
            )}
          </div>
        </div>
        
        <div className="dashboard-card team-workload">
          <h2>Team Workload</h2>
          {sortedTeamMembers.length > 0 ? (
            <div className="workload-list">
              {sortedTeamMembers.map(member => (
                <div key={member} className="workload-item">
                  <div className="member-info">
                    <div className="member-avatar">
                      {member.charAt(0).toUpperCase()}
                    </div>
                    <div className="member-name">{member}</div>
                  </div>
                  
                  <div className="workload-stats">
                    <div className="workload-total">
                      <span className="workload-number">{teamWorkload[member].total}</span>
                      <span className="workload-label">Total Issues</span>
                    </div>
                    
                    <div className="workload-breakdown">
                      <div className="workload-bar-container" aria-label="Status distribution">
                        {teamWorkload[member].pending > 0 && (
                          <div 
                            className="workload-bar pending" 
                            style={{ 
                              width: `${(teamWorkload[member].pending / teamWorkload[member].total) * 100}%` 
                            }}
                            title={`Pending: ${teamWorkload[member].pending}`}
                          ></div>
                        )}
                        {teamWorkload[member].doing > 0 && (
                          <div 
                            className="workload-bar doing" 
                            style={{ 
                              width: `${(teamWorkload[member].doing / teamWorkload[member].total) * 100}%` 
                            }}
                            title={`In Progress: ${teamWorkload[member].doing}`}
                          ></div>
                        )}
                        {teamWorkload[member].resolved > 0 && (
                          <div 
                            className="workload-bar resolved" 
                            style={{ 
                              width: `${(teamWorkload[member].resolved / teamWorkload[member].total) * 100}%` 
                            }}
                            title={`Resolved: ${teamWorkload[member].resolved}`}
                          ></div>
                        )}
                      </div>
                      
                      <div className="workload-numbers">
                        <span className="workload-number high" title="High Priority">
                          {teamWorkload[member].high}
                          <span className="priority-label">High</span>
                        </span>
                        <span className="workload-number medium" title="Medium Priority">
                          {teamWorkload[member].medium}
                          <span className="priority-label">Med</span>
                        </span>
                        <span className="workload-number low" title="Low Priority">
                          {teamWorkload[member].low}
                          <span className="priority-label">Low</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No team workload data available</div>
          )}
        </div>
        
        <div className="dashboard-card recent-activity">
          <div className="card-header">
            <h2>Recent Issues</h2>
            <Link to="/issues" className="view-all-link">
              View All <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
          
          <div className="recent-issues-list">
            {recentIssues.length > 0 ? (
              recentIssues.map(issue => (
                <Link to={`/issues/${issue.id}`} key={issue.id} className="recent-issue-card">
                  <div className="issue-header">
                    <h4>{issue.title}</h4>
                    <span className={`badge-status badge-${issue.status}`}>
                      {issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                    </span>
                  </div>
                  <p className="issue-desc">{issue.description.substring(0, 100)}...</p>
                  <div className="issue-meta">
                    <div className="issue-assignee">
                      <div className="avatar">
                        {issue.assignee.charAt(0).toUpperCase()}
                      </div>
                      <span>{issue.assignee}</span>
                    </div>
                    <span className="issue-date">
                      <i className="far fa-clock"></i> {formatDate(issue.createdAt)}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="no-data">No recent issues</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 