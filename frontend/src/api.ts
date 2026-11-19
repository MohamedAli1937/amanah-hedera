const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const API_URL =
  configuredApiUrl || (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");

if (!API_URL) {
  console.error(
    "[Amanah] VITE_API_URL is not configured. Set it in Vercel (Environment Variables) and redeploy."
  );
}

export const getToken = () => localStorage.getItem("amanah_token");
export const setToken = (token: string) => localStorage.setItem("amanah_token", token);

export function logout() {localStorage.removeItem("amanah_token"); window.location.href = "/";}

export async function login(email: string, password: string): Promise<string> {
  const body = new URLSearchParams({ username: email, password });
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail || "Incorrect email or password");
  }

  const data = (await response.json()) as { access_token: string };
  setToken(data.access_token);
  return data.access_token;
}

export async function api<T>(path: string,options: RequestInit = {},): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();

  if (token) headers.set("Authorization", `Bearer ${token}`);

  if (options.body && !(options.body instanceof FormData)) {headers.set("Content-Type", "application/json");}

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {...options,headers,});
  } catch (err) {
    throw new Error(
      `Cannot reach the API at ${API_URL || "(VITE_API_URL is empty)"}. ` +
      `Check that the backend is live and CORS allows this origin. (${err instanceof Error ? err.message : err})`
    );
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item: { msg?: string }) => item.msg).join(", ")
      : detail || `Request failed (${response.status})`;

    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}