# Vxture 开发环境启动脚本

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Vxture 开发环境启动脚本" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# 检查 Node.js 是否安装
Write-Host "检查 Node.js 环境..." -ForegroundColor Cyan
try {
    $nodeVersion = node -v
    Write-Host "Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "错误: 未找到 Node.js，请先安装 Node.js 22+ 版本" -ForegroundColor Red
    exit 1
}

# 检查 pnpm 是否安装
Write-Host "`n检查 pnpm 环境..." -ForegroundColor Cyan
try {
    $pnpmVersion = pnpm -v
    Write-Host "pnpm 版本: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "错误: 未找到 pnpm，请先安装 pnpm 10+ 版本" -ForegroundColor Red
    exit 1
}

# 检查依赖是否已安装
Write-Host "`n检查项目依赖..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "依赖未安装，正在安装..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "错误: 依赖安装失败" -ForegroundColor Red
        exit 1
    }
}
Write-Host "依赖已安装" -ForegroundColor Green

# 检查 Python 是否安装
Write-Host "`n检查 Python 环境..." -ForegroundColor Cyan
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python 版本: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "错误: 未找到 Python，请先安装 Python 3.11+ 版本" -ForegroundColor Red
    exit 1
}

# 检查并清理端口
Write-Host "`n检查端口占用..." -ForegroundColor Cyan

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

        foreach ($pid in $uniqueProcessIds) {
            if ($pid -and $pid -ne "0") {
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Host "终止进程: $($process.ProcessName) (PID: $pid)" -ForegroundColor Yellow
                        Stop-Process -Id $pid -Force
                    }
                } catch {
                    Write-Host "无法终止进程 PID: $pid" -ForegroundColor Red
                }
            }
        }
    }
}

# 检查 3010 端口（website portal）
if (Test-Port 3010) {
    Write-Host "发现 3010 端口被占用，正在清理..." -ForegroundColor Yellow
    Stop-ProcessByPort 3010
    Start-Sleep -Seconds 1
}

# 检查 8000 端口
if (Test-Port 8000) {
    Write-Host "发现 8000 端口被占用，正在清理..." -ForegroundColor Yellow
    Stop-ProcessByPort 8000
    Start-Sleep -Seconds 1
}

Write-Host "端口检查完成" -ForegroundColor Green

# 启动开发环境
Write-Host "`n==========================================" -ForegroundColor Gray
Write-Host "  启动开发环境..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Gray
Write-Host ""
Write-Host "前端地址: http://localhost:3010" -ForegroundColor Cyan
Write-Host "后端地址: http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "按 Ctrl+C 停止服务" -ForegroundColor Gray
Write-Host "==========================================" -ForegroundColor Gray
Write-Host ""

# 使用 concurrently 启动前后端（在当前终端显示日志）
pnpm dev:full
