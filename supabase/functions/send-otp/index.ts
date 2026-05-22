import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email: string, otp: string, purpose: string): Promise<{ success: boolean; log: string }> {
  const logs: string[] = [];
  const log = (msg: string) => { logs.push(`[${new Date().toISOString()}] ${msg}`); };

  const smtpHost = "smtp.gmail.com";
  const smtpPort = 587;
  const smtpUser = "costrasphere@gmail.com";
  const smtpPass = "uvjdbjoejboldtgr";

  const subject = purpose === "forgot_password"
    ? "CostraSphere AI - Password Reset OTP"
    : "CostraSphere AI - Email Verification OTP";

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1035; border-radius: 16px; overflow: hidden; border: 1px solid rgba(139,92,246,0.3);">
      <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">CostraSphere AI</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Telecom Infrastructure Planning</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #c4b5fd; margin-top: 0;">${purpose === "forgot_password" ? "Reset Your Password" : "Verify Your Email"}</h2>
        <p style="color: #a78bfa; font-size: 16px;">Use the following OTP code to ${purpose === "forgot_password" ? "reset your password" : "verify your email"}:</p>
        <div style="background: rgba(139,92,246,0.15); border: 2px dashed #7c3aed; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; color: #a78bfa; letter-spacing: 8px;">${otp}</span>
        </div>
        <p style="color: #8b5cf6; font-size: 14px;">This OTP expires in 10 minutes. Do not share this code with anyone.</p>
      </div>
      <div style="background: rgba(139,92,246,0.1); padding: 16px; text-align: center;">
        <p style="color: #7c3aed; font-size: 12px; margin: 0;">CostraSphere AI - AI-Powered Telecom Infrastructure Planning</p>
      </div>
    </div>
  `;

  try {
    log(`Connecting to ${smtpHost}:${smtpPort}`);
    const conn = await Deno.connect({ hostname: smtpHost, port: smtpPort, transport: "tcp" });
    const buf = new Uint8Array(8192);

    const readResponse = async (): Promise<string> => {
      const n = await conn.read(buf);
      return n ? new TextDecoder().decode(buf.subarray(0, n)) : "";
    };

    const sendCmd = async (cmd: string): Promise<string> => {
      await conn.write(new TextEncoder().encode(cmd + "\r\n"));
      const resp = await readResponse();
      log(`CMD: ${cmd.substring(0, 50)} -> ${resp.substring(0, 100)}`);
      return resp;
    };

    // Read greeting
    let resp = await readResponse();
    log(`Greeting: ${resp.substring(0, 100)}`);

    // EHLO
    resp = await sendCmd("EHLO costrasphere.ai");

    // STARTTLS
    resp = await sendCmd("STARTTLS");
    if (!resp.startsWith("220")) {
      log(`STARTTLS failed: ${resp}`);
      conn.close();
      return { success: false, log: logs.join("\n") };
    }
    log("STARTTLS accepted, upgrading connection");

    // Upgrade to TLS using Deno.startTls
    const tlsConn = await Deno.startTls(conn, { hostname: smtpHost });

    const tlsBuf = new Uint8Array(8192);
    const tlsRead = async (): Promise<string> => {
      const n = await tlsConn.read(tlsBuf);
      return n ? new TextDecoder().decode(tlsBuf.subarray(0, n)) : "";
    };

    const tlsSend = async (cmd: string): Promise<string> => {
      await tlsConn.write(new TextEncoder().encode(cmd + "\r\n"));
      const r = await tlsRead();
      log(`TLS-CMD: ${cmd.substring(0, 50)} -> ${r.substring(0, 100)}`);
      return r;
    };

    // EHLO again after TLS
    await tlsSend("EHLO costrasphere.ai");

    // AUTH LOGIN
    resp = await tlsSend("AUTH LOGIN");
    resp = await tlsSend(btoa(smtpUser));
    resp = await tlsSend(btoa(smtpPass));

    if (!resp.startsWith("235")) {
      log(`AUTH failed: ${resp}`);
      tlsConn.close();
      return { success: false, log: logs.join("\n") };
    }
    log("AUTH successful");

    // Send email
    await tlsSend(`MAIL FROM:<${smtpUser}>`);
    await tlsSend(`RCPT TO:<${email}>`);
    await tlsSend("DATA");

    const emailContent = [
      `From: CostraSphere AI <${smtpUser}>`,
      `To: ${email}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "",
      htmlBody,
    ].join("\r\n");

    await tlsSend(emailContent + "\r\n.");
    await tlsSend("QUIT");

    tlsConn.close();
    log("Email sent successfully");
    return { success: true, log: logs.join("\n") };
  } catch (error) {
    log(`ERROR: ${error.message}`);
    return { success: false, log: logs.join("\n") };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, purpose } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const otp = generateOTP();
    const { success, log: smtpLog } = await sendOTPEmail(email, otp, purpose || "register");

    if (!success) {
      return new Response(JSON.stringify({ error: "Failed to send OTP email", smtp_log: smtpLog }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from("otp_codes")
      .insert({
        email,
        otp_code: otp,
        purpose: purpose || "register",
        expires_at: expiresAt,
        used: false,
      });

    if (insertError) {
      console.error("DB insert error:", insertError);
    }

    return new Response(JSON.stringify({ success: true, message: "OTP sent successfully", smtp_log: smtpLog }), {
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
