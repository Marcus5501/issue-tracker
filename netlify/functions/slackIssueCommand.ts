import { Handler } from '@netlify/functions';
import axios from 'axios';

const handler: Handler = async (event) => {
  const bodyParams = new URLSearchParams(event.body || '');
  const trigger_id = bodyParams.get('trigger_id');

  const modalView = {
    trigger_id: trigger_id,
    view: {
      type: 'modal',
      callback_id: 'issue_form_submit',
      title: { type: 'plain_text', text: 'Report Issue' },
      submit: { type: 'plain_text', text: 'Submit' },
      blocks: [
        {
          type: 'input',
          block_id: 'app_name',
          label: { type: 'plain_text', text: 'App Name' },
          element: { type: 'plain_text_input', action_id: 'input' }
        },
        {
          type: 'input',
          block_id: 'issue_type',
          label: { type: 'plain_text', text: 'Issue Type' },
          element: { type: 'plain_text_input', action_id: 'input' }
        },
        {
          type: 'input',
          block_id: 'severity',
          label: { type: 'plain_text', text: 'Severity' },
          element: { type: 'plain_text_input', action_id: 'input' }
        },
        {
          type: 'input',
          block_id: 'description',
          label: { type: 'plain_text', text: 'Description' },
          element: { type: 'plain_text_input', action_id: 'input', multiline: true }
        }
      ]
    }
  };

  await axios.post('https://slack.com/api/views.open', modalView, {
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  return { statusCode: 200, body: '' };
};

export { handler };
