declare const __SOLVER_SOURCE__: string;

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Missing element: ${id}`);
  return result as T;
}
const board = element("board");
const solve = element<HTMLButtonElement>("solve");
const badge = element("status-badge");
const populationInput = element<HTMLInputElement>("population-size");
const mutationInput = element<HTMLInputElement>("mutation-rate");
let worker: Worker | null = null;
let clock: ReturnType<typeof setInterval> | undefined;
let timeout: ReturnType<typeof setTimeout> | undefined;
let started = 0;

function highlightQueen(row?: number, column?: number) {
  for (let index = 0; index < board.children.length; index++) {
    const square = board.children[index]!;
    const squareRow = Math.floor(index / 8);
    const squareColumn = index % 8;
    const active = row !== undefined && column !== undefined;
    square.classList.toggle("highlighted", active && (
      squareRow === row || squareColumn === column ||
      Math.abs(squareRow - row) === Math.abs(squareColumn - column)
    ));
    square.classList.toggle("selected", active && squareRow === row && squareColumn === column);
  }
}

function draw(genome?: number[]) {
  board.replaceChildren();
  element("genome").replaceChildren();
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 8; column++) {
      const square = document.createElement("div");
      square.className = `square${(row + column) % 2 ? " dark" : ""}`;
      if (column === 0) {
        const rank = document.createElement("span");
        rank.className = "rank";
        rank.textContent = String(8 - row);
        square.append(rank);
      }
      if (genome?.[row] === column) {
        const queen = document.createElement("span");
        queen.className = "queen";
        queen.textContent = "♛";
        queen.style.animationDelay = `${row * 35}ms`;
        queen.addEventListener("pointerenter", () => highlightQueen(row, column));
        queen.addEventListener("pointerleave", () => highlightQueen());
        queen.addEventListener("pointercancel", () => highlightQueen());
        square.append(queen);
      }
      board.append(square);
    }
    const gene = document.createElement("span");
    gene.className = "genome-cell";
    gene.textContent = genome ? String(genome[row]) : "–";
    element("genome").append(gene);
  }
  const positions = genome?.map((column, row) => `${"abcdefgh"[column]}${8 - row}`).join(", ");
  board.setAttribute("aria-label", positions ? `Solved chessboard. Queens at ${positions}.` : "Empty eight by eight chessboard");
  element("genome").setAttribute("aria-label", genome ? `Solution genome: ${genome.join(", ")}` : "No solution yet");
}
function stop() {
  worker?.terminate();
  worker = null;
  clearInterval(clock);
  clearTimeout(timeout);
  solve.textContent = "Run";
  board.removeAttribute("aria-busy");
  populationInput.disabled = false;
  mutationInput.disabled = false;
}
function status(text: string, state = "ready") {
  badge.textContent = text;
  badge.dataset.state = state;
}
function fail(message: string) {
  stop();
  status("Try again", "error");
  element("board-status").textContent = "Search stopped";
  element("board-caption").textContent = "";
  element("message").textContent = message;
}
function elapsed() {
  const ms = performance.now() - started;
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}
solve.addEventListener("click", () => {
  if (worker) {
    stop();
    status("Cancelled");
    element("board-status").textContent = "Search cancelled";
    element("board-caption").textContent = "";
    element("message").textContent = "Search cancelled.";
    return;
  }
  if (!populationInput.reportValidity() || !mutationInput.reportValidity()) return;
  const size = populationInput.valueAsNumber;
  const mutationRate = mutationInput.valueAsNumber / 100;
  draw();
  element("generations").textContent = "0";
  element("fitness").textContent = "—";
  element("duration").textContent = "0ms";
  element("board-caption").textContent = "";
  element("board-status").textContent = "Running";
  element("message").textContent = "Running…";
  status("Searching", "running");
  solve.textContent = "Cancel search";
  board.setAttribute("aria-busy", "true");
  populationInput.disabled = true;
  mutationInput.disabled = true;
  started = performance.now();
  const url = URL.createObjectURL(new Blob([__SOLVER_SOURCE__], { type: "text/javascript" }));
  try {
    worker = new Worker(url);
  } catch {
    URL.revokeObjectURL(url);
    fail("Could not start the solver. Check that web workers are allowed in your browser.");
    return;
  }
  URL.revokeObjectURL(url);
  clock = setInterval(() => { element("duration").textContent = elapsed(); }, 100);
  timeout = setTimeout(() => fail("Search stopped after 60 seconds without a solution."), 60_000);
  worker.onerror = () => fail("Solver error. Run again to retry.");
  worker.onmessage = (event: MessageEvent) => {
    const data = event.data;
    if (data.type === "error") { fail(`Solver error: ${data.message}`); return; }
    if (data.type === "progress") { element("generations").textContent = data.generation.toLocaleString(); return; }
    if (data.type !== "solution") return;
    const duration = elapsed();
    stop();
    draw(data.genome);
    status("Solved");
    element("generations").textContent = data.generation.toLocaleString();
    element("fitness").textContent = "14/14";
    element("duration").textContent = duration;
    element("board-status").textContent = "Solution found";
    element("board-caption").textContent = "No shared rows, columns, or diagonals.";
    element("message").textContent = "Solution found.";
  };
  worker.postMessage({ size, mutationRate });
});
element("reset").addEventListener("click", () => {
  stop(); draw(); status("Ready");
  populationInput.value = "10";
  mutationInput.value = "1";
  for (const id of ["generations", "fitness", "duration"]) element(id).textContent = "—";
  element("board-status").textContent = "Waiting for a solution";
  element("board-caption").textContent = "";
  element("message").textContent = "Set the parameters and click Run.";
});
element<HTMLInputElement>("show-coordinates").addEventListener("change", (event) => {
  board.parentElement!.classList.toggle("hide-coordinates", !(event.target as HTMLInputElement).checked);
});
draw();
