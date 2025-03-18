import { Handler } from '@netlify/functions';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import axios from 'axios';

// Initialize Firebase Admin
const firebaseApp = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
}, 'issueStatusListener');

const db = getDatabase(firebaseApp);

// Helper function to format status for display
const formatStatusEmoji = (status: string): string => {
  switch (status) {
    case 'pending': return '⏱️';
    case 'doing': return '🔄';
    case 'resolved': return '✅';
    default: return '❓';
  }
};

const handler: Handler = async (event) => {
  try {
    // Parse the body from the request
    const requestBody = JSON.parse(event.body || '{}');
    
    // Verify if this is a webhook call from our client app
    if (!requestBody.issueId || !requestBody.newStatus) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: issueId or newStatus' })
      };
    }

    const { issueId, newStatus, oldStatus } = requestBody;
    
    // Get the issue data from Firebase
    const issueSnapshot = await db.ref(`issues/${issueId}`).once('value');
    const issue = issueSnapshot.val();
    
    if (!issue) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Issue not found' })
      };
    }
    
    // Check if we have Slack metadata to send a notification
    if (issue.slackMetadata && issue.slackMetadata.channelId && issue.slackMetadata.messageTs) {
      const { channelId, messageTs } = issue.slackMetadata;
      
      // Only send a message if the status has changed
      if (oldStatus !== newStatus) {
        let statusChangeMessage;
        
        if (newStatus === 'resolved') {
          statusChangeMessage = {
            channel: channelId,
            thread_ts: messageTs,
            text: `✅ Issue #${issueId} has been resolved!`,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `✅ *Issue #${issueId} has been resolved!*`
                }
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*${issue.title}* has been marked as resolved.`
                }
              },
              {
                type: "context",
                elements: [
                  {
                    type: "mrkdwn",
                    text: `Resolved at: ${new Date().toLocaleString()}`
                  }
                ]
              }
            ]
          };
        } else {
          // For other status changes
          statusChangeMessage = {
            channel: channelId,
            thread_ts: messageTs,
            text: `${formatStatusEmoji(newStatus)} Status change: ${oldStatus} → ${newStatus}`,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `${formatStatusEmoji(newStatus)} *Status updated:* ${oldStatus} → ${newStatus}`
                }
              },
              {
                type: "context",
                elements: [
                  {
                    type: "mrkdwn",
                    text: `Updated at: ${new Date().toLocaleString()}`
                  }
                ]
              }
            ]
          };
        }
        
        // Send the message to Slack
        const slackResponse = await axios.post('https://slack.com/api/chat.postMessage', statusChangeMessage, {
          headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📤 Status update sent to Slack:', slackResponse.data);
        
        // Update last notified status in Firebase
        await db.ref(`issues/${issueId}/slackMetadata`).update({
          lastNotifiedStatus: newStatus,
          lastNotifiedAt: new Date().toISOString()
        });
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Status change notification processed' })
    };
  } catch (err) {
    console.error('❌ Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};

export { handler }; 