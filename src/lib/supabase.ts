import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const FUNCTION_URL = `${supabaseUrl}/functions/v1`;

export async function callEdgeFunction(name: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`,
  };

  const res = await fetch(`${FUNCTION_URL}/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Edge function error');
  return data;
}
