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
        .select('id, name, duration_minutes')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('fetchUserRoutines', error);
        return [];
    }
    return data || [];
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
async function recordExercisePracticeSession(userId, exerciseId, durationMinutes) {
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

    const { error: insErr } = await supabase.from('practice_sessions').insert({
        user_id: userId,
        session_date: todayLocalDateString(),
        duration_minutes: durationMinutes,
        exercise_id: exerciseId,
        created_at: nowIso,
    });

    if (insErr) {
        console.error('recordExercisePracticeSession insert session', insErr);
        throw insErr;
    }
}

async function recordSongPracticeSession(userId, songId, durationMinutes) {
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

    const { error: insErr } = await supabase.from('practice_sessions').insert({
        user_id: userId,
        session_date: todayLocalDateString(),
        duration_minutes: durationMinutes,
        song_id: songId,
        created_at: nowIso,
    });

    if (insErr) {
        console.error('recordSongPracticeSession insert session', insErr);
        throw insErr;
    }
}
