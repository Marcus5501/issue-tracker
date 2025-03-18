import { Handler } from '@netlify/functions';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import axios from 'axios';

// Initialize Firebase Admin
let firebaseApp;
let db;

try {
  firebaseApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  }, 'issueStatusListener');
  
  db = getDatabase(firebaseApp);
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

// Helper function to format status for display
const formatStatusEmoji = (status: string): string => {
  switch (status) {
    case 'pending': return '⏱️';
    case 'doing': return '🔄';
    case 'resolved': return '✅';
    default: return '❓';
  }
};

// Helper function to send message to Slack
const sendSlackMessage = async (message: any) => {
  try {
    // Test API token and connection first
    const authTestResponse = await axios.post('https://slack.com/api/auth.test', {}, {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Slack auth test:', authTestResponse.data);
    
    if (!authTestResponse.data.ok) {
      throw new Error(`Slack auth test failed: ${authTestResponse.data.error}`);
    }
    
    // If auth test passes, send the actual message
    const slackResponse = await axios.post('https://slack.com/api/chat.postMessage', message, {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📤 Message sent to Slack:', slackResponse.data);
    return slackResponse.data;
  } catch (error) {
    console.error('Error sending message to Slack:', error);
    throw error;
  }
};

const handler: Handler = async (event) => {
  try {
    // Validate Firebase initialization
    if (!db) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Firebase not initialized' })
      };
    }
    
    // Parse the body from the request
    const requestBody = JSON.parse(event.body || '{}');
    console.log('Received request body:', requestBody);
    
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
    
    console.log('Found issue with slack metadata:', issue.slackMetadata);
    
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
        
        try {
          // Send the message to Slack
          const slackResponseData = await sendSlackMessage(statusChangeMessage);
          
          // Update last notified status in Firebase
          if (slackResponseData.ok) {
            await db.ref(`issues/${issueId}/slackMetadata`).update({
              lastNotifiedStatus: newStatus,
              lastNotifiedAt: new Date().toISOString()
            });
          } else {
            console.error('Slack API error:', slackResponseData.error);
          }
        } catch (slackError) {
          console.error('Failed to send Slack notification:', slackError);
          // Continue processing, don't fail the entire function
        }
      }
    } else {
      console.log('No Slack metadata found or incomplete metadata for issue:', issueId);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Status change notification processed' })
    };
  } catch (err) {
    console.error('❌ Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: err.message })
    };
  }
};

export { handler }; 