import { Handler } from '@netlify/functions';
import axios from 'axios';

// Helper function to check if bot is in channel
const isBotInChannel = async (channelId: string): Promise<boolean> => {
  try {
    console.log(`Checking if bot is in channel: ${channelId}`);
    
    // First get bot's own ID using auth.test
    const authResponse = await axios.post('https://slack.com/api/auth.test', {}, {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!authResponse.data.ok) {
      console.error('Failed to get bot ID:', authResponse.data.error);
      return false;
    }
    
    const botUserId = authResponse.data.user_id;
    
    // Check if bot is in the channel
    const membersResponse = await axios.get(`https://slack.com/api/conversations.members?channel=${channelId}`, {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    });
    
    if (!membersResponse.data.ok) {
      // If error is not_in_channel or channel_not_found, it means bot is not in channel
      if (membersResponse.data.error === 'not_in_channel' || 
          membersResponse.data.error === 'channel_not_found') {
        return false;
      }
      
      console.error('Error checking channel members:', membersResponse.data.error);
      return false;
    }
    
    // Check if bot's ID is in members list
    return membersResponse.data.members.includes(botUserId);
  } catch (error) {
    console.error('Error checking if bot is in channel:', error);
    return false;
  }
};

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
            type: 'users_select', 
            action_id: 'input',
            placeholder: { type: 'plain_text', text: 'Ai sẽ xử lý issue này?' }
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
    
    // Check if bot is already in the channel
    const botInChannel = await isBotInChannel(channel_id || '');
    
    // Only send the reminder if bot is not in channel
    if (!botInChannel) {
      // Send a message to remind users to add the bot to the channel
      await axios.post('https://slack.com/api/chat.postEphemeral', {
        channel: channel_id,
        user: bodyParams.get('user_id'),
        text: "👋 *Lưu ý:* Để bot có thể gửi thông báo về issue, vui lòng đảm bảo đã *thêm bot vào channel này* nếu chưa làm điều đó. Bạn có thể thêm bot bằng cách gõ `@[tên bot]` và chọn 'Add to Channel'."
      }, {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
    }
    
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
