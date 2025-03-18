import { Handler } from '@netlify/functions';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import * as querystring from 'querystring';

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

const handler: Handler = async (event) => {
  try {
    // Parse x-www-form-urlencoded
    const bodyParams = querystring.parse(event.body || '');
    console.log('🔔 Raw Payload:', bodyParams.payload);

    const payload = JSON.parse(bodyParams.payload as string);
    
    // Extract values from the submitted form
    const title = payload.view.state.values.title.input.value;
    const description = payload.view.state.values.description.input.value;
    const status = payload.view.state.values.status.input.selected_option?.value || 'pending';
    const priority = payload.view.state.values.priority.input.selected_option?.value || 'medium';
    const feature = payload.view.state.values.feature.input.selected_option?.value || '';
    const assignee = payload.view.state.values.assignee.input.value;
    const notes = payload.view.state.values.notes?.input?.value || '';
    
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
      id: Date.now().toString() // Temporary ID that will be replaced by Firebase's key
    };

    console.log('✅ Parsed Issue:', issueData);

    // Get a reference to the issues node and push new data
    const issueRef = await db.ref('issues').push(issueData);
    
    // Update the id field with Firebase's generated key to match web app structure
    await db.ref(`issues/${issueRef.key}`).update({ id: issueRef.key });
    
    console.log('🔥 Issue saved to Firebase with ID:', issueRef.key);

    return { statusCode: 200, body: '' };
  } catch (err) {
    console.error('❌ Error:', err);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};

export { handler };
