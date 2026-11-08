import { emitKeypressEvents } from "node:readline";
import type { Key } from "node:readline";
import type { Population } from "./logic.ts";

export async function startTui(PopulationClass: typeof Population): Promise<void> {
  const { stdin, stdout } = process;
  if (!stdin.isTTY || !stdout.isTTY) {
    console.error("The TUI requires an interactive terminal. Run: bun run solve");
    process.exitCode = 1;
    return;
  }

  let size = 10;
  let mutationPercent = 1;
  let selected = 2;
  let editing: "population" | "mutation" | null = null;
  let input = "";
  let message = "Set the parameters, then select Run.";
  let genome: number[] | null = null;
  let generation = 0;
  let duration = 0;
  let search: { population: Population; started: number } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastRender = 0;
  const wasRaw = stdin.isRaw;

  function render() {
    const options = [
      `Population size: ${editing === "population" ? `[${input}_]` : size}`,
      `Mutation rate (%): ${editing === "mutation" ? `[${input}_]` : mutationPercent}`,
      search ? "Cancel search" : "Run",
      "Reset",
      "Quit",
    ].map((label, i) => `${selected === i ? ">" : " "} ${label}`);
    const board = ["    a  b  c  d  e  f  g  h", "  +------------------------+"];
    for (let row = 0; row < 8; row++) {
      const cells = Array.from({ length: 8 }, (_, col) => genome?.[row] === col ? " Q " : " . ");
      board.push(`${8 - row} |${cells.join("")}|`);
    }
    board.push("  +------------------------+");
    const sideBySide = stdout.columns >= 66;
    const lines = ["Eight Queens Solver", ""];
    if (sideBySide) {
      for (let i = 0; i < board.length; i++) lines.push(`${board[i]!.padEnd(31)}${options[i] ?? ""}`);
    } else {
      lines.push(...options, "", ...board);
    }
    lines.push(
      "",
      `Generations: ${generation.toLocaleString()}   Fitness: ${genome ? "14/14" : "-"}`,
      `Time: ${(duration / 1000).toFixed(2)}s`,
      `Genome: ${genome ? genome.join(" ") : "-"}`,
      "",
      message,
      editing ? "Enter: save   Esc: cancel   Ctrl+U: clear" : "Up/Down: select   Enter: apply   R: run/cancel   Q: quit",
    );
    stdout.write(`\x1b[H${lines.map(line => `\x1b[2K${line}`).join("\n")}\x1b[J`);
  }

  function cancel() {
    if (search) duration = performance.now() - search.started;
    search = null;
    clearTimeout(timer);
  }

  // Short batches let the terminal process cancel and quit keys during a search.
  function step() {
    if (!search) return;
    try {
      const { population, started } = search;
      let [found, answer] = population.check();
      const batchStarted = performance.now();
      while (!found && performance.now() - batchStarted < 12) {
        generation++;
        population.crossover();
        population.mutate();
        [found, answer] = population.check();
      }
      duration = performance.now() - started;
      if (found) {
        genome = [...answer!.genome];
        search = null;
        message = "Solution found.";
      } else if (duration >= 60_000) {
        cancel();
        message = "Search stopped after 60 seconds without a solution.";
      } else {
        timer = setTimeout(step, 0);
      }
      if (!search || performance.now() - lastRender > 100) {
        render();
        lastRender = performance.now();
      }
    } catch (error) {
      cancel();
      message = `Solver error: ${error instanceof Error ? error.message : String(error)}`;
      render();
    }
  }

  function run() {
    if (search) {
      cancel();
      message = "Search cancelled.";
    } else {
      genome = null;
      generation = 0;
      duration = 0;
      search = { population: new PopulationClass(size, mutationPercent / 100), started: performance.now() };
      message = "Running...";
      timer = setTimeout(step, 0);
    }
  }

  await new Promise<void>(resolve => {
    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      cancel();
      stdin.off("keypress", onKey);
      stdout.off("resize", render);
      process.off("SIGINT", close);
      process.off("SIGTERM", close);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      stdout.write("\x1b[?25h\x1b[?1049l");
      resolve();
    }

    function onKey(text: string, key: Key) {
      if (key.ctrl && (key.name === "c" || key.name === "d")) { close(); return; }
      if (editing) {
        if (key.name === "escape") {
          editing = null;
          message = "Parameter change cancelled.";
        } else if (key.name === "return") {
          const value = Number(input);
          const valid = input.trim() !== "" && Number.isFinite(value) && (editing === "population"
            ? Number.isInteger(value) && value >= 2 && value <= 1000
            : value >= 0 && value <= 100);
          if (valid) {
            if (editing === "population") size = value;
            else mutationPercent = value;
            editing = null;
            message = "Parameter saved.";
          } else {
            message = editing === "population" ? "Enter an integer from 2 to 1,000." : "Enter a percentage from 0 to 100.";
          }
        } else if (key.name === "backspace") input = input.slice(0, -1);
        else if (key.ctrl && key.name === "u") input = "";
        else if (text && /^[\d.]+$/.test(text) && input.length + text.length <= 12) input += text;
      } else if (key.name === "q" || key.name === "escape") { close(); return; }
      else if (key.name === "up") selected = (selected + 4) % 5;
      else if (key.name === "down" || key.name === "tab") selected = (selected + 1) % 5;
      else if (key.name === "r") run();
      else if (key.name === "return") {
        if (selected <= 1) {
          if (search) message = "Cancel the search before changing parameters.";
          else {
            editing = selected === 0 ? "population" : "mutation";
            input = "";
            message = editing === "population" ? "Population size (2–1,000):" : "Mutation rate (0–100%):";
          }
        } else if (selected === 2) run();
        else if (selected === 3) {
          cancel(); size = 10; mutationPercent = 1; genome = null; generation = 0; duration = 0;
          message = "Reset to default parameters.";
        } else { close(); return; }
      }
      render();
    }

    emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("keypress", onKey);
    stdout.on("resize", render);
    process.on("SIGINT", close);
    process.on("SIGTERM", close);
    stdout.write("\x1b[?1049h\x1b[?25l\x1b[2J");
    render();
  });
}
