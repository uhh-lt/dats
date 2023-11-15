from app.core.data.dto.feedback import FeedbackRead
from app.core.data.dto.user import UserRead
from app.util.singleton_meta import SingletonMeta
from config import conf
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from pydantic import EmailStr


class MailService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.fast_mail = FastMail(
            ConnectionConfig(
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
        )
        return super(MailService, cls).__new__(cls)

    async def send_mail(self, email: EmailStr, subject: str, body: str):
        if conf.mail.enabled == "True":
            message = MessageSchema(
                subject=subject,
                recipients=[email],
                body=body,
                subtype=MessageType.html,
            )
            await self.fast_mail.send_message(message)

    async def send_welcome_mail(self, user: UserRead):
        subject = "Welcome to D-WISE Tool Suite"
        body = f"""
            <p>Hi {user.first_name} {user.last_name},</p>
            <p>Thanks for using D-WISE Tool Suite!</p>
            <p>
            For your first steps, we highly recommend you to take a look at our <a href="https://github.com/uhh-lt/dwts/wiki/User-Guide">Wiki & User Guide</a>.
            <br>
            If you have further questions, feel free to reach out to us and write us <a href="mailto:dwise@uni-hamburg.de">dwise@uni-hamburg.de</a>.
            </p>
            <p>Best regards,<br>The D-WISE Team</p>
            """
        await self.send_mail(email=user.email, subject=subject, body=body)

    async def send_feedback_received_mail(self, user: UserRead, feedback: FeedbackRead):
        feedback_html = "> " + "<br>> ".join(feedback.user_content.splitlines())
        subject = (
            f"[DWTS Feedback] New feedback from {user.first_name} {user.last_name}"
        )
        body = f"""
            <p>Hi D-WISE Team,</p>
            <p>We recieved new feedback!</p>
            <p>
            {feedback_html}
            </p>
            <p>Best regards,<br>DWTS Notification Service</p>
            """
        await self.send_mail(email=self.mail, subject=subject, body=body)

    async def send_feedback_response_mail(
        self, user: UserRead, feedback: FeedbackRead, message: str
    ):
        feedback_html = "> " + "<br>> ".join(feedback.user_content.splitlines())
        subject = "Your DWTS Feedback"
        body = f"""
            <p>Hi {user.first_name} {user.last_name},</p>
            <p>Thanks for you feedback!</p>
            <p>
            {feedback_html}
            </p>
            <p>
            We have a message regarding this feedback for you:
            <br>
            {message}
            </p>
            <p>Best regards,<br>The D-WISE Team</p>
            """
        await self.send_mail(email=user.email, subject=subject, body=body)
