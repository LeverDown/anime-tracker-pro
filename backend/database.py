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

        cols = [("email", "TEXT", "users"), ("episodes", "INTEGER", "user_anime"),
                ("genres", "TEXT", "user_anime"), ("review", "TEXT", "user_anime"),
                ("progress", "INTEGER DEFAULT 0", "user_anime"), ("seasons_json", "TEXT", "user_anime"),
                ("theme_url", "TEXT", "users")]
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

def save_anime_to_db(username, anime_id, title, image_url, status, score, episodes, genres):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT review, progress, seasons_json FROM user_anime WHERE username=? AND anime_id=?", (username, anime_id))
        existing = c.fetchone()
        review_text = existing[0] if existing else ""
        current_progress = existing[1] if existing else 0
        if existing and existing[2]:
            seasons_data = existing[2]
        else:
            initial_season = [{"id": anime_id, "name": "Season 1 (Main)", "total": episodes if episodes else 0, "watched": current_progress}]
            seasons_data = json.dumps(initial_season)

        c.execute("""INSERT OR REPLACE INTO user_anime 
                     (username, anime_id, title, image_url, status, score, episodes, genres, review, progress, seasons_json) 
                     VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                  (username, anime_id, title, image_url, status, score, episodes, genres, review_text, current_progress, seasons_data))

def get_user_anime(username, status_filter):
    with get_db() as conn:
        c = conn.cursor()
        if status_filter == "All":
            c.execute('SELECT * FROM user_anime WHERE username=?', (username,))
        else:
            c.execute('SELECT * FROM user_anime WHERE username=? AND status=?', (username, status_filter))
        return c.fetchall()

def update_seasons_json(username, anime_id, seasons_json):
    with get_db() as conn:
        conn.execute('UPDATE user_anime SET seasons_json=? WHERE username=? AND anime_id=?', (seasons_json, username, anime_id))

def update_review(username, anime_id, review):
    with get_db() as conn:
        conn.execute('UPDATE user_anime SET review=? WHERE username=? AND anime_id=?', (review, username, anime_id))

def delete_anime_from_db(username, anime_id):
    with get_db() as conn:
        conn.execute('DELETE FROM user_anime WHERE username=? AND anime_id=?', (username, anime_id))
