from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from loguru import logger
from pydantic import EmailStr, NameEmail

from common.singleton_meta import SingletonMeta
from config import conf
from repos.repo_base import RepoBase


class MailRepo(RepoBase, metaclass=SingletonMeta):
    def __init__(self):
        """
        Initialize MailRepo.
        """
        RepoBase.__init__(self)
        self._is_enabled = conf.mail.enabled
        self._fast_mail: FastMail | None = None

    def connect(self) -> None:
        """Initialize MailRepo configuration."""
        if self._fast_mail is not None:
            logger.debug("MailRepo already connected, skipping")
            return

        config = ConnectionConfig(
            MAIL_FROM=conf.mail.mail,
            MAIL_USERNAME=conf.mail.user,
            MAIL_PASSWORD=conf.mail.password,
            MAIL_SERVER=conf.mail.server,
            MAIL_PORT=conf.mail.port,
            MAIL_STARTTLS=conf.mail.starttls,
            MAIL_SSL_TLS=conf.mail.ssl_tls,
            USE_CREDENTIALS=conf.mail.use_credentials,
            VALIDATE_CERTS=conf.mail.validate_certs,
        )
        self._fast_mail = FastMail(config)
        logger.info("Successfully initialized MailRepo!")
        if self._is_enabled:
            logger.info(
                f"MailRepo is enabled. Using the following configuraition: {config}"
            )
        else:
            logger.info("MailRepo is disabled. Emails will not be sent.")

    def close_connection(self) -> None:
        """
        Close the MailRepo connection.
        This does nothing as FastMail doesn't require explicit closing.
        """
        if self._fast_mail is None:
            logger.debug("MailRepo already closed, skipping")
            return

        logger.info("Closing MailRepo connection...")
        self._fast_mail = None

    def remove_data(self) -> None:
        """
        Remove MailRepo data.
        This does nothing as MailRepo has no state.
        """
        logger.info("MailRepo reset (no state to clear)")

    async def send_mail(self, email: EmailStr, subject: str, body: str):
        if self._fast_mail is None:
            raise RuntimeError("MailRepo is not connected. Call connect() first.")

        if self._is_enabled:
            message = MessageSchema(
                subject=subject,
                recipients=[NameEmail(name="", email=email)],
                body=body,
                subtype=MessageType.html,
            )
            await self._fast_mail.send_message(message)

    async def send_welcome_mail(self, email: EmailStr, first_name: str, last_name: str):
        logger.info(f"Sending welcome mail to {email}")
        subject = "Welcome to Discourse Analysis Tool Suite"
        body = f"""
            <p>Hi {first_name} {last_name},</p>
            <p>Thanks for using Discourse Analysis Tool Suite!</p>
            <p>
            For your first steps, we highly recommend you to take a look at our <a href="https://github.com/uhh-lt/dats/wiki/User-Guide">Wiki & User Guide</a>.
            <br>
            If you have further questions, feel free to reach out to us and write us <a href="mailto:tim.fischer@uni-hamburg.de">tim.fischer@uni-hamburg.de</a>.
            </p>
            <p>Best regards,<br>The DATS Team</p>
            """
        await self.send_mail(email=email, subject=subject, body=body)
