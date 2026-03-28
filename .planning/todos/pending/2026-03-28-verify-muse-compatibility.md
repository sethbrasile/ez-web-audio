---
created: 2026-03-28T20:29:59.749Z
title: Contribute WASM target to MUSE for Web Audio compatibility
area: general
files: []
---

## Problem

MUSE (https://github.com/glittercowboy/MUSE) is an AI-native DSL that compiles `.muse` files into native VST3/CLAP audio plugin binaries via Rust/nih-plug. It currently only targets desktop DAWs. EZ Audio runs in the browser via Web Audio API. These are different runtimes — no direct compatibility exists today.

However, MUSE's generated DSP code (allocation-free, lock-free Rust `process()` functions) is an ideal candidate for WebAssembly compilation. If MUSE could compile to WASM, those plugins could run as `AudioWorkletProcessor` nodes in the browser — and EZ Audio's `EffectWrapper`/`createEffect()` already wraps arbitrary `AudioNode` instances into its effect chain with zero changes needed.

## Solution

Open a PR on glittercowboy/MUSE to add a `wasm32-unknown-unknown` compilation target:

1. **New codegen backend** — generate an AudioWorkletProcessor-compatible WASM module instead of nih-plug crate
   - Strip DAW ABI (nih-plug trait impls, parameter automation, CLAP/VST3 bundling)
   - Keep the core DSP `process()` loop and parameter struct
   - Expose a WASM-friendly interface: `process(input: &[f32], output: &mut [f32], params: &[f32])`
   - Generate JS glue code that registers the `AudioWorkletProcessor`
2. **New CLI flag** — e.g. `muse build --target wasm` or `muse build --target web`
3. **Output artifacts** — `.wasm` file + `processor.js` (AudioWorklet registration) + optional `node.js` (AudioWorkletNode factory)
4. **On EZ Audio side** — no changes needed for basic integration. Optionally add a `createWasmEffect(wasmUrl, params)` convenience helper later.

### Research completed

- MUSE architecture: Rust compiler (logos lexer, chumsky parser, custom codegen) generating standalone Rust/nih-plug crates
- MUSE's generated DSP is already allocation-free and lock-free — perfect for AudioWorklet's real-time constraints
- EZ Audio's effect chain is AudioNode-agnostic — `createEffect(audioWorkletNode)` works today
- Related ecosystem: WAM (Web Audio Modules) project has similar goals but different approach
