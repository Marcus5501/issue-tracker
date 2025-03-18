import { Handler } from '@netlify/functions';
import axios from 'axios';

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

const handler: Handler = async (event) => {
  const bodyParams = new URLSearchParams(event.body || '');
  const trigger_id = bodyParams.get('trigger_id');
  const channel_id = bodyParams.get('channel_id');
  
  console.log('slackIssueCommand triggered in channel:', channel_id);

  const modalView = {
    trigger_id: trigger_id,
    view: {
      type: 'modal',
      callback_id: 'issue_form_submit',
      title: { type: 'plain_text', text: 'Create New Issue' },
      submit: { type: 'plain_text', text: 'Submit' },
      private_metadata: channel_id || '', // Lưu channel_id để sử dụng khi submit
      blocks: [
        {
          type: 'input',
          block_id: 'title',
          element: { 
            type: 'plain_text_input', 
            action_id: 'input',
            placeholder: { type: 'plain_text', text: 'Enter a title for the issue' }
          },
          label: { type: 'plain_text', text: 'Title *' }
        },
        {
          type: 'input',
          block_id: 'description',
          element: { 
            type: 'plain_text_input', 
            action_id: 'input', 
            multiline: true,
            placeholder: { type: 'plain_text', text: 'Describe the issue in detail' }
          },
          label: { type: 'plain_text', text: 'Description *' }
        },
        {
          type: 'input',
          block_id: 'status',
          element: { 
            type: 'static_select', 
            action_id: 'input',
            initial_option: {
              text: { type: 'plain_text', text: 'Pending' },
              value: 'pending'
            },
            options: [
              {
                text: { type: 'plain_text', text: 'Pending' },
                value: 'pending'
              },
              {
                text: { type: 'plain_text', text: 'In Progress' },
                value: 'doing'
              },
              {
                text: { type: 'plain_text', text: 'Resolved' },
                value: 'resolved'
              }
            ]
          },
          label: { type: 'plain_text', text: 'Status' }
        },
        {
          type: 'input',
          block_id: 'priority',
          element: { 
            type: 'static_select', 
            action_id: 'input',
            initial_option: {
              text: { type: 'plain_text', text: 'Medium' },
              value: 'medium'
            },
            options: [
              {
                text: { type: 'plain_text', text: 'Low' },
                value: 'low'
              },
              {
                text: { type: 'plain_text', text: 'Medium' },
                value: 'medium'
              },
              {
                text: { type: 'plain_text', text: 'High' },
                value: 'high'
              }
            ]
          },
          label: { type: 'plain_text', text: 'Priority' }
        },
        {
          type: 'input',
          block_id: 'feature',
          element: { 
            type: 'static_select', 
            action_id: 'input',
            options: COMMON_FEATURES.map(feature => ({
              text: { type: 'plain_text', text: feature },
              value: feature
            }))
          },
          label: { type: 'plain_text', text: 'Feature *' }
        },
        {
          type: 'input',
          block_id: 'assignee',
          element: { 
            type: 'plain_text_input', 
            action_id: 'input',
            placeholder: { type: 'plain_text', text: 'Who should work on this issue?' }
          },
          label: { type: 'plain_text', text: 'Assignee *' }
        },
        {
          type: 'input',
          block_id: 'notes',
          optional: true,
          element: { 
            type: 'plain_text_input', 
            action_id: 'input', 
            multiline: true,
            placeholder: { type: 'plain_text', text: 'Any additional notes or comments' }
          },
          label: { type: 'plain_text', text: 'Notes (Optional)' }
        }
      ]
    }
  };

  try {
    await axios.post('https://slack.com/api/views.open', modalView, {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    return { statusCode: 200, body: '' };
  } catch (err) {
    console.error('Error opening modal:', err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: 'Failed to open modal',
        details: err.message
      }) 
    };
  }
};

export { handler };
