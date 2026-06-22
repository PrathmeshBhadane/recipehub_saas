import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.story import Story
from app.models.user import User
from app.routers.auth import get_current_user

router = APIRouter(prefix="/stories", tags=["stories"])

UPLOAD_DIR = "/app/uploads"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/ogg", "video/quicktime"}
MAX_FILE_SIZE_MB = 50

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_story(
    file: UploadFile = File(...),
    caption: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validate content type
    content_type = file.content_type or ""
    if content_type in ALLOWED_IMAGE_TYPES:
        media_type = "image"
    elif content_type in ALLOWED_VIDEO_TYPES:
        media_type = "video"
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Allowed: images (jpg, png, gif, webp) and videos (mp4, webm, ogg, mov)."
        )

    # Read file and check size
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f} MB). Max allowed: {MAX_FILE_SIZE_MB} MB."
        )

    # Generate unique filename preserving extension
    ext = os.path.splitext(file.filename or "")[1] or (".jpg" if media_type == "image" else ".mp4")
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as f:
        f.write(contents)

    media_url = f"/media/{unique_name}"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    story = Story(
        user_id=current_user.id,
        media_url=media_url,
        media_type=media_type,
        caption=caption.strip(),
        expires_at=expires_at,
    )
    db.add(story)
    db.commit()
    db.refresh(story)

    return {
        "id": story.id,
        "media_url": story.media_url,
        "media_type": story.media_type,
        "caption": story.caption,
        "creator": current_user.username,
        "creator_id": current_user.id,
        "expires_at": story.expires_at.isoformat(),
    }


@router.get("/", response_model=List[dict])
def get_active_stories(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    stories = (
        db.query(Story)
        .filter(Story.expires_at > now)
        .order_by(Story.created_at.desc())
        .all()
    )

    result = []
    seen_users = set()
    for story in stories:
        creator = db.query(User).filter(User.id == story.user_id).first()
        username = creator.username if creator else "Unknown"
        # Group by user: only show latest story per user (first seen)
        if story.user_id not in seen_users:
            seen_users.add(story.user_id)
            user_stories = (
                db.query(Story)
                .filter(Story.user_id == story.user_id, Story.expires_at > now)
                .order_by(Story.created_at.asc())
                .all()
            )
            result.append({
                "creator_id": story.user_id,
                "creator": username,
                "slides": [
                    {
                        "id": s.id,
                        "media_url": s.media_url,
                        "media_type": s.media_type,
                        "caption": s.caption,
                    }
                    for s in user_stories
                ],
            })

    return result
