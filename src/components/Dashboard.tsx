import React, { useState } from 'react';
import { Issue } from '../types';
import { Link } from 'react-router-dom';
import './Dashboard.css';
import DashboardCharts from './DashboardCharts';

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
    if (issue.feature) {
      if (featureCounts[issue.feature]) {
        featureCounts[issue.feature]++;
      } else {
        featureCounts[issue.feature] = 1;
      }
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
    const assignee = issue.assignee || 'Unassigned';
    
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

  // Get feature color gradients based on feature name
  const getFeatureColor = (feature: string): [string, string] => {
    const lowerFeature = feature.toLowerCase();
    if (lowerFeature.includes('ui') || lowerFeature.includes('interface')) return ['#6366F1', '#8B5CF6']; // Indigo to Purple
    if (lowerFeature.includes('api') || lowerFeature.includes('backend')) return ['#3B82F6', '#0EA5E9']; // Blue to Sky
    if (lowerFeature.includes('auth') || lowerFeature.includes('security')) return ['#F59E0B', '#F97316']; // Amber to Orange
    if (lowerFeature.includes('data') || lowerFeature.includes('database')) return ['#10B981', '#06B6D4']; // Emerald to Cyan
    if (lowerFeature.includes('test') || lowerFeature.includes('qa')) return ['#8B5CF6', '#EC4899']; // Purple to Pink
    if (lowerFeature.includes('doc') || lowerFeature.includes('report')) return ['#6366F1', '#2563EB']; // Indigo to Blue
    if (lowerFeature.includes('mobile') || lowerFeature.includes('app')) return ['#F97316', '#EF4444']; // Orange to Red
    return ['#4F46E5', '#7C3AED']; // Indigo to Violet (default)
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
        <div className="dashboard-card-modern" style={{width: '100%', gridColumn: '1 / -1'}}>
          <DashboardCharts 
            pendingIssues={pendingIssues}
            inProgressIssues={inProgressIssues}
            resolvedIssues={resolvedIssues}
            highPriorityIssues={highPriorityIssues}
            mediumPriorityIssues={mediumPriorityIssues}
            lowPriorityIssues={lowPriorityIssues}
          />
        </div>
        
        <div className="dashboard-card features-distribution" style={{
          gridColumn: 'span 6',
          display: 'flex',
          flexDirection: 'column',
          padding: '32px',
          backgroundColor: 'white',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          gap: '24px'
        }}>
          <h2 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#1a1a1a',
            position: 'relative',
            display: 'inline-block',
            marginBottom: '8px'
          }}>
            Issues by Feature
            <div style={{ 
              position: 'absolute', 
              bottom: '-8px', 
              left: '0', 
              width: '48px', 
              height: '4px', 
              background: 'linear-gradient(90deg, #6366F1, #8B5CF6)', 
              borderRadius: '2px' 
            }}></div>
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            width: '100%'
          }}>
            {Object.entries(featureCounts).map(([feature, count]) => {
              const [gradientStart, gradientEnd] = getFeatureColor(feature);
              return (
                <div key={feature} className="feature-card" style={{
                  padding: '20px',
                  borderRadius: '16px',
                  background: '#fff',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'pointer'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className={`fas ${getFeatureIcon(feature)}`} style={{ color: '#fff', fontSize: '20px' }}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: '#1a1a1a',
                      marginBottom: '4px'
                    }}>{feature}</h3>
                    <p style={{ 
                      fontSize: '14px', 
                      color: '#666',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ fontWeight: '600', color: '#1a1a1a' }}>{count}</span> issues
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="dashboard-card team-workload" style={{
          gridColumn: 'span 6',
          display: 'flex',
          flexDirection: 'column',
          padding: '32px',
          backgroundColor: 'white',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          gap: '24px'
        }}>
          <h2 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#1a1a1a',
            position: 'relative',
            display: 'inline-block',
            marginBottom: '8px'
          }}>
            Team Workload
            <div style={{ 
              position: 'absolute', 
              bottom: '-8px', 
              left: '0', 
              width: '48px', 
              height: '4px', 
              background: 'linear-gradient(90deg, #F97316, #EF4444)', 
              borderRadius: '2px' 
            }}></div>
          </h2>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {sortedTeamMembers.map(member => {
              const workload = teamWorkload[member];
              const totalIssues = workload.total;
              const completionRate = Math.round((workload.resolved / totalIssues) * 100) || 0;
              
              return (
                <div key={member} style={{
                  padding: '20px',
                  borderRadius: '16px',
                  background: '#fff',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, #F97316, #EF4444)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}>
                        {member[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 style={{ 
                          fontSize: '16px', 
                          fontWeight: '600', 
                          color: '#1a1a1a' 
                        }}>{member}</h3>
                        <p style={{ 
                          fontSize: '14px', 
                          color: '#666' 
                        }}>{totalIssues} total issues</p>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        background: workload.high > 0 ? '#FEE2E2' : '#F3F4F6',
                        color: workload.high > 0 ? '#EF4444' : '#6B7280',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        {workload.high} High Priority
                      </div>
                      <div style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        background: '#F0FDF4',
                        color: '#22C55E',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        {completionRate}% Complete
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px'
                  }}>
                    <div style={{
                      padding: '12px',
                      borderRadius: '12px',
                      background: '#FFF7ED',
                      textAlign: 'center'
                    }}>
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#C2410C',
                        marginBottom: '4px'
                      }}>Pending</p>
                      <p style={{ 
                        fontSize: '16px', 
                        fontWeight: '600',
                        color: '#EA580C'
                      }}>{workload.pending}</p>
                    </div>
                    <div style={{
                      padding: '12px',
                      borderRadius: '12px',
                      background: '#EFF6FF',
                      textAlign: 'center'
                    }}>
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#1D4ED8',
                        marginBottom: '4px'
                      }}>In Progress</p>
                      <p style={{ 
                        fontSize: '16px', 
                        fontWeight: '600',
                        color: '#2563EB'
                      }}>{workload.doing}</p>
                    </div>
                    <div style={{
                      padding: '12px',
                      borderRadius: '12px',
                      background: '#F0FDF4',
                      textAlign: 'center'
                    }}>
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#15803D',
                        marginBottom: '4px'
                      }}>Resolved</p>
                      <p style={{ 
                        fontSize: '16px', 
                        fontWeight: '600',
                        color: '#16A34A'
                      }}>{workload.resolved}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
                    <span className={`badge-status badge-${issue.status || 'unknown'}`}>
                      {issue.status && issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                    </span>
                  </div>
                  <p className="issue-desc">{issue.description ? issue.description.substring(0, 100) + '...' : 'No description'}</p>
                  <div className="issue-meta">
                    <div className="issue-assignee">
                      <div className="avatar">
                        {issue.assignee && issue.assignee.charAt(0).toUpperCase()}
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

<style>
  {`
    .feature-card {
      transform: translateY(0);
    }
    .feature-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    }
  `}
</style> 