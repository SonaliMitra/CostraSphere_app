type QueryOptions = { count?: 'exact'; head?: boolean };

const API_BASE = '';

function getToken() {
  return localStorage.getItem('costrasphere_token') || '';
}

function setSession(token: string, user: any) {
  localStorage.setItem('costrasphere_token', token);
  localStorage.setItem('costrasphere_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('costrasphere_token');
  localStorage.removeItem('costrasphere_user');
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || data?.detail || 'API request failed');
  return data;
}

class QueryBuilder {
  private table: string;
  private filters: Record<string, any> = {};
  private orderBy = '';
  private ascending = true;
  private maxRows = 100;
  private head = false;
  private pendingInsert: any = null;
  private pendingUpdate: any = null;
  private deleteMode = false;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns = '*', options?: QueryOptions) {
    this.head = options?.head === true;
    return this;
  }

  eq(column: string, value: any) {
    this.filters[column] = value;
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orderBy = column;
    this.ascending = opts?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.maxRows = count;
    return this;
  }

  insert(value: any) {
    this.pendingInsert = Array.isArray(value) ? value[0] : value;
    return this;
  }

  update(value: any) {
    this.pendingUpdate = value;
    return this;
  }

  delete() {
    this.deleteMode = true;
    return this;
  }

  async single() {
    if (this.pendingInsert) {
      const data = await apiFetch(`/api/${this.table}`, { method: 'POST', body: JSON.stringify(this.pendingInsert) });
      return { data, error: null };
    }
    const { data, error } = await this.execute();
    return { data: Array.isArray(data) ? data[0] || null : data, error };
  }

  async maybeSingle() {
    return this.single();
  }

  then(resolve: any, reject: any) {
    return this.execute().then(resolve, reject);
  }

  private async execute() {
    try {
      if (this.deleteMode) {
        const id = this.filters.id;
        if (!id) throw new Error('Delete requires id filter');
        await apiFetch(`/api/${this.table}/${id}`, { method: 'DELETE' });
        return { data: null, error: null };
      }

      if (this.pendingUpdate) {
        const id = this.filters.id;
        if (!id) throw new Error('Update requires id filter');
        const data = await apiFetch(`/api/${this.table}/${id}`, { method: 'PATCH', body: JSON.stringify(this.pendingUpdate) });
        return { data, error: null };
      }

      if (this.pendingInsert) {
        const data = await apiFetch(`/api/${this.table}`, { method: 'POST', body: JSON.stringify(this.pendingInsert) });
        return { data, error: null };
      }

      const params = new URLSearchParams();
      const filterKeys = Object.keys(this.filters);
      if (filterKeys.length) {
        params.set('eq_col', filterKeys[0]);
        params.set('eq_val', String(this.filters[filterKeys[0]]));
      }
      if (this.orderBy) {
        params.set('order', this.orderBy);
        params.set('ascending', String(this.ascending));
      }
      params.set('limit', String(this.maxRows));
      if (this.head) params.set('head', 'true');

      const endpoint = this.table === 'projects' ? '/api/projects' : `/api/table/${this.table}`;
      const data = await apiFetch(`${endpoint}?${params.toString()}`);
      if (this.head && data && typeof data.count === 'number') return { data: [], count: data.count, error: null };
      return { data, count: Array.isArray(data) ? data.length : 0, error: null };
    } catch (error: any) {
      return { data: null, count: 0, error };
    }
  }
}

export const supabase = {
  auth: {
    onAuthStateChange(callback: (_event: string, session: any) => void) {
      const token = getToken();
      const user = JSON.parse(localStorage.getItem('costrasphere_user') || 'null');
      setTimeout(() => callback(token ? 'SIGNED_IN' : 'SIGNED_OUT', token && user ? { access_token: token, user } : null), 0);
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async getSession() {
      const token = getToken();
      const user = JSON.parse(localStorage.getItem('costrasphere_user') || 'null');
      return { data: { session: token && user ? { access_token: token, user } : null } };
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const data = await apiFetch('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        setSession(data.access_token, data.user);
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
      try {
        const data = await apiFetch('/api/register', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            full_name: options?.data?.full_name || email,
            role: options?.data?.role || 'customer',
            company_name: options?.data?.company_name || '',
          }),
        });
        setSession(data.access_token, data.user);
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    async signOut() {
      clearSession();
      return { error: null };
    },
  },
  from(table: string) {
    return new QueryBuilder(table);
  },
};

export async function callEdgeFunction(name: string, body: Record<string, unknown>) {
  const map: Record<string, string> = {
    'send-otp': '/api/send-otp',
    'verify-otp': '/api/verify-otp',
    'reset-password': '/api/reset-password',
    'ai-estimate': '/api/ai-estimate',
  };
  return apiFetch(map[name] || `/api/${name}`, { method: 'POST', body: JSON.stringify(body) });
}
