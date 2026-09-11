# -*- coding: utf-8 -*-
"""Mecenas remoto para Operación Veruela.

Se ejecuta desde GitHub Actions. Lee los mensajes de Firebase, usa el Bloque A
del dossier de ficción y publica una respuesta breve solo cuando corresponde.
Las claves se reciben exclusivamente mediante secretos de GitHub Actions.
"""
import datetime
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

DB = os.environ["FIREBASE_DB_URL"].rstrip("/")
KEY = os.environ["GROQ_API_KEY"].strip()
MODEL = os.environ.get("GROQ_MODEL") or "openai/gpt-oss-20b"
ROOT_PATH = "/veruela_preparacion_v2"
RECENT_MS = 3 * 60 * 60 * 1000
KNOWLEDGE_FILE = Path(__file__).with_name("Mecenas_conocimiento.md")

SYSTEM = """Eres el Mecenas de Operación Veruela, una partida ficticia de mesa.
Hablas solo en español de España, con frases cortas, secas y profesionales.

REGLAS INQUEBRANTABLES
- El material de juego es ficción. Nunca presentes como reales los dispositivos, personal, turnos o planos.
- Solo conoces el BLOQUE A del dossier. No conoces ni revelas secretos del Director.
- Si el mensaje viene de CONTROL, no respondas. Si CONTROL responde tras una pregunta, no añadas nada.
- No inventes resultados de dados. No des información N1, N2 o N3 hasta que el chat muestre una tirada pertinente.
- Para N1, N2 o N3 pide siempre primero habilidad y dificultad, con este formato:
  “Eso no sale gratis. Tira **Habilidad**, dificultad **Regular/Difícil/Extremo**. Dime el resultado exacto.”
- Tras una tirada, entrega únicamente el dato que corresponda al grado obtenido según el dossier. Si falla, no reveles el dato y sugiere otra vía. Si hay pifia, usa una pista falsa del dossier y no expliques que lo es.
- Para N3 responde que no lo sabes y que deben investigarlo en juego; no inventes acceso, código, contraseña, ruta ni vulnerabilidad.
- Nunca des instrucciones reales de seguridad, ni promuevas violencia, armas, fuego o daños. Mantén las líneas rojas del dossier.
- Un solo mensaje breve, máximo cuatro líneas. El programa ya filtra a Control y los mensajes irrelevantes: responde siempre al último mensaje de jugador que recibas. No uses NO_REPLY.
"""


def load_briefing():
    text = KNOWLEDGE_FILE.read_text(encoding="utf-8")
    marker = "# BLOQUE B"
    if marker in text:
        text = text.split(marker, 1)[0]
    return text


def get_json(path):
    with urllib.request.urlopen(f"{DB}{path}.json", timeout=25) as response:
        return json.loads(response.read().decode("utf-8"))


def post_json(path, payload):
    request = urllib.request.Request(
        f"{DB}{path}.json",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.read()


def ask_model(messages):
    body = json.dumps({
        "model": MODEL,
        "temperature": 0.35,
        "max_tokens": 180,
        "messages": messages,
    }, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
            # Evita que la capa de protección de la API bloquee el agente HTTP
            # por defecto de Python en los ejecutores de GitHub Actions.
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/122.0 Safari/537.36",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:300]
        raise RuntimeError(f"Groq devolvió HTTP {error.code}: {detail}") from error
    return data["choices"][0]["message"]["content"].strip()


def message_content(message):
    if message.get("gm"):
        return f"[CONTROL: {message.get('msg', '')}]"
    if message.get("t") == "roll":
        return (
            f"[{message.get('who')} tiró {message.get('label')} {message.get('val')}%: "
            f"resultado {message.get('roll')}]")
    return f"{message.get('who', 'Jugador')}: {message.get('msg', '')}"


def is_play_channel(channel):
    return channel in {"mecenas", "general"} or channel.startswith("priv_")


def main():
    now = datetime.datetime.now(ZoneInfo("Europe/Madrid"))
    manual = os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch"
    if not manual and not (9 <= now.hour <= 23):
        print("Fuera de horario de juego.")
        return

    root = get_json(ROOT_PATH) or {}
    messages = list((root.get("messages") or {}).values())
    messages = [message for message in messages if isinstance(message, dict)]
    messages.sort(key=lambda message: message.get("ts", 0))
    channels = {}
    for message in messages:
        channels.setdefault(message.get("ch", "general"), []).append(message)

    now_ms = int(time.time() * 1000)
    briefing = load_briefing()
    for channel, history in channels.items():
        if not is_play_channel(channel):
            continue
        last_mecenas = max((item.get("ts", 0) for item in history if item.get("who") == "Mecenas"), default=0)
        pending = [
            item for item in history
            if item.get("ts", 0) > last_mecenas
            and item.get("who") != "Mecenas"
            and not item.get("gm")
            and item.get("t") in {"text", "roll"}
        ]
        if not pending:
            continue
        newest = max(item.get("ts", 0) for item in pending)
        if newest < now_ms - RECENT_MS:
            print(f"{channel}: sin actividad reciente")
            continue
        if any(item.get("gm") and item.get("ts", 0) > newest for item in history):
            print(f"{channel}: Control ya intervino")
            continue

        transcript = [
            {"role": "assistant" if item.get("who") == "Mecenas" else "user", "content": message_content(item)}
            for item in history[-18:]
        ]
        channel_note = "Canal general." if channel == "general" else "Canal privado de juego."
        prompt = SYSTEM + "\n\n" + channel_note + "\n\nBLOQUE A DEL DOSSIER\n" + briefing
        reply = ask_model([{"role": "system", "content": prompt}] + transcript)
        if not reply or reply.upper().strip("[] ") == "NO_REPLY":
            # Salvaguarda: el modelo no debe silenciar una consulta de jugador.
            reply = "Concreta la duda. Piezas, personal, seguridad ficticia o calendario."
        post_json(
            f"{ROOT_PATH}/messages",
            {
                "id": f"mecenas-{int(time.time() * 1000)}",
                "msg": reply,
                "who": "Mecenas",
                "userId": "mecenas",
                "gm": False,
                "t": "text",
                "ch": channel,
                "ts": int(time.time() * 1000),
            },
        )
        print(f"{channel}: respuesta publicada")


if __name__ == "__main__":
    main()
