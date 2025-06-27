import {
  makeRedirectUri,
  revokeAsync,
  useAuthRequest,
} from "expo-auth-session";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = Constants.expoConfig!.extra!.githubClientId;

const discovery = {
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  tokenEndpoint: "https://github.com/login/oauth/access_token",
  revocationEndpoint: `https://github.com/settings/connections/applications/${CLIENT_ID}`,
};

export const useGitHubAuth = () => {
  const redirectUri = makeRedirectUri({
    scheme: "qnapp",
    path: "login",
  });

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ["repo", "user"],
      redirectUri,
      usePKCE: false,
    },
    discovery
  );

  return {
    request,
    response,
    promptAsync,
    redirectUri,
  };
};

export const exchangeCodeForToken = async (code: string) => {
  try {
    const response = await fetch(
      "https://qn-api.rovv.workers.dev/auth/github/token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code,
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("GitHub token exchange error:", data);
      throw new Error(data.error_description || data.error);
    }

    if (!data.access_token) {
      console.error("No access token in response:", data);
      throw new Error("No access token received");
    }

    return data.access_token;
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    throw error;
  }
};

export const fetchGitHubUser = async (token: string) => {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user data");
    }

    const userData = await response.json();

    return {
      login: userData.login,
      name: userData.name,
      avatarUrl: userData.avatar_url,
    };
  } catch (error) {
    console.error("Error fetching GitHub user:", error);
    throw error;
  }
};

export const revokeGitHubToken = async (token: string) => {
  try {
    await revokeAsync(
      {
        token,
        clientId: CLIENT_ID,
      },
      discovery
    );
  } catch (error) {
    console.error("Error revoking token:", error);
    // Continue with logout even if revocation fails
  }
};
