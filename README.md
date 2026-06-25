# zapret-strategies

Парсер стратегий обхода DPI из репозитория [Flowseal/zapret-discord-youtube](https://github.com/Flowseal/zapret-discord-youtube). Скачивает `general*.bat`, извлекает аргументы `winws.exe` и сохраняет их в JSON, адаптированный для **Linux-версии zapret** (nfqws). Дополнительно собирает zip-архивы с fake-файлами (`*.bin`) для OpenWrt и Windows.

## Требования

- [Node.js](https://nodejs.org/) 18+ (нужен встроенный `fetch`)
- Доступ в интернет к GitHub API и raw.githubusercontent.com

## Установка

```bash
git clone <url-репозитория> zapret-strategies
cd zapret-strategies
npm install
```

## Запуск парсера

Базовая команда — скачать **последний релиз** upstream, записать JSON, собрать zip и обновить индекс:

```bash
npm run parse
```

Эквивалент:

```bash
npx tsx src/index.ts
```

### Параметры CLI

| Параметр | Описание |
|----------|----------|
| `--tag VERSION` | Конкретный тег релиза GitHub (например `1.9.9c`). Без параметра — latest |
| `--out DIR` | Каталог для JSON (имя формируется автоматически) |
| `--out FILE.json` | Явный путь к выходному JSON |
| `--bundles-dir DIR` | Каталог для zip (по умолчанию `bundles/`) |
| `--skip-bundle` | Не скачивать `bin/*.bin` и не собирать zip |
| `-h`, `--help` | Справка |

Примеры:

```bash
# конкретная версия
npm run parse -- --tag 1.9.9c

# только JSON, без zip
npm run parse -- --tag 1.9.9c --skip-bundle
```

При успешном выполнении создаются:

- `strategies/<тег>.json` — стратегии для UI
- `bundles/<тег>.zip` — fake-файлы (если не `--skip-bundle`)
- `strategies/index.json` — каталог версий

## Публикация и автосинхронизация

GitHub Actions (`.github/workflows/sync.yml`) каждые 6 часов проверяет новые релизы [Flowseal/zapret-discord-youtube](https://github.com/Flowseal/zapret-discord-youtube). При появлении новой версии парсер запускается автоматически, артефакты коммитятся в `main`.

Ручной запуск: Actions → Sync strategies from Flowseal → Run workflow (опционально указать тег).

## Артефакты для приложения

| Файл | Назначение |
|------|------------|
| `strategies/index.json` | Список версий для выбора в UI |
| `strategies/<тег>.json` | Стратегии выбранной версии |
| `bundles/<тег>.zip` | Только `fake/*.bin` — скачивается при применении стратегии |

JSON **не** входит в zip: UI загружает его отдельно до выбора стратегии.

### URL (raw.githubusercontent.com)

```
https://raw.githubusercontent.com/<owner>/zapret-strategies/main/strategies/index.json
https://raw.githubusercontent.com/<owner>/zapret-strategies/main/strategies/1.9.9c.json
https://raw.githubusercontent.com/<owner>/zapret-strategies/main/bundles/1.9.9c.zip
```

Альтернатива — [jsDelivr](https://www.jsdelivr.com/): `https://cdn.jsdelivr.net/gh/<owner>/zapret-strategies@main/bundles/1.9.9c.zip`

### Контракт для клиента

```typescript
const BASE = "https://raw.githubusercontent.com/<owner>/zapret-strategies/main";

// 1. Список версий
const { versions } = await fetch(`${BASE}/strategies/index.json`).then((r) => r.json());

// 2. Стратегии (UI)
const tag = "1.9.9c";
const doc = await fetch(`${BASE}/strategies/${tag}.json`).then((r) => r.json());
const names = doc.strategies.map((s) => s.title);

// 3. Бинарники (после выбора стратегии)
const entry = versions.find((v) => v.release === tag);
await downloadAndUnzip(`${BASE}/${entry.bundle}`, targetFakeDir);
// OpenWrt: /opt/zapret/files/fake/
// Windows: <zapret>\bin\
```

### Формат index.json

```json
{
  "versions": [
    {
      "release": "1.9.9c",
      "parsedAt": "2026-06-25",
      "strategiesCount": 20,
      "bundle": "bundles/1.9.9c.zip"
    }
  ]
}
```

Версии отсортированы от новых к старым (`parsedAt`).

### Состав zip

Источник: `bin/*.bin` из тега релиза Flowseal (не `main`).

```
fake/
  stun.bin
  quic_initial_www_google_com.bin
  quic_initial_dbankcloud_ru.bin
  tls_clienthello_www_google_com.bin
  tls_clienthello_max_ru.bin
  tls_clienthello_4pda_to.bin
```

Один zip на версию — подходит и для OpenWrt (`unzip` через `opkg`), и для Windows.

## Формат strategies JSON

Файл `strategies/1.9.9c.json`:

```json
{
  "source": "Flowseal/zapret-discord-youtube",
  "parsedAt": "2026-06-25",
  "release": "1.9.9c",
  "strategies": [
    {
      "title": "general (ALT)",
      "general": {
        "tcp": "--filter-tcp=80,443 --dpi-desync=...",
        "udp": "--filter-udp=443 --dpi-desync=..."
      },
      "discord": {
        "tcp": "--filter-tcp=2053,...",
        "udp": "--filter-udp=19294-19344,..."
      },
      "youtube": {
        "tcp": "--filter-tcp=443 --ip-id=zero ..."
      },
      "games": {
        "tcp": "--filter-tcp=1024-65535 --dpi-desync=...",
        "udp": "--filter-udp=1024-65535 --dpi-desync=..."
      }
    }
  ]
}
```

| Поле | Смысл |
|------|-------|
| `title` | Имя исходного `.bat` без расширения |
| `general` | Общий трафик (TCP 80/443, UDP 443) |
| `discord` | Фильтры Discord / STUN (если есть в bat) |
| `youtube` | Фильтр для Google/YouTube (`list-google.txt` в оригинале) |
| `games` | Game filter: TCP/UDP `1024-65535` |

Каждое значение `tcp` / `udp` — готовая строка аргументов для nfqws, **без** `--new` в конце.

### Что меняется при конвертации

- Пути `%BIN%...` → `/opt/zapret/files/fake/...`
- `%GameFilterTCP%` / `%GameFilterUDP%` → `1024-65535`
- Удаляются `--hostlist`, `--hostlist-exclude`, `--hostlist-domains`, `--ipset`, `--ipset-exclude`

## Использование стратегий в zapret (Linux / OpenWrt)

1. Установите [zapret](https://github.com/bol-van/zapret) и распакуйте `bundles/<тег>.zip` в `/opt/zapret/files/fake/`.

2. Выберите стратегию по `title` в JSON.

3. Соберите команду nfqws: базовые опции zapret + сегменты из JSON через `--new`. **hostlist / hostlist-domains / ipset** добавляются вручную.

Типичный порядок сегментов: `general.udp` → `discord.udp` → `discord.tcp` → `youtube.tcp` → `general.tcp` → `games.tcp` → `games.udp`.

## Тесты

```bash
npm test
```

## Структура проекта

```
src/
  index.ts       — CLI, парсинг, сборка zip, обновление индекса
  github.ts      — API GitHub (релизы, дерево, raw)
  bundle.ts      — скачивание bin/*.bin и zip
  manifest.ts    — strategies/index.json
  transform.ts   — парсинг winws.exe
  constants.ts   — репозиторий-источник, префиксы фильтров
  paths.ts       — пути к JSON и zip
strategies/      — JSON и index.json (в git)
bundles/         — zip-архивы (в git)
.github/workflows/sync.yml
```

## Ограничения

- Источник — только `Flowseal/zapret-discord-youtube`, файлы `general*.bat` и `bin/*.bin` из тега релиза.
- Пути в JSON — для Linux (`/opt/zapret/...`); Windows использует те же `.bin`, пути задаёт приложение при распаковке.
- Bin-файлы привязаны к **версии**, не к отдельной стратегии.
- При лимитах GitHub API повторите позже или укажите `--tag`.
