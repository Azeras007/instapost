"""Publication Instagram NON OFFICIELLE via instagrapi (sans API Meta).

Attention : contraire aux CGU d'Instagram, le compte peut être bloqué/challengé,
surtout depuis les IP des serveurs GitHub. Réutiliser une session (IG_SESSION)
créée depuis ton propre PC limite fortement le risque.

Usage : python instagrapi_publish.py out/current.json
Env   : IG_SESSION (JSON produit par scripts/ig_session.py), sinon IG_USERNAME + IG_PASSWORD
"""
import json
import os
import sys
from pathlib import Path

from instagrapi import Client
from PIL import Image


def to_jpg(png: str) -> Path:
    # instagrapi n'accepte que du JPEG
    out = Path(png).with_suffix(".jpg")
    Image.open(png).convert("RGB").save(out, "JPEG", quality=95)
    return out


def main() -> None:
    job = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    cl = Client()
    cl.delay_range = [2, 6]

    session = os.environ.get("IG_SESSION")
    if session:
        cl.set_settings(json.loads(session))
    cl.login(os.environ["IG_USERNAME"], os.environ["IG_PASSWORD"])

    photos = [to_jpg(f) for f in job["files"]]
    caption = job["caption"]
    media = cl.photo_upload(photos[0], caption) if len(photos) == 1 else cl.album_upload(photos, caption)
    print(json.dumps({"id": media.pk}))


if __name__ == "__main__":
    main()
