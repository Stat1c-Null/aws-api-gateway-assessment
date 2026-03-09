const config = window.APP_CONFIG;

const authStatus = document.getElementById("authStatus");
const output = document.getElementById("output");

document.getElementById("loginBtn").addEventListener("click", login);
document.getElementById("logoutBtn").addEventListener("click", logout);
document.getElementById("jokesBtn").addEventListener("click", () => callApi("/api/jokes"));
document.getElementById("locationBtn").addEventListener("click", () => callApi("/api/location"));

init();

//Check for auth code in URL and exchange for tokens if present
async function init() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code && !sessionStorage.getItem("access_token")) {
    try {
      await exchangeCodeForTokens(code);
      window.history.replaceState({}, document.title, config.redirectUri);
    } catch (err) {
      output.textContent = "Token exchange failed:\n" + String(err);
    }
  }

  renderAuthState();
}

// Update UI based on authentication state
function renderAuthState() {
  const accessToken = sessionStorage.getItem("access_token");
  const idToken = sessionStorage.getItem("id_token");

  if (accessToken || idToken) {
    authStatus.textContent = "Signed in";
  } else {
    authStatus.textContent = "Not signed in";
  }
}

//Login using PKCE flow
async function login() {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await pkceChallengeFromVerifier(codeVerifier);

  sessionStorage.setItem("pkce_code_verifier", codeVerifier);

  const authUrl = new URL(`https://${config.userPoolDomain}/oauth2/authorize`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("code_challenge", codeChallenge);

  window.location.href = authUrl.toString();
}

//Logout by clearing tokens
function logout() {
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("id_token");
  sessionStorage.removeItem("refresh_token");
  sessionStorage.removeItem("pkce_code_verifier");

  const logoutUrl = new URL(`https://${config.userPoolDomain}/logout`);
  logoutUrl.searchParams.set("client_id", config.clientId);
  logoutUrl.searchParams.set("logout_uri", config.redirectUri);

  window.location.href = logoutUrl.toString();
}

//Exchange authorization code for tokens at the token endpoint
async function exchangeCodeForTokens(code) {
  const codeVerifier = sessionStorage.getItem("pkce_code_verifier");
  if (!codeVerifier) {
    throw new Error("Missing PKCE code verifier in sessionStorage.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    code,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier
  });

  const response = await fetch(`https://${config.userPoolDomain}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token endpoint failed: ${response.status} ${text}`);
  }

  const tokens = await response.json();

  sessionStorage.setItem("access_token", tokens.access_token || "");
  sessionStorage.setItem("id_token", tokens.id_token || "");
  sessionStorage.setItem("refresh_token", tokens.refresh_token || "");
}

//Call protected API with access token in Authorization header
async function callApi(path) {
  const token = sessionStorage.getItem("access_token") || sessionStorage.getItem("id_token");

  if (!token) {
    output.textContent = "You must sign in first.";
    return;
  }

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  const text = await response.text();

  try {
    output.textContent = JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    output.textContent = text;
  }
}

function generateRandomString(length) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  let result = "";
  randomValues.forEach((x) => {
    result += charset[x % charset.length];
  });
  return result;
}

async function pkceChallengeFromVerifier(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes) {
  let binary = "";
  bytes.forEach((b) => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}