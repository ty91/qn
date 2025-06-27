import { Base64 } from "js-base64";
import { GitHubContentResponse, GitHubUserRepo } from "../types/github";

const GITHUB_API_URL = "https://api.github.com";
const REPO_NAME = "qn-vault";
const REPO_DESCRIPTION = "Data vault for the qn note-taking app.";

export type RepoStatus = "READY" | "CONFLICT" | "NOT_FOUND";

let owner = "";

const getHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github.v3+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

async function githubApiRequest<T>(
  url: string,
  options: RequestInit,
  isJson = true
): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `GitHub API request failed: ${response.status} ${response.statusText} - ${errorData.message}`
    );
  }
  if (isJson) {
    return response.json();
  }
  return response as T;
}

export async function getLoginUser(token: string) {
  const user = await githubApiRequest<{ login: string }>(
    `${GITHUB_API_URL}/user`,
    {
      headers: getHeaders(token),
    }
  );
  owner = user.login;
  return user;
}

export async function checkRepoStatus(token: string): Promise<RepoStatus> {
  try {
    const repos = await githubApiRequest<GitHubUserRepo[]>(
      `${GITHUB_API_URL}/user/repos?type=owner`,
      {
        headers: getHeaders(token),
      }
    );
    const qnRepo = repos.find((repo) => repo.name === REPO_NAME);

    if (!qnRepo) {
      return "NOT_FOUND";
    }

    if (qnRepo.description === REPO_DESCRIPTION) {
      return "READY";
    }

    return "CONFLICT";
  } catch (error) {
    console.error("Failed to verify repo existence:", error);
    throw error;
  }
}

export async function createRepo(token: string): Promise<void> {
  await githubApiRequest(`${GITHUB_API_URL}/user/repos`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify({
      name: REPO_NAME,
      description: REPO_DESCRIPTION,
      private: true,
    }),
  });
}

export async function getNote(
  token: string,
  noteId: string
): Promise<{ content: string; sha: string } | null> {
  try {
    const response = await githubApiRequest<GitHubContentResponse>(
      `${GITHUB_API_URL}/repos/${owner}/${REPO_NAME}/contents/notes/${noteId}.md`,
      {
        headers: getHeaders(token),
      }
    );
    const content = Base64.decode(response.content);
    return { content, sha: response.sha };
  } catch (error) {
    // It's okay if the note doesn't exist, so we can ignore 404 errors.
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

export async function upsertNote(
  token: string,
  noteId: string,
  content: string,
  sha?: string
): Promise<void> {
  await githubApiRequest(
    `${GITHUB_API_URL}/repos/${owner}/${REPO_NAME}/contents/notes/${noteId}.md`,
    {
      method: "PUT",
      headers: getHeaders(token),
      body: JSON.stringify({
        message: `upsert note ${noteId}`,
        content: Base64.encode(content),
        sha,
      }),
    }
  );
}

export async function deleteNote(
  token: string,
  noteId: string,
  sha: string
): Promise<void> {
  await githubApiRequest(
    `${GITHUB_API_URL}/repos/${owner}/${REPO_NAME}/contents/notes/${noteId}.md`,
    {
      method: "DELETE",
      headers: getHeaders(token),
      body: JSON.stringify({
        message: `delete note ${noteId}`,
        sha,
      }),
    },
    false
  );
}
