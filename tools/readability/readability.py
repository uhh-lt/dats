from time import sleep
from typing import TypedDict
import requests
import subprocess
import shlex


class ReadabilityOutput(TypedDict):
    title: str
    byline: str
    dir: str
    content: str
    textContent: str
    length: int
    excerpt: str
    siteName: str


class Readability:

    def __init__(self, port=6666):
        self.BASE_PATH = f"http://localhost:{port}/"
        command = f"node readability/readability_express.js -p {port}"
        args = shlex.split(command)
        self.proc = subprocess.Popen(args)
        while not self.__is_alive():
            sleep(1)

    def __del__(self):
        self.proc.kill()

    def __is_alive(self):
        try:
            r = requests.get(self.BASE_PATH)
            return r.status_code == 200
        except requests.exceptions.ConnectionError:
            return False

    def parse(self, html: str) -> ReadabilityOutput:
        r = requests.post(self.BASE_PATH, json={
            "html": html,
        })
        r.raise_for_status()
        return r.json()
