const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

export const api = {
    async request<T>(endpoint: string, options: RequestOptions = {}): Promise<{ data: T; message?: string }> {
        const { params, headers, ...rest } = options;

        // Build URL with query parameters
        // Ensure API_BASE_URL doesn't end with slash and endpoint starts with one
        const baseUrl = API_BASE_URL.replace(/\/$/, '');
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        let url = `${baseUrl}${cleanEndpoint}`;

        if (params) {
            const queryString = new URLSearchParams(params).toString();
            url += `?${queryString}`;
        }

        // Get token from localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

        const defaultHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...rest,
            headers: {
                ...defaultHeaders,
                ...headers,
            },
        });

        // Global 401 Handling
        if (response.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
                // Use window.location for a hard redirect to clear all states
                window.location.href = '/login';
            }
            throw new Error('Unauthorized');
        }

        let result;
        const textResponse = await response.text();

        try {
            result = JSON.parse(textResponse);
        } catch (e) {
            console.error('API non-JSON response from:', url, textResponse.substring(0, 200));
            throw new Error(`Server returned HTML/Text instead of JSON. Status: ${response.status}`);
        }

        if (!response.ok) {
            throw new Error(result.message || `API Error: ${response.status}`);
        }

        return result;
    },

    get<T>(endpoint: string, options?: RequestOptions) {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    },

    post<T>(endpoint: string, data?: any, options?: RequestOptions) {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    },

    put<T>(endpoint: string, data?: any, options?: RequestOptions) {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    },

    patch<T>(endpoint: string, data?: any, options?: RequestOptions) {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    },

    delete<T>(endpoint: string, options?: RequestOptions) {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    },
};
