import sqlite3
import hashlib
import json

import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'anime_tracker.db')

def get_db():
    return sqlite3.connect(DB_PATH)

def init_db():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, email TEXT)""")
        c.execute("""CREATE TABLE IF NOT EXISTS user_anime (
            username TEXT, anime_id INTEGER, title TEXT, image_url TEXT, status TEXT, 
            score REAL, episodes INTEGER, genres TEXT, review TEXT, progress INTEGER, seasons_json TEXT,
            PRIMARY KEY (username, anime_id))""")
        c.execute("""CREATE TABLE IF NOT EXISTS friends (username TEXT, friend_username TEXT, PRIMARY KEY(username, friend_username))""")
        c.execute("""CREATE TABLE IF NOT EXISTS watch_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, anime_id INTEGER, episode INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)""")

        c.execute("""CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, action_text TEXT,
            anime_title TEXT, anime_id INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)""")
        c.execute("""CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, message TEXT,
            anime_id INTEGER, is_read INTEGER DEFAULT 0, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)""")

        cols = [("email", "TEXT", "users"), ("episodes", "INTEGER", "user_anime"),
                ("genres", "TEXT", "user_anime"), ("review", "TEXT", "user_anime"),
                ("progress", "INTEGER DEFAULT 0", "user_anime"), ("seasons_json", "TEXT", "user_anime"),
                ("coop_friend_username", "TEXT", "user_anime"), ("drop_reason", "TEXT", "user_anime"),
                ("idMal", "INTEGER", "user_anime"), ("theme_url", "TEXT", "users"),
                ("custom_tags", "TEXT", "user_anime"), ("private_notes", "TEXT", "user_anime"),
                ("score_story", "REAL", "user_anime"), ("score_art", "REAL", "user_anime"),
                ("score_sound", "REAL", "user_anime"), ("series_name", "TEXT", "user_anime"),
                ("banner_url", "TEXT", "users"), ("pfp_url", "TEXT", "users"),
                ("theme_color", "TEXT DEFAULT '#ff0055'", "users"),
                ("atmosphere_url", "TEXT", "users"),
                ("seasonal_theme_enabled", "INTEGER DEFAULT 0", "users"),
                ("custom_theme_selection", "TEXT DEFAULT 'Personal'", "users")]
        for col_name, col_type, table in cols:
            try:
                c.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
            except sqlite3.OperationalError:
                pass
        conn.commit()

def make_hashes(password):
    return hashlib.sha256(str.encode(password)).hexdigest()

def add_user(username, password, email):
    try:
        with get_db() as conn:
            conn.execute('INSERT INTO users(username, password, email) VALUES (?,?,?)',
                         (username, make_hashes(password), email))
            return True
    except sqlite3.IntegrityError:
        return False

def login_user(username, password):
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT * FROM users WHERE username =? AND password = ?', (username, make_hashes(password)))
        return c.fetchone() is not None

def get_user_theme(username):
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT theme_url FROM users WHERE username=?', (username,))
        row = c.fetchone()
        return row[0] if row and len(row) > 0 and row[0] else None

def set_user_theme(username, theme_url):
    with get_db() as conn:
        conn.execute('UPDATE users SET theme_url=? WHERE username=?', (theme_url, username))

def get_seasonal_theme_enabled(username):
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT seasonal_theme_enabled FROM users WHERE username=?', (username,))
        row = c.fetchone()
        return bool(row[0]) if row else False

def set_seasonal_theme_enabled(username, enabled):
    with get_db() as conn:
        conn.execute('UPDATE users SET seasonal_theme_enabled=? WHERE username=?', (1 if enabled else 0, username))

def get_custom_theme_selection(username):
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT custom_theme_selection FROM users WHERE username=?', (username,))
        row = c.fetchone()
        return row[0] if row else 'Personal'

def set_custom_theme_selection(username, selection):
    with get_db() as conn:
        conn.execute('UPDATE users SET custom_theme_selection=? WHERE username=?', (selection, username))

def add_friend(username, friend_username):
    try:
        with get_db() as conn:
            conn.execute('INSERT INTO friends (username, friend_username) VALUES (?,?)', (username, friend_username))
            return True
    except sqlite3.IntegrityError:
        return False

def remove_friend(username, friend_username):
    with get_db() as conn:
        conn.execute('DELETE FROM friends WHERE username=? AND friend_username=?', (username, friend_username))

def get_friends(username):
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT friend_username FROM friends WHERE username=?', (username,))
        return [r[0] for r in c.fetchall()]

def check_user_exists(username):
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT username FROM users WHERE username=?', (username,))
        return c.fetchone() is not None

def save_anime_to_db(username, anime_id, title, image_url, status, score, episodes, genres, coop_friend_username=None, drop_reason=None, idMal=None):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT review, progress, seasons_json, coop_friend_username, drop_reason, idMal FROM user_anime WHERE username=? AND anime_id=?", (username, anime_id))
        existing = c.fetchone()
        review_text = existing[0] if existing else ""
        current_progress = episodes if status == "Completed" else (existing[1] if existing else 0)
        
        if existing and existing[2]:
            seasons_data = existing[2]
        else:
            initial_season = [{"id": anime_id, "name": "Season 1 (Main)", "total": episodes if episodes else 0, "watched": current_progress}]
            seasons_data = json.dumps(initial_season)
        
        # If not provided (None), keep existing values. If empty string (""), clear the field (set to None).
        coop_friend = coop_friend_username if coop_friend_username is not None else (existing[3] if existing else None)
        if coop_friend_username == "": coop_friend = None
        
        reason = drop_reason if drop_reason is not None else (existing[4] if existing else None)
        if drop_reason == "": reason = None
        
        mal_id = idMal if idMal is not None else (existing[5] if existing else None)
        if idMal == 0: mal_id = None # Treat 0 as "not provided/clear" for ID

        c.execute("""INSERT OR REPLACE INTO user_anime 
                     (username, anime_id, title, image_url, status, score, episodes, genres, review, progress, seasons_json, coop_friend_username, drop_reason, idMal) 
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                  (username, anime_id, title, image_url, status, score, episodes, genres, review_text, current_progress, seasons_data, coop_friend, reason, mal_id))

