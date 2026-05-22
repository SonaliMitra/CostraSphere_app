import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const devUser = existingUsers.users.find((u: any) => u.email === "developer@costrasphere.ai");

    if (devUser) {
      return new Response(JSON.stringify({ message: "Developer account already exists", user_id: devUser.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: "developer@costrasphere.ai",
      password: "CostraSphere@Dev2026",
      email_confirm: true,
      user_metadata: {
        full_name: "Developer",
        role: "developer",
        company_name: "CostraSphere",
      },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("profiles").update({ role: "developer" }).eq("id", data.user.id);

    return new Response(JSON.stringify({ message: "Developer account created", user_id: data.user.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
