import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DemoAccount {
  email: string
  password: string
  role: 'super_admin' | 'manager' | 'data_entry' | 'viewer'
  fullName: string
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: 'super@demo.com', password: 'demo123456', role: 'super_admin', fullName: 'Super Admin Demo' },
  { email: 'manager@demo.com', password: 'demo123456', role: 'manager', fullName: 'Manager Demo' },
  { email: 'operator@demo.com', password: 'demo123456', role: 'data_entry', fullName: 'Data Entry Demo' },
  { email: 'viewer@demo.com', password: 'demo123456', role: 'viewer', fullName: 'Viewer Demo' },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const results: { email: string; status: string; error?: string }[] = []

    for (const account of DEMO_ACCOUNTS) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find(u => u.email === account.email)

        let userId: string

        if (existingUser) {
          userId = existingUser.id
          results.push({ email: account.email, status: 'exists' })
        } else {
          // Create new user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: account.email,
            password: account.password,
            email_confirm: true,
            user_metadata: { full_name: account.fullName }
          })

          if (createError) {
            results.push({ email: account.email, status: 'error', error: createError.message })
            continue
          }

          userId = newUser.user.id
          results.push({ email: account.email, status: 'created' })
        }

        // Check if role already assigned
        const { data: existingRole } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (!existingRole) {
          // Assign role
          const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: userId, role: account.role })

          if (roleError) {
            console.error(`Error assigning role for ${account.email}:`, roleError)
          }
        }

        // Check if profile exists
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (!existingProfile) {
          // Create profile
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({ user_id: userId, full_name: account.fullName })

          if (profileError) {
            console.error(`Error creating profile for ${account.email}:`, profileError)
          }
        }

      } catch (err) {
        results.push({ email: account.email, status: 'error', error: String(err) })
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
