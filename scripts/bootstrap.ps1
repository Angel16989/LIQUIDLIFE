[CmdletBinding()]
param()

. (Join-Path $PSScriptRoot 'common.ps1')

Use-Node20

Write-Step '[2/4] Installing frontend dependencies'
Invoke-Checked -FilePath 'npm' -ArgumentList @('install') -WorkingDirectory $FrontendDir

Write-Step '[3/4] Setting Python virtual environment'
$venvDir = Resolve-BackendVenv
$pythonExe = Get-VenvPythonPath -VenvDir $venvDir

Write-Step '[4/4] Installing backend dependencies and applying migrations'
Invoke-Checked -FilePath $pythonExe -ArgumentList @('-m', 'pip', 'install', '-r', 'requirements.txt') -WorkingDirectory $BackendDir
Invoke-Checked -FilePath $pythonExe -ArgumentList @('manage.py', 'migrate') -WorkingDirectory $BackendDir

Write-Step 'Bootstrap complete.'
