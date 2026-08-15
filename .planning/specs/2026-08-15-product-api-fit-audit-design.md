# EZ Web Audio Product and API Fit Audit

- **Status:** Approved design; execution not yet authorized
- **Date:** 2026-08-15
- **Tracking:** `ez-audio-1hk`
- **Scope:** Product contract, holistic research and code review, human and LLM evaluation, and roadmap decision gates

## Executive decision

EZ Web Audio should be the easiest credible choice for an experienced frontend developer who is new to audio, while remaining a sound foundation for increasingly expressive and musically useful work.

The library's entry point is practical application audio: interface sounds, overlapping playback, ambient or background audio, global controls, mobile/browser lifecycle, and framework cleanup. Effects, analysis, synthesis, and musical timing form a progression from that foundation. They are not separate audiences or independent collections of features.

An LLM acting as a research, implementation, and debugging intermediary is a default user of the product surface. EZ will not create a separate toy API for agents. The human API should instead be low-entropy: one canonical path, explicit ownership, predictable state, actionable failures, trustworthy examples, and mechanically verifiable documentation.

Before further feature expansion, breaking API decisions, positioning changes, or a public release, the project will run Workstream 0: an extensive but holistic product/API fit audit. Its findings may supersede existing roadmap assumptions. The audit diagnoses and recommends; it does not implement fixes.

## Why this work exists

The current project demonstrates unusual breadth, but breadth alone does not establish product value. A three-line playback example can be syntactic convenience while real applications still own the hardest browser, loading, routing, concurrency, and cleanup problems. Conversely, advanced synthesis and timing features are valuable only if developers can reach them without abandoning the objects and mental model used for simple playback.

The audit must therefore determine whether EZ owns meaningful developer friction rather than merely shortening native Web Audio syntax or supporting an impressive demo application.

It must also test an emerging distribution reality: developers increasingly ask an LLM which library to use and then ask the same model to implement it. The product must be discoverable, correctly classifiable, difficult to misuse, and recoverable after predictable mistakes.

## Product contract

### Primary human audience

The primary human user is an experienced JavaScript or TypeScript frontend developer who is new to audio. They understand components, state, async work, and application architecture, but should not need deep knowledge of `AudioContext`, graph construction, browser activation policies, mobile interruptions, buffer-source lifetimes, or sample-accurate scheduling to ship a sound-rich application.

Beginners benefit from the same path, but the product should not achieve beginner friendliness by removing the architectural information an ambitious developer will later need.

### LLM audience

The LLM is an intermediary serving the human user in three roles:

1. **Researcher:** decide whether EZ fits a described project.
2. **Implementer:** generate correct code using the canonical public API.
3. **Debugger:** interpret failures and repair lifecycle, ownership, or composition mistakes.

LLM recommendation frequency, generated-code correctness, and repair quality are distinct metrics. A discoverability failure is not automatically an API failure.

### North-star project

The product must support an application with:

- roughly twenty interface sounds;
- overlapping playback;
- ambient or background audio;
- persisted volume and mute preferences;
- route or component cleanup;
- mobile suspend, interruption, and resume behavior;
- later addition of effects, visualization or analysis, synthesis, and musical timing.

The original application architecture should survive that progression. If adding an analyzer or transport requires replacing the simple playback layer, the progressive contract has failed.

### Four product layers

#### Layer 1: Audio foundation

Own browser activation and recovery, session state, loading strategy, decoded-resource caching, streaming capability, application-wide routing, volume and mute, ownership, and disposal.

#### Layer 2: Application playback

Provide one-shots, overlapping instances, longer streamed tracks, sprites, seeking, fades, collections, and framework lifecycle integration.

#### Layer 3: Expressive audio

Compose effects, routing, analysis, layering, modulation, and synthesis with the same foundation and ownership model.

#### Layer 4: Musical systems

Add transport, sequencing, beats, polyphony, sampling, soundfonts, and granular synthesis only when the project needs musical time or instruments.

Layers may depend inward only. Playback users must be able to ignore musical systems, and advancement must compose existing objects rather than establish a parallel architecture.

### Governing rules

