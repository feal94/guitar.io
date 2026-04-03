// guitar.io — practice data via Supabase (RLS). Requires authenticated session.

function todayLocalDateString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

async function getPracticeSupabase() {
    await waitForSupabase();
    return window.guitarIoSupabase || null;
}

async function fetchExercisesCatalog() {
    const response = await fetch('exercises.json');
    if (!response.ok) {
        throw new Error('Failed to load exercises.json');
    }
    return response.json();
}

async function fetchProfileDisplayName(userId) {
    const supabase = await getPracticeSupabase();
    if (!supabase) {
        return null;
    }
    const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle();
    if (error) {
        console.error('fetchProfileDisplayName', error);
        return null;
    }
    return data?.display_name ?? null;
}

/**
 * @returns {Promise<Map<string, object>>} exercise_id -> row
 */
async function fetchExerciseProgressMap(userId) {
    const supabase = await getPracticeSupabase();
    if (!supabase) {
        return new Map();
    }
    const { data, error } = await supabase
        .from('exercise_progress')
        .select('exercise_id, times_practiced, last_practiced, completed')
        .eq('user_id', userId);
    if (error) {
        console.error('fetchExerciseProgressMap', error);
        return new Map();
    }
    const map = new Map();
    for (const row of data || []) {
        map.set(row.exercise_id, row);
    }
    return map;
}

/**
 * Fetch sessions in [monthStart, monthEnd) where monthEnd is exclusive (first day of next month).
 */
async function fetchPracticeSessionsInRange(userId, monthStart, monthEnd) {
    const supabase = await getPracticeSupabase();
    if (!supabase) {
        return [];
    }
    const { data, error } = await supabase
        .from('practice_sessions')
        .select('duration_minutes, song_id, session_date')
        .eq('user_id', userId)
        .gte('session_date', monthStart)
        .lt('session_date', monthEnd);
    if (error) {
        console.error('fetchPracticeSessionsInRange', error);
        return [];
    }
    return data || [];
}

function aggregateMonthlyStats(rows) {
    const totalSessions = rows.length;
    let totalMinutes = 0;
    const songIds = new Set();
    const days = new Set();

    for (const r of rows) {
        totalMinutes += r.duration_minutes || 0;
        if (r.song_id) {
            songIds.add(r.song_id);
        }
        if (r.session_date) {
            const d = String(r.session_date).slice(0, 10);
            days.add(d);
        }
    }

    return {
        totalSessions,
        totalMinutes,
        uniqueSongs: songIds.size,
        practiceDateStrings: [...days],
    };
}

