# API Responsibility Map

This is an audit map, not a proposed replacement API. Populate observed symbols and evidence links as the review establishes responsibility boundaries.

| Product layer | Semantic responsibility | Audit questions | Observed symbols / evidence |
| --- | --- | --- | --- |
| foundation | Session activation, interruption recovery, global routing, volume, mute, application state, top-level disposal | Is browser lifecycle owned without a generic initialization screen? | Pending audit |
| foundation | Audio resource loading, decoding, caching, and streaming | Are buffered and streamed modes explicit and inspectable? | Pending audit |
| application playback | Reusable resource and active playback occurrence | Can users control overlapping instances independently? | Pending audit |
| application playback | Scope ownership and route/component cleanup | Does cleanup belong to a boundary and remain idempotent? | Pending audit |
| expressive audio | Effects, routing, analysis, synthesis, and native-node interoperation | Do advanced capabilities compose with the foundation? | Pending audit |
| musical systems | Transport, beats, sequencing, and synchronization | Is musical time optional for application playback? | Pending audit |
| acquisition | Package, docs, examples, metadata, and discoverability | Can humans and LLMs find one canonical public path? | Pending audit |
