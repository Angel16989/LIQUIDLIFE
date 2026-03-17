$ErrorActionPreference = 'Stop'

$Script:RootDir = Split-Path -Parent $PSScriptRoot
$Script:FrontendDir = Join-Path $Script:RootDir 'frontend'
$Script:BackendDir = Join-Path $Script:RootDir 'liquidlife_backend'

function Import-EnvFile {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path $Path)) {
        return
    }

    foreach ($rawLine in Get-Content -Path $Path) {
        $line = $rawLine.Trim()
        if (-not $line -or $line.StartsWith('#') -or -not $line.Contains('=')) {
            continue
        }

        $parts = $line.Split('=', 2)
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()

        if (-not $key) {
            continue
        }

        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
    }
}

Import-EnvFile -Path (Join-Path $Script:RootDir '.env')
Import-EnvFile -Path (Join-Path $Script:BackendDir '.env')

function Write-Step {
    param([string]$Message)
    Write-Host $Message
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string[]]$ArgumentList = @(),
        [string]$WorkingDirectory = $Script:RootDir
    )

    Push-Location $WorkingDirectory
    try {
        & $FilePath @ArgumentList
        if ($LASTEXITCODE -ne 0) {
            $joinedArgs = if ($ArgumentList.Count -gt 0) { ' ' + ($ArgumentList -join ' ') } else { '' }
            throw "Command failed: $FilePath$joinedArgs"
        }
    }
    finally {
        Pop-Location
    }
}

function Get-CommandPath {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$InstallHint
    )

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "Error: $Name not found. $InstallHint"
    }

    return $command.Source
}

function Use-Node20 {
    $nvm = Get-CommandPath -Name 'nvm' -InstallHint 'Install nvm-windows first: https://github.com/coreybutler/nvm-windows'
    Write-Step '[1/4] Setting Node.js 20'
    Invoke-Checked -FilePath $nvm -ArgumentList @('install', '20')
    Invoke-Checked -FilePath $nvm -ArgumentList @('use', '20')
}

function Resolve-PythonLauncher {
    foreach ($candidate in @('py', 'python', 'python3')) {
        $command = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($command) {
            if ($candidate -eq 'py') {
                return @($command.Source, '-3')
            }
            return @($command.Source)
        }
    }

    throw 'Error: Python 3 not found. Install Python 3.10+ and ensure it is on PATH.'
}

function Resolve-BackendVenv {
    $dotVenv = Join-Path $Script:BackendDir '.venv'
    $legacyVenv = Join-Path $Script:BackendDir 'venv'

    if (Test-Path $dotVenv) {
        return $dotVenv
    }

    if (Test-Path $legacyVenv) {
        return $legacyVenv
    }

    $pythonLauncher = Resolve-PythonLauncher
    $pythonExecutable = $pythonLauncher[0]
    $pythonArgs = @()
    if ($pythonLauncher.Count -gt 1) {
        $pythonArgs = $pythonLauncher[1..($pythonLauncher.Count - 1)]
    }

    Invoke-Checked -FilePath $pythonExecutable -ArgumentList ($pythonArgs + @('-m', 'venv', $dotVenv)) -WorkingDirectory $Script:BackendDir
    return $dotVenv
}

function Get-VenvPythonPath {
    param([Parameter(Mandatory = $true)][string]$VenvDir)

    foreach ($candidate in @(
        (Join-Path $VenvDir 'Scripts/python.exe'),
        (Join-Path $VenvDir 'bin/python')
    )) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    throw "Error: Could not find a Python executable inside virtualenv at $VenvDir"
}

function Test-HttpEndpoint {
    param(
        [Parameter(Mandatory = $true)][string]$Uri,
        [int]$TimeoutMilliseconds = 2000
    )

    try {
        $request = [System.Net.WebRequest]::Create($Uri)
        $request.Method = 'GET'
        $request.Timeout = $TimeoutMilliseconds
        $response = $request.GetResponse()
        $response.Dispose()
        return $true
    }
    catch [System.Net.WebException] {
        if ($_.Exception.Response) {
            $_.Exception.Response.Dispose()
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

function Wait-ForEndpoint {
    param(
        [Parameter(Mandatory = $true)][string]$Uri,
        [int]$MaxAttempts = 40,
        [int]$DelayMilliseconds = 500
    )

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        if (Test-HttpEndpoint -Uri $Uri) {
            return $true
        }
        Start-Sleep -Milliseconds $DelayMilliseconds
    }

    return $false
}

function Open-Browser {
    param([Parameter(Mandatory = $true)][string]$Url)
    Start-Process $Url | Out-Null
}

function Get-PowerShellExecutable {
    $pwsh = Get-Command 'pwsh' -ErrorAction SilentlyContinue
    if ($pwsh) {
        return $pwsh.Source
    }

    $powershell = Get-Command 'powershell' -ErrorAction SilentlyContinue
    if ($powershell) {
        return $powershell.Source
    }

    throw 'Error: PowerShell executable not found on PATH.'
}
