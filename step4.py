import sys
import re

with open('d:\\PythonProjects\\dht-crawler-project\\PersonalShowTracker.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Stats Page
stats_target = '''            with c2:
                st.subheader("Top Genres")
                genre_list = []
                for g_str in df['Genres']:
                    if g_str: genre_list.extend([g.strip() for g in g_str.split(',')])
                if genre_list:
                    from collections import Counter
                    g_counts = Counter(genre_list)
                    g_df = pd.DataFrame(g_counts.items(), columns=['Genre', 'Count']).sort_values(by='Count',
                                                                                                  ascending=False).head(
                        8)
                    fig2 = px.bar(g_df, x='Count', y='Genre', orientation='h', color='Count')
                    st.plotly_chart(fig2, use_container_width=True)
        else:'''

stats_replacement = '''            with c2:
                st.subheader("Top Genres")
                genre_list = []
                for g_str in df['Genres']:
                    if g_str: genre_list.extend([g.strip() for g in g_str.split(',')])
                if genre_list:
                    from collections import Counter
                    g_counts = Counter(genre_list)
                    g_df = pd.DataFrame(g_counts.items(), columns=['Genre', 'Count']).sort_values(by='Count',
                                                                                                  ascending=False).head(
                        8)
                    fig2 = px.bar(g_df, x='Count', y='Genre', orientation='h', color='Count')
                    st.plotly_chart(fig2, use_container_width=True)
            
            st.divider()
            st.subheader("✨ Advanced Analytics")
            c3, c4 = st.columns(2)
            with c3:
                if genre_list:
                    top_genre = g_counts.most_common(1)[0][0]
                    taste_titles = {
                        "Action": "Shounen Junkie", "Romance": "Romance Connoisseur", 
                        "Comedy": "Gag Master", "Fantasy": "Isekai Protagonist", 
                        "Sci-Fi": "Futurist", "Drama": "Tearjerker Collector",
                        "Slice of Life": "Cozy Watcher", "Horror": "Thrill Seeker"
                    }
                    st.info(f"🏆 **Taste Profile**: {taste_titles.get(top_genre, top_genre + ' Enthusiast')}")
            with c4:
                avg_score = df['Score'].mean()
                if avg_score > 0:
                    st.info(f"📈 **Avg Library Score**: {avg_score:.2f} / 10")
        else:'''
content = content.replace(stats_target, stats_replacement)


# 2. Add Community and Settings tabs before Importer
import_target = '''    # --- 5. IMPORTER ---
    elif page == "📥 Import":'''

new_tabs = '''    # --- NEW: COMMUNITY ---
    elif page == "🌐 Community":
        st.title("Otaku Community")
        tab_find, tab_friends = st.tabs(["🔍 Find Users", "👥 My Friends"])
        
        with tab_find:
            st.write("Search for other users to compare tastes!")
            search_u = st.text_input("Username:", key="search_user_input")
            if st.button("Search", key="btn_search_user"):
                if search_u.lower() == st.session_state['username'].lower():
                    st.warning("That's you!")
                elif check_user_exists(search_u):
                    st.success(f"User '{search_u}' found!")
                    if add_friend(st.session_state['username'], search_u):
                        st.toast(f"Added {search_u} as a friend!")
                    else:
                        st.info("Already on your friends list.")
                else:
                    st.error("User not found in the database.")
                    
        with tab_friends:
            friends = get_friends(st.session_state['username'])
            if not friends:
                st.info("You haven't added any friends yet.")
            else:
                for f in friends:
                    with st.expander(f"👤 {f}"):
                        c_f1, c_f2 = st.columns([3, 1])
                        with c_f1:
                            f_anime = get_user_anime(f, "Completed")
                            st.write(f"**Completed Shows:** {len(f_anime)}")
                            
                            my_anime = get_user_anime(st.session_state['username'], "Completed")
                            my_ids = {a[1] for a in my_anime}
                            f_ids = {a[1] for a in f_anime}
                            overlap = my_ids.intersection(f_ids)
                            
                            st.metric("Shared Completed Shows", len(overlap))
                            if len(overlap) > 0:
                                shared_titles = [a[2] for a in f_anime if a[1] in overlap]
                                st.write("You both watched:", ", ".join(shared_titles[:5]))
                        with c_f2:
                            if st.button("Remove", key=f"rm_{f}"):
                                remove_friend(st.session_state['username'], f)
                                st.rerun()

    # --- NEW: SETTINGS ---
    elif page == "⚙️ Settings":
        st.title("App Settings")
        
        st.subheader("🎨 Theme Customization")
        st.caption("Paste an image URL to change your app background.")
        current_theme = get_user_theme(st.session_state['username'])
        new_theme = st.text_input("Background Image URL", value=current_theme if current_theme else "")
        if st.button("Save Theme"):
            import time
            set_user_theme(st.session_state['username'], new_theme)
            st.success("Theme saved! Refreshing...")
            time.sleep(1)
            st.rerun()

        st.divider()
        st.subheader("💾 Data Export")
        st.caption("Export your entire library as a CSV file for safekeeping.")
        my_all_anime = get_user_anime(st.session_state['username'], "All")
        if my_all_anime:
            df_export = pd.DataFrame(my_all_anime, columns=['Username', 'AnimeID', 'Title', 'ImageURL', 'Status', 'Score', 'Episodes', 'Genres', 'Review', 'Progress', 'SeasonsJSON'])
            csv_data = df_export.to_csv(index=False).encode('utf-8')
            st.download_button("📥 Export Library (CSV)", data=csv_data, file_name="anime_tracker_export.csv", mime="text/csv")
        else:
            st.info("Your library is empty.")

    # --- 5. IMPORTER ---
    elif page == "📥 Import":'''
content = content.replace(import_target, new_tabs)

with open('d:\\PythonProjects\\dht-crawler-project\\PersonalShowTracker.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactored Community, Settings, and Advanced Analytics.")
