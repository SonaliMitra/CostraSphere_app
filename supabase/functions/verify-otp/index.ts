import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, otp, purpose } = await req.json();

    // Validate input
    if (!email || !otp) {
      return new Response(
        JSON.stringify({
          error: "Email and OTP are required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    );

    // Find OTP record
    const { data: otpRecords, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .eq("otp_code", otp)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1);

    // Invalid OTP
    if (error || !otpRecords || otpRecords.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Invalid OTP",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const otpRecord = otpRecords[0];

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);

    if (now > expiresAt) {
      return new Response(
        JSON.stringify({
          error: "OTP has expired. Please request a new one.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Check OTP purpose if provided
    if (purpose && otpRecord.purpose !== purpose) {
      return new Response(
        JSON.stringify({
          error: "OTP purpose mismatch",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Mark OTP as used
    const { error: updateError } = await supabase
      .from("otp_codes")
      .update({
        used: true,
      })
      .eq("id", otpRecord.id);

    if (updateError) {
      return new Response(
        JSON.stringify({
          error: "Failed to update OTP status",
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

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP verified successfully",
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
