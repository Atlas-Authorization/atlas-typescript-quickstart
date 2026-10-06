// Atlas vanilla-JS quickstart — no framework, just @atlasauth/js.
//
// NOTE: the prebuilt <SignIn> / <UserButton> widgets live in @atlasauth/react
// (they render DOM via React). @atlasauth/js is the framework-agnostic layer
// beneath them: a `FapiClient` plus the flow / OAuth / session helpers those
// widgets are built from. This app wires those primitives by hand.
import {
  FapiClient,
  initialFlow,
  advance,
  startOauthRedirect,
  readRedirectResult,
  stripRedirectParams,
  type AttemptView,
  type FlowState,
} from '@atlasauth/js';

/** `GET /v1/client` — only the fields this app reads. */
interface ClientUser {
  id: string;
  first_name?: string | null;
}
interface ClientView {
  session?: { id: string } | null;
  user?: ClientUser | null;
  jwt?: string;
}

const client = new FapiClient({
  publishableKey: import.meta.env.VITE_ATLAS_PUBLISHABLE_KEY ?? '',
  baseUrl: import.meta.env.VITE_ATLAS_FRONTEND_API ?? 'https://atlasauth.net',
});

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
};
const out = (v: unknown): void => {
  $('out').textContent = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
};

// Read the current session: GET /v1/client returns { session, user, jwt }.
// The session cookie rides along automatically (credentials:'include').
async function render(): Promise<void> {
  const res = await client.get<ClientView>('/v1/client');
  const user = res.ok ? res.data?.user : null;
  if (user) {
    $('signed-out').classList.add('hidden');
    $('signed-in').classList.remove('hidden');
    $('who').textContent = `Signed in as ${user.first_name ?? user.id}`;
    out({ user, sessionId: res.data?.session?.id });
  } else {
    $('signed-in').classList.add('hidden');
    $('signed-out').classList.remove('hidden');
    out('Signed out.');
  }
}

// Exchange a completed attempt's one-time ticket for session cookies.
// (`AttemptView` in @atlasauth/js omits the id the server returns, so `attempt` is just `{ id }`.)
async function exchange(attempt: { id: string }, ticket: string): Promise<void> {
  await client.post('/v1/client/tickets/exchange', { attempt_id: attempt.id, ticket });
  await render();
}

// Email + password (+ optional emailed/MFA code), driven one step at a time.
async function emailSignIn(): Promise<void> {
  let flow: FlowState = initialFlow;
  flow = await advance(client, flow, { identifier: $<HTMLInputElement>('identifier').value });
  if (flow.errors.length) {
    out(flow.errors);
    return;
  }

  flow = await advance(client, flow, { password: $<HTMLInputElement>('password').value });
  if (flow.errors.length) {
    out(flow.errors);
    return;
  }

  // If the instance demands a second factor, submit the code field.
  if (flow.attempt && flow.attempt.status !== 'complete' && $<HTMLInputElement>('code').value) {
    flow = await advance(client, flow, { code: $<HTMLInputElement>('code').value });
  }

  if (flow.attempt?.status === 'complete' && flow.ticket) {
    // `id` is on the wire response but not on the SDK's AttemptView type.
    await exchange(flow.attempt as AttemptView & { id: string }, flow.ticket);
    return;
  }
  out({ status: flow.attempt?.status ?? 'unknown', note: 'Enter the code you were sent, if any.' });
}

// Social sign-in via a full-page redirect back to this app.
async function googleSignIn(): Promise<void> {
  const start = await startOauthRedirect(client, {
    provider: 'google',
    redirectUrl: window.location.origin,
  });
  if (start) window.location.href = start.authorizationUrl;
  else out('Could not start Google sign-in.');
}

async function signOut(): Promise<void> {
  const res = await client.get<ClientView>('/v1/client');
  const sid = res.data?.session?.id;
  if (sid) await client.post(`/v1/client/sessions/${sid}/revoke`);
  await render();
}

// On load, finish an OAuth redirect if we just came back from the provider.
async function boot(): Promise<void> {
  const result = readRedirectResult(window.location.search);
  if (result?.ticket) {
    await exchange({ id: result.attemptId }, result.ticket);
    history.replaceState(null, '', stripRedirectParams(window.location.href));
  }
  await render();
}

$('signin').addEventListener('click', () => void emailSignIn());
$('google').addEventListener('click', () => void googleSignIn());
$('signout').addEventListener('click', () => void signOut());
void boot();
