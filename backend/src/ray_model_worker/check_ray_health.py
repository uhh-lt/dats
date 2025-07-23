import subprocess

import yaml


def check_health():
    # Run the serve status command and capture the output
    result = subprocess.run(["serve", "status"], stdout=subprocess.PIPE)
    status_output = result.stdout.decode("utf-8")

    # Parse the YAML output
    status = yaml.safe_load(status_output)

    # Check if all proxies are HEALTHY
    for proxy_status in status.get("proxies", {}).values():
        if proxy_status != "HEALTHY":
            print("Unhealthy proxies found")
            return 1

    # Check if all applications are RUNNING
    for app in status.get("applications", {}).values():
        if app.get("status") != "RUNNING":
            print("Unhealthy applications found")
            return 1

        # Check if all deployments are HEALTHY
        for deployment in app.get("deployments", {}).values():
            if deployment.get("status") != "HEALTHY":
                print("Unhealthy deployments found")
                return 1

    print("All proxies, applications, and deployments are healthy")
    return 0


if __name__ == "__main__":
    exit(check_health())