def get_user_anime(username, status_filter):
    with get_db() as conn:
        c = conn.cursor()
        if status_filter == "All":
            c.execute('SELECT * FROM user_anime WHERE username=?', (username,))
        else:
            c.execute('SELECT * FROM user_anime WHERE username=? AND status=?', (username, status_filter))
        return c.fetchall()

def get_shared_anime(user1, user2):
    """Returns (total_completed_by_user2, list_of_shared_anime_details)"""
    with get_db() as conn:
        c = conn.cursor()
        # Get total completed for friend
        c.execute("SELECT count(*) FROM user_anime WHERE username=? AND status='Completed'", (user2,))
        total_completed = c.fetchone()[0]
        
        # Get shared completed titles
        c.execute("""
            SELECT a2.anime_id, a2.title 
            FROM user_anime a1
            JOIN user_anime a2 ON a1.anime_id = a2.anime_id
            WHERE a1.username = ? AND a2.username = ?
            AND a1.status = 'Completed' AND a2.status = 'Completed'
        """, (user1, user2))
        shared = [{"anime_id": r[0], "title": r[1]} for r in c.fetchall()]
        
        return total_completed, shared

def update_seasons_json(username, anime_id, seasons_json):
    with get_db() as conn:
        conn.execute('UPDATE user_anime SET seasons_json=? WHERE username=? AND anime_id=?', (seasons_json, username, anime_id))

def log_watch_history(username, anime_id, episode):
    with get_db() as conn:
        conn.execute('INSERT INTO watch_history (username, anime_id, episode) VALUES (?,?,?)', (username, anime_id, episode))

def get_friend_progress(friend_username, anime_id):
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT progress FROM user_anime WHERE username=? AND anime_id=?', (friend_username, anime_id))
        row = c.fetchone()
        return row[0] if row else None

def update_review(username, anime_id, review):
    with get_db() as conn:
        conn.execute('UPDATE user_anime SET review=? WHERE username=? AND anime_id=?', (review, username, anime_id))

def delete_anime_from_db(username, anime_id):
    with get_db() as conn:
        conn.execute('DELETE FROM user_anime WHERE username=? AND anime_id=?', (username, anime_id))

# ── Activity Log ──────────────────────────────────────────────────────────────
def log_activity(username, action_text, anime_title, anime_id):
    with get_db() as conn:
        conn.execute('INSERT INTO activity_log (username, action_text, anime_title, anime_id) VALUES (?,?,?,?)',
                     (username, action_text, anime_title, anime_id))

def get_activity_feed(limit=50):
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT username, action_text, anime_title, anime_id, timestamp FROM activity_log ORDER BY timestamp DESC LIMIT ?', (limit,))
        return [{'username': r[0], 'action': r[1], 'anime_title': r[2], 'anime_id': r[3], 'timestamp': r[4]} for r in c.fetchall()]

def set_series_name(username, anime_id, series_name):
    with get_db() as conn:
        conn.execute('UPDATE user_anime SET series_name=? WHERE username=? AND anime_id=?',
                     (series_name if series_name else None, username, anime_id))

# ── Notifications ─────────────────────────────────────────────────────────────
def create_notification(username, message, anime_id):
    with get_db() as conn:
        conn.execute('INSERT INTO notifications (username, message, anime_id) VALUES (?,?,?)', (username, message, anime_id))

def get_notifications(username):
    with get_db() as conn:
        c = conn.cursor()
        c.execute('SELECT id, message, anime_id, is_read, timestamp FROM notifications WHERE username=? ORDER BY timestamp DESC LIMIT 20', (username,))
        return [{'id': r[0], 'message': r[1], 'anime_id': r[2], 'is_read': r[3], 'timestamp': r[4]} for r in c.fetchall()]

def mark_notifications_read(username):
    with get_db() as conn:
        conn.execute('UPDATE notifications SET is_read=1 WHERE username=?', (username,))

