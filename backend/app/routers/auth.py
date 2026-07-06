from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.deps import get_current_user
from app.models import PasswordResetToken, User
from app.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserPublic,
    UserUpdate,
)
from app.security import create_access_token, hash_password, verify_password
from app.services.email import send_password_reset_email
from app.services.upvotes import user_total_upvotes

router = APIRouter(prefix="/auth", tags=["auth"])

_FORGOT_PASSWORD_MESSAGE = (
    "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé."
)


def _hash_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> User:
    user = User(
        username=body.username.strip(),
        email=str(body.email).strip().lower(),
        password_hash=hash_password(body.password),
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Username or email already registered",
        )
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    settings = get_settings()
    email = str(body.email).strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is not None:
        await db.execute(
            delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
        )
        raw_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.password_reset_expire_minutes
        )
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=_hash_reset_token(raw_token),
                expires_at=expires_at,
            )
        )
        await db.commit()
        reset_url = (
            f"{settings.frontend_url.rstrip('/')}/reset-password?token={raw_token}"
        )
        await send_password_reset_email(
            to_email=user.email,
            username=user.username,
            reset_url=reset_url,
        )
    return MessageResponse(message=_FORGOT_PASSWORD_MESSAGE)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    token_hash = _hash_reset_token(body.token)
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.expires_at > now,
        )
    )
    reset_row = result.scalar_one_or_none()
    if reset_row is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Lien invalide ou expiré.",
        )
    user_result = await db.execute(select(User).where(User.id == reset_row.user_id))
    user = user_result.scalar_one_or_none()
    if user is None:
        await db.delete(reset_row)
        await db.commit()
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Lien invalide ou expiré.",
        )
    user.password_hash = hash_password(body.password)
    await db.delete(reset_row)
    await db.commit()
    return MessageResponse(message="Mot de passe mis à jour. Vous pouvez vous connecter.")


@router.post("/heartbeat", status_code=status.HTTP_204_NO_CONTENT)
async def heartbeat(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    """Met à jour last_seen_at pour compter les membres actifs."""
    current.last_seen_at = datetime.utcnow()
    await db.commit()


@router.get("/me", response_model=UserPublic)
async def me(
    current: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    total_upvotes = await user_total_upvotes(db, current.id)
    return {
        "id": current.id,
        "username": current.username,
        "email": current.email,
        "created_at": current.created_at,
        "total_upvotes": total_upvotes,
    }


@router.patch("/me", response_model=UserPublic)
async def update_me(
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    if body.username is not None:
        new_username = body.username.strip()
        if new_username != current.username:
            existing = await db.execute(
                select(User).where(User.username == new_username)
            )
            if existing.scalar_one_or_none() is not None:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    detail="Ce pseudo est déjà pris.",
                )
            current.username = new_username
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Ce pseudo est déjà pris.",
        )
    await db.refresh(current)
    total_upvotes = await user_total_upvotes(db, current.id)
    return {
        "id": current.id,
        "username": current.username,
        "email": current.email,
        "created_at": current.created_at,
        "total_upvotes": total_upvotes,
    }
