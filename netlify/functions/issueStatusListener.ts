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
    
    // Try to join the channel before sending the message
    await tryJoinChannel(message.channel);
    
    // If auth test passes, send the actual message
    const slackResponse = await axios.post('https://slack.com/api/chat.postMessage', message, {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📤 Message sent to Slack:', slackResponse.data);
    
    // Check for specific errors and provide helpful instructions
    if (!slackResponse.data.ok) {
      if (slackResponse.data.error === 'not_in_channel') {
        console.error('⚠️ BOT KHÔNG Ở TRONG CHANNEL! Vui lòng thêm bot vào channel bằng cách thực hiện:');
        console.error(`1. Mở Slack và vào channel "${message.channel}"`);
        console.error('2. Gõ "@[tên bot của bạn]" trong chat');
        console.error('3. Khi hiện lên thông tin bot, nhấp vào "Add to Channel"');
        console.error('4. Các notification sẽ hoạt động sau khi đã thêm bot vào channel');
      } else if (slackResponse.data.error === 'channel_not_found') {
        console.error(`⚠️ KHÔNG TÌM THẤY CHANNEL: "${message.channel}". Vui lòng kiểm tra ID channel.`);
      } else {
        console.error(`⚠️ LỖI SLACK API: ${slackResponse.data.error}`);
      }
    }
    
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
        
        // Create mention for assignee if available
        const assigneeMention = issue.assigneeId && issue.assigneeId !== 'Unassigned' 
          ? `<@${issue.assigneeId}>` 
          : '';
        
        if (newStatus === 'resolved') {
          statusChangeMessage = {
            channel: channelId,
            thread_ts: messageTs,
            text: `✅ Issue has been resolved!`,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `✅ *Issue has been resolved!*`
                }
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*${issue.title}* has been marked as resolved.${assigneeMention ? ` Great job ${assigneeMention}!` : ''}`
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
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: newStatus === 'doing' 
                    ? `Issue "*${issue.title}*" is now being worked on${assigneeMention ? ` by ${assigneeMention}` : ''}.`
                    : `Issue "*${issue.title}*" status has been updated.${assigneeMention ? ` CC: ${assigneeMention}` : ''}`
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