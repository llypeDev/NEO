# Histórico de versões

## Não publicado

- Notas das versões com lista de downloads, conferência de hash e instruções de atualização, geradas a partir de `.github/release-notes.md`; uma tag sem a seção correspondente no CHANGELOG é recusada.
- Captura da tela Sobre atualizada para a versão 0.3.2.

## 0.3.2 — 2026-10-09

- Preservação das contas válidas quando o perfil contém uma conta que esta versão não reconhece; antes, todas eram descartadas e o arquivo era sobrescrito no próximo salvamento.
- Cópia de `settings.json` ou `secrets.json` danificado para `*.invalid-<data>.json` antes do reparo.
- Ordem da faixa mantida ao editar uma conta existente.
- Tema desconhecido volta para o tema do sistema.
- Faixa reposicionada quando um monitor é reconectado; falha em uma conta não interrompe a atualização das demais.
- Versão do aplicativo lida do `package.json` e quantidade de conectores derivada do catálogo.
- Menos trabalho por atualização: estado calculado uma vez por envio e região da faixa enviada só quando muda.
- CLIs dos provedores não são procurados em entradas relativas do `PATH`; consulta após a suspensão aguarda a rede voltar.
- Smoke test da interface no CI do Windows, com capturas nos artefatos; workflow de publicação por tag que gera os pacotes, as somas SHA-256 e um rascunho da versão; Dependabot para npm e GitHub Actions.
- Acessibilidade: nomes legíveis em seletores e grupos de opções, foco preso no modal e devolvido ao fechar, busca de provedores sem acentos.

## 0.3.1 — 2026-10-09

- Aplicação da logo N em fita preta no aplicativo, bandeja, notificações, tela Sobre, instaladores e atalho.
- Preservação da imagem original e preparação dos tamanhos de ícone do Windows.
- Publicação do código e dos pacotes Windows em `llypeDev/NEO`, com guia de uso, imagens, configuração e contribuição.
- Verificação do portátil em 24 checks; manutenção do perfil e das credenciais da versão anterior.

## 0.3.0 — 2026-10-09

- Renomeação de Pulse Windows para Neo, mantendo o perfil existente.
- Forma da faixa baseada em `DockBerthShape`, encaixada sem margem nas quatro bordas.
- Animação de expansão e recolhimento, continuidade dos cartões e respeito ao movimento reduzido.
- Arraste para deixar a faixa flutuante e reencaixá-la na borda.
- Correção do início com o Windows para apontar ao portátil permanente.
- Iniciador que seleciona a versão mais recente e reinicia a instância anterior da mesma pasta.

## 0.2.0 — 2026-10-09

- Revisão da interface com configurações agrupadas, navegação lateral e recursos visuais do Pulse.
- Faixa com marcas dos provedores, anéis, percentuais externos e cartões de uso.

## 0.1.0 — 2026-10-09

- Primeira adaptação para Windows, publicada localmente como Pulse Windows.
- Catálogo dos 77 provedores, consultas e parsers, múltiplas contas e cache.
- Bandeja, armazenamento protegido de credenciais, importação/exportação JSON e histórico local de Codex e Claude Code.

O histórico descreve as entregas locais anteriores e a primeira publicação pública. A implementação de um conector não comprova acesso real ao serviço; consulte [PROVEDORES.md](PROVEDORES.md).
