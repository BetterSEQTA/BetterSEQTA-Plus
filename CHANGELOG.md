# Changelog

All notable changes to this project will be documented in this file.

## [3.6.5] - 2026-04-30

### *Seek and CTRL-Found: Global Search won’t CTRL-fuse you anymore*

- **Global Search & indexing.** Hybrid lexical + vector search behaves more reliably, passive capture aligns better with SEQTA payloads, vectorization waits correctly so progress doesn’t “freeze,” and indexing covers more surfaces (e.g. courses) with sane schema resets when needed.
- **Results.** Fewer duplicate tiles that navigated to the same course (`/courses/…`): job index, passive `/load/courses` captures, and subject shortcuts are consolidated for one hit per destination.
- **Progress UI.** Top-bar indexing status polished: neutral status copy, subtle blue progress strip, violet chip accent—and a green **Done!** that holds (then fades) so you actually see the finish line.
- **Reset index.** Confirmation and success messages spell out that you should **reload the SEQTA tab** so the index can rebuild cleanly.

## [3.6.4] - prior

See in-app What’s New (Settings) for notes on DM folders, theme flavours, upcoming assessments, and BS Cloud themes.
