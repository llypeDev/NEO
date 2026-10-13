# Neo

Monitor de cotas de IA para Windows (Electron 44, Node 24), adaptado do Pulse de qunqin24. Interface e documentação em português brasileiro; comentários de código em inglês. Catálogo de 77 provedores em `src/catalog.json` e `src/registry.cjs`. O README traz a estrutura de `src/`.

**Por onde começar:** `docs/PENDENCIAS.md` lista o que falta, em ordem de prioridade.

## Comandos

- `npm test`: testes em `test/*.test.cjs`. Com `PULSE_TEST_TMP=<pasta>`, eles usam essa pasta temporária. O teste com PowerShell real (`test/powershell.test.cjs`) só roda no Windows.
- `npm run check`: sintaxe de todos os `.cjs`/`.js` e catálogo com 77 provedores.
- `npm run smoke`: teste da interface com 24 checks em modo de demonstração. Grava as capturas em `PULSE_SMOKE_OUTPUT`.
- `npm run build`: instalador NSIS, portátil e ZIP x64 em `release/`. Exige Windows.
- `PULSE_WINDOWS_DATA=<pasta>` isola o perfil; o perfil normal fica em `%APPDATA%\Pulse Windows`.

## CI e publicação

- **Verificação** (`.github/workflows/ci.yml`): "Testes e sintaxe no Windows" e "Interface no Windows" (smoke test; capturas no artefato `capturas-da-interface` por 7 dias).
- **Publicação** (`.github/workflows/release.yml`, job "Pacotes Windows"): em PRs que mudam empacotamento, gera os pacotes e imprime as notas sem publicar. Na tag `v*`, cria um **rascunho** de release.
- **Para lançar uma versão:**
  1. No PR, antes do merge, rode `npm version X.Y.Z --no-git-tag-version` e transforme a seção "Não publicado" do CHANGELOG em `## X.Y.Z — AAAA-MM-DD`.
  2. Atualize as referências de versão no README, em `docs/CONFIGURACAO.md` e em `DESIGN.md`.
  3. A tag precisa bater com o `package.json`. **Quem envia a tag é o usuário, de um clone local**, porque as sessões na nuvem recebem 403 ao enviar tags (os comandos estão em `docs/PENDENCIAS.md`).
  4. As notas da release vêm de `.github/release-notes.md` e da seção do CHANGELOG.
- O repositório é público, então os runners do GitHub Actions são gratuitos.

## Convenções

- Código compacto, como o existente: uma instrução por linha longa, sem reformatar arquivos inteiros.
- Mudanças passam por PR com CI verde. O usuário costuma pedir o merge quando o CI passa.
- Use `merge` como método de merge.
- **Não encerre processos de outros programas nem use `powershell -EncodedCommand`.** O SentinelOne de um usuário já bloqueou o Neo. Se o PowerShell for necessário, envie o script pela entrada padrão com `powershellJSON` (`src/special.cjs`).
- Credenciais só vão para o `safeStorage` (`src/storage.cjs`) e nunca voltam ao renderer.
- A entrega entre versões abertas usa `src/instances.cjs` e o `instance.json` do perfil. A 0.3.1 e a 0.3.2 não conhecem esse mecanismo.

## Testar a interface fora do Windows

No Linux:
1. Rode `npm ci` (sem `--ignore-scripts`) ou `node node_modules/electron/install.js`.
2. Rode o Electron com `xvfb-run -a node_modules/electron/dist/electron . --smoke --no-sandbox --disable-gpu`.

O `safeStorage` não funciona sem keyring. Para chegar ao fim do smoke test, carregue o `main.cjs` por um script fora do repositório que antes substitua `encryptString`, `decryptString` e `isEncryptionAvailable` com `Object.defineProperty`. Nesse caso, `app.getVersion()` retorna `0.0`. Comportamentos exclusivos do Windows (forma da faixa, DPAPI, janelas sempre no topo) só são validados no CI.
