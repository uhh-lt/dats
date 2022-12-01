from io import StringIO

class StringBuilder(StringIO):
    def __iadd__(self, str: str):
        self.write(str)
        return self
    def build(self):
        return self.getvalue()