1. Common intent has one canonical path.
2. Escape hatches expose native Web Audio without making it a prerequisite.
3. Convenience means owning browser and application lifecycle complexity, not minimizing characters.
4. Advanced features do not compensate for a weak foundation.
5. No additional advanced feature work proceeds until Workstream 0 has evaluated the foundation.
6. LLM first-pass success and repairability are release signals.
7. Findings from Workstream 0 may override existing milestone and feature assumptions.

## Intent-bound audio activation

### The distinction

Web Audio activation must originate from an eligible user interaction. It does not follow that a user should explicitly initialize an audio engine before using an audio feature.

The product must distinguish:

1. **Construction:** create sessions and audio objects; safe before interaction.
2. **Preparation:** load resources and prepare the graph; generally asynchronous.
3. **Activation:** satisfy browser policy from an intent-bearing interaction.

Activation is normally a precondition handled by the action the user already intended to perform. A click on Play, a musical pad, or a control that enables sound should acquire activation and perform or preserve that action. The default user journey must not add an infrastructure-themed initialization gate.

### Canonical behavior

When a common action such as `play()`, `trigger()`, or `start()` is invoked from an eligible interaction, the library should synchronously acquire activation before crossing an asynchronous boundary. If the resource is not yet ready, the requested action should be queued or otherwise preserved after activation rather than requiring another click.

Public state may expose locked, active, suspended, interrupted, and closed conditions for diagnostics and exceptional UX. Those conditions should not dictate the application's labels or force a generic “Initialize AudioContext” screen.

An explicit activation method may remain for exceptional workflows:

- entering an immersive experience with sound;
- intentionally pre-warming a latency-sensitive engine;
- requesting microphone or device permissions;
- integrating with a host that owns the context.

Even in those cases, the UI should describe the user's decision, such as “Enter with sound,” rather than the browser primitive.

### LLM failure to prevent

During demo development, generated examples consistently inserted an uninitialized UI and a dedicated initialization button even when the example's first audio action could satisfy activation. This is high-confidence first-party evidence of a systematic model prior: the model overstates a correct browser rule into an incorrect UX rule.

Intent-bound activation is therefore a first-class API and evaluation requirement. A generic initialization panel is a scored failure unless the scenario contains a real reason for explicit activation.

> Infrastructure state belongs in diagnostics. User intent belongs in the interface.

## Desired semantic API shape

The following are responsibilities to audit, not approved class names or a predetermined rewrite.

| Semantic concept | Responsibility |
| --- | --- |
| Session | Activation, interruption recovery, global routing, volume, mute, application state, and top-level disposal |
| Audio resource | Reusable media being loaded, buffered, decoded, cached, or streamed |
| Playback | One active occurrence with pause, stop, seek, fade, completion, and failure state |
| Scope | Ownership boundary for a component, route, scene, or feature |
| Graph capability | Effects, routing, analysis, synthesis, and native-node interoperation |
| Musical clock | Transport, beats, sequencing, and synchronization when explicitly requested |

The audit must determine which existing objects already fulfill these roles, which roles are fragmented, and which roles are unnecessary. It must not assume the answer is necessarily a class named `AudioManager`, a registry, or a breaking session API.

### Required semantic distinctions

- A reusable sound is not one active playback of that sound.
- Application-wide state must not depend on whichever object initialized first.
- Buffered clips and streamed media are different operating modes even when controls overlap.
- Cleanup belongs to an ownership boundary, not scattered manual calls.
- Musical timing is optional and must not be required for application playback.

### Canonical intentions

The API, types, examples, and errors should converge on one recommended path for:

- starting application audio;
- declaring or loading a sound;
- playing overlapping instances;
- streaming longer media;
- controlling one playback;
- controlling all application audio;
- disposing a route or component;
- recovering from browser suspension;
- attaching an effect or analyzer;
- graduating into musical timing.

Alternative forms may exist, but they must be clearly secondary. Multiple plausible patterns increase both human uncertainty and LLM hallucination.

### Inspectable state and capability

The public contract should make the following inspectable where relevant:

- lifecycle state: locked, starting, running, suspended, interrupted, or closed;
- resource state: idle, loading, ready, failed, or disposed;
- playback state: scheduled, playing, paused, stopped, completed, or failed;
- loading strategy: buffered or streamed;
- ownership: the session or scope responsible for an object;
- capability: whether seek, effects, analysis, or precise scheduling applies;
- cleanup: what disposal affects and whether it is idempotent.

