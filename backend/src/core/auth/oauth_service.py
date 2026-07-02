import random
import string

from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import Request
from fastapi.concurrency import run_in_threadpool
from loguru import logger
from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from config import conf
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM
from repos.mail_repo import MailRepo


class OAuthService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.mail_repo = MailRepo()

        cls.is_enabled = conf.auth.oidc.enabled
        cls.oauth = OAuth()

        # Create Authentik OAuth client
        cls.oauth.register(
            name="authentik",
            client_id=conf.auth.oidc.client_id,
            client_secret=conf.auth.oidc.client_secret,
            server_metadata_url=conf.auth.oidc.server_metadata_url,
            client_kwargs={
                "scope": "openid email profile",
                "code_challenge_method": "S256",
                "token_endpoint_auth_method": "client_secret_post",
            },
            id_token_encryption_alg="RSA-OAEP-256",
            id_token_encryption_enc="A256CBC-HS512",
        )
        client = cls.oauth.create_client("authentik")
        assert client is not None, "Failed to create Authentik OAuth client"
        cls.authentik = client

        return super(OAuthService, cls).__new__(cls)

    async def authenticate_oidc(self, db: Session, request: Request) -> UserORM:
        try:
            token = await self.authentik.authorize_access_token(request)
        except OAuthError as error:
            logger.error(f"OAuth error: {error}")
            raise error

        try:
            userinfo = token.get("userinfo")
            print(f"Userinfo: {userinfo}")

            try:
                user = await run_in_threadpool(
                    crud_user.read_by_email, db=db, email=userinfo["email"]
                )
                return user
            except Exception as e:
                logger.info(f"User not found, creating new user: {e}")

                create_dto = UserCreate(
                    email=userinfo["email"],
                    first_name=userinfo.get("given_name", "Unknown"),
                    last_name=userinfo.get("family_name", "Unknown"),
                    password="".join(
                        random.choices(
                            string.ascii_letters + string.digits,
                            k=32,
                        )
                    ),
                )
                user = await run_in_threadpool(
                    crud_user.create, db=db, create_dto=create_dto
                )

                await MailRepo().send_welcome_mail(
                    email=user.email,
                    first_name=user.first_name,
                    last_name=user.last_name,
                )
                return user

        except Exception as e:
            logger.error(f"Error processing OIDC authentication: {e}")
            raise Exception("Authentication failed")
