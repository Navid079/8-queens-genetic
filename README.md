# Eight Queens — Genetic Algorithm

## Getting started

1. Install Bun if it is not already installed.

   On macOS and Linux:

   ```sh
   curl -fsSL https://bun.sh/install | bash
   ```

   On Windows:

   ```powershell
   powershell -c "irm bun.sh/install.ps1|iex"
   ```

2. Install the project dependencies.

   ```sh
   bun install
   ```

3. Choose the terminal interface or build the web interface.

   To open the terminal interface (TUI):

   ```sh
   bun run solve
   ```

   To build the web interface:

   ```sh
   bun run build
   ```

   Then open `dist/index.html` in your browser. No server is required.

## Authorship

The genetic algorithm and solver logic in `logic.ts` were written by me. The graphical user interface (GUI) and terminal user interface (TUI) were written by OpenAI Codex.

## License

This project is licensed under the [MIT License](LICENSE).
