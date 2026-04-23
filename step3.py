import sys

with open('d:\\PythonProjects\\dht-crawler-project\\PersonalShowTracker.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the CSS and Theme injection
css_target = '''def main_app():
    st.set_page_config(page_title="Pro Anime Tracker", layout="wide", page_icon="⛩️")

    st.markdown("""
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Roboto+Condensed:wght@400;700&display=swap');
        .stApp {
            background-image: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.85)), 
                              url('https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=2070&auto=format&fit=crop');'''

css_replacement = '''def main_app():
    st.set_page_config(page_title="Pro Anime Tracker", layout="wide", page_icon="⛩️")

    user_theme = get_user_theme(st.session_state['username'])
    bg_image = user_theme if user_theme else "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=2070&auto=format&fit=crop"

    st.markdown(f"""
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Roboto+Condensed:wght@400;700&display=swap');
        .stApp {{
            background-image: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.85)), 
                              url('{bg_image}');'''
content = content.replace(css_target, css_replacement)

# 2. Update radio button
radio_target = 'page = st.radio("", ["🔍 Discover", "📅 Schedule", "📚 My Collection", "📊 My Stats", "📥 Import"],'
radio_replacement = 'page = st.radio("", ["🔍 Discover", "📅 Schedule", "📚 My Collection", "📊 My Stats", "🌐 Community", "⚙️ Settings", "📥 Import"],'
content = content.replace(radio_target, radio_replacement)

# 3. Add Airing Today Notification
air_target = '''        st.write("")
        if st.button("🚪 Logout"):'''
air_replacement = '''        st.write("---")
        st.subheader("📺 Airing Today")
        try:
            today_name = datetime.utcnow().strftime("%A")
            today_schedule = fetch_anilist_schedule(today_name)
            my_watching = get_user_anime(st.session_state['username'], "Watching")
            watching_ids = {row[1] for row in my_watching} if my_watching else set()
            airing_for_me = [s for s in today_schedule if s['mal_id'] in watching_ids]
            
            if airing_for_me:
                for show in airing_for_me:
                    st.info(f"**{show['title']}** airs at {show['broadcast']['string'].split('at ')[-1]}")
            else:
                st.caption("No shows from your list today.")
        except Exception:
            st.caption("Schedule unavailable.")

        st.write("")
        if st.button("🚪 Logout"):'''
content = content.replace(air_target, air_replacement)

# 4. Add Cast Tab
cast_target = '''                        t1, t2, t3 = st.tabs(["Info", "Binge", "Trailer"])
                        with t1:
                            st.caption(f"⭐ {score} | 📺 {eps} eps")
                            st.caption(f"🏷️ {genres}")
                            with st.expander("Synopsis"):
                                safe_synopsis = anime.get('synopsis') or "No details available."
                                st.write(safe_synopsis[:200] + "...")
                        with t2:'''
cast_replacement = '''                        t1, t2, t3, t4 = st.tabs(["Info", "Binge", "Trailer", "Cast"])
                        with t1:
                            st.caption(f"⭐ {score} | 📺 {eps} eps")
                            st.caption(f"🏷️ {genres}")
                            with st.expander("Synopsis"):
                                safe_synopsis = anime.get('synopsis') or "No details available."
                                st.write(safe_synopsis[:200] + "...")
                        with t4:
                            chars = anime.get('characters', [])
                            if chars:
                                for c in chars[:4]:
                                    node = c.get('node', {})
                                    c_name = node.get('name', {}).get('full', 'Unknown')
                                    vas = c.get('voiceActors', [])
                                    va_name = vas[0].get('name', {}).get('full', '') if vas else ''
                                    st.caption(f"🎭 **{c_name}** (VA: {va_name})")
                            else:
                                st.caption("No cast info available.")
                        with t2:'''
content = content.replace(cast_target, cast_replacement)

with open('d:\\PythonProjects\\dht-crawler-project\\PersonalShowTracker.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactored UI and Cast features.")
