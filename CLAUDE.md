# Neo

Monitor de cotas de IA para Windows (Electron 44, Node 24), adaptado do Pulse de qunqin24. Interface e documentação em português brasileiro; comentários de código em inglês. Catálogo de 77 provedores em `src/catalog.json` e `src/registry.cjs`. O README traz a estrutura de `src/`.

**Por onde começar:** `docs/PENDENCIAS.md` lista o que falta, em ordem de prioridade.

## Comandos

- `npm test`: testes em `test/*.test.cjs`. Com `PULSE_TEST_TMP=<pasta>`, eles usam essa pasta temporária. O teste com PowerShell real (`test/powershell.test.cjs`) só roda no Windows.
- `npm run check`: sintaxe de todos os `.cjs`/`.js` e catálogo com 77 provedores.
- `npm run smoke`: teste da interface com 24 checks em modo de demonstração.
  - Grava as capturas e o `smoke-result.json` em `PULSE_SMOKE_OUTPUT`; sem ela, em `<userData>/smoke`.
  - Sem `PULSE_WINDOWS_DATA`, o userData é `<temp>/pulse-windows-demo`.
  - Uma exceção vai para `smoke-error.txt` na raiz do userData.
- `npm run build`: instalador NSIS, portátil e ZIP x64 em `release/`. Exige Windows.
- `PULSE_WINDOWS_DATA=<pasta>` isola o perfil; o perfil normal fica em `%APPDATA%\Pulse Windows`.

## CI e publicação

- **Verificação** (`.github/workflows/ci.yml`): "Testes e sintaxe no Windows" e "Interface no Windows" (smoke test; capturas no artefato `capturas-da-interface` por 7 dias).
- **Publicação** (`.github/workflows/release.yml`, job "Pacotes Windows"): em PRs que mudam empacotamento, gera os pacotes e imprime as notas sem publicar. Na tag `v*`, cria um **rascunho** de release em 4 a 5 minutos.
- **Para lançar uma versão:**
  1. No PR, antes do merge, rode `npm version X.Y.Z --no-git-tag-version` e renomeie `## Não publicado` para `## X.Y.Z — AAAA-MM-DD` no CHANGELOG. Numa tag, o workflow recusa a publicação se faltar essa seção.
  2. Atualize as referências de versão no README, em `docs/CONFIGURACAO.md` e em `DESIGN.md`, e o número de testes em "Estado atual" do README (o `# tests` do `npm test`). Depois que o CI do PR rodar com a versão nova, troque `docs/images/about.png` pelo `about.png` do artefato `capturas-da-interface`. Não use a captura do Linux, que mostra a versão 0.0.
  3. Depois do merge, a tag precisa bater com o `package.json`. **Quem envia a tag é o usuário, de um clone local**, porque as sessões na nuvem recebem 403 ao enviar tags. Passe a ele:
     ```powershell
     cd $env:TEMP; git clone https://github.com/llypeDev/NEO.git neo-tag; cd neo-tag
     git tag -a vX.Y.Z <sha do merge do PR da versão> -m "Neo X.Y.Z"; git push origin vX.Y.Z
     cd ..; Remove-Item -Recurse -Force neo-tag
     ```
  4. O rascunho deve ter 5 arquivos: nsis, portable, `x64.zip`, `codigo.zip` e `SHA256SUMS.txt`. As notas vêm de `.github/release-notes.md` e da seção do CHANGELOG. O usuário revisa e clica em **Publish release**; as sessões não editam nem publicam releases.
- O repositório é público, então os runners do GitHub Actions são gratuitos.

## Convenções

- Toda mudança visível ganha um item em `## Não publicado`, no topo do `CHANGELOG.md` (logo abaixo de `# Histórico de versões`). Crie a seção se ela não existir; depois de cada versão, ela vira a seção da versão.
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

Sem keyring, o `safeStorage` falha e o smoke test termina com código 1 no check de credenciais. Para chegar ao fim, carregue o `main.cjs` por um script fora do repositório que antes substitua `encryptString`, `decryptString` e `isEncryptionAvailable` com `Object.defineProperty`. Nesse caso, `app.getVersion()` retorna `0.0`.

Comportamentos exclusivos do Windows (forma da faixa, DPAPI, janelas sempre no topo) só são validados no CI.
