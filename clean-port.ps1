param(
    [int[]]$Port = @(3000)
)

foreach ($currentPort in $Port) {
    Write-Host "Checking port $currentPort..." -ForegroundColor Cyan

    $processIds = Get-NetTCPConnection -LocalPort $currentPort -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    if (-not $processIds) {
        Write-Host "Port $currentPort is free." -ForegroundColor Green
        continue
    }

    foreach ($processId in $processIds) {
        if ($processId -and $processId -ne 0) {
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            $name = if ($process) { $process.ProcessName } else { "unknown" }
            Write-Host "Stopping $name (PID: $processId) on port $currentPort..." -ForegroundColor Yellow
            Stop-Process -Id $processId -Force
        }
    }
}