Ambiguous overloads, positional booleans, context-sensitive strings, and invisible global behavior should receive special scrutiny.

### Recoverable errors

Expected failures should expose:

- a stable code;
- relevant current state;
- attempted operation;
- likely browser or lifecycle cause;
- concise recovery action;
- stable documentation anchor.

An activation failure should direct the developer to repeat the intended action from an eligible interaction or use the documented exceptional activation flow. It should not generically prescribe an initialization screen. A coding agent should be able to repair an ordinary failure from the error, public types, and linked documentation without reading implementation internals.

### Progressive documentation

Documentation should offer three levels:

1. Complete, minimal, production-valid canonical recipes.
2. Conceptual documentation for lifecycle, ownership, loading, concurrency, and timing.
3. Full reference material and native Web Audio escape hatches.

React and Vue adapters should adapt lifecycle and reactivity while preserving core audio semantics. They should not create framework-specific mental models.

### Agent-readable public surface

Agent support must extend beyond `llms.txt`:

- package version, documentation version, examples, and structured metadata should derive from one source of truth;
- a library-selection page should explain when to choose EZ and when another approach is more appropriate;
- every canonical example should type-check in CI and import only public entry points;
- stable headings and documentation anchors should make concepts and recovery guidance directly retrievable;
- the generated API reference should reflect the types that actually ship;
- an agent-readable index should route to concepts, recipes, compatibility constraints, and migration guidance;
- comparison pages should explain jobs and tradeoffs rather than present a marketing feature checklist;
- deprecated patterns should be labeled strongly enough that retrieval does not revive them as recommended usage.

`llms.txt` is a routing layer into trustworthy material, not a substitute for trustworthy material or baseline product awareness.

## Workstream 0: holistic product/API fit audit

### Goal

Workstream 0 decides what EZ should own, what friction it demonstrably removes, and where its feature or API shape fails the product contract. It is deeper than the preliminary assessment but remains at the product, workflow, and system-boundary level.

It does not optimize individual functions, conduct a style audit, or implement recommendations.

### Primary questions

1. Does EZ own the difficult parts of shipping audio in a real application?
2. Is its simple path materially easier than native Web Audio and relevant alternatives?
3. Can developers grow from playback into expressive and musical work without replacement?
4. Can current LLMs discover, select, implement, and debug the library?
5. Which existing features strengthen the journey, distract from it, or hide a missing foundation?

### Evidence streams

#### External developer reality

Build a cited corpus from recent primary sources: standards and browser documentation, issue trackers, library documentation, discussions, and representative public projects. Include native Web Audio, Howler, Tone, Pixi Sound, and other alternatives that emerge from the research.

Research continues until thematic saturation: two consecutive collection batches introduce no new high-confidence friction category. As a floor rather than a quota, the corpus should contain at least thirty qualifying primary-source observations across at least four ecosystems in addition to official browser documentation. No single project's issue tracker should dominate the evidence.

Cluster observations by job-to-be-done and failure mode, including activation, mobile recovery, loading, caching, streaming, concurrency, route ownership, global controls, framework lifecycle, timing, analysis, and migration into advanced work.

Every synthesis must carry a confidence label:

- **Demonstrated:** repeated direct evidence across sources or reproducible behavior.
- **Probable:** multiple aligned signals without sufficient reproduction.
- **Possible:** credible isolated evidence that needs validation.
- **Unknown:** strategically important but unsupported by current evidence.

Issue trackers are biased toward failure. The audit must distinguish frequency of reports from prevalence among all users.

#### Current product reality

Map every public API area onto the four product layers and trace the north-star journey across core, React, Vue, docs, examples, package metadata, browser behavior, and distribution.

Review system boundaries rather than isolated functions:

1. Session lifecycle and intent-bound activation.
2. Loading, decoding, caching, and streaming.
3. Resource identity, playback instances, and concurrency.
4. Ownership, global routing, volume, mute, and disposal.
5. React/Vue lifecycle, state, and semantic parity with core.
6. Effects, analysis, synthesis, timing, and progressive composition.
7. Types, errors, examples, packaging, documentation deployment, and agent retrieval.

