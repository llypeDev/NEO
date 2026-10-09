## Neo {{version}} para Windows

### Mudanças

{{changes}}

### Escolha seu download

- **Neo-{{version}}-x64-nsis.exe:** instalador com assistente, atalho e desinstalação pelo Windows.
- **Neo-{{version}}-x64-portable.exe:** executável portátil; salve em uma pasta permanente e execute.
- **Neo-{{version}}-codigo.zip:** código, testes, imagens e documentação para desenvolvimento.
- **SHA256SUMS.txt:** hashes dos três arquivos acima.

Os executáveis não precisam de Node.js e não têm assinatura digital. Para conferir um arquivo baixado, compare o resultado de `Get-FileHash .\Neo-{{version}}-x64-portable.exe -Algorithm SHA256` com a linha correspondente do `SHA256SUMS.txt`.

### Atualizar

Encerre o Neo pelo menu da bandeja e execute o novo instalador ou portátil. As contas continuam no perfil `%APPDATA%\Pulse Windows`.

Leia o [README](https://github.com/llypeDev/NEO#readme), o [guia de configuração](https://github.com/llypeDev/NEO/blob/main/docs/CONFIGURACAO.md) e a [cobertura dos provedores](https://github.com/llypeDev/NEO/blob/main/PROVEDORES.md).
