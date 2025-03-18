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

    const issueData = {
      app_name: payload.view.state.values.app_name.input.value,
      issue_type: payload.view.state.values.issue_type.input.value,
      severity: payload.view.state.values.severity.input.value,
      description: payload.view.state.values.description.input.value,
      created_at: Date.now()
    };

    console.log('✅ Parsed Issue:', issueData);

    await db.ref('issues').push(issueData);
    console.log('🔥 Issue saved to Firebase');

    return { statusCode: 200, body: '' };
  } catch (err) {
    console.error('❌ Error:', err);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};

export { handler };
