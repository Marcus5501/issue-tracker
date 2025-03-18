import { Handler } from '@netlify/functions';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import * as querystring from 'querystring';
import axios from 'axios';

// Initialize Firebase Admin
const firebaseApp = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = getDatabase(firebaseApp);

// Helper function to format priority and status for display
const formatPriorityEmoji = (priority: string): string => {
  switch (priority) {
    case 'high': return '🔴';
    case 'medium': return '🟠';
    case 'low': return '🟢';
    default: return '⚪';
  }
};

// Helper function to try joining a channel before posting
const tryJoinChannel = async (channelId: string): Promise<boolean> => {
  try {
    console.log(`Checking if bot needs to join channel: ${channelId}`);
    
    // First check if bot is already in the channel
    // Get bot's own ID
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
    try {
      const membersResponse = await axios.get(`https://slack.com/api/conversations.members?channel=${channelId}`, {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
        }
      });
      
      if (membersResponse.data.ok && membersResponse.data.members.includes(botUserId)) {
        console.log('✅ Bot is already in channel, no need to join');
        return true;
      }
    } catch (error) {
      // Continue to joining if checking fails
      console.log('Could not check membership, will try to join:', error);
    }
    
    // Try to join the channel using conversations.join API
    console.log('Bot not in channel, attempting to join now');
    const joinResponse = await axios.post('https://slack.com/api/conversations.join', 
      { channel: channelId }, 
      {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Channel join attempt result:', joinResponse.data);
    
    if (joinResponse.data.ok) {
      console.log('✅ Successfully joined channel!');
      return true;
    } else {
      console.error(`❌ Could not join channel: ${joinResponse.data.error}`);
      if (joinResponse.data.error === 'method_not_allowed_for_channel_type') {
        console.error('This might be a private channel or DM. Bot must be invited manually.');
      }
      return false;
    }
  } catch (error) {
    console.error('Error joining channel:', error);
    return false;
  }
};

const formatStatusEmoji = (status: string): string => {
  switch (status) {
    case 'pending': return '⏱️';
    case 'doing': return '🔄';
    case 'resolved': return '✅';
    default: return '❓';
  }
};

// Helper function to safely extract user information
const extractUserInfo = (payload: any) => {
  try {
    // Log the structure of payload for debugging
    console.log('Payload structure:', JSON.stringify({
      hasUser: !!payload.user,
      hasTeam: !!(payload.user && payload.user.team_id),
      hasChannel: !!payload.channel,
      view: !!(payload.view && payload.view.state && payload.view.state.values)
    }));
    
    // Different payload structures based on interaction type
    // For modal submissions
    if (payload.view && payload.view.state) {
      return {
        userId: payload.user?.id || 'unknown',
        username: payload.user?.name || 'Unknown User',
        channelId: payload.view?.private_metadata || payload.user?.id || 'unknown'
      };
    }
    
    // For slash commands or direct interactions
    return {
      userId: payload.user?.id || 'unknown',
      username: payload.user?.name || payload.user?.username || 'Unknown User',
      channelId: payload.channel?.id || payload.channel_id || payload.user?.id || 'unknown'
    };
  } catch (error) {
    console.error('Error extracting user info:', error);
    return {
      userId: 'unknown',
      username: 'Unknown User',
      channelId: 'unknown'
    };
  }
};

// Helper function to get user info from Slack API
const getUserInfo = async (userId: string): Promise<{ id: string, name: string, real_name?: string }> => {
  try {
    // Skip API call if no valid userId
    if (!userId || userId === 'Unassigned') {
      return { id: 'Unassigned', name: 'Unassigned' };
    }
    
    // Call Slack API to get user info
    const response = await axios.get(`https://slack.com/api/users.info?user=${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    });
    
    if (response.data.ok && response.data.user) {
      return {
        id: response.data.user.id,
        name: response.data.user.name,
        real_name: response.data.user.real_name || response.data.user.name
      };
    } else {
      console.error('Failed to get user info:', response.data.error);
      return { id: userId, name: 'Unknown User' };
    }
  } catch (error) {
    console.error('Error fetching user info:', error);
    return { id: userId, name: 'Unknown User' };
  }
};

const handler: Handler = async (event) => {
  try {
    // Parse x-www-form-urlencoded
    const bodyParams = querystring.parse(event.body || '');
    console.log('🔔 Raw Payload:', bodyParams.payload);

    const payload = JSON.parse(bodyParams.payload as string);
    
    // Extract user information safely
    const { userId, username, channelId } = extractUserInfo(payload);
    
    // Extract values from the submitted form
    const values = payload.view?.state?.values || {};
    
    // Safely access form values with fallbacks
    const title = values.title?.input?.value || 'Untitled Issue';
    const description = values.description?.input?.value || 'No description provided';
    const status = values.status?.input?.selected_option?.value || 'pending';
    const priority = values.priority?.input?.selected_option?.value || 'medium';
    const feature = values.feature?.input?.selected_option?.value || 'Unspecified';
    const shopUrl = values.shop_url?.input?.value || 'No shop URL provided';
    const chatUrl = values.chat_url?.input?.value || 'No chat URL provided';
    
    // Handle assignee from users_select
    const assigneeId = values.assignee?.input?.selected_user || 'Unassigned';
    const assigneeInfo = await getUserInfo(assigneeId);
    const assignee = assigneeInfo.real_name || assigneeInfo.name;
    
    const notes = values.notes?.input?.value || '';
    
    // Extract followers from the form
    const followers = values.followers?.input?.value.split(',').map((follower: string) => follower.trim()) || [];
    
    // Create issue data matching the web app structure
    const issueData = {
      title,
      description,
      status,
      priority,
      feature,
      shopUrl,
      chatUrl,
      assignee,
      assigneeId: assigneeInfo.id, // Save the user ID for future reference
      notes,
      followers, // Add followers to the issue data
      createdAt: new Date().toISOString(),
      id: Date.now().toString(), // Temporary ID that will be replaced by Firebase's key
      slackMetadata: {
        channelId,
        userId,
        username: `@${username}` // Add '@' symbol to the username
      }
    };

    console.log('✅ Parsed Issue:', issueData);

    // Get a reference to the issues node and push new data
    const issueRef = await db.ref('issues').push(issueData);
    
    // Get the generated Firebase key
    const issueId = issueRef.key;
    
    // Update the id field with Firebase's generated key to match web app structure
    await db.ref(`issues/${issueId}`).update({ id: issueId });
    
    console.log('🔥 Issue saved to Firebase with ID:', issueId);

    // Send a message to the Slack channel with issue details
    const message = {
      channel: channelId,
      text: `*New Issue Created:*`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `🔔 New Issue`,
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${title}*`
          }
        },
        {
          type: "divider"
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Status:* ${formatStatusEmoji(status)} ${status.charAt(0).toUpperCase() + status.slice(1)}`
            },
            {
              type: "mrkdwn",
              text: `*Priority:* ${formatPriorityEmoji(priority)} ${priority.charAt(0).toUpperCase() + priority.slice(1)}`
            },
            {
              type: "mrkdwn",
              text: `*Feature:* ${feature}`
            },
            {
              type: "mrkdwn",
              text: `*Assignee:* ${assigneeId !== 'Unassigned' ? `<@${assigneeId}>` : 'Unassigned'}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Description:*
${description}`
          }
        },
        {
          type: "divider"
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Shop URL:* ${shopUrl === 'No shop URL provided' ? shopUrl : `<${shopUrl}|Shop Link>`}`
            },
            {
              type: "mrkdwn",
              text: `*Chat URL:* ${chatUrl === 'No chat URL provided' ? chatUrl : `<${chatUrl}|Chat Link>`}`
            }
          ]
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Created by ${username} | ${new Date().toLocaleString()}`
            }
          ]
        },
        {
          type: "divider"
        }
      ]
    };

    // Try to join the channel before sending the message
    await tryJoinChannel(channelId);

    // Send the message to Slack
    const slackResponse = await axios.post('https://slack.com/api/chat.postMessage', message, {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📤 Message sent to Slack:', slackResponse.data);

    // Check if there was a channel permission error
    if (slackResponse.data.error === 'not_in_channel') {
      console.error('⚠️ BOT KHÔNG Ở TRONG CHANNEL! Vui lòng thêm bot vào channel bằng cách thực hiện:');
      console.error(`1. Mở Slack và vào channel "${channelId}"`);
      console.error('2. Gõ "@[tên bot của bạn]" trong chat');
      console.error('3. Khi hiện lên thông tin bot, nhấp vào "Add to Channel"');
      console.error('4. Thử lại lệnh issue sau khi đã thêm bot vào channel');
    }

    // Save the thread_ts to Firebase for future updates if successful
    if (slackResponse.data.ok && slackResponse.data.ts) {
      await db.ref(`issues/${issueId}/slackMetadata`).update({ 
        messageTs: slackResponse.data.ts 
      });
    }

    return { statusCode: 200, body: '' };
  } catch (err) {
    console.error('❌ Error:', err);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};

export { handler };
