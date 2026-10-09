# Configurar contas no Neo

Este guia acompanha o Neo 0.3.1. Os 77 conectores e suas fontes estão em [PROVEDORES.md](../PROVEDORES.md). O acesso real depende das permissões, do plano e dos endpoints disponíveis no serviço.

## Adicionar ou editar uma conta

1. Use a busca lateral para encontrar o provedor, ou abra **Adicionar provedor**.
2. Clique em **Adicionar…**. Escolha um nome e mantenha **Monitorar esta conta** habilitado.
3. Configure a origem conforme os exemplos abaixo e clique em **Salvar conexão**.
4. Clique em **Atualizar** na página da conta ou em **Rede e atualização**.
5. Confira a última leitura e a mensagem de conexão. Se houver mais de um limite, você pode fixar o limite principal da faixa em **Configurar…**.

Para editar uma conta, abra sua página e clique em **Configurar…**. Deixar o campo de credencial vazio mantém a credencial anterior. A opção **Remover a credencial salva** apaga somente a credencial daquela conta. Desabilitar o monitoramento pausa a consulta; **Excluir conta** remove a configuração.

**Prioridade das origens:** uma resposta JSON local selecionada substitui a consulta de rede. Sem esse arquivo, uma credencial inserida tem prioridade sobre o login local. Para voltar a usar o login local, remova a credencial salva, limpe o arquivo selecionado e habilite a opção de login local.

## Codex

**Login existente no computador:** autentique o cliente Codex e marque **Usar login local quando nenhuma credencial for inserida**. O Neo procura `auth.json` em `CODEX_HOME`, quando definido, ou em `%USERPROFILE%\.codex`.

**Outra conta:** insira o token OAuth aceito pelo serviço e o **ID da conta ChatGPT** nos campos da conexão. Uma chave pública de API OpenAI não substitui automaticamente o login de uma conta ChatGPT para cotas do Codex.

O Neo não renova o login. Quando o token expirar, autentique novamente o cliente de origem ou substitua a credencial. As métricas exibidas dependem do plano e da resposta recebida.

## Claude Code

Autentique o cliente Claude Code e habilite o login local. A leitura usa `.credentials.json` em `CLAUDE_CONFIG_DIR`, quando definido, ou em `%USERPROFILE%\.claude`.

Para outra conta, insira o token OAuth aceito pelo serviço. Quando houver expiração, abra o Claude Code e renove o login nele. O Neo não realiza essa renovação por conta própria.

## Cursor e Grok Bot

Com Cursor autenticado, o login local lê somente `cursorAuth/accessToken` no SQLite `%APPDATA%\Cursor\User\globalStorage\state.vscdb`, em modo de leitura.

Para uma conexão manual, o adaptador aceita um JWT ou o Cookie `WorkosCursorSessionToken` da sua própria sessão. Remova uma credencial anterior para usar novamente o login local. Cotas de uma conta individual e de uma equipe podem ter estruturas diferentes.

## GitHub Copilot

Insira um token OAuth GitHub aceito pelo endpoint de cotas do Copilot. Um PAT genérico pode não ser aceito. O Neo 0.3.1 não possui login próprio por código de dispositivo.

Se houver recusa de acesso, confirme o produto e o tipo de token em uso; adicionar permissões a um PAT não garante compatibilidade com o endpoint interno.

## Kimi Code, DeepSeek e serviços de API

Insira a chave do produto correspondente. **Kimi Code** consulta cotas do plano Coding; **DeepSeek** informa saldo monetário, sem necessariamente fornecer um percentual de utilização.

Para os demais serviços, siga a ajuda exibida na janela de conexão e consulte o catálogo. Uma assinatura de chat e uma conta de API do mesmo fornecedor podem ter credenciais e métricas distintas. Alguns conectores usam tokens de sessão do cliente, em vez de chaves públicas de API.

## Serviços por Cookie

Insira o cabeçalho Cookie da sua própria sessão quando a conexão pedir **Cookie da sessão**. O Neo não extrai automaticamente Cookies do Chrome ou Edge. Sessões expiradas precisam ser substituídas manualmente.

