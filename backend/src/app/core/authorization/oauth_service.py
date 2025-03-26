from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import Request
from loguru import logger

from app.core.data.crud.user import crud_user
from app.core.data.dto.user import UserCreate
from app.core.data.orm.user import UserORM
from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta
from config import conf


class OAuthService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.is_enabled = conf.api.auth.oidc.enabled == "True"
        cls.oauth = OAuth()

        # Create Authentik OAuth client
        cls.oauth.register(
            name="authentik",
            client_id=conf.api.auth.oidc.client_id,
            client_secret=conf.api.auth.oidc.client_secret,
            server_metadata_url=conf.api.auth.oidc.server_metadata_url,
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

    async def authenticate_oidc(self, request: Request) -> UserORM:
        try:
            token = await self.authentik.authorize_access_token(request)
        except OAuthError as error:
            logger.error(f"OAuth error: {error}")
            raise error

        try:
            userinfo = token.get("userinfo")
            print(f"Userinfo: {userinfo}")

            with SQLService().db_session() as db:
                try:
                    # Warning: Security concern
                    user = crud_user.read_by_email(db=db, email=userinfo["email"])
                    return user
                except Exception as e:
                    logger.info(f"User not found, creating new user: {e}")
                    # Create user if not exists
                    user = crud_user.create(
                        db=db,
                        create_dto=UserCreate(
                            email=userinfo["email"],
                            first_name=userinfo.get("given_name", "Unknown"),
                            last_name=userinfo.get("family_name", "Unknown"),
                            # Set a random password since we'll only use OIDC
                            password="".join(
                                __import__("random").choices(
                                    __import__("string").ascii_letters
                                    + __import__("string").digits,
                                    k=32,
                                )
                            ),
                        ),
                    )

                    return user
        except Exception as e:
            logger.error(f"Error processing OIDC authentication: {e}")
            raise Exception("Authentication failed")
