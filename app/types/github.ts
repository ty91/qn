export interface GitHubUserRepo {
  id: number;
  name: string;
  private: boolean;
  description: string | null;
}

export interface GitHubContentResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  content: string; // Base64 encoded content
  encoding: 'base64';
}
