## Backend Configuration Details

The backend configuration is managed using Omegaconf, allowing for flexible and hierarchical settings management:

Backend:

- Configuration files are stored in the `/backend/configs` directory.
- Different configuration files are used for various environments (e.g., development, production).
- Some settings can be overridden by environment variables (e.g., database credentials, API keys).
- Such environment variables are defined in `/backend/.env` file that is not committed to version control for security reasons.
- Instead, `/backend/.env.example` file is provided to show the required variables.

Docker:

- Docker Compose files (`/docker/`) need to forward relevant environment variables to the backend services.
- Docker Compose files read environment variables from the `/docker/.env` file, which is not committed to version control.
- Again, `/docker/.env.example` is provided to illustrate the necessary variables.

Scripts:

- For easy setup, we provide the `/bin/setup-envs.sh` file which copies the example files to `.env` and initializes environment variables.

## Guidelines for Adding New Configuration Options

When adding new configuration options, consider if they should be configurable via environment variables, especially for sensitive data or settings that may vary between deployments.

If no:

1. Update the configuration files in `/backend/configs`.

If yes:

1. Add the configuration files in `/backend/configs`.
2. Add corresponding environment variable entries in `/backend/.env.example` and `/backend/.env`.
3. Add corresponding entries in `/docker/.env.example` and `/docker/.env`.
4. Update the `/bin/setup-envs.sh` script if necessary to handle new environment variables.
5. Update Docker Compose files in `/docker/` to forward the new environment variables to the backend services.
