from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from loguru import logger
from pydantic import EmailStr

from common.singleton_meta import SingletonMeta
from config import conf


class MailRepo(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.is_enabled = conf.mail.enabled == "True"

        config = ConnectionConfig(
            MAIL_FROM=conf.mail.mail,
            MAIL_USERNAME=conf.mail.user,
            MAIL_PASSWORD=conf.mail.password,
            MAIL_SERVER=conf.mail.server,
            MAIL_PORT=conf.mail.port,
            MAIL_STARTTLS=conf.mail.starttls == "True",
            MAIL_SSL_TLS=conf.mail.ssl_tls == "True",
            USE_CREDENTIALS=conf.mail.use_credentials == "True",
            VALIDATE_CERTS=conf.mail.validate_certs == "True",
        )
        logger.info(f"MailService config: {config}")
        cls.fast_mail = FastMail(config)
        return super(MailRepo, cls).__new__(cls)

    async def send_mail(self, email: EmailStr, subject: str, body: str):
        if self.is_enabled:
            message = MessageSchema(
                subject=subject,
                recipients=[email],
                body=body,
                subtype=MessageType.html,
            )
            await self.fast_mail.send_message(message)

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