A credencial é enviada ao domínio definido no conector; redirecionamentos de consulta são recusados para evitar transferir a credencial a outro destino. Uma resposta HTML de login geralmente indica sessão expirada ou uma rota que mudou.

## Windsurf, Devin e xAI API

| Provedor | Formato esperado |
| --- | --- |
| **Windsurf** | JSON com `devin_session_token`, `devin_auth1_token`, `devin_account_id` e `devin_primary_org_id` da sua sessão. |
| **Devin** | JSON com `token` e `organizationId`. |
| **xAI API** | `TeamID:ManagementKey`, usando a chave de gerenciamento da equipe. |

Insira esses dados somente no campo de credencial da conexão. Não coloque valores reais em arquivos de exemplo, issues ou pull requests.

## Ferramentas locais e CLIs

| Provedor | Preparação |
| --- | --- |
| **Kiro** | `kiro-cli` no `PATH`, autenticado e com suporte ACP. O adaptador abre o helper, consulta o uso e o encerra. A disponibilidade do CLI no Windows precisa ser verificada no seu ambiente. |
| **Alibaba Token Plan** | CLI `bl` no `PATH`, autenticado. O conector consulta o uso de `token-plan`. |
| **Volcengine** | CLI `arkcli` autenticado; alternativamente, credencial JSON com `accessKeyID` e `secretAccessKey` para requisições assinadas em `cn-beijing`. |
| **Antigravity** | Aplicativo aberto e login local habilitado. A consulta usa o servidor `language_server` do usuário atual, somente em `127.0.0.1`. |
| **JetBrains AI** | IDE autenticada com AI Assistant. O Neo lê o `options/AIAssistantQuotaManager2.xml` mais recente em `%APPDATA%\JetBrains` ou `%APPDATA%\Google`, sem requisição externa. |

Outros conectores com login local opcional aparecem identificados no [catálogo](../PROVEDORES.md). Confira se os arquivos ou clientes que eles procuram existem no seu ambiente.

## Gateways

**Bifrost, LiteLLM, LLM API Key Proxy, sub2api e New API** exigem o endereço do seu servidor e a credencial apropriada.

1. Preencha **Endereço do gateway**, por exemplo, `https://gateway.sua-equipe.example`.
2. Insira a credencial aceita por essa instalação.
3. Salve e atualize a conexão.

Use HTTPS em servidores remotos. HTTP é permitido apenas no loopback local, como `http://127.0.0.1:4000`. O conector consulta as rotas de uso do produto; um endpoint compatível com geração de texto não garante que as rotas de cotas estejam disponíveis.

## Importar uma resposta JSON

Todos os provedores aceitam **Resposta JSON local** como origem alternativa. Selecione um arquivo exportado ou produzido por seu coletor, no formato aceito pelo parser daquele serviço.

- O arquivo substitui a rede para aquela conta, mesmo que exista uma credencial salva.
- O horário da leitura é a data de modificação do arquivo.
- Um arquivo com mais de dez minutos aparece como uma leitura antiga.
- Respostas HTML, Protobuf ou JSONL precisam ser convertidas para a estrutura esperada pelo parser.
- Os formatos de referência estão em [test/fixtures](../test/fixtures), [src/profiles.cjs](../src/profiles.cjs) e [src/special.cjs](../src/special.cjs).

Para dados com um formato genérico definido por você, prefira **Extensão local**. Veja o exemplo em [Extensão por JSON](../README.md#extensão-por-json).

## Entender o resultado

**Percentual usado** representa a utilização informada ou calculada a partir dos campos do serviço. **Percentual restante** é a opção de apresentação complementar. **Saldo** é mostrado na unidade ou moeda fornecida pelo provedor, sem criar um limite percentual artificial.

**Renovação** aparece quando a resposta contém uma data válida. **Esgotamento** não é presumido apenas porque um número alcançou 100%: o conector também considera as informações de limite e continuidade do serviço. Dados ausentes não são substituídos por consumo fictício.

Uma consulta com erro pode manter a última leitura disponível, identificada com sua idade. Confira o erro na página da conta antes de interpretar essa leitura como atual.

Voltar ao [README](../README.md).
