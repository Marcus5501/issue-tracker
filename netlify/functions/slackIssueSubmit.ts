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
    const assignee = values.assignee?.input?.value || 'Unassigned';
    const notes = values.notes?.input?.value || '';
    
    // Create issue data matching the web app structure
    const issueData = {
      title,
      description,
      status,
      priority,
      feature,
      assignee,
      notes,
      createdAt: new Date().toISOString(),
      id: Date.now().toString(), // Temporary ID that will be replaced by Firebase's key
      slackMetadata: {
        channelId,
        userId,
        username
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
      text: `*New Issue Created:* #${issueId}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `🔔 New Issue #${issueId}`,
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
              text: `*Assignee:* ${assignee}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Description:*\n${description}`
          }
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

    // Send the message to Slack
    const slackResponse = await axios.post('https://slack.com/api/chat.postMessage', message, {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📤 Message sent to Slack:', slackResponse.data);
    
    // Save the thread_ts to Firebase for future updates
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
