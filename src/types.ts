export interface Issue {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'doing' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  feature: string;
  assignee: string;
  createdAt: string;
  notes?: string;
  shopUrl?: string;
  chatUrl?: string;
} 