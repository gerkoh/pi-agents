# Pi Agent Configuration

## Quickstart

Run Pi with an extension directly (no install):

```bash
pi -e ./extensions/<extension>/index.ts
```

Or install an extension for auto-discovery (pick one):

- Global:

```bash
mkdir -p ~/.pi/agent/extensions/<extension>
cp -R ./extensions/<extension>/* ~/.pi/agent/extensions/<extension>/
```

- Project-local (from your target project directory):

```bash
mkdir -p .pi/extensions/<extension>
cp -R /path/to/pi-agents/extensions/<extension>/* .pi/extensions/<extension>/
```

Then in Pi, run `/reload`.

## Extensions

This repo contains [Pi Coding Agent](https://github.com/badlogic/pi-mono) extensions.

Pi auto-discovers extensions from:
- `~/.pi/agent/extensions/` (global)
- `.pi/extensions/` (project-local)

### Extension: Command Gate (command-gate)

Prevents the agent from running commands listed in `extensions/command-gate/restricted-commands.json`.
Registers the `/restricted` command to manage the list of commands the Pi agent is not allowed to run.

```bash
/restricted list
/restricted add <pattern>
/restricted remove <pattern>
```

### Other Useful Extensions

- [Pi-FFF](https://github.com/dmtrKovalenko/fff.nvim#pi-agent-extension): fast file search.