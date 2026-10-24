/** True when the browser or server has the public Supabase project values. */
export function supabaseConfigured(): boolean {
  const url = import.meta.env["VITE_SUPABASE_URL"] || readProcessEnv("SUPABASE_URL");
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || readProcessEnv("SUPABASE_PUBLISHABLE_KEY");
  return Boolean(url && key);
}

function readProcessEnv(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}
