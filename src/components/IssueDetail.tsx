import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Issue } from '../types';
import './IssueDetail.css';

interface IssueDetailProps {
  issues: Issue[];
  onUpdateIssue: (updatedIssue: Issue) => void;
  onDeleteIssue: (id: string) => void;
}

// Danh sách các tính năng phổ biến cho dropdown
const COMMON_FEATURES = [
  'Review box',
  'Star rating',
  'Submit form',
  'Review popup',
  'Carousel',
  'Sidebar',
  'All reviews page',
  'Testimonials',
  'Discount',
  'Review request',
  'Import reviews',
  'Email notification',
  'QR code',
  'Color',
  'SEO'
];

const IssueDetail: React.FC<IssueDetailProps> = ({ issues, onUpdateIssue, onDeleteIssue }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedIssue, setEditedIssue] = useState<Issue | null>(null);
  const [notes, setNotes] = useState('');
  const [customFeature, setCustomFeature] = useState<string>('');
  const [showCustomFeature, setShowCustomFeature] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      const foundIssue = issues.find(issue => issue.id === id);
      if (foundIssue) {
        setIssue(foundIssue);
        setEditedIssue(foundIssue);
        setNotes(foundIssue.notes || '');
        
        // Kiểm tra xem feature có trong danh sách không
        if (!COMMON_FEATURES.includes(foundIssue.feature)) {
          setCustomFeature(foundIssue.feature);
          setShowCustomFeature(true);
        } else {
          setShowCustomFeature(false);
        }
      }
    }
  }, [id, issues]);

  if (!issue) {
    return <div className="issue-detail-container">Issue not found</div>;
  }

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setEditedIssue({...issue});
      
      // Kiểm tra xem feature có trong danh sách không
      if (!COMMON_FEATURES.includes(issue.feature)) {
        setCustomFeature(issue.feature);
        setShowCustomFeature(true);
      } else {
        setShowCustomFeature(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (editedIssue) {
      // Xử lý đặc biệt cho feature
      if (name === 'feature' && value === 'custom') {
        setShowCustomFeature(true);
      } else if (name === 'feature') {
        setShowCustomFeature(false);
        setEditedIssue({
          ...editedIssue,
          [name]: value
        });
      } else {
        setEditedIssue({
          ...editedIssue,
          [name]: value
        });
      }
    }
  };

  const handleCustomFeatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomFeature(e.target.value);
    if (editedIssue) {
      setEditedIssue({
        ...editedIssue,
        feature: e.target.value
      });
    }
  };

  const handleSave = () => {
    if (editedIssue) {
      // Cập nhật feature từ custom input nếu đang hiển thị
      if (showCustomFeature && customFeature) {
        editedIssue.feature = customFeature;
      }
      
      onUpdateIssue(editedIssue);
      setIssue(editedIssue);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this issue?')) {
      onDeleteIssue(issue.id);
      navigate('/issues');
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const saveNotes = () => {
    if (issue) {
      const updatedIssue = { ...issue, notes };
      onUpdateIssue(updatedIssue);
    }
  };

  return (
    <div className="issue-detail-container">
      <div className="issue-detail-header">
        <button className="back-button" onClick={() => navigate('/issues')}>
          &larr; Back to Issues
        </button>
        <div className="issue-actions">
          <button className="edit-button" onClick={handleEditToggle}>
            {isEditing ? 'Cancel' : 'Edit Issue'}
          </button>
          {!isEditing && (
            <button className="delete-button" onClick={handleDelete}>
              Delete Issue
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="issue-edit-form">
          <h2>Edit Issue</h2>
          <div className="form-group">
            <label>Title:</label>
            <input
              type="text"
              name="title"
              value={editedIssue?.title || ''}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Description:</label>
            <textarea
              name="description"
              value={editedIssue?.description || ''}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Status:</label>
              <select
                name="status"
                value={editedIssue?.status || ''}
                onChange={handleInputChange}
              >
                <option value="pending">Pending</option>
                <option value="doing">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority:</label>
              <select
                name="priority"
                value={editedIssue?.priority || ''}
                onChange={handleInputChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Feature:</label>
              <select
                name="feature"
                value={COMMON_FEATURES.includes(editedIssue?.feature || '') ? editedIssue?.feature : 'custom'}
                onChange={handleInputChange}
              >
                {COMMON_FEATURES.map(feature => (
                  <option key={feature} value={feature}>{feature}</option>
                ))}
                <option value="custom">Custom Feature...</option>
              </select>
              {showCustomFeature && (
                <input
                  type="text"
                  className="custom-feature-input"
                  placeholder="Enter custom feature"
                  value={customFeature}
                  onChange={handleCustomFeatureChange}
                />
              )}
            </div>
            <div className="form-group">
              <label>Assignee:</label>
              <input
                type="text"
                name="assignee"
                value={editedIssue?.assignee || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <button className="save-button" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      ) : (
        <div className="issue-detail-content">
          <div className="issue-title-section">
            <h1>{issue.title}</h1>
            <div className="issue-badges">
              <span className={`badge-status badge-${issue.status || 'unknown'}`}>
                {issue.status ? issue.status.charAt(0).toUpperCase() + issue.status.slice(1) : 'Unknown'}
              </span>
              <span className={`badge-priority badge-${issue.priority || 'unknown'}`}>
                {issue.priority ? issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1) : 'Unknown'}
              </span>
            </div>
          </div>
          
          <div className="issue-meta">
            <div className="meta-item">
              <span className="meta-label">Feature:</span>
              <span className="meta-value">{issue.feature || 'Unassigned'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Assignee:</span>
              <span className="meta-value">{issue.assignee || 'Unassigned'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Created:</span>
              <span className="meta-value">{issue.createdAt ? new Date(issue.createdAt).toLocaleDateString() : 'Unknown'}</span>
            </div>
          </div>
          
          <div className="issue-description">
            <h3>Description</h3>
            <p>{issue.description || 'No description provided'}</p>
          </div>
          
          <div className="issue-notes">
            <h3>Developer Notes</h3>
            <textarea
              value={notes}
              onChange={handleNotesChange}
              placeholder="Add notes about this issue..."
            />
            <button className="save-notes-button" onClick={saveNotes}>
              Save Notes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueDetail; 