from datetime import UTC, datetime, timedelta
from typing import Never

from sqlalchemy import and_, delete, or_, update
from sqlalchemy.orm import Session, joinedload

from config import conf
from core.auth.auth_exceptions import credentials_exception
from core.auth.refresh_token_dto import RefreshTokenCreate
from core.auth.refresh_token_orm import RefreshTokenORM
from core.auth.security import genereate_refresh_token
from repos.db.crud_base import CRUDBase


class CRUDRefreshToken(CRUDBase[RefreshTokenORM, RefreshTokenCreate, Never]):
    ### CREATE OPERATIONS ###

    def create(self, db: Session, user_id: int) -> RefreshTokenORM:
        dto = RefreshTokenCreate(
            token=genereate_refresh_token(),
            expires_at=datetime.now(UTC)
            + timedelta(seconds=int(conf.api.auth.jwt.refresh_ttl)),
            user_id=user_id,
        )
        return super().create(db, create_dto=dto)

    ### READ OPERATIONS ###

    def read(self, _db: Session, _id: int) -> RefreshTokenORM:
        raise Exception("Use read_and_verify instead")

    def read_and_verify(self, db: Session, token_str: str) -> RefreshTokenORM:
        token = (
            db.query(self.model)
            .options(joinedload(self.model.user))
            .filter(self.model.token == token_str)
            .first()
        )
        if token is None:
            raise credentials_exception

        is_expired = datetime.now(UTC) > token.expires_at
        # Allow an extra time window of 10 seconds after revoking
        # in case the frontend has multiple requests trying to refresh at once
        is_revoked = token.revoked_at is not None and datetime.now(
            UTC
        ) > token.revoked_at + timedelta(seconds=10)

        if is_expired or is_revoked:
            # if the token was already revoked,
            # revoke all other refresh and access tokens as well.
            # revoked refresh tokens will never be used by the frontend,
            # so someone trying to use one indicates malicious activity
            revoke_statement = (
                update(RefreshTokenORM)
                .where(RefreshTokenORM.user_id == token.user_id)
                .values(revoked_at=datetime.now(UTC))
            )
            db.execute(revoke_statement)
            raise credentials_exception

        return token

    ### DELETE OPERATIONS ###

    def delete_old_refresh_tokens(self, db: Session, user_id: int):
        remove_tokens_older_than = datetime.now(UTC) - timedelta(
            seconds=int(conf.api.auth.jwt.refresh_ttl) * 3
        )
        query = delete(RefreshTokenORM).filter(
            and_(
                or_(
                    RefreshTokenORM.revoked_at < remove_tokens_older_than,
                    RefreshTokenORM.expires_at < remove_tokens_older_than,
                ),
                RefreshTokenORM.user_id == user_id,
            )
        )
        db.execute(query)

        db.commit()

    ### OTHER OPERATIONS ###

    def revoke(self, db: Session, token: RefreshTokenORM) -> RefreshTokenORM:
        token.revoked_at = datetime.now(UTC)
        db.add(token)
        db.commit()
        db.refresh(token)
        return token


crud_refresh_token = CRUDRefreshToken(RefreshTokenORM)
