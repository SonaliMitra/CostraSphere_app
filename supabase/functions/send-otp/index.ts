import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const { email, purpose } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    ).toISOString();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: insertError } = await supabase
      .from("otp_codes")
      .insert([
        {
          email,
          otp_code: otp,
          purpose: purpose || "reset-password",
          expires_at: expiresAt,
          used: false,
        },
      ]);

    if (insertError) {
      return new Response(
        JSON.stringify({
          error: insertError.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // SEND EMAIL USING RESEND
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const emailResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "CostraSphere <onboarding@resend.dev>",
          to: email,
          subject: "CostraSphere Password Reset OTP",
          html: `
            <div style="font-family:Arial;padding:20px">
              <h2>CostraSphere OTP</h2>
              <p>Your OTP is:</p>
              <h1>${otp}</h1>
              <p>This OTP expires in 10 minutes.</p>
            </div>
          `,
        }),
      }
    );

    const emailData = await emailResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        otpSent: true,
        emailData,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
