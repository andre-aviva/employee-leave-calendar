export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, code?: string, message?: string) {
    super(message || `API Error: ${status} ${code || ''}`);
    this.status = status;
    this.code = code;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token');
  
  const headers = new Headers(options?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    if (window.location.pathname !== '/sign-in') {
      window.location.href = '/sign-in';
    }
  }

  if (!response.ok) {
    let code: string | undefined;
    try {
      const errorData = await response.json();
      code = errorData.code;
    } catch {
      // Ignore if body is not JSON
    }
    throw new ApiError(response.status, code);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const client = {
  get: <T>(url: string) => fetcher<T>(url),
  post: <T>(url: string, body?: any) => fetcher<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body?: any) => fetcher<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(url: string) => fetcher<T>(url, { method: 'DELETE' }),
};

export const defaultSWRConfig = {
  fetcher: (url: string) => client.get(url),
  revalidateOnFocus: false,
  shouldRetryOnError: false,
};
