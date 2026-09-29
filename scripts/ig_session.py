"""À lancer UNE fois depuis ton PC (pas depuis GitHub) pour créer une session Instagram.

    pip install instagrapi
    python scripts/ig_session.py

Copie ensuite le contenu de ig_session.json dans le secret GitHub IG_SESSION,
puis supprime le fichier (il donne accès à ton compte).
"""
import getpass
import json
from pathlib import Path

from instagrapi import Client

cl = Client()
username = input("Identifiant Instagram : ")
password = getpass.getpass("Mot de passe : ")
code = input("Code 2FA (laisser vide si pas de 2FA) : ").strip()
cl.login(username, password, verification_code=code)
Path("ig_session.json").write_text(json.dumps(cl.get_settings()), encoding="utf-8")
print("OK -> ig_session.json créé. Mets son contenu dans le secret GitHub IG_SESSION puis supprime-le.")
