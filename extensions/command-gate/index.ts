import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { AutocompleteItem } from "@mariozechner/pi-tui";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Node 20.11+; fall back for older runtimes. */
const extensionDir =
  import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));

const CONFIG_FILE = join(import.meta.dirname, "restricted-commands.json");

type RestrictedCommandsFile = {
  restrictedCommands?: unknown;
};

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function parseRestrictedCommandsFile(text: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (parsed === null || typeof parsed !== "object") return [];
  const { restrictedCommands } = parsed as RestrictedCommandsFile;
  return isStringArray(restrictedCommands) ? restrictedCommands : [];
}

async function loadRestrictedCommands(): Promise<string[]> {
  try {
    const text = await readFile(CONFIG_FILE, "utf8");
    return parseRestrictedCommandsFile(text);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "ENOENT"  // File not found
    ) {
      return [];
    }
    return [];
  }
}

async function saveRestrictedCommands(commands: string[]): Promise<void> {
  await mkdir(dirname(CONFIG_FILE), { recursive: true });
  await writeFile(
    CONFIG_FILE,
    `${JSON.stringify({ restrictedCommands: commands }, null, 2)}\n`,
    "utf8",
  );
}

export default function (pi: ExtensionAPI) {
  // Intercept bash tool calls
  pi.on("tool_call", async (event, ctx) => {
    if (isToolCallEventType("bash", event)) {
      const command = event.input.command;
      const restrictedCommands = await loadRestrictedCommands();

      for (const restricted of restrictedCommands) {
        if (command.includes(restricted)) {
          const confirmed = await ctx.ui.confirm(
            "⚠️ Restricted Command Detected",
            `The agent wants to run: ${command}\n\nThis command is restricted in the extension config. Are you sure you want to allow this?`,
          );

          if (!confirmed) {
            return {
              block: true,
              reason: `User denied the restricted command containing: ${restricted}`,
            };
          }
          break;
        }
      }
    }
  });

  // Command to manage restricted commands: /restricted [add|remove|list] [pattern]
  pi.registerCommand("restricted", {
    description: "Manage restricted bash commands",
    getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
      const actions = ["list", "add", "remove"];
      const items = actions.map((a) => ({ value: a, label: a }));
      const filtered = items.filter((i) => i.value.startsWith(prefix));
      return filtered.length > 0 ? filtered : null;
    },
    handler: async (args, ctx) => {
      const parts = args?.trim().split(/\s+/);
      const action = parts[0];
      const pattern = parts.slice(1).join(" ");

      const commands = await loadRestrictedCommands();

      if (!action || action === "list") {
        if (commands.length === 0) {
          ctx.ui.notify("No restricted commands configured.", "info");
        } else {
          ctx.ui.notify(
            `Restricted commands:\n- ${commands.join("\n- ")}`,
            "info",
          );
        }
        return;
      }

      if (action === "add") {
        if (!pattern) {
          ctx.ui.notify(
            "Please provide a pattern to add. Example: /restricted add sudo",
            "error",
          );
          return;
        }
        if (commands.includes(pattern)) {
          ctx.ui.notify(`'${pattern}' is already restricted.`, "info");
          return;
        }
        commands.push(pattern.trim().replace(/\s+/g, " "));
        await saveRestrictedCommands(commands);
        ctx.ui.notify(`Added '${pattern}' to restricted commands.`, "info");
      } else if (action === "remove") {
        if (!pattern) {
          ctx.ui.notify(
            "Please provide a pattern to remove. Example: /restricted remove sudo",
            "error",
          );
          return;
        }
        const index = commands.indexOf(pattern);
        if (index === -1) {
          ctx.ui.notify(`'${pattern}' is not in the restricted list.`, "error");
          return;
        }
        commands.splice(index, 1);
        await saveRestrictedCommands(commands);
        ctx.ui.notify(
          `Removed '${pattern}' from restricted commands.`,
          "info",
        );
      } else {
        ctx.ui.notify(
          "Usage: /restricted [list | add <pattern> | remove <pattern>]",
          "info",
        );
      }
    },
  });
}
