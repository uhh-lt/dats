import random
import string
from typing import Any

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

        cls.__is_enabled = len(conf.auth.oidc) > 0 and any(
            x.enabled for x in conf.auth.oidc
        )
        cls.__oauth = OAuth()
        cls.__clients: dict[str, Any] = {}

        for oidc in conf.auth.oidc:
            if not oidc.enabled:
                continue
            # Create OAuth client
            cls.__oauth.register(
                name=oidc.name,
                client_id=oidc.client_id,
                client_secret=oidc.client_secret,
                server_metadata_url=oidc.server_metadata_url,
                client_kwargs={
                    "scope": "openid email profile",
                    "code_challenge_method": "S256",
                    "token_endpoint_auth_method": "client_secret_post",
                },
                id_token_encryption_alg="RSA-OAEP-256",
                id_token_encryption_enc="A256CBC-HS512",
            )
            client = cls.__oauth.create_client(oidc.name)
            assert client is not None, "Failed to create Authentik OAuth client"
            cls.__clients[oidc.name] = client

        return super(OAuthService, cls).__new__(cls)

    async def login(self, request: Request, provider: str, redirect_uri: str):
        client = self.__get_provider_client(provider)
        return await client.authorize_redirect(request, redirect_uri)

    async def authenticate_oidc(
        self, db: Session, request: Request, provider: str
    ) -> UserORM:
        try:
            client = self.__get_provider_client(provider)
            token = await client.authorize_access_token(request)
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

    def __get_provider_client(self, provider: str):
        if not self.__is_enabled:
            raise Exception("OIDC authentication is not enabled")
        client = self.__clients.get(provider)
        if client is None:
            raise Exception(f"OIDC provider '{provider} does not exist")
        return client
