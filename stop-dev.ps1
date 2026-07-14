# Vxture 开发环境停止脚本

Write-Host "==========================================" -ForegroundColor Red
Write-Host "  Vxture 开发环境停止脚本" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red
Write-Host ""

# 函数：检查端口是否被占用
function Test-Port {
    param($Port)
    try {
        $listener = [System.Net.Sockets.TcpListener]::new($Port)
        $listener.Start()
        return $false
    } catch {
        return $true
    } finally {
        if ($listener) {
            $listener.Stop()
        }
    }
}

# 函数：终止占用指定端口的进程
function Stop-ProcessByPort {
    param($Port)

    $processes = netstat -ano | findstr ":$Port"
    if ($processes) {
        $processIds = @()

        foreach ($line in $processes.Split("`n")) {
            if ($line.Trim()) {
                $parts = $line.Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
                if ($parts.Length -ge 5) {
                    $processIds += $parts[-1]
                }
            }
        }

        $uniqueProcessIds = $processIds | Sort-Object -Unique

        foreach ($procId in $uniqueProcessIds) {
            if ($procId -and $procId -ne "0") {
                try {
                    $process = Get-Process -Id $procId -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Host "终止进程: $($process.ProcessName) (PID: $procId)" -ForegroundColor Yellow
                        Stop-Process -Id $procId -Force
                    }
                } catch {
                    Write-Host "无法终止进程 PID: $procId" -ForegroundColor Red
                }
            }
        }
    }
}

# 检查并终止占用 3010 端口的进程（website portal）
Write-Host "检查前端服务端口 (3010)..." -ForegroundColor Cyan
if (Test-Port 3010) {
    Write-Host "发现占用 3010 端口的进程，正在终止..." -ForegroundColor Yellow
    Stop-ProcessByPort 3010
    Start-Sleep -Seconds 1

    if (Test-Port 3010) {
        Write-Host "警告: 无法完全终止占用 3010 端口的进程" -ForegroundColor Yellow
    } else {
        Write-Host "前端服务已停止" -ForegroundColor Green
    }
} else {
    Write-Host "前端服务未运行" -ForegroundColor Gray
}

# 检查并终止占用 8000 端口的进程（后端）
Write-Host "`n检查后端服务端口 (8000)..." -ForegroundColor Cyan
if (Test-Port 8000) {
    Write-Host "发现占用 8000 端口的进程，正在终止..." -ForegroundColor Yellow
    Stop-ProcessByPort 8000
    Start-Sleep -Seconds 1

    if (Test-Port 8000) {
        Write-Host "警告: 无法完全终止占用 8000 端口的进程" -ForegroundColor Yellow
    } else {
        Write-Host "后端服务已停止" -ForegroundColor Green
    }
} else {
    Write-Host "后端服务未运行" -ForegroundColor Gray
}

Write-Host "`n==========================================" -ForegroundColor Red
Write-Host "  开发环境停止完成！" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red
