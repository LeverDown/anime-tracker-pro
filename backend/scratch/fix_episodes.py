import sqlite3
import requests
import time
import sys
import os

# Add parent directory to path to import local modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import anilist as al

def fix_episodes():
    db_path = 'backend/anime_tracker.db'
    if not os.path.exists(db_path):
        # Try from root
        db_path = 'anime_tracker.db'
        
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    c.execute('SELECT title, anime_id, idMal FROM user_anime WHERE episodes = 0 OR episodes IS NULL')
    zeros = c.fetchall()
    
    if not zeros:
        print("No zero-episode entries found.")
        return

    print(f"Found {len(zeros)} entries to fix.")
    
    for title, aid, mid in zeros:
        print(f"Repairing {title} (ID: {aid})...")
        try:
            episodes = None
            
            # 1. Try AniList first
            print(f"  Attempting AniList uplink...")
            media = al.fetch_anilist_media(aid, is_mal=True)
            if media:
                episodes = media.get('episodes')
                if episodes:
                    print(f"  SUCCESS: Found {episodes} on AniList.")
            
            # 2. Fallback to Jikan if AniList failed or returned None
            if not episodes:
                print(f"  Attempting Jikan fallback...")
                try:
                    response = requests.get(f"https://api.jikan.moe/v4/anime/{aid}", timeout=10)
                    if response.status_code == 200:
                        data = response.json().get('data', {})
                        episodes = data.get('episodes')
                        if episodes:
                            print(f"  SUCCESS: Found {episodes} on Jikan.")
                    else:
                        print(f"  ERROR: Jikan API failed (Status: {response.status_code})")
                except Exception as je:
                    print(f"  ERROR: Jikan connection error: {je}")

            if episodes:
                c.execute('UPDATE user_anime SET episodes = ? WHERE anime_id = ?', (episodes, aid))
                # Also update seasons_json if it exists and has 0 total
                c.execute('SELECT seasons_json FROM user_anime WHERE anime_id = ?', (aid,))
                row = c.fetchone()
                if row and row[0]:
                    import json
                    try:
                        seasons = json.loads(row[0])
                        if seasons and len(seasons) > 0 and seasons[0].get('total') == 0:
                            seasons[0]['total'] = episodes
                            c.execute('UPDATE user_anime SET seasons_json = ? WHERE anime_id = ?', (json.dumps(seasons), aid))
                            print(f"  SUCCESS: Synchronized seasons_json.")
                    except:
                        pass
            else:
                print(f"  NOTICE: Could not find episode count for {title}.")
            
            # Rate limiting respect
            time.sleep(1)
        except Exception as e:
            print(f"  CRITICAL: {str(e)}")
            
    conn.commit()
    conn.close()
    print("Database maintenance protocol completed.")

if __name__ == "__main__":
    fix_episodes()
