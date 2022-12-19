import random
import string

from app.core.data.dto.feedback import FeedbackCreate
from app.core.db.redis_service import RedisService


def test_get_all_create_get_feedback() -> None:
    user_content = "".join(random.choices(string.ascii_letters, k=15))
    user_id = 1
    feedback = FeedbackCreate(user_content=user_content, user_id=user_id)

    fb_before = RedisService().get_all_feedbacks()

    fb_stored = RedisService().store_feedback(feedback)
    fb_stored_read = RedisService().load_feedback(key=fb_stored.id)

    fb_after = RedisService().get_all_feedbacks()

    assert len(fb_after) == len(fb_before) + 1

    assert fb_stored_read.user_content == user_content
    assert fb_stored_read.user_id == user_id
