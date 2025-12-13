const TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks';
const GOOGLE_CLIENT_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise = null;
let tokenClient = null;
let accessToken = null;
let tokenExpiresAt = 0;

export async function exportShoppingList({ title, items, notes }) {
  ensureClientId();
  await loadGoogleClient();
  const token = await ensureAccessToken();
  const list = await createTaskList(title, token);

  if (items?.length) {
    for (const item of items) {
      await createTask(list.id, { title: item }, token);
    }
  }

  if (notes) {
    await createTask(list.id, { title: `${title} Notes`, notes }, token);
  }

  return list;
}

function ensureClientId() {
  if (!window.GOOGLE_TASKS_CLIENT_ID) {
    throw new Error('Google Tasks client ID is not configured.');
  }
}

function loadGoogleClient() {
  if (scriptPromise) {
    return scriptPromise;
  }
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GOOGLE_CLIENT_SRC;
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script.'));
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function ensureAccessToken() {
  if (accessToken && tokenExpiresAt > Date.now()) {
    return Promise.resolve(accessToken);
  }
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: window.GOOGLE_TASKS_CLIENT_ID,
        scope: TASKS_SCOPE,
        callback: (response) => {
          if (response.error) {
            reject(response);
            return;
          }
          accessToken = response.access_token;
          tokenExpiresAt = Date.now() + (response.expires_in || 3600) * 1000;
          resolve(accessToken);
        }
      });
    }
    try {
      tokenClient.requestAccessToken();
    } catch (err) {
      reject(err);
    }
  });
}

async function createTaskList(title, token) {
  const response = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({ title })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to create task list: ${message}`);
  }
  return response.json();
}

async function createTask(listId, task, token) {
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(task)
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to create task: ${message}`);
  }
  return response.json();
}

function buildHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}
