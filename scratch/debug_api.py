import sys
import os
sys.path.append(os.path.abspath('backend'))
import anilist as al

def test():
    print("Testing fetch_anilist_top...")
    data, info = al.fetch_anilist_top(1, 10)
    print(f"Results: {len(data)}")
    if len(data) > 0:
        print(f"First title: {data[0]['title']}")
    else:
        print("Empty results!")
    
    print("\nTesting fetch_anilist (trending)...")
    data2, info2 = al.fetch_anilist(mode="top", perPage=10)
    print(f"Results: {len(data2)}")
    if len(data2) > 0:
        print(f"First title: {data2[0]['title']}")

if __name__ == "__main__":
    test()
