# Contribuir com o Neo

O projeto adapta contratos e recursos do [Pulse](https://github.com/qunqin24/Pulse); preserve as atribuições em `LICENSE` e `NOTICE` ao reutilizar código ou fixtures.

## Preparar o ambiente

Use Windows, Git e Node.js 24+:

```powershell
git clone https://github.com/llypeDev/NEO.git
cd NEO
npm.cmd ci
npm.cmd test
npm.cmd run check
npm.cmd run demo
```

O modo de demonstração não usa suas contas. Para testar outras entradas, use `PULSE_WINDOWS_DATA` com uma pasta separada, conforme o [README](README.md#usar-um-perfil-isolado). Não envie dados de perfil, credenciais, pacotes compilados ou `node_modules` no pull request.

## Melhorar um conector

1. Consulte sua definição em `src/catalog.json`/`src/registry.cjs` e o contrato de origem em [PROVEDORES.md](PROVEDORES.md).
2. Ajuste o parser em `src/core.cjs`/`src/profiles.cjs` e a consulta em `src/providers.cjs`/`src/special.cjs`, conforme a integração.
3. Inclua uma fixture anonimizada e um teste que reproduza a diferença observada. Cubra os casos relevantes de campos ausentes, moeda, plano, janela vencida ou limite ilimitado.
4. Preserve o isolamento entre contas, o destino das credenciais e a indicação de dados antigos. Não transforme ausência de informação em consumo ou renovação presumidos.
5. Atualize a documentação caso o tipo de credencial ou a forma de conexão mude.

Ao validar com uma conta real, descreva o produto e o tipo de plano, sem compartilhar token, Cookie, ID de conta ou captura com dados pessoais. Identifique fixtures simuladas como simuladas.

## Alterar a interface

Use `npm.cmd run demo` para conferir as mudanças. Para a faixa, observe as quatro bordas, estado recolhido, cartão aberto, arraste e movimento reduzido. As referências de forma e animação estão em [DESIGN.md](DESIGN.md).

Verifique os temas claro e escuro e o funcionamento com mais de uma conta. Evite recriar os elementos do painel durante a troca de cartão, porque sua continuidade sustenta as animações.

## Antes do pull request

- Execute `npm.cmd test` e `npm.cmd run check`.
- Descreva o problema, o comportamento final e como verificou a mudança.
- Inclua imagens quando elas ajudarem a avaliar uma alteração visual.
- Atualize a documentação afetada e preserve a compatibilidade do perfil existente.

A validação automática do GitHub executa os testes e a verificação de sintaxe no Windows. Ela não autentica contas reais dos provedores.

## Reportar um problema

Abra uma [issue](https://github.com/llypeDev/NEO/issues) com versão do Neo, versão do Windows, provedor, passos para reproduzir e resultado esperado/observado. Revise capturas e mensagens antes de enviá-las para remover segredos e dados pessoais.
