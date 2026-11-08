type Gene = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export class Instance {
  static OrderCrossover(parentA: Instance, parentB: Instance): Instance {
    const genomeA = parentA.genome;
    const genomeB = parentB.genome;

    // start           -> 0~6
    const start = Math.floor(Math.random() * 7);

    // end | start = 0 -> 1~7
    // end | start = 6 -> 7~7
    const end = Math.floor(Math.random() * (8 - start - 1)) + start + 1;

    const childGenome = new Array(8).fill(null);

    const available = new Array(8)
      .fill(null)
      .map((_, i) => i) as (Gene | null)[];

    for (let i = start; i <= end; i++) {
      const gene = genomeA[i]!;
      childGenome[i] = gene;
      available[gene] = null;
    }

    let idx = (end + 1) % 8;
    for (let step = 0; step < 8; step++) {
      const i = (end + 1 + step) % 8;
      const gene = genomeB[i]!;
      if (available[gene] !== null) {
        available[gene] = null;
        childGenome[idx++] = gene;
        if (idx === 8) idx = 0;
      }
    }

    return new Instance(childGenome as Gene[]);
  }

  genome: Gene[];
  constructor(genome?: Gene[]) {
    if (!genome) {
      this.genome = [];
      const available = new Array(8)
        .fill(null)
        .map((_, i) => i) as (Gene | null)[];
      for (let i = 0; i < 8; i++) {
        let pick: Gene = 0;
        let idx = 0;
        do {
          idx = Math.floor(Math.random() * available.length);
          pick = available[idx]!;
        } while (pick === null);

        available[idx] = null;
        this.genome.push(pick);
      }
    } else {
      this.genome = genome;
    }
  }

  print(): void {
    for (const gene of this.genome) {
      let line = new Array(8).fill("[ ]");
      line[gene] = "[*]";
      console.log(line.join(""));
    }
  }

  // can be between 1 and 14
  getFitness(): number {
    let result = 0;

    for (let i = 0; i < 8; i++) {
      const gene = this.genome[i]!;
      let diagLeft = gene - 1,
        diagRight = gene + 1;

      for (let j = i + 1; j < 8; j++) {
        if (diagLeft >= 0 && this.genome[j] === diagLeft) {
          result++;
          diagLeft = -1;
        } else diagLeft--;

        if (diagRight < 8 && this.genome[j] === diagRight) {
          result++;
          diagRight = 8;
        } else diagRight++;
      }
    }

    return 14 - result;
  }

  swapMutate(): void {
    // a           -> 0~6
    const a = Math.floor(Math.random() * 7);

    // b | a = 0 -> 1~7
    // b | a = 6 -> 7~7
    const b = Math.floor(Math.random() * (8 - a - 1)) + a + 1;

    const geneA = this.genome[a]!;
    const geneB = this.genome[b]!;
    this.genome[a] = geneB;
    this.genome[b] = geneA;
  }
}

export class Population {
  private instances: Instance[];
  constructor(
    private size: number,
    private mutationRate: number,
  ) {
    this.instances = Array(size);
    for (let i = 0; i < this.size; i++) this.instances[i] = new Instance();
  }

  crossover() {
    const fitnesses = this.instances.map(instance =>
      instance.getFitness(),
    ) as number[];

    const aggregated = fitnesses.reduce((result, fitness, idx) => {
      if (idx === 0) result[idx] = fitness;
      else result[idx] = fitness + result[idx - 1]!;

      return result;
    }, [] as number[]);

    const max = aggregated[this.size - 1]!;

    const newPopulation: Instance[] = [];

    for (let i = 0; i < this.size; i++) {
      const choice1 = Math.floor(Math.random() * max);
      const choice2 = Math.floor(Math.random() * max);

      const parent1Idx = aggregated.findLastIndex(item => item <= choice1) + 1;
      const parent2Idx = aggregated.findLastIndex(item => item <= choice2) + 1;

      const parent1 = this.instances[parent1Idx]!;
      const parent2 = this.instances[parent2Idx]!;

      const child = Instance.OrderCrossover(parent1, parent2);
      newPopulation.push(child);
    }
    this.instances = newPopulation;
  }

  mutate() {
    for (const instance of this.instances) {
      if (Math.random() <= this.mutationRate) instance.swapMutate();
    }
  }

  check(): [boolean, Instance | null] {
    const fitnesses = this.instances.map(instance => instance.getFitness());
    const foundIdx = fitnesses.findIndex(item => item === 14);
    if (foundIdx === -1) return [false, null];
    return [true, this.instances[foundIdx]!];
  }
}

if (import.meta.main) {
  void import("./tui.ts").then(({ startTui }) => startTui(Population));
}
