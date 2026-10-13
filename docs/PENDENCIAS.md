# Pendências do Neo

Lista do que falta, em ordem de prioridade. Atualize-a quando um item for concluído ou quando surgir outro. Estado em 13/10/2026: a **0.3.4** está publicada ([release](https://github.com/llypeDev/NEO/releases/tag/v0.3.4), tag `v0.3.4` → `680131e`, run 38405847753 do workflow Publicação). O processo para lançar uma versão está no `CLAUDE.md`.

## 1. Validar a versão publicada no Windows da empresa (SentinelOne)

O SentinelOne bloqueou o portátil 0.3.2 e a 0.3.3 baixada. Com a versão publicada mais recente (hoje a 0.3.4), teste e anote, para cada formato, se o antivírus bloqueia, alerta ou deixa passar:

1. **ZIP:** descompacte o `Neo-0.3.4-x64.zip` numa pasta permanente e abra o `Neo.exe`. Esse formato não se extrai para `%TEMP%` e é o que tem mais chance de passar.
2. **Portátil:** ele se extrai para `%TEMP%\Neo-0.3.4`.
3. **Instalador:** o `Neo-0.3.4-x64-nsis.exe` instala por usuário, sem pedir administrador. Toda instalação chama `powershell.exe`, mesmo com o Neo fechado (ver 2.3).
4. **Atualização com a 0.3.2 aberta:** a versão nova deve mostrar o aviso "Uma versão anterior do Neo continua aberta". Depois de **Sair** na bandeja e **Tentar de novo**, a versão nova assume. O aviso tem uma janela-dona sempre no topo, mas esse comportamento só foi validado no Linux (Xvfb); confirme que no Windows ele não fica atrás da janela da 0.3.2.
5. **Atualização com a 0.3.3 aberta:** abrir a 0.3.4 deve fechar a 0.3.3 sem aviso, e a 0.3.4 assume a bandeja. Pode ser testado agora, com a 0.3.4 baixada ou gerada localmente.

**Resultado em 13/10/2026:** a 0.3.3 baixada das Releases foi bloqueada; o formato e o detalhe do alerta não foram registrados. A mesma 0.3.3 gerada no computador da empresa (`npm ci` e `npm run build`) abriu sem bloqueio. A 0.3.1, que nunca foi bloqueada, também tinha sido gerada localmente e enviada à mão; a 0.3.2 e a 0.3.3 vieram do GitHub Actions. Isso aponta para arquivo baixado sem assinatura e sem reputação (2.2), e não para o código. O README ganhou a seção "Gerar no próprio computador" como alternativa (0.3.4). Ainda falta saber se o ZIP baixado passa e registrar o detalhe do alerta (2.1).

**Pronto quando:** você souber quais formatos o SentinelOne aceita e a troca de versão tiver funcionado no Windows. Registre o resultado aqui e use-o no item 2.6.

## 2. Antivírus corporativo

O SentinelOne marcou o portátil 0.3.2 ("Mitigated · Terminated associated processes"). Causas prováveis, ainda sem confirmação:
- um extrator NSIS sem assinatura que roda o app a partir de `%TEMP%`;
- um hash novo a cada build, sem reputação;
- o PowerShell codificado no Antigravity, que já foi corrigido na 0.3.3.

### 2.1 Pedir os detalhes à TI

No console do SentinelOne, peça:
- o mecanismo que disparou (Static AI ou Behavioral AI) e a confiança;
- os indicadores e técnicas MITRE;
- a árvore de processos: se foi o extrator, o `%TEMP%\...\Neo.exe` ou um `powershell.exe` filho;
- o caminho e o SHA-256 do arquivo;
- o nível de mitigação (Kill, Quarantine ou Remediate).

Antes de qualquer liberação, compare o SHA-256 com o `SHA256SUMS.txt` da release. Se for falso positivo, a TI pode:
- marcar no console *Analyst Verdict = False Positive*;
- liberar pelo hash, que precisa ser refeito a cada versão enquanto o Neo não for assinado;
- abrir um chamado no suporte do SentinelOne.

Também vale consultar o hash no VirusTotal (linha "SentinelOne (Static ML)").

### 2.2 Assinatura de código

É o que permite uma liberação estável, por certificado. Ela não impede alertas por comportamento.

- **SignPath Foundation** (gratuita para projetos open source; a licença Apache-2.0 serve):
  - O editor exibido é "SignPath Foundation" e cada assinatura passa por aprovação manual.
  - Exige uma política de assinatura publicada, MFA de todos os mantenedores no GitHub e na SignPath, e uma política de privacidade que cubra o tráfego aos provedores.
  - A integração usa `signpath/github-action-submit-signing-request`.
  - Para assinar também o `Neo.exe` interno, o pipeline tem duas etapas: `electron-builder --dir`, assinatura do `win-unpacked` e depois `electron-builder --prepackaged`. Em seguida, os `.exe` finais são assinados.
  - No `release.yml`, os passos "Empacotar código e somas SHA-256", "Preparar as notas da versão" e "Guardar os pacotes" passam para depois da assinatura.
- **Certificado OV pago na nuvem** (SSL.com eSigner, Certum Open Source e similares):
  - Mostra o seu nome.
  - Configure com `win.signtoolOptions.sign` (hook) no `package.json`, removendo `"signExecutable": false`.
  - A assinatura acontece dentro do passo "Gerar instalador, portátil e ZIP", antes das somas e das notas, então a ordem do `release.yml` não muda.
  - A validade é de no máximo 460 dias.
- **Azure Artifact Signing:** não atende pessoa física no Brasil (só EUA e Canadá).

Em qualquer opção:
- adicione ao `release.yml` uma etapa que falhe se `Get-AuthenticodeSignature` não for `Valid` em algum `.exe` publicado;
- sempre use carimbo de tempo.

### 2.3 Instalador NSIS sem PowerShell

O `CHECK_APP_RUNNING` do electron-builder 26 (`node_modules/app-builder-lib/templates/nsis/include/allowOnlyOneInstallerInstance.nsh`) roda `powershell.exe` em **toda** instalação e desinstalação:
- duas vezes para checar se o PowerShell está disponível;
- uma com `Get-CimInstance Win32_Process` para procurar o Neo;
- e ainda `Stop-Process`, se o Neo estiver aberto.

Defina a macro `customCheckAppRunning` num script de inclusão (`build.nsis.include`). Ela deve:
- detectar o Neo sem PowerShell, por exemplo com `nsProcess::FindProcess "Neo.exe"`, que o modelo do electron-builder já inclui;
- pedir que a pessoa o feche pela bandeja (**Sair**), com uma `MessageBox` de Tentar de novo/Cancelar;
- valer também para o desinstalador.

A entrega de versão da 0.3.3 não ajuda aqui: esse passo roda antes de os arquivos novos serem instalados, então o `Neo.exe` na pasta ainda é o antigo.

A atualização executa em modo silencioso (`/S`) o desinstalador da versão já instalada, gerado com o modelo antigo. Por isso, a macro só elimina todo o PowerShell das atualizações a partir da segunda versão que a tiver.

### 2.4 Início com o Windows

`configureStartup()` (`src/main.cjs`) chama `app.setLoginItemSettings` em toda abertura e a cada vez que as configurações são salvas (handler `settings-save`), o que grava a chave `HKCU\...\Run`.

Leia o estado atual com `app.getLoginItemSettings({path, args})`, usando o mesmo `path` (`process.env.PORTABLE_EXECUTABLE_FILE || process.execPath`) e os mesmos `args` (`app.isPackaged ? [] : [app.getAppPath()]`) usados na gravação. Só chame `setLoginItemSettings` quando `openAtLogin` for diferente de `settings.startAtLogin`. Sem `path`/`args`, o Electron compara com `process.execPath`, que no portátil é a pasta temporária, e a gravação aconteceria toda vez.

### 2.5 Toolset NSIS novo

O electron-builder 26 usa por padrão o NSIS 3.0.4.1, de 2019, que já gerou falsos positivos em outros projetos. Teste num PR `"toolsets": {"nsis": "1.2.1"}` em `build` e compare os resultados no VirusTotal antes de adotar.

### 2.6 Orientação para empresas

A 0.3.4 já traz no README a linha "O antivírus da empresa bloqueia o Neo baixado" em "Solução de problemas", que aponta para "Gerar no próprio computador". Com o resultado do item 1, complete essa orientação no README e leve uma versão curta a `.github/release-notes.md`:
- prefira o ZIP; o instalador, só se o teste mostrar que o SentinelOne o aceita;
- confira o hash;
- peça à TI os detalhes do item 2.1.

## 3. Melhorias de código

O item 1 apareceu no CI; os demais são recomendações da análise inicial, ainda abertas:

1. **Teste do PowerShell instável:** o teste "o PowerShell do Windows executa o script recebido pela entrada padrão" (`test/powershell.test.cjs`) abre o `powershell.exe` de verdade com o prazo de produção de `powershellJSON`, 15 s.
   - Na `main`, ele levou 3,8 s (run 37999989243). No PR #6, que só alterou documentação, passou de 15 s e derrubou o job "Testes e sintaxe no Windows" (run 38398615910).
   - O workflow Publicação também roda os testes, então uma tag pode falhar pelo mesmo motivo.
   - O teste confere a entrada padrão, não a velocidade: passe um prazo maior só no teste, por exemplo `powershellJSON("…",{timeout:60000})`.
   - Avalie também se 15 s bastam para o Antigravity em máquinas com antivírus corporativo, onde o PowerShell pode demorar mais para abrir.
2. **Separar o smoke test:** o smoke test (cerca de 90 linhas) vive dentro de `src/main.cjs`; mova-o para um módulo próprio.
3. **Atualização testável:** extraia a orquestração de `refresh()` para um módulo com dependências injetadas, como foi feito com `src/instances.cjs`.
4. **Duplicação do `--json`:** `src/cli.cjs` e o modo `--json` de `src/main.cjs` repetem a exportação.
5. **HTTP 429:** depois de um 429, espere mais antes de consultar a mesma conta de novo, em vez de repetir no intervalo normal.
6. **Novas versões:** verificação opcional de nova versão pela API de releases do GitHub, desligada por padrão.
7. **Código compactado:** há linhas de milhares de caracteres; reorganize aos poucos, só no que for alterado, sem reformatar tudo de uma vez.
8. **Texto da tela Sobre:** "Consulte a análise que acompanha o aplicativo" aponta para algo que não existe (`about()` em `src/ui/app.js`).

## 4. Funcionalidades

Da lista "Estado atual" do README:
- login OAuth próprio e renovação de tokens. Para o Claude Code, o login local só é renovado quando a CLI faz uma consulta; quem usa o app Claude para desktop vê o login vencer em poucas horas (validado em 13/10/2026 com uma conta Team). Hoje o aviso pede `claude -p "ok"`. Renovar pelo Neo troca o login salvo e pode deslogar o Claude Code, então decida com o usuário antes;
- importação de Cookies dos navegadores;
- leitores de histórico além de Codex e Claude Code;
- preços de modelos e histórico das páginas de status;
- atualização automática;
- validação com contas reais e com várias telas e escalas.

## 5. Opcionais

- **Notas da release 0.3.2 no formato novo.** Parta do modelo anterior à 0.3.3 (`git show 66e0f20:.github/release-notes.md`), e não do atual: a 0.3.2 não tem o ZIP do aplicativo nem a entrega entre versões.
  - Preencha a versão, a seção 0.3.2 do CHANGELOG e os hashes do portátil e do NSIS do `SHA256SUMS.txt` da release.
  - A edição é manual, porque as sessões do Claude não editam releases.
- **Dependabot:** o `.github/dependabot.yml` ainda não abriu PRs. Quando abrir, os PRs do Electron passam pelo CI completo, incluindo pacotes e interface.
