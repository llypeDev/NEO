## Neo {{version}} para Windows

### Mudanças

{{changes}}

### Escolha seu download

Baixe um dos arquivos em **Assets**, logo abaixo. O ZIP do botão **Code** e o `Neo-{{version}}-codigo.zip` trazem só o código-fonte, sem o aplicativo.

- **Neo-{{version}}-x64-nsis.exe:** instalador com assistente, atalho e desinstalação pelo Windows.
- **Neo-{{version}}-x64-portable.exe:** executável portátil; salve em uma pasta permanente e execute. A cada abertura, ele se extrai para `%TEMP%\Neo-{{version}}`.
- **Neo-{{version}}-x64.zip:** o mesmo aplicativo sem instalador nem extração; descompacte em uma pasta permanente e abra o `Neo.exe`. Indicado quando o antivírus da empresa bloqueia o portátil.
- **Neo-{{version}}-codigo.zip:** código, testes, imagens e documentação para desenvolvimento.
- **SHA256SUMS.txt:** hashes dos arquivos acima.

Os executáveis não precisam de Node.js.

### Conferir o arquivo baixado

Os executáveis não têm assinatura digital. Para confirmar que o arquivo é o publicado, abra o PowerShell, entre na pasta em que ele foi salvo e confira o nome com `Get-ChildItem`. Depois rode a linha do arquivo que você baixou. O resultado deve ser `True`.

```powershell
cd $env:USERPROFILE\Downloads
Get-ChildItem Neo-*.exe, Neo-*.zip
(Get-FileHash .\Neo-{{version}}-x64-portable.exe -Algorithm SHA256).Hash -eq '{{sha256-portable}}'
(Get-FileHash .\Neo-{{version}}-x64-nsis.exe -Algorithm SHA256).Hash -eq '{{sha256-nsis}}'
(Get-FileHash .\Neo-{{version}}-x64.zip -Algorithm SHA256).Hash -eq '{{sha256-zip}}'
```

Um `False` sem mensagem de erro indica um arquivo diferente do publicado: apague-o e baixe de novo nesta página. Se antes aparecer "Não é possível localizar o caminho", o arquivo não está nessa pasta com esse nome; use o nome que o `Get-ChildItem` mostrou.

### Atualizar

Execute o novo instalador ou portátil. A versão anterior aberta sai sozinha e a nova assume a bandeja; se for a 0.3.1 ou a 0.3.2, a nova pede que você clique em **Sair** no ícone do Neo na bandeja e depois em **Tentar de novo**. As contas continuam no perfil `%APPDATA%\Pulse Windows`.

Leia o [README](https://github.com/llypeDev/NEO#readme), o [guia de configuração](https://github.com/llypeDev/NEO/blob/main/docs/CONFIGURACAO.md) e a [cobertura dos provedores](https://github.com/llypeDev/NEO/blob/main/PROVEDORES.md).
