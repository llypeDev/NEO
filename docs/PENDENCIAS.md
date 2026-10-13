# Pendências do Neo

Lista do que falta, em ordem de prioridade. Atualize-a quando um item for concluído ou quando surgir outro. Estado em 13/10/2026: a `main` está na **0.3.3**, mas a release 0.3.3 ainda não foi publicada.

## 1. Publicar a 0.3.3

### 1.1 Enviar a tag `v0.3.3`

A tag precisa apontar para o commit `129fd67` (merge do PR #5), em que o `package.json` já está em 0.3.3. As sessões do Claude Code na nuvem recebem **HTTP 403** ao enviar tags, então a tag é enviada de um clone local:

```powershell
cd $env:TEMP
git clone https://github.com/llypeDev/NEO.git neo-tag
cd neo-tag
git tag -a v0.3.3 129fd67 -m "Neo 0.3.3"
git push origin v0.3.3
cd ..
Remove-Item -Recurse -Force neo-tag
```

**Pronto quando:** o push mostra `* [new tag] v0.3.3 -> v0.3.3`.

### 1.2 Conferir e publicar o rascunho

A tag dispara o workflow **Publicação** (`.github/workflows/release.yml`, job "Pacotes Windows"), que leva cerca de 2 minutos. Ele confere se a tag bate com o `package.json`, roda os testes, gera os pacotes e cria um **rascunho** de release com as notas de `.github/release-notes.md`.

1. Abra o rascunho em [Releases](https://github.com/llypeDev/NEO/releases). Ele deve ter 5 arquivos:
   - `Neo-0.3.3-x64-nsis.exe`
   - `Neo-0.3.3-x64-portable.exe`
   - `Neo-0.3.3-x64.zip`
   - `Neo-0.3.3-codigo.zip`
   - `SHA256SUMS.txt`
2. Confira as notas: as mudanças da seção 0.3.3 do CHANGELOG, a lista de downloads e três linhas de conferência com os hashes preenchidos.
3. Clique em **Publish release**.

**Pronto quando:** a 0.3.3 é a release "latest" e os links de download do README respondem.

### 1.3 Testar no computador da empresa (SentinelOne)

1. **ZIP:** descompacte o `Neo-0.3.3-x64.zip` numa pasta permanente e abra o `Neo.exe`. Esse formato não se extrai para `%TEMP%`.
2. **Portátil:** ele se extrai para `%TEMP%\Neo-0.3.3`. Anote se o SentinelOne bloqueia.
3. **Atualização com a 0.3.2 aberta:** a 0.3.3 deve mostrar o aviso "Uma versão anterior do Neo continua aberta". Depois de **Sair** na bandeja e **Tentar de novo**, a 0.3.3 assume. O aviso tem uma janela-dona sempre no topo, mas esse comportamento só foi validado no Linux (Xvfb); confirme no Windows que ele não fica atrás da janela da 0.3.2.
4. **Atualização com a 0.3.3 aberta:** quando sair uma 0.3.4, abri-la deve fechar a 0.3.3 sem aviso.

**Pronto quando:** você souber qual formato o SentinelOne aceita e a troca de versão tiver funcionado no Windows.

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
- **Certificado OV pago na nuvem** (SSL.com eSigner, Certum Open Source e similares):
  - Mostra o seu nome.
  - Configure com `win.signtoolOptions.sign` (hook) no `package.json`, removendo `"signExecutable": false`.
  - A validade é de no máximo 460 dias.
- **Azure Artifact Signing:** não atende pessoa física no Brasil (só EUA e Canadá).

Em qualquer opção:
- mova o cálculo do `SHA256SUMS.txt` e o passo "Preparar as notas da versão" do `release.yml` para depois da assinatura;
- adicione uma etapa que falhe se `Get-AuthenticodeSignature` não for `Valid`;
- sempre use carimbo de tempo.

### 2.3 Instalador NSIS sem PowerShell

O `CHECK_APP_RUNNING` do electron-builder 26 roda `powershell.exe` com `Get-CimInstance Win32_Process` e `Stop-Process` quando o Neo está aberto durante a instalação. Defina a macro `customCheckAppRunning` num script de inclusão NSIS (`build.nsis.include`). Ela pode pedir para fechar o Neo, ou abrir o `Neo.exe` novo para que a entrega de versão da 0.3.3 feche o antigo.

### 2.4 Início com o Windows

`configureStartup()` (`src/main.cjs`) chama `app.setLoginItemSettings` em toda abertura, o que grava a chave `HKCU\...\Run`. Passe a gravar só quando o valor atual, lido com `app.getLoginItemSettings`, for diferente do desejado.

### 2.5 Toolset NSIS novo

O electron-builder 26 usa por padrão o NSIS 3.0.4.1, de 2019, que já gerou falsos positivos em outros projetos. Teste num PR `"toolsets": {"nsis": "1.2.1"}` em `build` e compare os resultados no VirusTotal antes de adotar.

### 2.6 Orientação para empresas

Adicione ao README (tabela "Solução de problemas") e a `.github/release-notes.md` uma orientação curta:
- prefira o ZIP ou o instalador;
- confira o hash;
- peça à TI os detalhes do item 2.1.

## 3. Melhorias de código

Recomendações da análise inicial, ainda abertas:

1. **Separar o smoke test:** o smoke test (cerca de 90 linhas) vive dentro de `src/main.cjs`; mova-o para um módulo próprio.
2. **Atualização testável:** extraia a orquestração de `refresh()` para um módulo com dependências injetadas, como foi feito com `src/instances.cjs`.
3. **Duplicação do `--json`:** `src/cli.cjs` e o modo `--json` de `src/main.cjs` repetem a exportação.
4. **HTTP 429:** depois de um 429, espere mais antes de consultar a mesma conta de novo, em vez de repetir no intervalo normal.
5. **Novas versões:** verificação opcional de nova versão pela API de releases do GitHub, desligada por padrão.
6. **Código compactado:** há linhas de milhares de caracteres; reorganize aos poucos, só no que for alterado, sem reformatar tudo de uma vez.
7. **Texto da tela Sobre:** "Consulte a análise que acompanha o aplicativo" aponta para algo que não existe (`about()` em `src/ui/app.js`).

## 4. Funcionalidades

Da lista "Estado atual" do README:
- login OAuth próprio e renovação de tokens;
- importação de Cookies dos navegadores;
- leitores de histórico além de Codex e Claude Code;
- preços de modelos e histórico das páginas de status;
- atualização automática;
- validação com contas reais e com várias telas e escalas.

## 5. Opcionais

- Colar na release 0.3.2 as notas no formato novo (download, hashes, atualização).
- O Dependabot (`.github/dependabot.yml`) ainda não abriu PRs. Quando abrir, os PRs do Electron passam pelo CI completo, incluindo pacotes e interface.