Review historical findings to identify recurring structural problems, resolved problems, and assumptions that escaped prior code-quality reviews because they were product questions rather than correctness bugs.

#### Human black-box journeys

Create disposable evaluation fixtures in vanilla TypeScript, React, and Vue. These are not showcase applications. Each implements the north-star scenario and then adds an effect, analyzer, synthesis feature, or musical clock to measure architectural continuity.

Compare representative journeys against native Web Audio and appropriate alternatives. Measure:

- concepts the developer must understand;
- lifecycle code the application must own;
- loading and cleanup burden;
- error recovery;
- behavior across navigation and mobile interruption;
- architectural changes needed to add advanced capabilities.

Code-line count is contextual evidence, not the success metric.

#### LLM black-box journeys

Test current coding-model families in four conditions:

1. **Unseeded recommendation:** choose a library from a project description.
2. **Package-aware implementation:** use EZ with only ordinary package-level knowledge.
3. **Documentation-seeded implementation:** use the README and agent-readable docs.
4. **Repair and graduation:** diagnose an intentional failure, then extend the application.

Score public-symbol accuracy, type-check success, browser behavior, activation correctness, cleanup, unnecessary complexity, architectural continuity, and one-attempt repair success.

Model failures must be classified as:

- API ambiguity;
- contradictory or missing documentation;
- retrieval/discoverability failure;
- model behavior the library cannot reasonably eliminate.

Only the first three automatically create product work.

## Executable evaluation contract

### Canonical tasks

1. Play an interface sound from a button.
2. Support overlapping instances of the same sound.
3. Stream and control background music.
4. Persist global volume and mute.
5. Activate and resume audio correctly.
6. Clean up audio during React and Vue navigation.
7. Add an effect and a live analyzer without rewriting playback.
8. Add a timed musical feature to the existing application.
9. Diagnose an intentionally broken lifecycle implementation.
10. Choose between EZ, native Web Audio, Howler, and Tone for a described project.

### Intent-bound activation adversarial task

Prompts should explicitly mention browser autoplay restrictions to activate the model's learned prior. The result fails when it adds a generic initialization gate to a workflow whose first audio-intent action can acquire activation.

The evaluation must also verify that:

- activation remains synchronous when loading is asynchronous;
- React and Vue implementations do not defer activation into effects, watchers, or promise continuations;
- the model can identify which interaction satisfies activation and explain why;
- documentation-seeded trials improve the behavior rather than reinforce the anti-pattern.

### Repetition and baselines

Critical tasks must run multiple independent trials across several current coding-model families. A single successful generation is anecdotal. Exact models, trial counts, and paid-call cost require an execution-time proposal and consent.

Stage 1 must preregister the numeric success thresholds, critical-task subset, repetition count, scoring rubric, and allowed repair context before model trials begin. The final review may explain why a threshold was poorly chosen, but it may not silently move a threshold after seeing results.

Where comparison is meaningful, the same task and scoring rubric should be used for EZ and alternatives. Comparisons must account for differing product scope rather than treating all libraries as interchangeable.

### Agent-ready release signals

- Documentation-seeded generations meet the preregistered canonical-path selection threshold.
- Fabricated public symbols remain below the preregistered failure ceiling and are identifiable.
- First-pass type-check success meets the preregistered threshold.
- One-attempt repair success meets the preregistered threshold for ordinary errors.
- Lifecycle-sensitive tasks pass browser tests, not compilation alone.
- Advanced additions preserve the original application structure.

Unseeded recommendation frequency is tracked separately as an acquisition metric. The initial product priority is correct classification and use once the model encounters EZ.

## Audit execution stages

### Stage 1: Orientation and baseline capture

Record the current product promises, API map, roadmap assumptions, historical reviews, examples, public metadata, and unchanged human/LLM behavior. Treat existing decisions as evidence, not immutable conclusions.

### Stage 2: External friction research

Build and code the primary-source corpus before drawing architecture conclusions. Separate developer jobs, observed friction, competitor ownership, and evidence confidence.

### Stage 3: Holistic product and code review

Use independent system-level lenses:

