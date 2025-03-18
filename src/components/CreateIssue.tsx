import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Issue } from '../types';
import './CreateIssue.css';

interface CreateIssueProps {
  onCreateIssue: (newIssue: Issue) => void;
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

const CreateIssue: React.FC<CreateIssueProps> = ({ onCreateIssue }) => {
  const navigate = useNavigate();
  const [newIssue, setNewIssue] = useState<Omit<Issue, 'id' | 'createdAt'>>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    feature: COMMON_FEATURES[0], // Mặc định chọn tính năng đầu tiên
    assignee: '',
    notes: '',
    shopUrl: '',
    chatUrl: ''
  });
  const [customFeature, setCustomFeature] = useState<string>('');
  const [showCustomFeature, setShowCustomFeature] = useState<boolean>(false);
  const [followers, setFollowers] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'followers') {
      setFollowers(value.split(',').map(follower => follower.trim()));
    } else if (name === 'feature' && value === 'custom') {
      setShowCustomFeature(true);
    } else if (name === 'feature') {
      setShowCustomFeature(false);
      setNewIssue(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setNewIssue(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCustomFeatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomFeature(e.target.value);
    setNewIssue(prev => ({
      ...prev,
      feature: e.target.value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Cập nhật feature từ custom input nếu đang hiển thị
    let finalIssue = {...newIssue, followers};
    if (showCustomFeature && customFeature) {
      finalIssue.feature = customFeature;
    }
    
    // Validate form
    if (!finalIssue.title.trim() || !finalIssue.description.trim() || !finalIssue.feature.trim() || !finalIssue.assignee.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Create new issue with ID and timestamp
    const issueToCreate: Issue = {
      ...finalIssue,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    onCreateIssue(issueToCreate);
    navigate('/issues');
  };

  return (
    <div className="create-issue-container">
      <div className="create-issue-header">
        <button className="back-button" onClick={() => navigate('/issues')}>
          &larr; Back to Issues
        </button>
        <h1>Create New Issue</h1>
      </div>
      
      <form className="create-issue-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={newIssue.title}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={newIssue.description}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="shopUrl">Shop URL</label>
          <input
            type="url"
            id="shopUrl"
            name="shopUrl"
            value={newIssue.shopUrl}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="chatUrl">Chat URL</label>
          <input
            type="url"
            id="chatUrl"
            name="chatUrl"
            value={newIssue.chatUrl}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={newIssue.status}
              onChange={handleInputChange}
            >
              <option value="pending">Pending</option>
              <option value="doing">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={newIssue.priority}
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
            <label htmlFor="feature">Feature *</label>
            <select
              id="feature"
              name="feature"
              value={showCustomFeature ? 'custom' : newIssue.feature}
              onChange={handleInputChange}
              required
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
                required
              />
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="assignee">Assignee *</label>
            <input
              type="text"
              id="assignee"
              name="assignee"
              value={`@${newIssue.assignee}`}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="notes">Initial Notes (Optional)</label>
          <textarea
            id="notes"
            name="notes"
            value={newIssue.notes}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="followers">Followers (comma-separated)</label>
          <input
            type="text"
            id="followers"
            name="followers"
            value={followers.join(', ')}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="form-actions">
          <button type="button" className="cancel-button" onClick={() => navigate('/issues')}>
            Cancel
          </button>
          <button type="submit" className="submit-button">
            Create Issue
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateIssue; 