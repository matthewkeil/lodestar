import fs from "fs";
import path from "path";
import {Options} from "yargs";
import {omit} from "lodash";
import {cmds} from "../src/cmds";
import {ICliCommand} from "../src/util";
import {globalOptions} from "../src/options";
import {beaconOptions} from "../src/cmds/beacon/options";
import {renderMarkdownSections, toMarkdownTable, IMarkdownSection} from "./markdown";

// Script to generate a reference of all CLI commands and options
// Outputs a markdown format ready to be consumed by mkdocs
//
// Usage:
// ts-node docsgen docs/cli.md
//
// After generation the resulting .md should be mv to the path expected
// by the mkdocs index and other existing paths in the documentation

const docsMarkdownPath = process.argv[2];
if (!docsMarkdownPath) throw Error("Run script with output path: 'ts-node docsgen docs/cli.md'");

const docsString = renderMarkdownSections([{
  title: "Lodestar CLI Documentation",
  body: "This reference describes the syntax of the Lodestar CLI options and commands.",
  subsections: [
    {
      title: "Global Options",
      body: getOptionsTable(globalOptions)
    },
    ...cmds.map(cmd => cmdToMarkdownSection(cmd))
  ]
}]);

fs.mkdirSync(path.parse(docsMarkdownPath).dir, {recursive: true});
fs.writeFileSync(docsMarkdownPath, docsString);

/**
 * Parse an ICliCommand type recursively and output a IMarkdownSection
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cmdToMarkdownSection(cmd: ICliCommand<any>, parentCommand?: string): IMarkdownSection {
  const commandJson = [parentCommand, cmd.command.replace("<command>", "")].filter(Boolean).join(" ");
  const body = [cmd.describe];
  if (cmd.options) {
    if (cmd.subcommands) {
      body.push("The options below apply to all subcommands.");
    }

    // De-duplicate beaconOptions. If all beaconOptions exists in this command, skip them
    if (
      cmds.some(c => c.command === "beacon") &&
      commandJson !== "beacon" &&
      Object.keys(beaconOptions).every(key => cmd.options[key])
    ) {
      cmd.options = omit(cmd.options, Object.keys(beaconOptions));
      body.push(`Cmd \`${commandJson}\` has all the options from the [\`beacon\` cmd](#beacon).`);
    }

    if (Object.keys(cmd.options).length > 0) {
      body.push(getOptionsTable(cmd.options));
    }
  }
  return {
    title: `\`${commandJson}\``, 
    body,
    subsections: (cmd.subcommands || []).map(subcmd => cmdToMarkdownSection(subcmd, commandJson))
  };
}

/**
 * Render a Yargs options dictionary to a markdown table
 */
function getOptionsTable(
  options: Record<string, Options>,
  {showHidden}: {showHidden?: boolean} = {}
): string {
  return toMarkdownTable(Object.entries(options)
    .filter(([, opt]) => showHidden || !opt.hidden)
    .map(([key, opt]) => ({
      Option: `\`--${key}\``,
      Type: opt.type,
      Description: opt.description,
      Default: opt.defaultDescription || opt.default || ""
    })), ["Option", "Type", "Description", "Default"]);
}