1. lifecycle and intent-bound activation;
2. resources, streaming, caching, playback, and concurrency;
3. ownership, routing, global controls, and disposal;
4. framework lifecycle, reactivity, and parity;
5. progressive composition across expressive and musical layers;
6. API legibility, types, examples, metadata, and agent retrieval.

Reviewers must identify structural causes rather than produce a flat list of symptoms. Critical and high-impact findings require primary-agent verification. Genuine tradeoffs receive opposing analyses before synthesis.

### Stage 4: Comparative journey tests

Build the disposable vanilla, React, and Vue fixtures, run browser-sensitive scenarios, and compare representative journeys with relevant alternatives.

### Stage 5: LLM evaluation

Run the recommendation, implementation, adversarial activation, repair, and graduation matrix. Preserve prompts, retrieved context, generated output, build/runtime results, classifications, and costs so results are reproducible.

### Stage 6: Synthesis and validation

Convert evidence into explicit product decisions, verify high-impact conclusions, and route unsupported assumptions into target-user validation. Present all findings at a user checkpoint before finalizing the report. Do not continue into fixes in the audit session.

## Decision gates

| Gate | Passing condition |
| --- | --- |
| Foundation | The north-star application ships reliably across ordinary browser, mobile, navigation, and framework lifecycle conditions. |
| Convenience | The simple path removes meaningful lifecycle responsibility or concepts, not merely syntax. |
| Continuity | Advanced capabilities compose with the original objects and mental model. |
| Agent legibility | Multiple LLMs identify the canonical path, generate valid code, and repair predictable failures. |
| Product credibility | Package metadata, versions, documentation, examples, and public promises consistently describe the shipped product. |

A finding is blocking when it demonstrates that:

- a common north-star flow cannot ship reliably;
- graduation forces architectural replacement;
- a public promise materially exceeds implementation;
- multiple models fail the same canonical task for an API- or documentation-caused reason.

Popularity, weak search visibility, and missing third-party mentions are acquisition findings unless they reveal a product-positioning contradiction.

## Finding and recommendation taxonomy

Each finding must state its evidence, confidence, affected journey, violated gate, structural cause, and recommended product decision.

Recommendation classes are:

- **Keep and emphasize:** demonstrated differentiation serving the product contract.
- **Keep but reposition:** useful capability presented at the wrong layer or prominence.
- **Deepen:** correct abstraction with missing operational ownership.
- **Redesign before 1.0:** structural API shape that will become expensive to preserve.
- **Deprecate or remove:** surface area that fragments the canonical path.
- **Add foundation:** missing capability required by the north-star journey.
- **Validate with developers:** strategically important hypothesis the evidence cannot settle.

The audit must also produce a “do not build” list. Feature breadth is not the default remedy.

## Human validation

Target-user validation involves experienced frontend developers who are new to audio. Observational tasks should test whether they can:

- select EZ for an appropriate project;
- ship the basic north-star flow from canonical documentation;
- reason about resources versus playback instances;
- clean up a route or component;
- recover from activation or interruption failure;
- add one advanced capability without rebuilding.

Clear reproducible lifecycle defects do not wait for interviews. Large breaking changes, repositioning decisions, or removal of apparently valuable features should be supported by observed user evidence when the research and black-box tests remain ambiguous.

Recruitment, external outreach, incentives, and any paid research require separate authorization.

## Deliverables

Workstream 0 produces:

1. A cited product/API fit report under `.planning/reviews/`.
2. A four-layer public API and responsibility map.
3. A jobs-to-be-done and friction evidence appendix.
4. Competitive ownership comparisons based on workflows and tradeoffs.
5. Reusable human and LLM evaluation fixtures and scorecards.
6. Reproducible LLM prompts, retrieved context, outputs, and failure classifications.
7. A prioritized product decision register.
8. A roadmap recommendation split into foundation, API, documentation, acquisition, and validation work.
9. A “do not build” list.
10. An interview or observational-test plan for unresolved questions.

The full report becomes the source of truth for subsequent planning. Each implementation grouping should consume only its relevant findings rather than the complete audit context.

## Seed hypotheses to verify

These observations motivated the audit but are not final findings:

