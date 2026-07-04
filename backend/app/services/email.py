from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.config import get_settings

logger = logging.getLogger(__name__)


def _send_smtp(*, to_email: str, subject: str, text_body: str, html_body: str) -> None:
    settings = get_settings()
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"] = to_email
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    if settings.smtp_use_tls:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
            smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)


async def send_password_reset_email(
    *,
    to_email: str,
    username: str,
    reset_url: str,
) -> None:
    settings = get_settings()
    subject = "Réinitialisation de votre mot de passe — Zaap Builder"
    text_body = (
        f"Bonjour {username},\n\n"
        "Vous avez demandé la réinitialisation de votre mot de passe sur Zaap Builder.\n"
        f"Cliquez sur ce lien pour choisir un nouveau mot de passe (valide {settings.password_reset_expire_minutes} minutes) :\n\n"
        f"{reset_url}\n\n"
        "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n"
    )
    html_body = f"""\
<!DOCTYPE html>
<html lang="fr">
<body style="font-family:sans-serif;color:#222;line-height:1.5;">
  <p>Bonjour <strong>{username}</strong>,</p>
  <p>Vous avez demandé la réinitialisation de votre mot de passe sur <strong>Zaap Builder</strong>.</p>
  <p>
    <a href="{reset_url}" style="display:inline-block;padding:10px 18px;background:#4a7c3f;color:#fff;text-decoration:none;border-radius:6px;">
      Choisir un nouveau mot de passe
    </a>
  </p>
  <p style="font-size:13px;color:#666;">
    Ce lien expire dans {settings.password_reset_expire_minutes} minutes.<br>
    Si le bouton ne fonctionne pas, copiez ce lien :<br>
    <a href="{reset_url}">{reset_url}</a>
  </p>
  <p style="font-size:13px;color:#666;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
</body>
</html>
"""

    if not settings.smtp_host:
        logger.warning(
            "SMTP non configuré — lien de réinitialisation pour %s : %s",
            to_email,
            reset_url,
        )
        return

    await asyncio.to_thread(
        _send_smtp,
        to_email=to_email,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
    )
