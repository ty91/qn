export type Bindings = {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
};

export type TokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};
