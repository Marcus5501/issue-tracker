import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Issue } from './types';
import IssueList from './components/IssueList';
import Dashboard from './components/Dashboard';
import IssueDetail from './components/IssueDetail';
import CreateIssue from './components/CreateIssue';
import { fetchIssues, addIssue, updateIssue, deleteIssue, setupIssuesListener } from './services/issueService';
import './App.css';

// Wrapper component to handle URL parameters
const IssueListWrapper: React.FC<{
  issues: Issue[];
  onDelete: (id: string) => void;
  onEdit: (issue: Issue) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onCreateIssue: (issue: Issue) => void;
}> = ({ issues, onDelete, onEdit, onUpdateNotes, onCreateIssue }) => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const viewParam = queryParams.get('view') as 'list' | 'grid' | 'table' | null;
  
  // Default to table view if no valid view is specified
  const view = viewParam && ['list', 'grid', 'table'].includes(viewParam) 
    ? viewParam 
    : 'table';
  
  return (
    <IssueList
      issues={issues}
      onDelete={onDelete}
      onEdit={onEdit}
      onUpdateNotes={onUpdateNotes}
      onCreateIssue={onCreateIssue}
      view={view}
    />
  );
};

const App: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sử dụng Firebase Realtime Database với listener
  useEffect(() => {
    setLoading(true);
    
    // Đầu tiên, lấy danh sách issues hiện tại
    const initIssues = async () => {
      try {
        console.log('Đang khởi tạo danh sách issues...');
        const fetchedIssues = await fetchIssues();
        console.log('Danh sách issues ban đầu:', fetchedIssues);
        setIssues(fetchedIssues);
        setError(null);
      } catch (err) {
        console.error('Error loading initial issues:', err);
        setError('Failed to load issues. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    initIssues();
    
    // Thiết lập listener để cập nhật realtime
    console.log('Thiết lập listener cho Firebase...');
    const unsubscribe = setupIssuesListener((updatedIssues) => {
      console.log('Nhận được cập nhật từ Firebase, issues mới:', updatedIssues.length);
      setIssues(updatedIssues);
      setLoading(false);
    });
    
    // Hủy đăng ký listener khi component unmount
    return () => {
      console.log('Hủy listener Firebase');
      unsubscribe();
    };
  }, []);

  const handleCreateIssue = async (newIssue: Omit<Issue, 'id'>) => {
    try {
      console.log('Đang tạo issue mới:', newIssue);
      setLoading(true);
      const createdIssue = await addIssue(newIssue);
      
      console.log('Kết quả từ addIssue:', createdIssue);
      
      if (createdIssue) {
        // Không cần cập nhật state vì listener sẽ tự cập nhật
        console.log('Issue đã được thêm vào Firebase, listener sẽ cập nhật UI');
      } else {
        console.error('Không nhận được issue từ addIssue');
      }
    } catch (err) {
      console.error('Error creating issue:', err);
      alert('Failed to create issue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIssue = async (id: string) => {
    try {
      setLoading(true);
      const success = await deleteIssue(id);
      
      if (success) {
        // Không cần cập nhật state vì listener sẽ tự cập nhật
        console.log('Issue đã được xóa từ Firebase, listener sẽ cập nhật UI');
      }
    } catch (err) {
      console.error('Error deleting issue:', err);
      alert('Failed to delete issue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIssue = async (updatedIssue: Issue) => {
    try {
      setLoading(true);
      const success = await updateIssue(updatedIssue);
      
      if (success) {
        // Không cần cập nhật state vì listener sẽ tự cập nhật
        console.log('Issue đã được cập nhật trong Firebase, listener sẽ cập nhật UI');
      }
    } catch (err) {
      console.error('Error updating issue:', err);
      alert('Failed to update issue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    const issueToUpdate = issues.find(issue => issue.id === id);
    
    if (issueToUpdate) {
      const updatedIssue = { ...issueToUpdate, notes };
      await handleUpdateIssue(updatedIssue);
    }
  };

  if (loading && issues.length === 0) {
    return <div className="loading-container">Loading issues...</div>;
  }

  if (error && issues.length === 0) {
    return <div className="error-container">{error}</div>;
  }

  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <div className="header-left">
            <h1>Issue Tracker</h1>
            <nav className="main-nav">
              <Link to="/" className="nav-link">Dashboard</Link>
              <Link to="/issues" className="nav-link">Issues</Link>
            </nav>
          </div>
        </header>

        <main className="app-main">
          {loading && <div className="loading-indicator">Processing...</div>}
          
          <Routes>
            <Route path="/" element={<Dashboard issues={issues} />} />
            <Route 
              path="/issues" 
              element={
                <IssueListWrapper
                  issues={issues}
                  onDelete={handleDeleteIssue}
                  onEdit={handleUpdateIssue}
                  onUpdateNotes={handleUpdateNotes}
                  onCreateIssue={handleCreateIssue}
                />
              } 
            />
            <Route 
              path="/issues/:id" 
              element={
                <IssueDetail 
                  issues={issues} 
                  onUpdateIssue={handleUpdateIssue} 
                  onDeleteIssue={handleDeleteIssue} 
                />
              } 
            />
            <Route 
              path="/create" 
              element={<CreateIssue onCreateIssue={handleCreateIssue} />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
