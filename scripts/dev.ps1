[CmdletBinding()]
param()

. (Join-Path $PSScriptRoot 'common.ps1')

$backendProcess = $null
$backendStartedByScript = $false
$backendLogPath = Join-Path ([System.IO.Path]::GetTempPath()) 'liquidlife-backend.log'

try {
    & (Join-Path $PSScriptRoot 'bootstrap.ps1')

    $venvDir = Resolve-BackendVenv
    $pythonExe = Get-VenvPythonPath -VenvDir $venvDir

    if (Test-HttpEndpoint -Uri 'http://127.0.0.1:8000/healthz') {
        Write-Step 'Backend already running on 127.0.0.1:8000'
    }
    else {
        $powerShellExe = Get-PowerShellExecutable
        $backendCommand = "Set-Location '$BackendDir'; & '$pythonExe' manage.py runserver 127.0.0.1:8000"
        $backendProcess = Start-Process -FilePath $powerShellExe -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $backendCommand) -RedirectStandardOutput $backendLogPath -RedirectStandardError $backendLogPath -PassThru
        $backendStartedByScript = $true
        Write-Step "Backend started (PID: $($backendProcess.Id), log: $backendLogPath)"

        if (-not (Wait-ForEndpoint -Uri 'http://127.0.0.1:8000/healthz')) {
            throw "Backend did not become ready. Check $backendLogPath"
        }
    }

    Open-Browser -Url 'http://localhost:3000'

    if (Test-HttpEndpoint -Uri 'http://127.0.0.1:3000') {
        Write-Step 'Frontend already running on http://localhost:3000'
        Write-Step 'Nothing else to start.'
        exit 0
    }

    Write-Step 'Starting frontend dev server on http://localhost:3000'
    Invoke-Checked -FilePath 'npm' -ArgumentList @('run', 'dev', '--', '--port', '3000') -WorkingDirectory $FrontendDir
}
finally {
    if ($backendStartedByScript -and $backendProcess -and -not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
