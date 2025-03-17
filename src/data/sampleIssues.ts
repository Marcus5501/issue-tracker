import { Issue } from '../types';

export const sampleIssues: Issue[] = [
  {
    id: '1',
    title: 'Fix login page responsiveness',
    description: 'The login page is not displaying correctly on mobile devices. Need to adjust the layout and form elements.',
    status: 'doing',
    priority: 'high',
    feature: 'Authentication',
    assignee: 'John Doe',
    createdAt: '2024-03-20T10:00:00Z',
    notes: 'Working on mobile-first approach'
  },
  {
    id: '2',
    title: 'Implement dark mode',
    description: 'Add dark mode support across all pages with theme toggle functionality',
    status: 'pending',
    priority: 'medium',
    feature: 'UI/UX',
    assignee: 'Jane Smith',
    createdAt: '2024-03-19T15:30:00Z'
  },
  {
    id: '3',
    title: 'API Integration bug',
    description: 'Users are experiencing timeout errors when making API calls to the backend',
    status: 'resolved',
    priority: 'high',
    feature: 'Backend',
    assignee: 'Mike Johnson',
    createdAt: '2024-03-18T09:15:00Z',
    notes: 'Fixed by implementing request retry logic'
  }
]; 