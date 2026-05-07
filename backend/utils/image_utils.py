def upscale_image_url(url: str) -> str:
    """
    Standardizes image URLs for tactical HUD display.
    Handles upscaling for MAL and AniList providers.
    """
    if not url: return url
    # Handle MyAnimeList image upscaling
    if "cdn.myanimelist.net/images/anime/" in url:
        if not url.endswith("l.jpg") and url.endswith(".jpg"):
            return url.replace(".jpg", "l.jpg")
    # Handle AniList image upscaling (already using extraLarge, but for safety)
    return url
