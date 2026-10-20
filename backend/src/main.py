from bootstrap import create_app, init_logging

init_logging(with_sentry=True)

app = create_app()