# ── Custom Notes/Tags ─────────────────────────────────────────────────────────
def update_custom_fields(username, anime_id, custom_tags, private_notes, score_story, score_art, score_sound):
    with get_db() as conn:
        conn.execute('''UPDATE user_anime SET custom_tags=?, private_notes=?, score_story=?, score_art=?, score_sound=?
                        WHERE username=? AND anime_id=?''',
                     (custom_tags, private_notes, score_story, score_art, score_sound, username, anime_id))

# ── Public Profile ────────────────────────────────────────────────────────────
def get_public_profile(username):
    with get_db() as conn:
        c = conn.cursor()
        # Get user basic info
        c.execute('SELECT banner_url, pfp_url, theme_color, atmosphere_url FROM users WHERE username=?', (username,))
        user_info = c.fetchone()
        if not user_info:
            return None
        
        banner, pfp, color, atmosphere = user_info
        
        c.execute('SELECT * FROM user_anime WHERE username=?', (username,))
        items = c.fetchall()
        total = len(items)
        completed = sum(1 for i in items if i[4] == 'Completed')
        scored = [(i[5]) for i in items if i[5] and i[5] > 0]
        avg_score = round(sum(scored) / len(scored), 1) if scored else 0
        genre_counts: dict = {}
        for item in items:
            if item[7]:
                for g in item[7].split(','):
                    g = g.strip()
                    if g: genre_counts[g] = genre_counts.get(g, 0) + 1
        top_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        completed_shows = [{'anime_id': i[1], 'title': i[2], 'image_url': i[3], 'score': i[5]} for i in items if i[4] == 'Completed'][:24]
        
        return {
            'username': username,
            'banner_url': banner,
            'pfp_url': pfp,
            'theme_color': color or '#ff0055',
            'atmosphere_url': atmosphere,
            'total_titles': total,
            'completed': completed,
            'avg_score': avg_score,
            'top_genres': [{'name': k, 'count': v} for k, v in top_genres],
            'completed_shows': completed_shows,
        }

def update_user_profile(username, banner_url=None, pfp_url=None, theme_color=None, atmosphere_url=None):
    with get_db() as conn:
        if banner_url is not None:
            conn.execute('UPDATE users SET banner_url=? WHERE username=?', (banner_url if banner_url else None, username))
        if pfp_url is not None:
            conn.execute('UPDATE users SET pfp_url=? WHERE username=?', (pfp_url if pfp_url else None, username))
        if theme_color is not None:
            conn.execute('UPDATE users SET theme_color=? WHERE username=?', (theme_color if theme_color else '#ff0055', username))
        if atmosphere_url is not None:
            conn.execute('UPDATE users SET atmosphere_url=? WHERE username=?', (atmosphere_url if atmosphere_url else None, username))

def batch_import_anime(username, data_list):
    """
    Import a large list of anime with reconciliation and merging.
    data_list: List of dicts with keys: anime_id, title, image_url, status, score, episodes, idMal
    """
    stats = {"inserted": 0, "updated": 0}
    with get_db() as conn:
        c = conn.cursor()
        
        # 1. Load existing collection into memory for fast lookup
        c.execute("SELECT anime_id, idMal, status, score, progress, review, seasons_json, custom_tags, private_notes FROM user_anime WHERE username=?", (username,))
        existing_rows = c.fetchall()
        
        # Maps: id -> row_tuple
        by_id = {r[0]: r for r in existing_rows}
        by_mal = {r[1]: r for r in existing_rows if r[1]}
        
        for item in data_list:
            aid = item.get('anime_id')
            mid = item.get('idMal')
            
            # Reconciliation: Match by MAL ID first, then Internal ID
            existing = by_mal.get(mid) if mid else by_id.get(aid)
            
            if existing:
                # Merge Logic: Only update if status/score/progress changed. Protect local fields.
                # existing: (anime_id, idMal, status, score, progress, review, seasons_json, custom_tags, private_notes)
                ex_status, ex_score, ex_progress = existing[2], existing[3], existing[4]
                new_status, new_score, new_progress = item['status'], item['score'], item['progress']
                
                # Check if change is needed
                if ex_status != new_status or ex_score != new_score or ex_progress != new_progress or not existing[1]:
                    c.execute("""UPDATE user_anime SET 
                                 status=?, score=?, progress=?, idMal=?, title=?, image_url=?, episodes=?
                                 WHERE username=? AND anime_id=?""",
                              (new_status, new_score, new_progress, mid or existing[1], 
                               item['title'], item['image_url'], item['episodes'], username, existing[0]))
                    stats["updated"] += 1
            else:
                # Insert New
                # Note: We generate a default seasons_json for new imports
                initial_season = [{"id": aid, "name": "Season 1 (Main)", "total": item['episodes'] or 0, "watched": item['progress']}]
                c.execute("""INSERT INTO user_anime 
                             (username, anime_id, title, image_url, status, score, episodes, progress, seasons_json, idMal) 
                             VALUES (?,?,?,?,?,?,?,?,?,?)""",
                          (username, aid, item['title'], item['image_url'], item['status'], 
                           item['score'], item['episodes'], item['progress'], json.dumps(initial_season), mid))
                stats["inserted"] += 1
        
        conn.commit()
    return stats

