$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$neoRoot = [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\') + '\'
$neoLog = Join-Path $PSScriptRoot 'Abrir-Neo.log'

function Write-NeoLog([string]$Message) {
    Add-Content -LiteralPath $neoLog -Value ('{0:yyyy-MM-dd HH:mm:ss} {1}' -f (Get-Date), $Message) -Encoding UTF8
}

function Get-NeoVersion([string]$FilePath) {
    if (-not $FilePath -or -not (Test-Path -LiteralPath $FilePath -PathType Leaf)) { return $null }
    $info = (Get-Item -LiteralPath $FilePath).VersionInfo
    if ($info.ProductName -notin @('Neo','Pulse Windows') -or $info.ProductVersion -notmatch '^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?') { return $null }
    $revision = if ($Matches[4]) { $Matches[4] } else { '0' }
    return [version]('{0}.{1}.{2}.{3}' -f $Matches[1], $Matches[2], $Matches[3], $revision)
}

function Get-NeoInstances {
    $processes = @(Get-CimInstance Win32_Process -Filter "Name LIKE '%Neo%' OR Name LIKE '%Pulse%'")
    $launchers = @($processes | Where-Object {
        $_.ExecutablePath -and $_.ExecutablePath.StartsWith($neoRoot, [StringComparison]::OrdinalIgnoreCase) -and
        $_.Name -match '^(?:Neo|PulseWindows)-\d+\.\d+\.\d+-x64-portable\.exe$' -and (Get-NeoVersion $_.ExecutablePath)
    })
    $launcherIds = @($launchers | ForEach-Object { $_.ProcessId })
    foreach ($process in $processes) {
        if ($process.Name -notin @('Neo.exe','Pulse Windows.exe') -or -not $process.ExecutablePath -or $process.CommandLine -match '(?:^|\s)--type=') { continue }
        $owned = $launcherIds -contains $process.ParentProcessId -or $process.ExecutablePath.StartsWith($neoRoot, [StringComparison]::OrdinalIgnoreCase)
        if (-not $owned) { continue }
        $version = Get-NeoVersion $process.ExecutablePath
        if ($version) { [pscustomobject]@{ ProcessId = $process.ProcessId; Path = $process.ExecutablePath; Version = $version } }
    }
}

try {
    $release = if (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'package.json') -PathType Leaf) {
        Join-Path $PSScriptRoot 'release'
    } else {
        Join-Path $PSScriptRoot 'Neo\release'
    }
    $candidates = @(Get-ChildItem -LiteralPath $release -File | ForEach-Object {
        if ($_.Name -match '^Neo-(\d+\.\d+\.\d+)-x64-portable\.exe$') {
            $expected = [version]($Matches[1] + '.0')
            $actual = Get-NeoVersion $_.FullName
            if ($actual -and $actual -eq $expected) { [pscustomobject]@{ Path = $_.FullName; Version = $actual } }
        }
    } | Sort-Object Version -Descending)
    if (-not $candidates.Count) { throw ('O executavel do Neo nao foi encontrado em ' + $release + '.') }
    $target = $candidates[0]
    Write-NeoLog ('Selecionada versao {0}: {1}' -f $target.Version, $target.Path)

    foreach ($instance in @(Get-NeoInstances)) {
        if ($instance.Version -ge $target.Version) { continue }
        $current = Get-CimInstance Win32_Process -Filter ('ProcessId={0}' -f $instance.ProcessId)
        if ($current -and $current.ExecutablePath -eq $instance.Path -and (Get-NeoVersion $current.ExecutablePath) -eq $instance.Version) {
            Write-NeoLog ('Reiniciando instancia anterior {0}, PID {1}' -f $instance.Version, $instance.ProcessId)
            Stop-Process -Id $instance.ProcessId -ErrorAction Stop
        }
    }
    $deadline = (Get-Date).AddSeconds(10)
    do {
        $old = @(Get-NeoInstances | Where-Object { $_.Version -lt $target.Version })
        if (-not $old.Count) { break }
        Start-Sleep -Milliseconds 200
    } while ((Get-Date) -lt $deadline)
    if ($old.Count) { throw 'A instancia anterior ainda esta encerrando. Tente abrir o Neo novamente.' }

    $existing = @(Get-NeoInstances | Where-Object { $_.Version -eq $target.Version })
    $startPath = if ($existing.Count) { $existing[0].Path } else { $target.Path }
    $null = Start-Process -FilePath $startPath -WorkingDirectory (Split-Path -Parent $startPath) -WindowStyle Hidden -PassThru
    $deadline = (Get-Date).AddSeconds(45)
    do {
        $active = @(Get-NeoInstances | Where-Object { $_.Version -eq $target.Version })
        if ($active.Count) {
            Write-NeoLog ('Confirmada versao {0} em execucao, PID {1}' -f $active[0].Version, $active[0].ProcessId)
            exit 0
        }
        Start-Sleep -Milliseconds 300
    } while ((Get-Date) -lt $deadline)
    throw 'O Neo nao confirmou a inicializacao. Consulte Abrir-Neo.log nesta pasta.'
} catch {
    Write-NeoLog ('Erro: ' + $_.Exception.Message)
    $notice = New-Object -ComObject WScript.Shell
    $null = $notice.Popup($_.Exception.Message, 0, 'Neo', 16)
    exit 1
}
