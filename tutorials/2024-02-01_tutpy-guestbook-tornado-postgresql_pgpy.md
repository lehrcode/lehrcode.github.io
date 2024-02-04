# Ein digitales Gästebuch in Python mit Tornado und PostgreSQL

Ein Klassiker im Internet aus der Zeit vor dem Siegeszug der Sozialen Medien ist das Gästebuch. Was Anfang der 2000er noch bei vielen Homepages anzutreffen war ist heute auch wegen Spam und anderer unerwünschter Inhalte kaum noch zu finden. Ein digitales Gästebuch zu erstellen ist allerdings eine gute Übung für den Einstieg in die Entwicklung von Webanwendungen.

Wir werden in diesem Tutorial das Gästebuch mit der Programmiersprache [Python](https://www.python.org/) in der Version 3.11 und dem [Tornado Web Server](https://www.tornadoweb.org/) mit der Version 6.4 entwickeln. Außerdem werden wir die Gästebucheinträge in einer [PostgreSQL](https://www.postgresql.org/) Datenbank speichern.

## Datenmodell

Jeder Gästebucheintrag wird als Datensatz bestehend aus den Werten `name`, `email`, `message` sowie einem automatischen Timestamp für den Zeitpunkt der Erstellung in einer Einzelnen Tabelle abgelegt. Die Tabelle wird außerdem eine automatisch vergebene numerische id als Primärschlüssel haben.

```csv table-centered
guestbook
PK,id,bigint
,name,varchar
,email,varchar
,message,varchar
,created,timestamp(3)
```

Eine Webanwendung sollte nicht mit dem Superuser auf die Datenbank zugreifen, also erstellen wir als Erstes einen neuen Datenbankbenutzer und ein dazu passendes Schema.

```postgresql
CREATE USER guestbook WITH PASSWORD 'trustno1';
GRANT CONNECT ON DATABASE postgres TO guestbook;
CREATE SCHEMA AUTHORIZATION guestbook;
```

Mit dem neu angelegten Datenbankbenutzer können wir jetzt in das ebenfalls neu angelegte Schema die Tabelle erstellen.

```postgresql
CREATE TABLE guestbook (
    id BIGINT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    "name" VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    message VARCHAR NOT NULL,
    created TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

## Boilerplate-Code

```python
import asyncio
import logging
import math
from html import escape

import asyncpg
from tornado.httpserver import HTTPServer
from tornado.options import define, options, parse_command_line
from tornado.web import Application, RedirectHandler

define("port", default=8080, help="port to listen on")


async def main():
    app = Application([
        (r"/", RedirectHandler, {"url": "/guestbook"})
    ], serve_traceback=True)
    server = HTTPServer(app)
    logging.info('Start listening on port %d', options.port)
    server.listen(options.port)
    shutdown_event = asyncio.Event()
    await shutdown_event.wait()


if __name__ == '__main__':
    parse_command_line()
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info('Shutting down')
```
