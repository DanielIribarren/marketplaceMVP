import { supabase } from '../utils/supabase-client.js'

/**
 * GET /api/meetings/my-meetings
 * Fetch all meetings where the user is requester OR owner.
 * 
 * meetings FK refs point to auth.users (not public), so PostgREST
 * cannot do embedded joins. We fetch meetings + mvp data, then
 * resolve participant names from user_profiles separately.
 */
export async function getMyMeetings(req, res) {
  try {
    const userId = req.user.id
    const { status, from_date, to_date } = req.query

    // 1. Fetch meetings with MVP info only (mvps is in public schema)
    let query = supabase
      .from('meetings')
      .select(`
        *,
        mvp:mvps!mvp_id (
          id,
          title,
          slug,
          cover_image_url
        )
      `)
      .or(`requester_id.eq.${userId},owner_id.eq.${userId}`)
      .order('scheduled_at', { ascending: true })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (from_date) {
      query = query.gte('scheduled_at', from_date)
    }

    if (to_date) {
      query = query.lte('scheduled_at', to_date)
    }

    const { data: meetings, error } = await query

    if (error) throw error

    if (!meetings || meetings.length === 0) {
      return res.status(200).json({ success: true, data: [], count: 0 })
    }

    // 2. Collect unique user IDs to resolve from user_profiles
    const userIds = new Set()
    for (const m of meetings) {
      userIds.add(m.requester_id)
      userIds.add(m.owner_id)
    }

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name, avatar_url, company')
      .in('id', [...userIds])

    // Also get emails from auth.admin (service key has access)
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()

    // Build lookup maps
    const profileMap = new Map()
    for (const p of (profiles || [])) {
      profileMap.set(p.id, p)
    }

    const emailMap = new Map()
    for (const u of (authUsers || [])) {
      emailMap.set(u.id, u.email)
    }

    // 3. Enrich meetings with participant info
    const enriched = meetings.map(m => ({
      ...m,
      requester: {
        id: m.requester_id,
        display_name: profileMap.get(m.requester_id)?.display_name || null,
        avatar_url: profileMap.get(m.requester_id)?.avatar_url || null,
        email: emailMap.get(m.requester_id) || null,
      },
      owner: {
        id: m.owner_id,
        display_name: profileMap.get(m.owner_id)?.display_name || null,
        avatar_url: profileMap.get(m.owner_id)?.avatar_url || null,
        email: emailMap.get(m.owner_id) || null,
      },
    }))

    res.status(200).json({
      success: true,
      data: enriched,
      count: enriched.length
    })

  } catch (error) {
    console.error('Error fetching meetings:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudieron obtener las reuniones',
      details: error.message
    })
  }
}
