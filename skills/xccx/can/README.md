# can

Clock Address Nameable. Three-pole naming for OpenClaw agents.

```
CLOCK    = when     (millisecond unix timestamp)
ADDRESS  = where    (SHA-256 content hash)
NAMEABLE = human    (petnames, tags, whatever you want)
```

## What

Every thing gets named three ways: by time, by content hash, and optionally by human words. Computer handles the first two automatically, and optionally includes editable human namings. Human adds/edits the naming whenever they feel like it. Both find things fast.

## Why

36% of ClawHub skills have security flaws in week one. Agents phish agents for API keys on Moltbook. Paths lie. Hashes don't. Timestamps prove ordering. Petnames make it all findable by humans.

## Install

```
clawhub install can
```

## Quick test

```bash
CLOCK=$(date +%s%3N)
ADDRESS=$(echo -n "hello world" | sha256sum | awk '{print $1}')
echo "$CLOCK $ADDRESS greeting:hello"
```

Three poles. One line. That's CAN.

## Zero dependencies

Only needs `sha256sum` (pre-installed on macOS and Linux). No npm. No pip. No runtime. Works air-gapped.

## License

Public domain.
