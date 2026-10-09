# Cobertura dos 77 provedores

Revisão original: `73e210f10fc98b5e097fd0ee8c021f9965327ebe`. O catálogo exclui a extensão personalizada, que é uma opção adicional.

**Todos têm parser e caminho de consulta implementados. Nenhuma conta real dos 77 serviços foi usada para comprovar autenticação ou disponibilidade da API.** “Implementado” indica existência do código, não certificação pelo provedor. CLI, permissões, planos e mudanças dos endpoints podem impedir a consulta.

Todos aceitam importação alternativa de uma resposta JSON no formato do parser; alguns parsers especializados exigem envoltório específico, descrito no código. Leituras importadas têm a data de modificação do arquivo.

| Provedor | Conexão implementada | Login local opcional | Contrato de origem |
|---|---|---|---|
| Claude Code | API com token inserido ou login local | Sim | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/ClaudeCodeUsageService.swift) |
| Codex | API com token inserido ou login local | Sim | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/CodexUsageService.swift) |
| Kiro | CLI autenticado | Sim | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/KiroUsageService.swift) |
| Antigravity | Servidor local do cliente | Sim | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/AntigravityUsageService.swift) |
| Cursor | API com token inserido ou login local | Sim | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/CursorUsageService.swift) |
| OpenCode Go | API com token inserido ou login local | Sim | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/OpenCodeGoUsageService.swift) |
| Kimi Code | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/KimiCodeUsageService.swift) |
| Ollama Cloud | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/OllamaCloudUsageService.swift) |
| z.ai | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/ZaiUsageService.swift) |
| Zhipu | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Usage/UsageProvider.swift) |
| MiniMax | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/MinimaxUsageService.swift) |
| MiniMax CN | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Usage/UsageProvider.swift) |
| GitHub Copilot | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/CopilotUsageService.swift) |
| Grok | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/GrokUsageService.swift) |
| Grok Bot | Sessão web (Cookie inserido) | Sim | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/GrokBotUsageService.swift) |
| Volcengine | CLI ou API assinada | Sim | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/VolcengineUsageService.swift) |
| Command Code | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/CommandCodeUsageService.swift) |
| DeepSeek | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/DeepSeekUsageService.swift) |
| Devin | Sessão (JSON inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/DevinUsageService.swift) |
| Xiaomi Coding Plan | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/XiaomiMiMoUsageService.swift) |
| sub2api | API do gateway | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Sub2apiUsageService.swift) |
| New API | API do gateway | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/NewAPIUsageService.swift) |
| V2EX | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/V2exUsageService.swift) |
| Qoder | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/QoderUsageService.swift) |
| StepFun | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/StepFunUsageService.swift) |
| ClinePass | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/ClinePassUsageService.swift) |
| Alibaba Coding Plan | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/AlibabaCodingPlanUsageService.swift) |
| Alibaba Token Plan | CLI autenticado | Sim | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/AlibabaTokenPlanUsageService.swift) |
| Qwen Cloud | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/QwenCloudUsageService.swift) |
| Factory | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/FactoryUsageService.swift) |
| Gemini | API com token inserido ou login local | Sim | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/GeminiUsageService.swift) |
| Kilo Code | API com token inserido ou login local | Sim | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/KiloCodeUsageService.swift) |
| Augment Code | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/AugmentUsageService.swift) |
| JetBrains AI | Arquivo local da IDE | Sim | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/JetBrainsAIUsageService.swift) |
| T3 Chat | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/T3ChatUsageService.swift) |
| Synthetic | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/SyntheticUsageService.swift) |
| ElevenLabs | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/ElevenLabsUsageService.swift) |
| Warp | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/WarpUsageService.swift) |
| Windsurf | Sessão (JSON inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/WindsurfUsageService.swift) |
| Bifrost | API do gateway | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/BifrostUsageService.swift) |
| Chutes | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/ChutesUsageService.swift) |
| LongCat | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/LongCatUsageService.swift) |
| ZoomMate | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/ZoomMateUsageService.swift) |
| Notion AI | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/NotionAIUsageService.swift) |
| IBM Bob | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/IbmBobUsageService.swift) |
| Nous Portal | API com token inserido ou login local | Sim | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/NousPortalUsageService.swift) |
| Raycast AI | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/RaycastAIUsageService.swift) |
| GitKraken AI | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/GitKrakenUsageService.swift) |
| xKiro | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/XKiroUsageService.swift) |
| Abacus AI | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/AbacusUsageService.swift) |
| Moonshot | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/MoonshotUsageService.swift) |
| Hyper | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/HyperUsageService.swift) |
| Atlas Cloud | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/AtlasCloudUsageService.swift) |
| Poe | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/PoeUsageService.swift) |
| Venice | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/VeniceUsageService.swift) |
| OpenAI API | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/OpenAIPlatformUsageService.swift) |
| Amp | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/AmpUsageService.swift) |
| Zed | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/ZedUsageService.swift) |
| Sakana AI | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/SakanaUsageService.swift) |
| Mistral | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/MistralUsageService.swift) |
| Codebuff | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/CodebuffUsageService.swift) |
| LLM API Key Proxy | API do gateway | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/LlmProxyUsageService.swift) |
| LiteLLM | API do gateway | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/LiteLLMUsageService.swift) |
| Aixy | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/AixyUsageService.swift) |
| Neuralwatt | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/NeuralwattUsageService.swift) |
| ClawRouter | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/ClawRouterUsageService.swift) |
| ZenMux | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/ZenMuxUsageService.swift) |
| v0 | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/V0UsageService.swift) |
| DevPass | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/DevPassUsageService.swift) |
| Perplexity | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/PerplexityUsageService.swift) |
| Manus | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/ManusUsageService.swift) |
| Hugging Face | API com token inserido ou login local | Sim | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/HuggingFaceUsageService.swift) |
| DeepInfra | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/DeepInfraUsageService.swift) |
| xAI API | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/XaiAPIUsageService.swift) |
| Replicate | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/ReplicateUsageService.swift) |
| TypeSafe | Sessão web (Cookie inserido) | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/TypeSafeUsageService.swift) |
| Vercel AI Gateway | API com token/chave inserido | Não | [Fonte](https://github.com/qunqin24/Pulse/blob/73e210f10fc98b5e097fd0ee8c021f9965327ebe/Sources/Pulse/Providers/Profiled/VercelAIGatewayUsageService.swift) |

As instruções por tipo de credencial e os requisitos especiais estão no [README](README.md). Os arquivos de teste mantêm as fixtures e os casos verificados. A cobertura dos parsers não substitui uma verificação de rede com a conta do usuário.
