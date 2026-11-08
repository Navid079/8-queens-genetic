import { Population } from "../logic.ts";

const channel = globalThis as unknown as { postMessage: (message: unknown) => void };

type Parameters = { size: number; mutationRate: number };
globalThis.onmessage = (event: MessageEvent<Parameters>) => {
  try {
    const { size, mutationRate } = event.data;
    if (!Number.isInteger(size) || size < 2 || size > 1000 || !Number.isFinite(mutationRate) || mutationRate < 0 || mutationRate > 1) {
      throw new Error("Choose a population of 2–1,000 and a mutation rate of 0–100%.");
    }
    const population = new Population(size, mutationRate);
    let [found, answer] = population.check();
    let generation = 0;
    let lastUpdate = performance.now();
    while (!found) {
      generation++;
      population.crossover();
      population.mutate();
      [found, answer] = population.check();
      if (generation % 100 === 0 && performance.now() - lastUpdate > 100) {
        channel.postMessage({ type: "progress", generation });
        lastUpdate = performance.now();
      }
    }
    channel.postMessage({ type: "solution", generation, genome: answer!.genome });
  } catch (error) {
    channel.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
