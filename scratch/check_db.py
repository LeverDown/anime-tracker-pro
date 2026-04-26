import sqlite3
import os

db_path = os.path.join('d:\\PythonProjects\\AnimeTracker\\backend', 'anime_tracker.db')
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("SELECT sql FROM sqlite_master WHERE name='user_anime'")
print(c.fetchone()[0])
conn.close()