function practiceDaysOfMonthFromStrings(dateStrings, year, monthIndex) {
    const days = [];
    const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`;
    for (const s of dateStrings) {
        if (s.startsWith(prefix)) {
            const day = parseInt(s.slice(8, 10), 10);
            if (!Number.isNaN(day)) {
                days.push(day);
            }
        }
    }
    return [...new Set(days)].sort((a, b) => a - b);
}

async function fetchRecentSongs(userId, limit = 5) {
    const supabase = await getPracticeSupabase();
    if (!supabase) {
        return [];
    }
    const { data, error } = await supabase
        .from('songs')
        .select('id, title, artist, last_practiced')
        .eq('user_id', userId)
        .order('last_practiced', { ascending: false })
        .limit(limit);
    if (error) {
        console.error('fetchRecentSongs', error);
        return [];
    }
    return data || [];
}

async function fetchSingleExerciseProgress(userId, exerciseId) {
    const supabase = await getPracticeSupabase();
    if (!supabase) {
        return null;
    }
    const { data, error } = await supabase
        .from('exercise_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .maybeSingle();
    if (error) {
        console.error('fetchSingleExerciseProgress', error);
        return null;
    }
    return data;
}

async function fetchUserRoutines(userId) {
    const supabase = await getPracticeSupabase();
    if (!supabase) {
        return [];
    }
    const { data, error } = await supabase
        .from('routines')
        .select('id, name, duration_minutes, description, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('fetchUserRoutines', error);
        return [];
    }
    return data || [];
}

async function fetchAllUserSongs(userId) {
    const supabase = await getPracticeSupabase();
    if (!supabase) {
        return [];
    }
    const { data, error } = await supabase
        .from('songs')
        .select('id, title, artist, bpm, song_url, tab_path')
        .eq('user_id', userId)
        .order('title', { ascending: true });
    if (error) {
        console.error('fetchAllUserSongs', error);
        return [];
    }
    return data || [];
}

/**
 * @returns {Promise<{ routine: object, items: object[] } | null>}
 */
async function fetchRoutineWithItems(routineId) {
    const supabase = await getPracticeSupabase();
    if (!supabase) {
        return null;
    }
    const { data: routine, error: rErr } = await supabase
        .from('routines')
        .select('*')
        .eq('id', routineId)
        .maybeSingle();
    if (rErr) {
        console.error('fetchRoutineWithItems routine', rErr);
        return null;
    }
    if (!routine) {
        return null;
    }
    const { data: items, error: iErr } = await supabase
        .from('routine_items')
        .select('*')
        .eq('routine_id', routineId)
        .order('sort_order', { ascending: true });
    if (iErr) {
        console.error('fetchRoutineWithItems items', iErr);
        return null;
    }
    return { routine, items: items || [] };
}

/**
 * @param {string} userId
 * @param {{ name: string, description?: string }} meta
 * @param {{ item_type: 'song'|'exercise', song_id?: string, exercise_id?: string, duration_minutes: number }[]} items
 * @returns {Promise<string>} new routine id
 */
async function insertRoutineWithItems(userId, meta, items) {
    const supabase = await getPracticeSupabase();
    if (!supabase) {
        throw new Error('Supabase is not configured');
    }
    if (!items.length) {
        throw new Error('Add at least one song or exercise to the routine.');
    }
    const totalMinutes = items.reduce((sum, row) => sum + (row.duration_minutes || 0), 0);

    const { data: routineRow, error: rErr } = await supabase
        .from('routines')
        .insert({
            user_id: userId,
            name: meta.name,
            description: meta.description || null,
            duration_minutes: totalMinutes || null,
        })
        .select('id')
        .single();

    if (rErr) {
        console.error('insertRoutineWithItems routine', rErr);
        throw rErr;
    }

    const routineId = routineRow.id;
    const rows = items.map((it, idx) => ({
        routine_id: routineId,
        sort_order: idx,
        item_type: it.item_type,
        song_id: it.item_type === 'song' ? it.song_id : null,
        exercise_id: it.item_type === 'exercise' ? it.exercise_id : null,
        duration_minutes: it.duration_minutes,
    }));

    const { error: iErr } = await supabase.from('routine_items').insert(rows);
    if (iErr) {
        console.error('insertRoutineWithItems items', iErr);
        await supabase.from('routines').delete().eq('id', routineId);
        throw iErr;
    }

    return routineId;
}

/**
 * Replace routine metadata and all items (same shape as insertRoutineWithItems items).
 * @param {string} userId
 * @param {string} routineId
 * @param {{ name: string, description?: string }} meta
 * @param {{ item_type: 'song'|'exercise', song_id?: string, exercise_id?: string, duration_minutes: number }[]} items
 */
async function updateRoutineWithItems(userId, routineId, meta, items) {
    const supabase = await getPracticeSupabase();
    if (!supabase) {
        throw new Error('Supabase is not configured');
    }
    if (!items.length) {
        throw new Error('Add at least one song or exercise to the routine.');
    }
    const totalMinutes = items.reduce((sum, row) => sum + (row.duration_minutes || 0), 0);

    const { data: existing, error: fetchErr } = await supabase
        .from('routines')
        .select('id, user_id')
        .eq('id', routineId)
        .maybeSingle();

    if (fetchErr) {
        console.error('updateRoutineWithItems fetch', fetchErr);
        throw fetchErr;
    }
    if (!existing) {
        throw new Error('Routine not found.');
    }
    if (existing.user_id !== userId) {
        throw new Error('You cannot edit this routine.');
    }

    const { error: upErr } = await supabase
        .from('routines')
        .update({
            name: meta.name,
            description: meta.description || null,
            duration_minutes: totalMinutes || null,
        })
        .eq('id', routineId)
        .eq('user_id', userId);

    if (upErr) {
        console.error('updateRoutineWithItems routine', upErr);
        throw upErr;
    }

    const { error: delErr } = await supabase.from('routine_items').delete().eq('routine_id', routineId);
    if (delErr) {
        console.error('updateRoutineWithItems delete items', delErr);
        throw delErr;
    }

    const rows = items.map((it, idx) => ({
        routine_id: routineId,
        sort_order: idx,
        item_type: it.item_type,
        song_id: it.item_type === 'song' ? it.song_id : null,
        exercise_id: it.item_type === 'exercise' ? it.exercise_id : null,
        duration_minutes: it.duration_minutes,
    }));

    const { error: insErr } = await supabase.from('routine_items').insert(rows);
    if (insErr) {
        console.error('updateRoutineWithItems insert items', insErr);
        throw insErr;
    }
}

async function deleteRoutine(routineId) {
    const supabase = await getPracticeSupabase();
    if (!supabase) {
        throw new Error('Supabase is not configured');
    }
    const { error } = await supabase.from('routines').delete().eq('id', routineId);
    if (error) {
        console.error('deleteRoutine', error);
        throw error;
    }
}

function mapProgressRow(row) {
    if (!row) {
        return {
            times_practiced: 0,
            last_practiced: null,
            completed: 0,
        };
    }
    return {
        times_practiced: row.times_practiced ?? 0,
        last_practiced: row.last_practiced,
        completed: row.completed ? 1 : 0,
    };
}

/**
 * Increment times_practiced, set last_practiced, completed; insert practice session row.
 */
async function recordExercisePracticeSession(userId, exerciseId, durationMinutes, routineId = null) {
    const supabase = await getPracticeSupabase();
    if (!supabase) {
        throw new Error('Supabase is not configured');
    }

    const { data: current, error: selErr } = await supabase
        .from('exercise_progress')
        .select('times_practiced')
        .eq('user_id', userId)
        .eq('exercise_id', exerciseId)
        .maybeSingle();

    if (selErr) {
        console.error('recordExercisePracticeSession select', selErr);
        throw selErr;
    }

    const nextCount = (current?.times_practiced ?? 0) + 1;
    const nowIso = new Date().toISOString();

    const { error: upErr } = await supabase.from('exercise_progress').upsert(
        {
            user_id: userId,
            exercise_id: exerciseId,
            times_practiced: nextCount,
            last_practiced: nowIso,
            completed: true,
        },
        { onConflict: 'user_id,exercise_id' }
    );

    if (upErr) {
        console.error('recordExercisePracticeSession upsert', upErr);
        throw upErr;
    }

    const sessionRow = {
        user_id: userId,
        session_date: todayLocalDateString(),
        duration_minutes: durationMinutes,
        exercise_id: exerciseId,
        created_at: nowIso,
    };
    if (routineId) {
        sessionRow.routine_id = routineId;
    }

    const { error: insErr } = await supabase.from('practice_sessions').insert(sessionRow);

    if (insErr) {
        console.error('recordExercisePracticeSession insert session', insErr);
        throw insErr;
    }
}

async function recordSongPracticeSession(userId, songId, durationMinutes, routineId = null) {
    const supabase = await getPracticeSupabase();
    if (!supabase) {
        throw new Error('Supabase is not configured');
    }

    const nowIso = new Date().toISOString();

    const { error: upErr } = await supabase
        .from('songs')
        .update({ last_practiced: nowIso })
        .eq('user_id', userId)
        .eq('id', songId);

    if (upErr) {
        console.error('recordSongPracticeSession update song', upErr);
        throw upErr;
    }

    const sessionRow = {
        user_id: userId,
        session_date: todayLocalDateString(),
        duration_minutes: durationMinutes,
        song_id: songId,
        created_at: nowIso,
    };
    if (routineId) {
        sessionRow.routine_id = routineId;
    }

    const { error: insErr } = await supabase.from('practice_sessions').insert(sessionRow);

    if (insErr) {
        console.error('recordSongPracticeSession insert session', insErr);
        throw insErr;
    }
}
