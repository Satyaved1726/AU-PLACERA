import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.11.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Custom OAuth2 access token generator using Web Crypto API for RSASSA-PKCS1-v1_5
async function getAccessToken(serviceAccount: any): Promise<string> {
  const jwtHeader = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const jwtClaim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(jwtHeader))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedClaim = btoa(JSON.stringify(jwtClaim))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const message = `${encodedHeader}.${encodedClaim}`;

  const pem = serviceAccount.private_key;
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = pem
    .substring(pem.indexOf(pemHeader) + pemHeader.length, pem.indexOf(pemFooter))
    .replace(/\s/g, "");

  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" },
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(message)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const assertion = `${message}.${encodedSignature}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`,
  });

  const tokenData = await tokenResponse.json();
  if (tokenData.error) {
    throw new Error(`Failed to get OAuth token: ${tokenData.error_description || tokenData.error}`);
  }
  return tokenData.access_token;
}

async function sendFcmMessage(accessToken: string, projectId: string, messagePayload: any) {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: messagePayload })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('FCM send API error response:', errorText)
    
    // Check if token is unregistered
    if (response.status === 404 || response.status === 410) {
      return { token: messagePayload.token, status: 'unregistered' }
    }
    throw new Error(`FCM request failed: ${errorText}`)
  }
  return { status: 'success' }
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify caller session
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check Role: MUST be admin or super_admin
    const { data: callerProfile, error: roleError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError || !callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'super_admin')) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { postId } = await req.json()
    if (!postId) {
      return new Response(JSON.stringify({ error: 'Missing postId in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Load service role client to bypass database RLS policies securely
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
    }
    const supabaseService = createClient(supabaseUrl, serviceRoleKey)

    // Fetch the post from database
    const { data: post, error: postError } = await supabaseService
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const isOia = post.post_type === 'oia' || post.audience === 'oia'
    const targetAudience = isOia ? 'oia_eligible' : 'all_students'

    // IDEMPOTENCY / STATE MACHINE CHECK: Select existing log
    const { data: existingLog, error: fetchLogError } = await supabaseService
      .from('notification_logs')
      .select('*')
      .eq('post_id', postId)
      .maybeSingle()

    if (fetchLogError) {
      throw new Error(`Failed to query existing logs: ${fetchLogError.message}`)
    }

    let logId = '';

    if (existingLog) {
      if (existingLog.status === 'sent') {
        console.log(`[Idempotency] Post ${postId} already sent. Aborting duplicate send.`)
        return new Response(JSON.stringify({ success: true, message: 'Notification already successfully dispatched' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      if (existingLog.status === 'sending' || existingLog.status === 'pending') {
        console.warn(`[Idempotency] Post ${postId} dispatch currently in progress. Aborting duplicate request.`)
        return new Response(JSON.stringify({ success: true, message: 'Notification dispatch already in progress' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // If failed, allow retry. Update status to 'sending' only if previous state was 'failed'.
      const { data: updatedLog, error: updateLogError } = await supabaseService
        .from('notification_logs')
        .update({
          status: 'sending',
          error_message: null,
          sent_at: null,
          recipient_count: 0,
          success_count: 0,
          failure_count: 0
        })
        .eq('post_id', postId)
        .eq('status', 'failed')
        .select()
        .maybeSingle()

      if (updateLogError) {
        throw new Error(`Failed to lock retry log: ${updateLogError.message}`)
      }

      if (!updatedLog) {
        // Concurrency lock failed
        return new Response(JSON.stringify({ success: true, message: 'Concurrent retry locked out' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      logId = updatedLog.id;
    } else {
      // First attempt: insert new log as 'sending'
      const { data: insertedLog, error: insertLogError } = await supabaseService
        .from('notification_logs')
        .insert({
          post_id: postId,
          status: 'sending',
          audience: targetAudience
        })
        .select()
        .maybeSingle()

      if (insertLogError) {
        // Handle database-level concurrent inserts
        if (insertLogError.code === '23505') {
          return new Response(JSON.stringify({ success: true, message: 'Concurrent dispatch blocked' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        throw new Error(`Failed to initialize notification log: ${insertLogError.message}`)
      }

      logId = insertedLog.id;
    }

    // Load Service Account secrets
    const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!serviceAccountStr) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured')
    }
    const serviceAccount = JSON.parse(serviceAccountStr)
    const projectIdFCM = serviceAccount.project_id
    const accessToken = await getAccessToken(serviceAccount)

    let tokenRows = []

    if (isOia) {
      // OIA OPPORTUNITY: Query tokens for active student accounts meeting the OIA-eligible flag
      const { data, error: tokenError } = await supabaseService
        .from('fcm_tokens')
        .select('token, profiles!inner(role, oia_eligible)')
        .eq('profiles.role', 'student')
        .eq('profiles.oia_eligible', true)

      if (tokenError) {
        throw new Error(`Failed to query OIA eligible student tokens: ${tokenError.message}`)
      }
      tokenRows = data || []
    } else {
      // GENERAL POST: Query active student FCM tokens directly
      const { data, error: tokenError } = await supabaseService
        .from('fcm_tokens')
        .select('token, profiles!inner(role)')
        .eq('profiles.role', 'student')

      if (tokenError) {
        throw new Error(`Failed to query active student tokens: ${tokenError.message}`)
      }
      tokenRows = data || []
    }

    let successCount = 0
    let failureCount = 0
    const recipientCount = tokenRows.length
    const unregisteredTokens: string[] = []

    if (recipientCount > 0) {
      const tokens = tokenRows.map(row => row.token)
      const CHUNK_SIZE = 100 // Scale safe chunking to prevent API request spikes

      for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
        const chunk = tokens.slice(i, i + CHUNK_SIZE)
        const chunkResults = await Promise.all(
          chunk.map(token => 
            sendFcmMessage(accessToken, projectIdFCM, {
              token,
              notification: {
                title: isOia ? '🌍 New OIA Opportunity' : '🔔 New Announcement',
                body: post.opportunity_title || (isOia ? 'New OIA opportunity posted' : 'New announcement posted')
              },
              data: {
                type: 'announcement',
                postId: post.id,
                audience: isOia ? 'oia_eligible' : 'all_students'
              }
            }).then(res => {
              if (res.status === 'success') {
                successCount++
              } else if (res.status === 'unregistered') {
                failureCount++
                unregisteredTokens.push(token)
              }
              return res
            }).catch(err => {
              console.error(`FCM dispatch error for token: ${token}`, err)
              failureCount++
              return { token, status: 'error' }
            })
          )
        )
      }

      // Clean up invalid/expired tokens (UNREGISTERED status)
      if (unregisteredTokens.length > 0) {
        await supabaseService
          .from('fcm_tokens')
          .delete()
          .in('token', unregisteredTokens)
      }
    }

    // Mark as SENT inside transaction-safe log update
    const { error: markSentError } = await supabaseService
      .from('notification_logs')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: recipientCount,
        success_count: successCount,
        failure_count: failureCount,
        error_message: null
      })
      .eq('id', logId)

    if (markSentError) {
      throw new Error(`Failed to mark notification log as sent: ${markSentError.message}`)
    }

    return new Response(JSON.stringify({ success: true, isOia, dispatched: successCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error(`Fatal notification handler error: ${error.message || error}`)
    
    // Attempt to mark dispatch status as failed in database so that it can be retried
    try {
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const { postId } = await req.clone().json()
        if (serviceRoleKey && postId) {
          const supabaseService = createClient(supabaseUrl, serviceRoleKey)
          await supabaseService
            .from('notification_logs')
            .update({
              status: 'failed',
              error_message: error.message || String(error),
              sent_at: null
            })
            .eq('post_id', postId)
            .eq('status', 'sending')
        }
      }
    } catch (dbErr) {
      console.error(`Failed to update error logs in catch block:`, dbErr)
    }

    return new Response(JSON.stringify({ error: error.message || error }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