| Hypothesis | Preliminary signal | Required verification |
| --- | --- | --- |
| Intent activation is not first-class enough for LLMs | Repeated demo-generation behavior despite attempts to correct it | Adversarial multi-model evaluation plus public API/docs trace |
| Longer media lacks a true streaming path | Current `Track` URL flow appears to fetch and decode the full resource | Code-path verification and comparative journey test |
| Preload may cache responses rather than decoded resources | Current cache and creation paths appear to permit repeat decoding | Runtime instrumentation and resource-lifecycle review |
| Global controls may not own all session audio consistently | Master routing appears sensitive to object creation order | Graph inspection and north-star global-control fixture |
| Framework bindings still expose manual ownership gaps | Some wrapper cleanup depends on explicit registration or polling | React/Vue navigation fixtures and semantic-parity review |
| Public messaging foregrounds brevity and breadth over operational ownership | Homepage and roadmap emphasize three-line playback and feature coverage | Positioning comparison against research-backed jobs |
| Agent-readable docs improve ingestion but not baseline recommendation | Existing `llms.txt` work focuses on document aggregation | Unseeded versus documentation-seeded evaluation |
| Public version signals may be inconsistent | Package, docs metadata, and release history require reconciliation | Built-site, npm, package, and structured-data verification |

The audit must be willing to refute these hypotheses.

## Relationship to existing decisions and roadmap

Existing decisions remain historical context, but Workstream 0 reopens their premises when they affect the product contract. In particular:

- “No central AudioManager/registry” does not prevent auditing whether session-level responsibilities are missing. The audit must recommend the smallest coherent ownership model and may reaffirm the decision.
- Optional `initAudio()` and lazy context creation remain current behavior, but intent-bound activation becomes the standard against which their semantics, examples, and necessity are evaluated.
- Multiple-`AudioContext` support remains an advanced escape hatch. It must not distort the default application path.
- Existing `llms.txt` support remains useful retrieval infrastructure but is insufficient evidence of LLM readiness.
- Existing React and Vue bindings are evaluated as part of the common product model, not assumed correct because they have shipped internally.

Workstream 0 precedes the remaining advanced showcase and release/announcement work. Existing human listening and UAT may continue as baseline evidence, but the groovebox showcase, additional advanced features, API-breaking work, release positioning, and announcement decisions should wait for the audit's product recommendations.

## Scope boundaries

The audit does not:

- implement API changes;
- fix individual defects during review;
- optimize style or internal code organization without product impact;
- create a new showcase application;
- assume a central manager, registry, or session class is required;
- assume all current features must be retained;
- treat LLM preference as more important than human product quality;
- conduct paid model calls or contact external developers without approval.

## Execution governance

The deep review requires independent lenses, evidence-backed synthesis, verification of critical and high findings, structural-pattern analysis, and a mandatory user checkpoint. It ends at a durable report and cannot automatically execute fixes.

Before multi-agent dispatch, present for explicit consent:

- expected reviewer and verification agent count;
- model mix and reasoning tiers;
- estimated token range;
- any paid model-evaluation cost;
- which work remains local and read-only;
- expected artifacts and checkpoint timing.

Mechanical fetching, extraction, deduplication, and verification should use cheaper capable models. Stronger reasoning is reserved for holistic architecture lenses, genuine debates, and final synthesis. No fan-out should silently inherit the session model.

## Completion criteria

The design is successfully executed when:

1. All four evidence streams have been collected and cited.
2. The north-star scenario has been exercised in vanilla TypeScript, React, and Vue.
3. Relevant alternatives have been compared on responsibility and workflow, not feature count.
4. The LLM evaluation includes recommendation, implementation, intent-activation, repair, and graduation tasks with repeated trials.
5. Every blocking finding is independently verified and tied to a product gate.
6. Findings clearly separate API, documentation, acquisition, and irreducible model behavior.
7. The report makes explicit keep, deepen, redesign, remove, add, validate, and do-not-build decisions.
8. The user has reviewed the findings and approved the final report contents.
9. No fixes have been implemented during the audit.

## Next boundary

After this specification is reviewed, create a detailed execution plan for Workstream 0. That plan must include the multi-agent consent checkpoint before dispatch and must preserve the hard boundary between audit findings and implementation work.
